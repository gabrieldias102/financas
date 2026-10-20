// Teste de integração do sync com uma Pluggy falsa. Precisa de um Postgres
// vazio em TEST_DATABASE_URL (o CI sobe um); sem ele, o teste é pulado.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/db/schema";
import type { Db } from "@/db";
import type { PluggyApi } from "./pluggy";
import { syncAll } from "./sync";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? postgres(url, { max: 1, onnotice: () => {} }) : undefined;
const db = (sql ? drizzle(sql, { schema }) : undefined) as Db;

type Tx = Awaited<ReturnType<PluggyApi["fetchAllTransactions"]>>[number];

function tx(id: string, date: string, description: string, type: "DEBIT" | "CREDIT", amount: number, extra: Partial<Tx> = {}) {
  return { id, date: new Date(date), description, type, amount, category: null, status: "POSTED", creditCardMetadata: null, ...extra } as unknown as Tx;
}

let txByAccount: Record<string, Tx[]> = {};
const fakePluggy = {
  fetchItem: async (id: string) => ({ id, status: "UPDATED", connector: { name: "MeuPluggy" }, error: null, consentExpiresAt: null, lastUpdatedAt: new Date() }),
  fetchAccounts: async () => ({
    results: [
      { id: "acc-conta", type: "BANK", subtype: "CHECKING_ACCOUNT", name: "Conta", marketingName: "Nubank Conta", number: "1", balance: 1000, currencyCode: "BRL", creditData: null },
      { id: "acc-cartao", type: "CREDIT", subtype: "CREDIT_CARD", name: "Cartão", marketingName: null, number: "2", balance: 300, currencyCode: "BRL", creditData: { creditLimit: 5000 } },
    ],
  }),
  fetchAllTransactions: async (accountId: string) => txByAccount[accountId] ?? [],
} as unknown as PluggyApi;

before(async () => {
  if (!sql) return;
  await sql`drop schema if exists public cascade`;
  await sql`drop schema if exists drizzle cascade`;
  await sql`create schema public`;
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.categories).values([
    { name: "Alimentação", kind: "expense" },
    { name: "Transferências", kind: "transfer" },
  ]);
  const cats = await db.select().from(schema.categories);
  const id = (n: string) => cats.find((c) => c.name === n)!.id;
  await db.insert(schema.rules).values([
    { pattern: "ifood", categoryId: id("Alimentação") },
    { pattern: "pagamento de fatura", categoryId: id("Transferências") },
  ]);
});

after(async () => {
  await sql?.end();
});

test("sync grava contas, transações com sinal certo e aplica regras", { skip: !sql }, async () => {
  txByAccount = {
    "acc-conta": [
      tx("t1", "2026-10-01T12:00:00Z", "Salário", "CREDIT", 5000),
      tx("t2", "2026-10-05T12:00:00Z", "Pagamento de fatura", "DEBIT", -300),
    ],
    "acc-cartao": [
      tx("t3", "2026-10-03T12:00:00Z", "IFOOD *Restaurante", "DEBIT", 45.9, {
        creditCardMetadata: { installmentNumber: 1, totalInstallments: 3 },
      }),
      tx("t4", "2026-10-06T12:00:00Z", "Compra pendente", "DEBIT", 10, { status: "PENDING" } as Partial<Tx>),
    ],
  };
  const r = await syncAll(db, fakePluggy, ["item-1"]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.accounts, 2);
  assert.equal(r.transactions, 4);

  const rows = await db.select().from(schema.transactions);
  const byId = Object.fromEntries(rows.map((t) => [t.id, t]));
  assert.equal(byId.t1.amount, 5000);
  assert.equal(byId.t2.amount, -300);
  assert.equal(byId.t3.amount, -45.9);
  assert.equal(byId.t3.installment, "1/3");
  assert.equal(byId.t3.categorySource, "rule");
  assert.equal(byId.t2.categorySource, "rule");
  assert.equal(byId.t1.categoryId, null);
});

test("re-sync não duplica, preserva categoria manual e remove pendente que sumiu", { skip: !sql }, async () => {
  const [transfer] = await db.select().from(schema.categories).where(eq(schema.categories.name, "Transferências"));
  await db.update(schema.transactions).set({ categoryId: transfer.id, categorySource: "manual" }).where(eq(schema.transactions.id, "t3"));

  // O pendente t4 foi confirmado com outro id (t5).
  txByAccount["acc-cartao"] = [
    txByAccount["acc-cartao"][0],
    tx("t5", "2026-10-06T12:00:00Z", "Compra pendente", "DEBIT", 10),
  ];
  await syncAll(db, fakePluggy, ["item-1"]);

  const rows = await db.select().from(schema.transactions);
  const ids = rows.map((t) => t.id).sort();
  assert.deepEqual(ids, ["t1", "t2", "t3", "t5"]);
  const t3 = rows.find((t) => t.id === "t3")!;
  assert.equal(t3.categoryId, transfer.id);
  assert.equal(t3.categorySource, "manual");
});

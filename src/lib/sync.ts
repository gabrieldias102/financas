import { and, eq, gte, inArray, isNull, ne, notInArray, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { accounts, categories, connections, rules, transactions } from "@/db/schema";
import { matchRule, signedAmount } from "./categorize";
import { PLUGGY_CATEGORY_MAP } from "./defaults";
import type { PluggyApi } from "./pluggy";

const FIRST_SYNC_DAYS = 365;
// Reprocessa alguns dias para pegar lançamentos que mudaram (ex.: pendentes).
const OVERLAP_DAYS = 10;

export type SyncResult = { items: number; accounts: number; transactions: number; errors: string[] };

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number, from = new Date()) {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000);
}

export async function syncAll(db: Db, pluggy: PluggyApi, itemIds: string[]): Promise<SyncResult> {
  const result: SyncResult = { items: 0, accounts: 0, transactions: 0, errors: [] };
  if (itemIds.length === 0) {
    result.errors.push("Nenhum item configurado em PLUGGY_ITEM_IDS");
    return result;
  }

  for (const itemId of itemIds) {
    try {
      const r = await syncItem(db, pluggy, itemId);
      result.items++;
      result.accounts += r.accounts;
      result.transactions += r.transactions;
    } catch (e) {
      result.errors.push(`Item ${itemId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await applyRules(db);
  return result;
}

async function syncItem(db: Db, pluggy: PluggyApi, itemId: string) {
  const item = await pluggy.fetchItem(itemId);
  const [previous] = await db.select().from(connections).where(eq(connections.id, itemId));

  const connectionValues = {
    connectorName: item.connector?.name ?? "Pluggy",
    status: item.status,
    error: item.error?.message ?? null,
    consentExpiresAt: item.consentExpiresAt ? new Date(item.consentExpiresAt) : null,
    pluggyUpdatedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null,
  };
  await db
    .insert(connections)
    .values({ id: itemId, ...connectionValues })
    .onConflictDoUpdate({ target: connections.id, set: connectionValues });

  let dateFrom = previous?.lastSyncedAt
    ? isoDate(daysAgo(OVERLAP_DAYS, previous.lastSyncedAt))
    : isoDate(daysAgo(FIRST_SYNC_DAYS));
  // Volta até o pendente mais antigo, para ver se ele foi confirmado ou sumiu.
  const [oldestPending] = await db
    .select({ date: sql<string | null>`min(${transactions.date})` })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(accounts.connectionId, itemId), eq(transactions.status, "PENDING")));
  if (oldestPending?.date && oldestPending.date < dateFrom) dateFrom = oldestPending.date;

  const accountPage = await pluggy.fetchAccounts(itemId);
  let txCount = 0;

  for (const acc of accountPage.results) {
    const accountValues = {
      connectionId: itemId,
      name: acc.marketingName ?? acc.name,
      type: acc.type,
      subtype: acc.subtype,
      number: acc.number,
      balance: acc.balance,
      creditLimit: acc.creditData?.creditLimit ?? null,
      currency: acc.currencyCode,
      updatedAt: new Date(),
    };
    await db
      .insert(accounts)
      .values({ id: acc.id, ...accountValues })
      .onConflictDoUpdate({ target: accounts.id, set: accountValues });

    const txs = await pluggy.fetchAllTransactions(acc.id, { dateFrom });
    for (const tx of txs) {
      const meta = tx.creditCardMetadata;
      const values = {
        accountId: acc.id,
        date: isoDate(new Date(tx.date)),
        description: tx.description,
        amount: signedAmount(tx.type, tx.amount),
        status: tx.status ?? "POSTED",
        pluggyCategory: tx.category,
        installment:
          meta?.installmentNumber && meta.totalInstallments
            ? `${meta.installmentNumber}/${meta.totalInstallments}`
            : null,
      };
      // Não mexe em categoria/nota numa transação que já existe.
      await db
        .insert(transactions)
        .values({ id: tx.id, ...values })
        .onConflictDoUpdate({ target: transactions.id, set: values });
    }
    txCount += txs.length;

    // Pendentes costumam ganhar outro id quando confirmados; remove os que
    // sumiram da Pluggy para não duplicar.
    const returnedIds = txs.map((t) => t.id);
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.accountId, acc.id),
          eq(transactions.status, "PENDING"),
          gte(transactions.date, dateFrom),
          returnedIds.length > 0 ? notInArray(transactions.id, returnedIds) : undefined,
        ),
      );
  }

  await db.update(connections).set({ lastSyncedAt: new Date() }).where(eq(connections.id, itemId));
  return { accounts: accountPage.results.length, transactions: txCount };
}

// Categoriza tudo que não foi categorizado à mão: primeiro pelas regras,
// depois pela categoria que a Pluggy mandou.
export async function applyRules(db: Db) {
  const allRules = await db.select().from(rules);
  const allCategories = await db.select().from(categories);
  const byName = new Map(allCategories.map((c) => [c.name, c.id]));

  const pending = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      pluggyCategory: transactions.pluggyCategory,
      categoryId: transactions.categoryId,
      categorySource: transactions.categorySource,
    })
    .from(transactions)
    .where(or(isNull(transactions.categorySource), ne(transactions.categorySource, "manual")));

  const updates = new Map<string, { categoryId: number | null; source: string | null }>();
  for (const tx of pending) {
    const rule = matchRule(tx.description, allRules);
    let next: { categoryId: number | null; source: string | null } = { categoryId: null, source: null };
    if (rule) {
      next = { categoryId: rule.categoryId, source: "rule" };
    } else if (tx.pluggyCategory && byName.has(PLUGGY_CATEGORY_MAP[tx.pluggyCategory])) {
      next = { categoryId: byName.get(PLUGGY_CATEGORY_MAP[tx.pluggyCategory])!, source: "pluggy" };
    }
    if (next.categoryId !== tx.categoryId || next.source !== tx.categorySource) {
      updates.set(tx.id, next);
    }
  }

  // Agrupa por categoria para fazer poucas queries.
  const groups = new Map<string, string[]>();
  for (const [id, u] of updates) {
    const key = `${u.categoryId}|${u.source}`;
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  for (const [key, ids] of groups) {
    const [cat, source] = key.split("|");
    await db
      .update(transactions)
      .set({
        categoryId: cat === "null" ? null : Number(cat),
        categorySource: source === "null" ? null : source,
      })
      .where(inArray(transactions.id, ids));
  }
  return updates.size;
}

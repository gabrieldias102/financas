import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, categories, connections, rules, transactions } from "@/db/schema";
import { monthRange } from "./format";

export async function getAccounts() {
  return getDb().select().from(accounts).orderBy(asc(accounts.type), asc(accounts.name));
}

export async function getConnections() {
  return getDb().select().from(connections);
}

export async function getCategories() {
  return getDb().select().from(categories).orderBy(asc(categories.kind), asc(categories.name));
}

export async function getRules() {
  return getDb()
    .select({ id: rules.id, pattern: rules.pattern, categoryName: categories.name })
    .from(rules)
    .innerJoin(categories, eq(rules.categoryId, categories.id))
    .orderBy(asc(rules.pattern));
}

// Totais do mês por categoria, sem transferências (pagamento de fatura,
// aplicação etc.) para não contar o mesmo dinheiro duas vezes.
export async function getMonthSummary(month: string) {
  const { start, end } = monthRange(month);
  const rows = await getDb()
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      kind: categories.kind,
      out: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} end), 0)`,
      in: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} end), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(gte(transactions.date, start), lt(transactions.date, end)))
    .groupBy(transactions.categoryId, categories.name, categories.kind);

  const spending: { name: string; total: number; count: number }[] = [];
  let income = 0;
  let expenses = 0;
  for (const r of rows) {
    if (r.kind === "transfer") continue;
    const out = Number(r.out);
    const inn = Number(r.in);
    if (r.kind === "income") {
      income += inn - out;
      continue;
    }
    // Sem categoria: entradas contam como receita e saídas como gasto.
    // Numa categoria de gasto, estornos abatem o total.
    const spent = r.kind === null ? out : out - inn;
    if (r.kind === null) income += inn;
    if (spent === 0) continue;
    expenses += spent;
    spending.push({ name: r.name ?? "Sem categoria", total: spent, count: r.count });
  }
  spending.sort((a, b) => b.total - a.total);
  return { income, expenses, spending };
}

export async function getMonthTransactions(month: string) {
  const { start, end } = monthRange(month);
  return getDb()
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      status: transactions.status,
      installment: transactions.installment,
      categoryId: transactions.categoryId,
      categorySource: transactions.categorySource,
      accountName: accounts.name,
      accountType: accounts.type,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(gte(transactions.date, start), lt(transactions.date, end)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

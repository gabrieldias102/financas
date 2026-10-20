import Link from "next/link";
import { connection } from "next/server";
import { CategorySelect } from "@/components/category-select";
import { Money } from "@/components/money";
import { formatDay, monthLabel, parseMonth, shiftMonth } from "@/lib/format";
import { getCategories, getMonthTransactions } from "@/lib/queries";

export default async function Transacoes({ searchParams }: PageProps<"/transacoes">) {
  await connection();
  const { mes } = await searchParams;
  const month = parseMonth(typeof mes === "string" ? mes : undefined);
  const [txs, cats] = await Promise.all([getMonthTransactions(month), getCategories()]);

  const byDay = new Map<string, typeof txs>();
  for (const t of txs) byDay.set(t.date, [...(byDay.get(t.date) ?? []), t]);
  const uncategorized = txs.filter((t) => t.categoryId === null).length;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <Link href={`/transacoes?mes=${shiftMonth(month, -1)}`} className="px-2 text-2xl text-muted" aria-label="Mês anterior">
          ‹
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold">{monthLabel(month)}</h1>
          <p className="text-xs text-muted">
            {txs.length} transações{uncategorized > 0 && `, ${uncategorized} sem categoria`}
          </p>
        </div>
        <Link href={`/transacoes?mes=${shiftMonth(month, 1)}`} className="px-2 text-2xl text-muted" aria-label="Próximo mês">
          ›
        </Link>
      </header>

      {txs.length === 0 && <p className="text-center text-sm text-muted">Nada neste mês.</p>}

      {[...byDay].map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-1 px-1 text-xs font-semibold uppercase text-muted">{formatDay(day)}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {list.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted">
                    {t.accountName}
                    {t.installment && ` · parcela ${t.installment}`}
                    {t.status === "PENDING" && " · pendente"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Money value={t.amount} colored className="text-sm font-semibold" />
                  <CategorySelect transactionId={t.id} value={t.categoryId} options={cats} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

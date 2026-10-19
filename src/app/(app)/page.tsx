import Link from "next/link";
import { connection } from "next/server";
import { Card } from "@/components/card";
import { Money } from "@/components/money";
import { SyncButton } from "@/components/sync-button";
import { currentMonth, formatDateTime, monthLabel } from "@/lib/format";
import { connectionWarnings, latestSync } from "@/lib/connections";
import { getAccounts, getConnections, getMonthSummary } from "@/lib/queries";

export default async function Home() {
  await connection();
  const month = currentMonth();
  const [accs, conns, summary] = await Promise.all([
    getAccounts(),
    getConnections(),
    getMonthSummary(month),
  ]);

  const bank = accs.filter((a) => a.type === "BANK");
  const cards = accs.filter((a) => a.type === "CREDIT");
  const totalBank = bank.reduce((s, a) => s + a.balance, 0);
  const lastSync = latestSync(conns);
  const warnings = connectionWarnings(conns);
  const maxSpend = summary.spending[0]?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resumo</h1>
          <p className="text-xs text-muted">Atualizado {formatDateTime(lastSync)}</p>
        </div>
        <SyncButton />
      </header>

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-negative/40 bg-negative/10 p-3 text-sm">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      {accs.length === 0 && (
        <Card>
          <p className="text-sm text-muted">
            Nenhuma conta ainda. Configure as variáveis da Pluggy e toque em Sincronizar.
          </p>
        </Card>
      )}

      {bank.length > 0 && (
        <Card title="Saldo em conta">
          <Money value={totalBank} className="text-3xl font-bold" />
          <ul className="mt-3 divide-y divide-border">
            {bank.map((a) => (
              <li key={a.id} className="flex justify-between py-2 text-sm">
                <span>{a.name}</span>
                <Money value={a.balance} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {cards.length > 0 && (
        <Card title="Cartões">
          <ul className="divide-y divide-border">
            {cards.map((a) => (
              <li key={a.id} className="flex justify-between py-2 text-sm">
                <span>
                  {a.name}
                  {a.creditLimit != null && (
                    <span className="block text-xs text-muted">
                      Limite <Money value={a.creditLimit} />
                    </span>
                  )}
                </span>
                <Money value={a.balance} className="font-semibold" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title={monthLabel(month)}
        action={
          <Link href={`/transacoes?mes=${month}`} className="text-xs font-medium text-accent">
            Ver transações
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted">Entradas</p>
            <Money value={summary.income} className="text-lg font-semibold text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted">Gastos</p>
            <Money value={summary.expenses} className="text-lg font-semibold text-negative" />
          </div>
        </div>
        {summary.spending.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3">
            {summary.spending.map((s) => (
              <li key={s.name} className="text-sm">
                <div className="flex justify-between">
                  <span>{s.name}</span>
                  <Money value={s.total} />
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-border">
                  <div
                    className="h-1.5 rounded-full bg-accent"
                    style={{ width: `${maxSpend ? (s.total / maxSpend) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

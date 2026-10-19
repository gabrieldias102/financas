import { connection } from "next/server";
import { addCategory, addRule, deleteCategory, deleteRule, logout } from "@/app/actions";
import { Card } from "@/components/card";
import { ensureDefaults } from "@/lib/defaults";
import { getCategories, getRules } from "@/lib/queries";

const KIND_LABEL: Record<string, string> = {
  expense: "Gasto",
  income: "Entrada",
  transfer: "Transferência (fora dos totais)",
};

const input = "rounded-lg border border-border bg-background px-3 py-2 text-sm";
const button = "rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white";

export default async function Regras() {
  await connection();
  await ensureDefaults();
  const [cats, rls] = await Promise.all([getCategories(), getRules()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Categorias</h1>

      <Card title="Regras automáticas">
        <p className="mb-3 text-xs text-muted">
          Se a descrição da transação contém o texto, ela recebe a categoria. Categorias que você
          escolheu à mão nunca são trocadas.
        </p>
        <form action={addRule} className="mb-4 flex flex-wrap gap-2">
          <input name="padrao" required placeholder="Texto (ex.: IFOOD)" className={`${input} min-w-0 flex-1`} />
          <select name="categoria" required className={input}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className={button}>Adicionar</button>
        </form>
        <ul className="divide-y divide-border">
          {rls.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0 truncate">
                <code className="font-semibold">{r.pattern}</code>
                <span className="text-muted"> → {r.categoryName}</span>
              </span>
              <form action={deleteRule}>
                <input type="hidden" name="id" value={r.id} />
                <button className="text-xs text-negative">Remover</button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Categorias">
        <form action={addCategory} className="mb-4 flex flex-wrap gap-2">
          <input name="nome" required placeholder="Nova categoria" className={`${input} min-w-0 flex-1`} />
          <select name="tipo" className={input}>
            {Object.entries(KIND_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <button className={button}>Criar</button>
        </form>
        <ul className="divide-y divide-border">
          {cats.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>
                {c.name}
                <span className="block text-xs text-muted">{KIND_LABEL[c.kind]}</span>
              </span>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-xs text-negative">Remover</button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <form action={logout} className="text-center">
        <button className="text-sm text-muted underline">Sair</button>
      </form>
    </div>
  );
}

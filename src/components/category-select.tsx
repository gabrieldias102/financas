"use client";

import { useTransition } from "react";
import { setCategory } from "@/app/actions";

type Option = { id: number; name: string };

export function CategorySelect({
  transactionId,
  value,
  options,
}: {
  transactionId: string;
  value: number | null;
  options: Option[];
}) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Categoria"
      disabled={pending}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        start(() => setCategory(transactionId, v === "" ? null : Number(v)));
      }}
      className="max-w-40 truncate rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted disabled:opacity-60"
    >
      <option value="">Sem categoria</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

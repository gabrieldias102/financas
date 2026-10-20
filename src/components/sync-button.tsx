"use client";

import { useState, useTransition } from "react";
import { syncNow } from "@/app/actions";

export function SyncButton() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await syncNow();
              setMessage(
                r.errors.length
                  ? r.errors.join("; ")
                  : `${r.transactions} transações de ${r.accounts} contas atualizadas`,
              );
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Falha ao sincronizar");
            }
          })
        }
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sincronizando…" : "Sincronizar"}
      </button>
      {message && <p className="max-w-64 text-right text-xs text-muted">{message}</p>}
    </div>
  );
}

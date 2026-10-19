"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function Login() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-bold">Finanças</h1>
      <form action={action} className="flex flex-col gap-3">
        <input
          type="password"
          name="senha"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Senha"
          className="rounded-xl border border-border bg-card px-4 py-3"
        />
        {error && <p className="text-sm text-negative">{error}</p>}
        <button disabled={pending} className="rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-60">
          Entrar
        </button>
      </form>
    </main>
  );
}

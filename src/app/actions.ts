"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, rules, transactions } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  checkPassword,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth";
import { ensureDefaults } from "@/lib/defaults";
import { getItemIds, getPluggy } from "@/lib/pluggy";
import { applyRules, syncAll } from "@/lib/sync";

// Server actions podem ser chamadas direto por POST; checa a sessão em cada uma.
async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) redirect("/login");
}

export async function login(_prev: string | null, form: FormData) {
  const password = String(form.get("senha") ?? "");
  if (!checkPassword(password)) return "Senha incorreta";
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function syncNow() {
  await requireSession();
  await ensureDefaults();
  const result = await syncAll(getDb(), getPluggy(), getItemIds());
  revalidatePath("/", "layout");
  return result;
}

export async function setCategory(transactionId: string, categoryId: number | null) {
  await requireSession();
  await getDb()
    .update(transactions)
    .set({ categoryId, categorySource: categoryId === null ? null : "manual" })
    .where(eq(transactions.id, transactionId));
  // Voltar para "sem categoria" devolve a transação para as regras.
  if (categoryId === null) await applyRules(getDb());
  revalidatePath("/", "layout");
}

export async function addRule(form: FormData) {
  await requireSession();
  const pattern = String(form.get("padrao") ?? "").trim();
  const categoryId = Number(form.get("categoria"));
  if (!pattern || !categoryId) return;
  await getDb().insert(rules).values({ pattern, categoryId });
  await applyRules(getDb());
  revalidatePath("/", "layout");
}

export async function deleteRule(form: FormData) {
  await requireSession();
  await getDb().delete(rules).where(eq(rules.id, Number(form.get("id"))));
  await applyRules(getDb());
  revalidatePath("/", "layout");
}

export async function addCategory(form: FormData) {
  await requireSession();
  const name = String(form.get("nome") ?? "").trim();
  const kind = String(form.get("tipo") ?? "expense");
  if (!name || !["expense", "income", "transfer"].includes(kind)) return;
  await getDb().insert(categories).values({ name, kind }).onConflictDoNothing();
  revalidatePath("/", "layout");
}

export async function deleteCategory(form: FormData) {
  await requireSession();
  const id = Number(form.get("id"));
  // Transações dessa categoria voltam para "sem categoria" (on delete set null).
  await getDb()
    .update(transactions)
    .set({ categorySource: null })
    .where(eq(transactions.categoryId, id));
  await getDb().delete(categories).where(eq(categories.id, id));
  await applyRules(getDb());
  revalidatePath("/", "layout");
}

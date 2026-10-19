import { getDb } from "@/db";
import { checkCronHeader } from "@/lib/auth";
import { ensureDefaults } from "@/lib/defaults";
import { getItemIds, getPluggy } from "@/lib/pluggy";
import { syncAll } from "@/lib/sync";

export const maxDuration = 60;

// Chamado uma vez por dia pelo Vercel Cron (ver vercel.json).
export async function GET(request: Request) {
  if (!checkCronHeader(request.headers.get("authorization"))) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }
  await ensureDefaults();
  const result = await syncAll(getDb(), getPluggy(), getItemIds());
  return Response.json(result, { status: result.errors.length ? 207 : 200 });
}

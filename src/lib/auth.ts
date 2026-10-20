import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "financas_sessao";
export const SESSION_DAYS = 90;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  // Compara hashes para não vazar o tamanho e ter buffers do mesmo tamanho.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createSessionToken(now = Date.now()) {
  const expires = String(now + SESSION_DAYS * 24 * 60 * 60 * 1000);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires))) return false;
  return Number(expires) > now;
}

export function checkPassword(input: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD não configurada");
  return safeEqual(input, expected);
}

// Vercel Cron manda "Authorization: Bearer <CRON_SECRET>".
export function checkCronHeader(header: string | null) {
  const s = process.env.CRON_SECRET;
  if (!s || !header) return false;
  return safeEqual(header, `Bearer ${s}`);
}

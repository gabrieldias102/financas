import { test } from "node:test";
import assert from "node:assert/strict";
import * as auth from "./auth";

// auth lê as variáveis na hora da chamada, então dá para definir depois do import.
process.env.SESSION_SECRET = "x".repeat(40);
process.env.APP_PASSWORD = "senha-forte";
process.env.CRON_SECRET = "cron123";

test("token válido é aceito", () => {
  assert.equal(auth.verifySessionToken(auth.createSessionToken()), true);
});

test("token expirado ou adulterado é recusado", () => {
  const old = auth.createSessionToken(Date.now() - 100 * 24 * 60 * 60 * 1000);
  assert.equal(auth.verifySessionToken(old), false);
  const [exp, sig] = auth.createSessionToken().split(".");
  assert.equal(auth.verifySessionToken(`${Number(exp) + 1}.${sig}`), false);
  assert.equal(auth.verifySessionToken(undefined), false);
  assert.equal(auth.verifySessionToken("lixo"), false);
});

test("senha e cron", () => {
  assert.equal(auth.checkPassword("senha-forte"), true);
  assert.equal(auth.checkPassword("errada"), false);
  assert.equal(auth.checkCronHeader("Bearer cron123"), true);
  assert.equal(auth.checkCronHeader("Bearer outro"), false);
  assert.equal(auth.checkCronHeader(null), false);
});

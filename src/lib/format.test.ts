import { test } from "node:test";
import assert from "node:assert/strict";
import { monthRange, parseMonth, shiftMonth } from "./format";

test("intervalo do mês vira o ano em dezembro", () => {
  assert.deepEqual(monthRange("2026-12"), { start: "2026-12-01", end: "2027-01-01" });
  assert.deepEqual(monthRange("2026-02"), { start: "2026-02-01", end: "2026-03-01" });
});

test("navegação entre meses", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});

test("mês inválido cai no mês atual", () => {
  assert.match(parseMonth("2026-13"), /^\d{4}-\d{2}$/);
  assert.equal(parseMonth("2026-10"), "2026-10");
});

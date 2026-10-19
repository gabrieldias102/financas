import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRule, normalize, signedAmount } from "./categorize";

test("normalize tira acento e padroniza", () => {
  assert.equal(normalize("  Padaria  São João "), "PADARIA SAO JOAO");
});

test("regra mais específica vence", () => {
  const rules = [
    { pattern: "uber", categoryId: 1 },
    { pattern: "Uber Eats", categoryId: 2 },
  ];
  assert.equal(matchRule("UBER EATS *PEDIDO", rules)?.categoryId, 2);
  assert.equal(matchRule("Uber *Trip", rules)?.categoryId, 1);
  assert.equal(matchRule("Mercado", rules), undefined);
});

test("sinal segue o tipo da transação", () => {
  assert.equal(signedAmount("DEBIT", 50), -50);
  assert.equal(signedAmount("DEBIT", -50), -50);
  assert.equal(signedAmount("CREDIT", -20), 20);
});

export type RuleLike = { pattern: string; categoryId: number };

// Maiúsculas e sem acento, para "Ifood" casar com "IFOOD *RESTAURANTE".
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// A regra com o padrão mais longo vence: "UBER EATS" ganha de "UBER".
export function matchRule<R extends RuleLike>(description: string, rules: R[]): R | undefined {
  const text = normalize(description);
  return [...rules]
    .sort((a, b) => b.pattern.length - a.pattern.length)
    .find((r) => {
      const p = normalize(r.pattern);
      return p.length > 0 && text.includes(p);
    });
}

// A Pluggy manda o valor com sinal diferente para conta e cartão; o tipo
// (DEBIT/CREDIT) é o que diz se o dinheiro saiu ou entrou.
export function signedAmount(type: "DEBIT" | "CREDIT", amount: number) {
  const abs = Math.abs(amount);
  return type === "DEBIT" ? -abs : abs;
}

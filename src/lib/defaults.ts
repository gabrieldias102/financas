import { getDb } from "@/db";
import { categories, rules } from "@/db/schema";
import { eq } from "drizzle-orm";

export const DEFAULT_CATEGORIES: { name: string; kind: "expense" | "income" | "transfer" }[] = [
  { name: "Alimentação", kind: "expense" },
  { name: "Mercado", kind: "expense" },
  { name: "Transporte", kind: "expense" },
  { name: "Moradia", kind: "expense" },
  { name: "Contas e serviços", kind: "expense" },
  { name: "Saúde", kind: "expense" },
  { name: "Lazer", kind: "expense" },
  { name: "Compras", kind: "expense" },
  { name: "Assinaturas", kind: "expense" },
  { name: "Educação", kind: "expense" },
  { name: "Impostos e tarifas", kind: "expense" },
  { name: "Outros gastos", kind: "expense" },
  { name: "Salário", kind: "income" },
  { name: "Outras entradas", kind: "income" },
  { name: "Investimentos", kind: "transfer" },
  { name: "Transferências", kind: "transfer" },
];

const DEFAULT_RULES: [string, string][] = [
  ["PAGAMENTO DE FATURA", "Transferências"],
  ["PAGAMENTO RECEBIDO", "Transferências"],
  ["PAG FATURA", "Transferências"],
  ["IFOOD", "Alimentação"],
  ["UBER EATS", "Alimentação"],
  ["RAPPI", "Alimentação"],
  ["UBER", "Transporte"],
  ["99APP", "Transporte"],
  ["NETFLIX", "Assinaturas"],
  ["SPOTIFY", "Assinaturas"],
  ["AMAZON PRIME", "Assinaturas"],
  ["IOF", "Impostos e tarifas"],
  ["APLICACAO", "Investimentos"],
  ["RESGATE", "Investimentos"],
];

// Categoria da Pluggy (em inglês) → nossa categoria, usada quando nenhuma
// regra casa. Só os casos mais comuns; o resto fica sem categoria.
export const PLUGGY_CATEGORY_MAP: Record<string, string> = {
  "Credit card payment": "Transferências",
  "Transfer - Bank account": "Transferências",
  "Same person transfer": "Transferências",
  "Same person transfer - PIX": "Transferências",
  Investments: "Investimentos",
  Salary: "Salário",
  "Eating out": "Alimentação",
  "Food delivery": "Alimentação",
  Groceries: "Mercado",
  Supermarket: "Mercado",
  "Taxi and ride-hailing": "Transporte",
  "Gas stations": "Transporte",
  "Public transportation": "Transporte",
  Pharmacy: "Saúde",
  Health: "Saúde",
  Rent: "Moradia",
  Electricity: "Contas e serviços",
  Water: "Contas e serviços",
  "Telecommunications": "Contas e serviços",
  Internet: "Contas e serviços",
  "Video streaming": "Assinaturas",
  "Music streaming": "Assinaturas",
  Education: "Educação",
  "Bank fees": "Impostos e tarifas",
  Taxes: "Impostos e tarifas",
  Shopping: "Compras",
  Entertainment: "Lazer",
};

// Cria categorias e regras iniciais na primeira execução.
export async function ensureDefaults() {
  const db = getDb();
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length > 0) return;

  await db.insert(categories).values(DEFAULT_CATEGORIES).onConflictDoNothing();
  for (const [pattern, name] of DEFAULT_RULES) {
    const [cat] = await db.select().from(categories).where(eq(categories.name, name));
    if (cat) await db.insert(rules).values({ pattern, categoryId: cat.id });
  }
}

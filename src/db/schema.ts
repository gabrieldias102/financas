import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Uma conexão (item) da Pluggy. Com o Meu Pluggy normalmente é um só item
// que agrupa todos os bancos.
export const connections = pgTable("connections", {
  id: text("id").primaryKey(),
  connectorName: text("connector_name").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true }),
  pluggyUpdatedAt: timestamp("pluggy_updated_at", { withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // BANK ou CREDIT
  type: text("type").notNull(),
  subtype: text("subtype"),
  number: text("number"),
  balance: numeric("balance", { precision: 14, scale: 2, mode: "number" }).notNull(),
  creditLimit: numeric("credit_limit", { precision: 14, scale: 2, mode: "number" }),
  currency: text("currency").notNull().default("BRL"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  // expense | income | transfer. Transferências ficam fora dos relatórios
  // para não contar duas vezes (ex.: pagamento de fatura).
  kind: text("kind").notNull().default("expense"),
});

export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    description: text("description").notNull(),
    // Negativo = saiu dinheiro, positivo = entrou.
    amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
    status: text("status").notNull().default("POSTED"),
    pluggyCategory: text("pluggy_category"),
    installment: text("installment"),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    // rule | pluggy | manual. Categoria manual nunca é sobrescrita.
    categorySource: text("category_source"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transactions_date_idx").on(t.date), index("transactions_account_idx").on(t.accountId)],
);

export type Category = typeof categories.$inferSelect;
export type Rule = typeof rules.$inferSelect;

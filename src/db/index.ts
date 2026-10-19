import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let instance: PostgresJsDatabase<typeof schema> | undefined;

// Conexão criada sob demanda para o build não precisar do banco.
export function getDb() {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada");
    // prepare: false é necessário no pooler do Supabase (modo transaction).
    instance = drizzle(postgres(url, { prepare: false, max: 5 }), { schema });
  }
  return instance;
}

export type Db = ReturnType<typeof getDb>;

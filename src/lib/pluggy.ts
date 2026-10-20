import { PluggyClient } from "pluggy-sdk";

// Subconjunto do SDK usado pelo sync, para dar para testar com um falso.
export type PluggyApi = Pick<
  PluggyClient,
  "fetchItem" | "fetchAccounts" | "fetchAllTransactions"
>;

export function getPluggy(): PluggyApi {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configurados");
  }
  return new PluggyClient({ clientId, clientSecret });
}

export function getItemIds() {
  return (process.env.PLUGGY_ITEM_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

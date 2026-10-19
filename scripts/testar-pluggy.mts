// Confere se as credenciais da Pluggy funcionam e mostra o que vem de cada conta.
// Não grava nada no banco. Uso: npm run testar-pluggy
import { getItemIds, getPluggy } from "../src/lib/pluggy";

const pluggy = getPluggy();
const itemIds = getItemIds();
if (itemIds.length === 0) {
  console.error("Defina PLUGGY_ITEM_IDS no .env.local (veja o README).");
  process.exit(1);
}

const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

for (const itemId of itemIds) {
  const item = await pluggy.fetchItem(itemId);
  console.log(`\nItem ${item.id} (${item.connector?.name}) status=${item.status}`);
  if (item.consentExpiresAt) console.log(`  autorização expira em ${new Date(item.consentExpiresAt).toLocaleDateString("pt-BR")}`);

  const accounts = await pluggy.fetchAccounts(itemId);
  for (const acc of accounts.results) {
    const txs = await pluggy.fetchAllTransactions(acc.id, { dateFrom: since });
    console.log(`\n  ${acc.type} ${acc.marketingName ?? acc.name} (${acc.number}) saldo=${acc.balance}`);
    console.log(`  ${txs.length} transações desde ${since}. Últimas:`);
    for (const t of txs.slice(-5)) {
      console.log(`    ${new Date(t.date).toISOString().slice(0, 10)}  ${t.type.padEnd(6)} ${String(t.amount).padStart(10)}  ${t.description}  [${t.category ?? "-"}]`);
    }
  }
}

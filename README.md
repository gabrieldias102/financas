# Finanças

App pessoal de finanças que puxa saldos e transações do Nubank e da Caixa pelo Open Finance (via [Meu Pluggy](https://www.pluggy.ai/meu-pluggy), gratuito para uso pessoal), categoriza por regras e mostra o resumo do mês. Funciona como PWA: dá para instalar na tela inicial do iPhone sem App Store.

## Como funciona

- Uma vez por dia o Vercel Cron chama `/api/sync`, que busca contas e transações na Pluggy e grava no Postgres. Também há o botão **Sincronizar** na tela inicial.
- Transações são categorizadas por regras de texto ("contém IFOOD → Alimentação"), editáveis na aba Categorias. Uma categoria escolhida à mão nunca é sobrescrita.
- Categorias do tipo **Transferência** (pagamento de fatura, aplicação) ficam fora dos totais, para o mesmo dinheiro não contar duas vezes.
- O app tem uma senha só (`APP_PASSWORD`); a sessão dura 90 dias.

## 1. Pluggy (Meu Pluggy)

1. Em [meu.pluggy.ai](https://meu.pluggy.ai), conecte o Nubank e a Caixa.
2. Em [dashboard.pluggy.ai](https://dashboard.pluggy.ai), crie uma aplicação e copie o **Client ID** e o **Client Secret**.
3. Na aplicação, ative o conector **MeuPluggy** e entre com a conta do Meu Pluggy.
4. Pegue o **Item ID**: na aplicação, clique em "Ir para Demo", abra o menu de três pontos no canto superior direito e copie o Item ID. Se tiver mais de um, separe por vírgula em `PLUGGY_ITEM_IDS`.

Os dados do Meu Pluggy atualizam a cada ~24h. A autorização de cada banco expira (o app avisa 30 dias antes); renove no Meu Pluggy.

## 2. Rodar no computador

Precisa de Node 22 e de um Postgres (local ou o do Supabase).

```bash
npm install
cp .env.example .env.local   # preencha os valores
npm run testar-pluggy        # confere a Pluggy sem gravar nada
npm run db:migrate           # cria as tabelas
npm run dev                  # http://localhost:3000
```

## 3. Publicar (grátis)

1. **Banco:** crie um projeto no [Supabase](https://supabase.com). Em Project Settings → Database, copie a connection string do **Transaction pooler** para `DATABASE_URL`. Rode `npm run db:migrate` uma vez com essa URL no `.env.local`.
2. **App:** importe o repositório na [Vercel](https://vercel.com/new) e cadastre as variáveis do `.env.example` em Settings → Environment Variables. O cron diário já está em `vercel.json`.
3. **iPhone:** abra o endereço da Vercel no Safari, toque em Compartilhar → **Adicionar à Tela de Início**.

## Desenvolvimento

```bash
npm run lint
npm run typecheck
npm test                                    # testes unitários
TEST_DATABASE_URL=postgres://... npm test   # inclui o teste do sync (apaga o banco indicado!)
npm run db:generate                         # nova migration depois de mudar src/db/schema.ts
```

Estrutura principal:

- `src/lib/sync.ts`: busca na Pluggy, grava e aplica as regras
- `src/lib/categorize.ts`: regras de categoria e sinal dos valores
- `src/db/schema.ts`: tabelas (Drizzle)
- `src/app/(app)/`: telas (Resumo, Transações, Categorias)
- `src/app/api/sync/route.ts`: rota do cron

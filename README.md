# Mira Finance

Organizador financeiro pessoal — PWA mobile-first em português. Acompanha gastos
variáveis contra um teto por ciclo de fatura, despesas fixas recorrentes,
compras parceladas e investimentos.

Next.js 16 (App Router) · React 19 · Prisma 7 · Postgres (Neon) · Auth.js v5.

## Pré-requisitos

- Node 22+
- Um banco Postgres. O runtime usa o driver serverless da
  [Neon](https://neon.tech) via `@prisma/adapter-neon`, mas qualquer Postgres
  alcançável por `DATABASE_URL` serve para desenvolvimento.
- Um OAuth Client do Google — é o único provedor de login.
  [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

## Setup

```bash
cp .env.example .env     # e preencha os valores (ver a tabela abaixo)
npm install              # roda prisma generate no postinstall
npm run db:migrate       # cria o schema
npm run db:seed          # cria as 12 categorias de sistema
npm run dev
```

Abra <http://localhost:3000>. A primeira tela é o login com Google.

No OAuth Client, cadastre como redirect URI autorizada:
`http://localhost:3000/api/auth/callback/google` (e a equivalente do domínio de
produção).

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | Conexão Postgres. Lida pelo runtime e pelo `prisma.config.ts`. |
| `AUTH_SECRET` | sim | Assina os JWT de sessão. Gere com `openssl rand -hex 32`. |
| `AUTH_GOOGLE_ID` | sim | Client ID do OAuth. |
| `AUTH_GOOGLE_SECRET` | sim | Client secret do OAuth. |
| `AUTH_URL` | produção | URL canônica do app. Opcional em dev. |
| `CRON_SECRET` | produção | Bearer que protege `/api/cron/recurring`. A Vercel injeta sozinha. |
| `DEV_USER_ID` | não | Migração de uso único: a primeira conta Google que logar herda os dados do seed. Pode remover depois. |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (com `TZ=UTC`, ver abaixo). |
| `npm run build` | Build de produção. |
| `npm test` | Testes unitários (Vitest). |
| `npm run lint` | ESLint. |
| `npm run check` | `tsc` + lint + testes — o mesmo que a CI roda. |
| `npm run db:migrate` | Cria e aplica migration a partir do schema. |
| `npm run db:migrate:deploy` | Aplica migrations pendentes (produção). |
| `npm run db:seed` | Popula as categorias de sistema. |
| `npm run db:studio` | Prisma Studio. |

## Como o app está organizado

```
app/            rotas. As páginas só montam uma <Screen>; a API vive em app/api.
components/
  screens/      uma tela por rota
  ui/           peças reutilizáveis (modais, sheets, chips)
  charts/       SVG desenhado à mão, sem biblioteca
lib/            domínio puro e testável — ciclos, parcelas, recorrência, datas
data/           ponte entre a chave de ícone gravada no banco e o componente
prisma/         schema, migrations e seed
```

`proxy.ts` na raiz é o middleware do Next 16 (renomeado nesta versão). Ele
autentica toda requisição e repassa o `userId` às rotas de API pelo header
`x-user-id`, que **reescreve sempre** — inclusive apagando o que o cliente
mandar. As rotas confiam nesse header, então os dois arquivos precisam mudar
juntos: ver o comentário em `lib/api.ts`.

## Conceitos que não são óbvios pelo código

**Ciclo de fatura.** Um ciclo é identificado pelo mês em que ele *fecha*. Ele
começa no dia do fechamento anterior e termina na véspera do próprio — uma
compra feita no dia do fechamento já pertence ao ciclo seguinte. O dia de
fechamento não é fixo: o banco antecipa em fim de semana e feriado, então cada
ciclo pode ter uma exceção própria. Tudo isso está em `lib/cycle.ts`, que é o
arquivo mais delicado do projeto e tem a maior cobertura de testes.

**Parcelas aparecem um mês antes da fatura.** Uma compra com `startDate` na
fatura de junho aparece como parcela 1/N em maio. É o modelo mental de "o gasto
acontece quando eu compro, não quando eu pago" (`lib/installments.ts`).

**Recorrentes são materializados.** Um gasto fixo é um template que gera clones
reais nos meses seguintes, 3 meses à frente. Um cron diário na Vercel estende o
horizonte e preenche lacunas de execuções puladas — a operação é idempotente
(`lib/recurring.ts`).

**Datas são meia-noite local, e o app roda com `TZ=UTC`.** Os scripts `dev` e
`build` fixam o fuso, e a Vercel já usa UTC por padrão. Isso não é decoração:
misturar `Date.UTC` com `new Date(y, m, d)` nos dois lados de uma comparação já
fez clones do dia 1 sumirem do dashboard. A convenção inteira, com a exceção
documentada de `Installment.startDate`, está em `lib/dates.ts` — leia antes de
mexer em qualquer data.

## Testes

Vitest, só sobre `lib/` — tudo lá é puro e não precisa de DOM nem de banco.

```bash
npm test
TZ=America/Sao_Paulo npm test    # a CI roda as duas
```

O segundo comando não é redundante: rodar em fuso não-UTC é o que revela as
regressões de data. Servidor em UTC mascara essa classe inteira de bug.

## Deploy

Vercel. `vercel.json` registra o cron diário de recorrentes às 03:00 UTC.
Defina as variáveis de ambiente no projeto e rode `npm run db:migrate:deploy`
contra o banco de produção.

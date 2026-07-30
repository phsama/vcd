# Deploy no Railway

## Estrutura (1 projeto, 2 ambientes: staging e production)

| Serviço | Origem | Porta |
|---|---|---|
| `api` | Dockerfile `apps/api/Dockerfile` (root directory = raiz do repo) | 3001 |
| `admin` | Dockerfile `apps/admin/Dockerfile` (root directory = raiz do repo) | 3000 |
| `postgres` | Plugin gerenciado do Railway | — |
| `redis` | Plugin gerenciado do Railway | — |

## Passo a passo (uma vez)

1. Criar conta/projeto no [railway.app](https://railway.app) e conectar o repositório GitHub.
2. Adicionar os plugins **PostgreSQL** e **Redis**.
3. Criar serviço `api`: Settings → Source → root directory `/`, Dockerfile path `apps/api/Dockerfile`. O CMD já roda `prisma migrate deploy` no boot.
4. Criar serviço `admin`: idem com `apps/admin/Dockerfile`.
5. Criar o ambiente `staging` (Environments → New) — o Railway duplica os serviços.
6. Rodar o seed uma vez por ambiente: `railway run --service api pnpm db:seed`.

## Variáveis de ambiente do serviço `api`

Obrigatórias:
- `DATABASE_URL` → referência `${{Postgres.DATABASE_URL}}`
- `REDIS_URL` → referência `${{Redis.REDIS_URL}}`
- `JWT_ACCESS_SECRET` → gerar com `openssl rand -base64 48`
- `JOURNAL_MASTER_KEY` → gerar com `openssl rand -base64 32` ⚠️ NUNCA trocar sem re-wrap das DEKs; NUNCA logar
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → credenciais reais do primeiro admin

Cloudflare R2 (quando criado): `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_*`.
Integrações (fases seguintes): `ANTHROPIC_API_KEY`, `GOOGLE_TTS_CREDENTIALS_JSON`, `GOOGLE_OAUTH_CLIENT_ID`, `APPLE_BUNDLE_ID`, `OPENAI_MODERATION_API_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `STRIPE_*`, `FCM_SERVICE_ACCOUNT_JSON`, `SENTRY_DSN`.

## Variáveis do serviço `admin`

- `API_URL` → URL pública do serviço `api` (o Next faz proxy de `/api/v1/*`).

## Backup

Job diário de `pg_dump` → R2 (script em `infra/scripts`, agendar via Railway cron quando o R2 existir). Backups automáticos do plugin Postgres ficam como primeira linha.

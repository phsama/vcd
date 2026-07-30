# Você conhece Deus?

Rede social de espiritualidade multiconfessional. Reflexão do momento 1–3x/dia (IA + curadoria humana), em 5 trilhas espirituais × 2 idiomas (pt-BR, en), com comunidade, check-ins de bem-estar, caderno privado criptografado e assinatura freemium. Sem ads, nunca.

## Estrutura

| Diretório | O que é |
|---|---|
| `apps/api` | API NestJS (monolito modular) + Prisma + BullMQ |
| `apps/admin` | Painel administrativo Next.js (curadoria, moderação, LGPD, analytics) |
| `apps/mobile` | App Flutter (iOS + Android) |
| `packages/contracts` | OpenAPI gerado pela API → clients (Dart, TS) |
| `packages/config` | Configs compartilhadas (eslint, tsconfig, prettier) |
| `infra` | docker-compose local, scripts, notas de deploy (Railway + R2) |
| `docs` | ADRs, runbook, checklist de submissão às stores |

## Pré-requisitos

- Node.js ≥ 22 + pnpm ≥ 11 (`npm i -g pnpm`)
- Docker Desktop (Postgres, Redis, MinIO, Mailpit locais)
- Flutter SDK ≥ 3.35 (apenas para `apps/mobile`)

## Desenvolvimento local

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
cp apps/api/.env.example apps/api/.env
pnpm --filter @vcd/api prisma:migrate:dev
pnpm dev
```

- API: http://localhost:3001 (Swagger em `/docs`)
- Admin: http://localhost:3000
- Bull Board: http://localhost:3001/admin/queues
- MinIO console: http://localhost:9001 · Mailpit: http://localhost:8025

## Documentos-chave

- Plano de implementação e arquitetura: `docs/`
- Modelo de dados: `apps/api/prisma/schema.prisma`

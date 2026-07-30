# Plano de Implementação — App "Você conhece Deus?" (v1.0)

## Contexto

Construir do zero, da concepção ao lançamento nas stores (iOS + Android), uma rede social de espiritualidade multiconfessional. Core loop: "reflexão do momento" 1–3x/dia (IA gerada + curadoria humana obrigatória, texto + áudio TTS), em 5 trilhas espirituais × 2 idiomas (pt-BR + en). Em volta: comentários, mural de intenções, check-ins de bem-estar, caderno privado criptografado, cards compartilháveis, streak compassivo + widget, e assinatura freemium (R$ 19,90/mês, R$ 129/ano, trial 7d). Sem ads, nunca. Segundo produto: painel admin web (curadoria, moderação, LGPD, analytics) na mesma API. Fonte de verdade do produto: o brief fornecido pelo PH (jul/2026).

**Decisões fechadas com o usuário:**
- Mobile: **Flutter** (just_audio + audio_service para áudio background; home_widget para WidgetKit/Glance)
- Backend: **custom NestJS + PostgreSQL** (monolito modular; sem Supabase/Firebase)
- Billing: **RevenueCat + Stripe** (IAP iOS + Play Billing + web checkout com Pix)
- Time: **solo (PH + Claude Code)** — fases sequenciais com incrementos verificáveis
- Admin: **Next.js** consumindo a mesma API

**Decisões arquiteturais propostas (fechadas no planning):**
- **Realtime: SSE** (não WebSocket) — mural/comentários são escrita-REST + leitura-push; `EventSource` reconecta sozinho; fan-out multi-instância via Redis Pub/Sub; fallback polling 30s.
- **Filas: BullMQ + Redis** — integração 1ª classe com NestJS, Bull Board (UI de filas grátis), repeatable/delayed jobs, rate limiting para quotas de LLM/TTS. Redis também serve cache, rate limit e Pub/Sub do SSE.
- **Deploy: Railway** (API + admin + Postgres + Redis gerenciados, deploy por git push) + **Cloudflare R2** para áudio/imagens (S3-compatível, **egress zero** — áudio é o maior consumidor de banda). Backup diário `pg_dump` → R2. Upgrade path p/ Neon documentado.
- **Criptografia do caderno: envelope na camada de aplicação** — DEK AES-256-GCM por usuário, wrapped por master key que vive só no secret manager (nunca no banco). Banco guarda só ciphertext+iv+tag. Nenhum endpoint admin descriptografa; decrypt só com JWT do dono. Escolhido sobre E2E porque viabiliza os AI insights opt-in da v1.5 (com consentimento específico); trade-off documentado na política de privacidade.
- ORM: **Prisma**. Contrato entre apps: **OpenAPI gerado pela API** → client Dart (openapi-generator) + tipos TS (openapi-typescript). Sem código compartilhado Dart↔TS.
- TTS v1.0: **Google Cloud TTS** (Neural2/Chirp pt-BR, ~10x mais barato que ElevenLabs; ElevenLabs como upgrade por trilha depois). LLM de geração: mid-tier (ex. Claude Haiku).
- Moderação: **OpenAI Moderation API** síncrona em todo UGC; zona cinzenta → fila humana.

## Estrutura do monorepo

Novo repo em `C:\Users\Philipe\projetos\voceconhecedeus\` — pnpm workspaces + Turborepo (lado TS); Flutter no mesmo repo fora do grafo Turbo.

```
voceconhecedeus/
├── apps/
│   ├── mobile/          # Flutter — core/ (api gerada, auth, audio, push, storage, analytics)
│   │                    #   features/ (onboarding, reflection, comments, wall, checkins,
│   │                    #   journal, routine, streak, cards, social, paywall, settings)
│   │                    #   ios/ (ext. WidgetKit Swift) · android/ (Glance Kotlin) · l10n/ (pt-BR, en)
│   ├── api/             # NestJS monolito modular — modules/: auth, users, consents, tracks,
│   │                    #   content, pipeline, comments, wall, checkins, journal (com crypto/),
│   │                    #   social, streaks, notifications, realtime (SSE), moderation, billing,
│   │                    #   cards, analytics, admin, audit · database/ (Prisma) · queues/ (BullMQ)
│   └── admin/           # Next.js App Router — curation, calendar, prompts, moderation,
│                        #   users (+LGPD DSR), analytics, audit
├── packages/
│   ├── contracts/       # openapi.json + scripts de geração de clients
│   └── config/          # eslint/tsconfig/prettier compartilhados
├── infra/
│   ├── docker-compose.yml   # local: postgres:16, redis:7, minio, mailpit
│   ├── railway/ · scripts/  # backup pg_dump→R2, seed, gerar clients
├── docs/                # ADRs, runbook, checklist de submissão
└── .github/workflows/   # ci-api, ci-admin, ci-mobile (paths-filter), deploy Railway
```

Arquivos críticos que nascem primeiro:
- `apps/api/src/database/schema.prisma` — todo o modelo de dados; tudo deriva dele
- `apps/api/src/modules/pipeline/` — coração do produto (gerar→curar→TTS→publicar→push)
- `apps/api/src/modules/journal/crypto/envelope.service.ts` — único módulo com decrypt, auditável
- `apps/mobile/lib/core/audio/audio_handler.dart` — player background
- `infra/docker-compose.yml` — destrava todas as fases

## Modelo de dados (entidades-chave)

Convenções: PK uuid v7, timestamps em tudo, soft-delete onde há obrigação de moderação/retenção; exclusão LGPD = anonimização + purga.

- **Identidade/consentimento**: `users` (language, track_id, timezone, status, premium_until-cache), `auth_identities` (apple/google/email), `refresh_tokens` (rotação com detecção de reuso por família), `consent_purposes` + `consent_versions` (texto exato imutável pt/en) + `user_consents` (**append-only** — trilha de auditoria LGPD art. 8º), `data_subject_requests` (acesso/exclusão/portabilidade).
- **Conteúdo/pipeline**: `tracks` (5, com voz TTS por idioma), `time_slots` (morning/midday/night), `reflections` (master: trilha × slot × data), `reflection_variants` (por idioma; 10 por geração; `citation_source` + `citation_verified` + metadados de IA + `curation_status`), `audio_assets` (R2), `publication_slots` (grade concreta dia × slot × trilha × idioma — o que o cron varre), `seasonal_events` (overrides com prioridade), `prompts` (banco versionado, editável no admin — iterar prompt sem deploy).
- **State machine de curadoria** (por variante): `generated → in_review → (needs_changes ⇄ in_review | rejected) → approved → audio_pending → audio_ready → scheduled → published → archived`. **Guard duro**: `approved` exige `citation_verified=true` quando há citação (Apple 1.1.5). Transições só via service; cada uma grava no audit_log.
- **Social/engajamento**: `comments`, `intentions` (+ `intention_supports` PK composta, idempotente; mural expira em 30d), `checkins` (unique user×date×type; **gravável só com consentimento `health_checkins` ativo — guard no service, não só na UI**), `journal_entries` (só ciphertext/iv/tag/dek_version — zero colunas de texto plano) + `user_encryption_keys`, `follows`, `friendships`, `blocks` (Apple 1.2), `streaks` (grace semanal — streak compassivo), `notification_schedules` (horário local + timezone), `devices` (push tokens).
- **Billing**: `subscriptions`, `entitlements` (**derivados exclusivamente de webhooks RevenueCat** — RC é fonte de verdade, tabela é cache), `billing_events` (append-only, idempotente por event_id).
- **Moderação/staff/auditoria**: `moderation_flags` (auto_filter | user_report, `sla_deadline = created_at+24h`), `moderation_actions`, `staff_users` (**tabela separada de users**, TOTP obrigatório, roles admin/curator/moderator/analyst), `audit_log` (**append-only via GRANT** — interceptor global no AdminModule loga toda leitura staff de dado social; journal nem existe em endpoint admin), `analytics_events` (particionada por mês) + agregações diárias materializadas para o dashboard.

## API (grupos, prefixo /v1)

Auth: JWT access 15min + refresh opaco com rotação/detecção de reuso. Login: **Sign in with Apple (obrigatório iOS), Google, email**. Staff: sessão separada `/admin/auth` com TOTP e audiência JWT distinta.

`auth` · `me` (inclui **DELETE /me** — Apple 5.1.1(v) — e `GET /me/export` portabilidade) · `consents` · `reflections` (`/today` cacheada Redis 60s; histórico = premium gate) · `comments` (POST passa por Moderation sync) · `wall` · `checkins` · `journal` · `social` (com block) · `streaks` · `notifications` · `billing` (checkout-session Stripe/Pix + webhooks `/rc` e `/stripe`) · `cards` · `realtime/stream` (SSE) · `analytics/events` · `admin/*` (guards por role + audit interceptor).

Swagger → `packages/contracts/openapi.json` → clients regenerados em CI.

## Pipeline de conteúdo (filas BullMQ: generation, tts, publishing, push)

1. **Cron 03:00 UTC**: garante `publication_slots` para D+3..D+7.
2. **generation.job**: resolve prompt (seasonal override > padrão trilha/slot/idioma) → LLM gera 10 variantes → pré-triagem (Moderation + heurísticas) → top variantes `in_review`.
3. **Curadoria humana** (admin): edita/aprova/rejeita; botão "verificar citação" obrigatório antes de aprovar. Irmãs → archived (reaproveitáveis).
4. **tts.job** (rate-limited): Google TTS → m4a → R2; retry ×3 → `audio_failed` + alerta. **TTS só após aprovação** (nunca nas 10 variantes — controle de custo).
5. **publishing.job** (cron 5min): publica no horário, invalida cache `/today`, emite SSE.
6. **push.job**: fan-out por trilha/idioma/rotina respeitando timezone, lotes de 500; deep link direto na reflexão.

**Buffer de segurança**: alerta no admin + email se slot de D+1 não estiver `scheduled`; fallback automático de reflexões "evergreen" aprovadas por trilha/idioma — nunca amanhecer sem reflexão.

## Fases (total ~22–27 semanas, solo + Claude Code)

**Dia 1 (paralelo, bloqueantes longos):** conta Apple Developer + D-U-N-S (2–4 sem); conta Google Play (⚠️ contas novas exigem teste fechado 12 testadores/14 dias — começa na Fase 3); reservar bundle ID/nome/domínio/email de suporte; solicitar **StoreKit External Purchase Link Entitlement (Brasil/CADE)** imediatamente; rascunhar questionário etário 16+, health declaration (Play), privacy labels, política de privacidade pt/en.

| # | Fase | Duração | Critério de aceite |
|---|---|---|---|
| 0 | Protótipo + design (design system Flutter, fluxos-chave, tom por trilha, 20 reflexões-semente/trilha, prompts iniciais) | 1–2 sem | Protótipo navegável; fluxo onboarding→1ª reflexão < 2 min |
| 1 | Fundação: monorepo, Docker Compose, CI, auth completo, **schema Prisma inteiro de uma vez**, consents, OpenAPI→clients, deploy Railway staging+prod, Sentry | 2–3 sem | e2e auth verde; registro→consentimento→trilha via API; deploy automático |
| 2 | Pipeline + admin curadoria: BullMQ+Bull Board, generation/tts/publishing, R2, admin (login TOTP, fila de curadoria, verificação de citação com guard, calendário, prompts), audit interceptor | 3 sem | Ciclo completo sem código: cron gera → curador aprova → TTS → publica no horário → `GET /reflections/today` |
| 3 | App: onboarding (consentimentos destacados por finalidade), home, player background, label de IA, deep link. **Subir TestFlight + Play fechado já** | 3 sem | Install→reflexão tocando < 2 min; áudio sobrevive a lock; push abre reflexão certa |
| 4 | Check-ins + caderno + rotina: guards de consentimento, envelope encryption, notification_schedules por timezone | 2 sem | **Teste provando que dump do DB não contém plaintext do diário**; check-in bloqueado sem consentimento na API |
| 5 | Social + moderação: comentários, mural, perfis, follow/friends, block, report, Moderation sync + fila humana SLA 24h, SSE | 3 sem | Post tóxico pt-BR bloqueado sync; grey-zone na fila com deadline; block esconde conteúdo; audit_log completo |
| 6 | Cards + streak + widget: render server-side por trilha, streak com grace semanal, WidgetKit + Glance (escopo mínimo: texto do dia + streak) | 2 sem | Card ok no WhatsApp; streak não quebra com 1 dia perdido/semana; widget atualiza nos 2 OS (device físico) |
| 7 | Billing: RevenueCat SDK, produtos + trial, webhooks→entitlements, Stripe/Pix anual web, external link iOS BR, user-choice Android, gates premium (reflexão do dia continua grátis) | 2–3 sem | Trial→conversão sandbox nos 3 canais; Pix web reflete no app < 1 min; restore funciona |
| 8 | Compliance final: exclusão in-app ponta a ponta, export LGPD, revisão jurídica de consentimentos, privacy labels, rate limiting, checklist OWASP, restore de backup ensaiado | 1–2 sem | DSR de exclusão/portabilidade self-service; checklists Apple 1.2/1.1.5/5.1.1(v) + Google GenAI/Data Safety verdes |
| 9 | Beta fechado (50–100 users, mix de trilhas) → submissão com notas de revisão detalhadas (explicar curadoria humana, moderação, link CADE) | 3–4 sem | Crash-free > 99,5%; D1 beta ≥ 35%; zero slots vazios por 21 dias; aprovação nas 2 stores |

## Riscos principais

1. **Rejeição Apple (1.1.5/4.3, religião+IA)** → guard duro de citação demonstrável, notas de revisão antecipando perguntas, label de IA visível.
2. **Entitlement CADE atrasar** → solicitar semana 1; app 100% funcional só com IAP; checkout web é aditivo, nunca bloqueante.
3. **Moderação pt-BR com nuance religiosa** → thresholds conservadores, lista própria de termos, revisar 100% do UGC no beta para calibrar.
4. **Amanhecer sem reflexão** → buffer D+3, alerta D+1, fallback evergreen.
5. **Vazamento de dado sensível (LGPD art. 11)** → envelope encryption, guards de consentimento no service, audit append-only, check-ins como escalas numéricas.
6. **Widgets consumirem tempo desproporcional** → escopo mínimo, fase própria, cortável do launch.
7. **Divergência de entitlement entre canais** → RevenueCat fonte única, job de reconciliação diário, sandbox dos 3 canais.
8. **Custo TTS/LLM escalar** → TTS só pós-aprovação, Google TTS, rate limiter, dashboard de custo, reuso de variantes arquivadas.

## Verificação (contínua e final)

- Cada fase fecha com seu critério de aceite executado de verdade (não checklist de papel): e2e da API no CI (supertest + testcontainers Postgres/Redis), ciclo do pipeline rodado ponta a ponta no staging, app em device físico via TestFlight/Play internal a partir da Fase 3.
- Testes de segurança dedicados: dump do banco sem plaintext do diário (Fase 4); tentativa de aprovar variante com citação não verificada deve falhar (Fase 2); JWT de usuário rejeitado em rota admin (Fase 1).
- Billing: sandbox StoreKit + Play Billing test + Stripe test mode com Pix simulado, verificando entitlement via webhook nos 3 canais (Fase 7).
- Métricas do beta contra os alvos do MVP: D1 ≥ 40%, D7 ≥ 25%, conversão 2–5%, time-to-first-reflection < 2 min (instrumentado desde a Fase 3 via `analytics_events`).

# Build context: raiz do monorepo (railway: rootDirectory = /, dockerfilePath = apps/api/Dockerfile)
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @vcd/api...
RUN pnpm --filter @vcd/api prisma:generate && pnpm --filter @vcd/api build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo ./
WORKDIR /repo/apps/api
EXPOSE 3001
# Migrations rodam no boot — deploy é sempre migrate + start
CMD ["sh", "-c", "pnpm prisma:migrate:deploy && node dist/main.js"]

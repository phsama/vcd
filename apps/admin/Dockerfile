# Build context: raiz do monorepo (railway: rootDirectory = /, dockerfilePath = apps/admin/Dockerfile)
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin
RUN pnpm install --frozen-lockfile --filter @vcd/admin...
# API_URL entra no build porque o rewrite do next.config é resolvido em build-time;
# o Railway injeta a variável do serviço como build arg quando declarada aqui.
ARG API_URL
ENV API_URL=$API_URL
ENV NEXT_STANDALONE=1
RUN pnpm --filter @vcd/admin build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]

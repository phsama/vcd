# @vcd/contracts

O `openapi.json` deste pacote é **gerado** pela API NestJS (`pnpm --filter @vcd/api contracts:generate`). Não editar à mão.

Consumidores:
- `apps/admin` — tipos TS via `openapi-typescript` (`pnpm generate:admin-types`)
- `apps/mobile` — client Dart via `openapi-generator` (script em `infra/scripts`)

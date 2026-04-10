# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Includes a SplitEasy mobile app (Expo) and shared backend infrastructure.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### SplitEasy (`artifacts/spliteasy`)
- **Type**: Expo mobile app
- **Description**: Bill-splitting app for groups — create/join groups, track expenses, view balances, settle up
- **Storage**: AsyncStorage (no backend, fully local)
- **Navigation**: Expo Router with stack-based routing
- **Key screens**:
  - `app/index.tsx` — Home screen with recent groups
  - `app/create-group.tsx` — Create a new group
  - `app/join-group.tsx` — Join a group by 6-char code
  - `app/group/[code].tsx` — Group dashboard with Expenses, Balances, Settle Up tabs
- **Key utilities**:
  - `utils/storage.ts` — AsyncStorage read/write helpers
  - `utils/balance.ts` — Balance calculation + debt simplification
  - `utils/helpers.ts` — Format currency, dates, generate codes
- **Theme**: `constants/theme.ts` — Colors, spacing, fonts

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

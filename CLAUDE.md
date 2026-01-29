# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Astro integration providing disk-backed caching utilities (`@wyattjoh/astro-cache`). Exports an Astro integration (default export) that configures env vars, plus `swr`, `memo`, and `clearAllCaches` cache utilities via the `./cache.js` entrypoint.

## Commands

- **Build**: `bun run build` — runs `tsc` (declarations only) then `bun build` with externalized packages
- **Test**: `bun run test` — runs Bun's built-in test runner
- **Typecheck**: `bun run typecheck` — runs `tsc --noEmit`
- **Lint**: `bun run lint` — runs Biome (`biome check .`)
- **Lint fix**: `bun run lint:fix` — runs Biome with auto-fix
- **Format**: `bun run format` — runs Biome formatter
- **Release**: `bun run release` — runs semantic-release (CI only, uses `.releaserc.cjs`)

Pre-commit hook (via Husky) runs lint, test, and typecheck automatically.

## Architecture

Source files in `src/`:

- **`index.ts`** — The Astro integration entry point. Exports `astroCache()` which hooks into `astro:config:setup` to register `CACHE_DIR`, `MIN_TIME_TO_STALE`, and `MAX_TIME_TO_LIVE` env vars via Astro's `envField` helpers.
- **`cache.ts`** — Core cache utilities. `swr()` wraps async functions with stale-while-revalidate caching backed by flat-cache for disk persistence. `memo()` provides simple memoization with optional disk persistence. `clearAllCaches()` clears all registered caches.
- **`cache.test.ts`** — Test suite for all cache utilities using Bun's test runner. Mocks `astro:env/server` to provide env vars in test context.

## Key Design Decisions

- The integration uses `envField` helpers from `astro/config` with `access: "secret"` to keep cache config server-only.
- `cache.ts` imports `CACHE_DIR`, `MIN_TIME_TO_STALE`, and `MAX_TIME_TO_LIVE` from the `astro:env/server` virtual module.
- `--packages external` in the bun build step externalizes `astro:env/server`, `flat-cache`, and `stale-while-revalidate-cache`.
- Separate entrypoint `./cache.js` keeps integration config and cache utilities independently importable.

## Code Style

- Biome handles both linting and formatting (spaces, 2-width indent, double quotes, semicolons, ES5 trailing commas, LF line endings).
- `useImportType` is enforced — use `import type` for type-only imports.

## Commit Messages

This project uses `semantic-release` with the Angular preset (`.releaserc.cjs`), so commit message types directly control versioning:

| Type / Pattern | Release |
|---|---|
| `feat:` | **minor** |
| `fix:` | **patch** |
| `refactor:` | **patch** |
| `style:` | **patch** |
| `types:` | **patch** |
| `docs(README):` | **patch** |
| `revert:` (reverts) | **patch** |
| `BREAKING CHANGE` footer or `!` suffix (e.g. `feat!:`) | **major** |
| `chore`, `ci`, `test`, `build`, `perf`, `docs` (without `README` scope) | no release |

## Build Output

- `dist/` contains TypeScript declarations (from `tsc`) and bundled JS (from `bun build`)
- Package exports: `.` → `dist/index.js`, `./cache.js` → `dist/cache.js`

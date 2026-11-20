# DEV-00: Project foundation

**Status:** Done (2026-11-20, commit `c188aed` on `feat/v0-engine`)

**Goal:** A working TypeScript project that builds, lints, tests and runs CI, with the analysis engine fenced off from UI code.

**Objectives:**
- Vite + React + TypeScript (strict) project with npm scripts `dev`, `build`, `typecheck`, `lint`, `test`, `format`.
- Vitest for unit and property tests.
- ESLint rule that stops `src/engine/**` from importing UI code or using DOM and network globals.
- GitHub Actions CI with least privilege and actions pinned to commit hashes.
- Git repository with the docs baseline on `main` and work on `feat/v0-engine`.

**Scope:** Backend (tooling and project setup).

**Acceptance Criteria:**
1. `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` all exit 0.
2. A file in `src/engine/` that imports `react` fails `npm run lint` with `no-restricted-imports`.
3. `.github/workflows/ci.yml` runs `npm ci`, typecheck, lint and test on push and pull request, with `permissions: contents: read`.
4. `.cache/`, `node_modules/`, `dist/` and `.superpowers/` are git-ignored, and line endings are LF (`.gitattributes`).

**Details:**
- Plan: `docs/superpowers/plans/2026-11-20-v0-engine.md`, Task 1.
- Spec: `docs/SPEC.md` sections 14 (stack), 16 (CI on a $0 budget), 19.1 (engine boundary, pinned actions).
- Versions installed: React 19.3, TypeScript 6.0, Vite 8.3, Vitest 5.1, ESLint 10.15, Zod 4.6, fast-check 4.10, Playwright 1.65. Node v26.12.1, npm 12.0.2.

**Skills/Plugins:** superpowers:executing-plans, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- No git remote yet; the user supplies the repo link later. Do not push.
- Tailwind and shadcn/ui are not installed here; they arrive with the UI tickets.

**Definition of Done:**
- All acceptance criteria verified by running the commands.
- Committed on `feat/v0-engine` and recorded in the plan ledger.

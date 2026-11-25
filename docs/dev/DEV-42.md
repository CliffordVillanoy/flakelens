# DEV-42: Installable offline app (PWA)

**Status:** To do

**Goal:** FlakeLens installs like an app and works offline after the first load, without ever serving mixed old and new files.

**Objectives:**
- Add the manifest and a service worker.
- Add a safe update flow.

**Scope:** Frontend (build, service worker).

**Acceptance Criteria:**
1. `vite-plugin-pwa` (Workbox, generateSW) precaches the built files only: no runtime caching of other origins and no caching of anything outside the app. `scope`, `start_url` and the base path are `/flakelens/`. Icons come from the logo files (PNG 192 and 512 plus a maskable one); say how they were made.
2. Update flow: the new worker waits; a toast says an update is ready with a Reload button (interim keys `pwa.update`, `pwa.updateAction`, `pwa.offlineReady`). No `skipWaiting` mid-session, so a tab never mixes old and new files. Old caches are deleted on activate.
3. CSP adds only what is needed (`manifest-src 'self'`); `worker-src 'self'` is already there. The privacy e2e still passes: every request, including the worker's, stays on the app origin.
4. e2e: manifest valid, worker registered, then the network goes offline (`context.setOffline`) and the app loads, the sample works, importing a file works. An update simulation: serve build A, load, serve build B, the toast appears, Reload gives B only.
5. Check that `sw.js` and the manifest are not cached for long by the host and report the response headers; if Pages caches them, hand the finding to the Dev Ops chat.
6. Report the plugin's version and licence; bundle size change reported.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-37 to DEV-41.
- Spec: sections 7 (PWA), 15 (offline behaviour). Plan Review Focus 5.
- Pages deploy settings are the Dev Ops chat's; this ticket changes the build output only.
- Security chat re-review: yes (cache scope, update flow, hijack resistance).
- Needs a board for the update toast and install prompt.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, security-review.

**Limitations/Restrictions:**
- Version control (branches, pull requests, merges, tags, version numbers) and every CI/CD change belong to the Project Dev Ops chat. Work on the branch the Dev Ops chat names; commit only task files; no push, no merge.
- Visible text only from `src/ui/copy.ts`; list every new interim copy key in the report (the UI/UX chat confirms them later).
- No new network calls, accounts or secrets. A new dependency only as named in the ticket; report its name, version and licence.
- Every regex or loop over untrusted text is bounded or linear and has a timing test (plan, Global constraints).
- Plain commit messages, no Claude attribution.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npx vitest run`, `npm run typecheck`, `npm run lint` and `npm run build` green; `npm run e2e` green when the app changes.
- Committed on the branch named by the Dev Ops chat; development report sent to the planning chat.

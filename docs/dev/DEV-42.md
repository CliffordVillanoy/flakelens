# DEV-42: Installable offline app (PWA)

**Status:** To do

**Goal:** FlakeLens installs like an app and works offline after the first load, without ever serving mixed old and new files.

**Objectives:**
- Add the manifest and a service worker.
- Add a safe update flow.

**Scope:** Frontend (build, service worker).

**Acceptance Criteria:**
1. `vite-plugin-pwa` (Workbox, generateSW) precaches the built files only: no runtime caching of other origins and no caching of anything outside the app. `scope`, `start_url` and the base path are `/flakelens/`. Icons come from the logo files (PNG 192 and 512 plus a maskable one); say how they were made.
2. Update flow: the new worker waits; a toast says `pwa.update` with the primary button `pwa.updateAction` (Reload). The toast has no timer and is never pushed out by other toasts. When storage is off and data is loaded, the toast says `pwa.update.storageOff` instead and adds the secondary button `pwa.updateAction.anyway` (Reload anyway); for that the update toast reads the storage state from the store at the moment the worker reports the update. No `skipWaiting` mid-session, so a tab never mixes old and new files. Old caches are deleted on activate.
3. Offline-ready toast `pwa.offlineReady` closes itself after 8 seconds and shows once per install.
4. Install is a row in Settings under About (board 11, needs the DEV-41 settings page): `pwa.install.title`, `pwa.install.hint` and the button `pwa.install.action` when the browser offers installation (capture the `beforeinstallprompt` event; no pop-up anywhere); after install the row shows `pwa.installed.title`, `pwa.installed.hint` and the pill `pwa.installed.badge` (use the `appinstalled` event and the standalone display mode); on Safari on iPhone or iPad it shows the how-to text `pwa.install.ios.title` and `pwa.install.ios.hint` with no button; the whole row is hidden when the browser cannot install.
5. Toast rules for these toasts: at most 2 at a time, bottom left on desktop and full width on phones, never take focus, Esc closes the focused toast, 150 ms fade that is off with reduced motion. Tests for each variant and for the stacking rule.
6. CSP adds only what is needed (`manifest-src 'self'`); `worker-src 'self'` is already there. The privacy e2e still passes: every request, including the worker's, stays on the app origin.
7. e2e: manifest valid, worker registered, then the network goes offline (`context.setOffline`) and the app loads, the sample works, importing a file works. An update simulation: serve build A, load, serve build B, the toast appears, Reload gives B only.
8. Check that `sw.js` and the manifest are not cached for long by the host and report the response headers; if Pages caches them, hand the finding to the Dev Ops chat.
9. Report the plugin's version and licence; bundle size change reported.
10. Second sub-label sweep (`docs/ux/12-simplification-pass.md` section 7b, canvas v79): the install rows have no hints (the explanation is a tooltip); the Safari row is one line, "On iPhone or iPad: Share, then Add to Home Screen" (replace `pwa.install.ios.title` and `pwa.install.ios.hint` by one key). Retire `pwa.install.hint` and `pwa.installed.hint`.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-37 to DEV-41.
- Spec: sections 7 (PWA), 15 (offline behaviour). Plan Review Focus 5.
- Pages deploy settings are the Dev Ops chat's; this ticket changes the build output only.
- Security chat re-review: yes (cache scope, update flow, hijack resistance).
- **Board ready (2026-11-25):** board 11, `docs/ux/wireframes/Banners.dc.html` and `BannersLight.dc.html`; design rules in `DESIGN.md` "System banners and toasts"; confirmed copy in `docs/ux/04-ux-copy.md` section 13 (`pwa.*` keys). Use that wording and those keys.

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

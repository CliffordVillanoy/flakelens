# DEV-48: Start: "Try sample data" is a link under the drop area

**Status:** Done locally (2026-11-28, commit `7a4c0cf` on `feat/dev-48-sample-link` from origin/main 14a609c, worktree `flakelens-dev48`; dev chat reports 1291 unit + 74 e2e, typecheck, lint, build clean, axe Start both themes). Not pushed or merged. It stays a `<button>` styled as a link (it loads the sample first, which can fail with Try again, then navigates); Enter and Space work; text-sm, link colour, underline, offset 2px, min-h-6. No new copy.

**Goal:** Start has one clear action: Browse files is the only button, and the sample is a quiet link.

**Objectives:**
- Turn "Try sample data" from a button into a text link under the drop box.

**Scope:** Frontend (small).

**Acceptance Criteria:**
1. On the Start screen "Try sample data" (key `start.sample`, unchanged, no new copy) is no longer a button beside Browse files. It is a plain text link centered under the drop box: 14px, link colour (`--link`), underline offset 2px. Browse files stays the only button.
2. Behaviour unchanged: it opens the same read-only sample, every time (the existing "navigates every time" e2e keeps passing).
3. Accessibility: a real link or button element, reachable by Tab, visible focus ring, activates with Enter (and Space if it is a button). Axe clean in both themes; non-text and text contrast of the link colour on both backgrounds.
4. Tests: keep the existing Start test that clicks it; update its selector if it looks for a button role (a link role if it is an anchor; if it stays a `<button>` styled as a link, keep the role and say so). Check the e2e specs and other tests that find the sample control. The Start word budget (40) is unaffected (a control name).
5. Phone width: the link stays centered and tappable (target at least 24px high, with padding).

**Details:**
- Owner decision via UI/UX, 2026-11-28. Design: board 1 (Start, dark and light), `DESIGN.md` "Start: the sample is a link (2026-11-28)".
- Needs first: nothing. Do it after DEV-43 so the two do not collide on the Start screen (DEV-43 adds a JUnit step to the format help text there).

**Skills/Plugins:** superpowers:test-driven-development, superpowers:verification-before-completion, frontend-design / impeccable (match DESIGN.md).

**Limitations/Restrictions:**
- Version control (branches, pull requests, merges, tags, version numbers) and every CI/CD change belong to the Project Dev Ops chat. Work on the branch the Dev Ops chat names; commit only task files; no push, no merge.
- Visible text only from `src/ui/copy.ts`; no new keys expected.
- No new network calls, accounts, secrets or dependencies.
- Plain commit messages, no Claude attribution.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run build` and `npm run e2e` green.
- Committed on the branch named by the Dev Ops chat; development report sent to the planning chat.

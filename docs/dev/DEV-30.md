# DEV-30: Community files and feedback path

**Status:** To do

**Goal:** The public repository has the community files the launch checklist (spec 18) and the Settings About links expect.

**Objectives:**
- Add SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md and issue templates.
- Name a feedback path in the README.

**Scope:** Documentation (repository files).

**Acceptance Criteria:**
1. `SECURITY.md` explains how to report a vulnerability privately (GitHub's "Report a vulnerability" under the Security tab; the owner switches private reporting on in Settings > Code security, say so in the report), what is in scope (a client-only app: no backend, no accounts), what is not, which versions are supported (the latest on GitHub Pages), and the response expectation in plain words. It lists the accepted risks from `docs/security/review-2026-11-22.md` section 7 in two or three lines (non-cryptographic IDs, meta-tag CSP and shared `github.io` origin) without publishing the full report.
2. `CONTRIBUTING.md` is short: how to run the app and tests (`npm install`, `npm run dev`, `npm test`, `npm run e2e`), what a good bug report holds, the rules (no secrets or real test reports in issues, plain commit messages, pull requests only because `main` is protected), and where the plan and tickets live (`docs/dev/README.md`).
3. `CODE_OF_CONDUCT.md` uses the Contributor Covenant 2.1 with its required attribution. The enforcement contact is GitHub's private reporting or the maintainer through the repository; do not use the owner's email address. Ask the owner in the report whether they want another contact.
4. Issue templates in `.github/ISSUE_TEMPLATE/`: a bug report (version or commit, browser, steps, a clear warning not to attach real reports or secrets and how to anonymize a report) and a feature request; `config.yml` turns off blank issues and links the security policy.
5. The README gains one short "Feedback" paragraph linking the issue templates, the security policy and the contributing guide; nothing else in the README changes.
6. All four files render (headings, links resolve); the links `Source code`, `Report an issue` and `Security policy` that the Settings About block uses work: the dev chat lists the exact URLs for DEV-33.
7. No code changes.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: nothing.
- Source: spec section 18 (launch readiness checklist: issue templates, CONTRIBUTING, security policy, code of conduct, a feedback path) and board 10 (About links `settings.about.links`: Source code, Report an issue, Security policy, MIT licence).
- Docs-only except the `.github/ISSUE_TEMPLATE` files, which the CI path filters do not skip; Dev Ops handles that.

**Skills/Plugins:** superpowers:verification-before-completion.

**Limitations/Restrictions:**
- Version control (branches, pull requests, merges, tags, version numbers) and every CI/CD change belong to the Project Dev Ops chat. Work on the branch the Dev Ops chat names; commit only task files; no push, no merge.
- Visible text only from `src/ui/copy.ts`; list every new interim copy key in the report (the UI/UX chat confirms them later).
- No new network calls, accounts or secrets. A new dependency only as named in the ticket; report its name, version and licence.
- Every regex or loop over untrusted text is bounded or linear and has a timing test (plan, Global constraints).
- Plain commit messages, no Claude attribution.

**Definition of Done:**
- Files written, links checked, nothing else changed.
- Committed on the branch named by the Dev Ops chat; development report sent to the planning chat.

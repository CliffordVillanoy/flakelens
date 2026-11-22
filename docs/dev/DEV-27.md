# DEV-27: README accuracy fixes on pull request #2

**Status:** To do

**Goal:** The rewritten README (PR #2, branch `CliffordVillanoy-patch-1`) says only what the v0 app really does, so nobody is surprised when they try their own reports.

**Objectives:**
- Fix three accuracy problems found in the PR review, on the PR's own branch, then let the owner merge the PR.

**Scope:** Fix or refinement (documentation only).

**Acceptance Criteria:**
1. **Commit claim.** Everywhere the README says a test is "confirmed flaky" because it passed and failed on the same commit across runs (the Features list, "How It Works", "Why Same-Commit Evidence Matters", the Detection Engine Evaluation text), it also says what v0 really does: each imported file counts as its own commit, because commit labels are not in the UI yet (the app shows "No commit info found"). So for the user's own reports, Confirmed Flaky currently comes from a pass after a retry inside one run. The same-commit evidence across runs shows in the built-in sample data, which has commits assigned. Required wording, or very close to it, once in a clearly visible place (a short "v0 limitation" note near the top, under the Development Status box): "v0 treats each imported file as its own commit. Commit labels and reading commits from report metadata are not in the app yet, so same-commit evidence across runs currently shows in the sample data. For your own reports, Flaky means a test passed on a retry within one run." Add "Commit labels for imported files" to the planned enhancements list.
2. **Deploy sentence.** Remove the italic sentence that says the app is published "once Pages is enabled and its deployment workflow completes successfully". The app is live at https://cliffordvillanoy.github.io/flakelens/ (workflow `pages`, build and deploy jobs).
3. **Status name.** Replace "Suspected Instability" and "unproven suspects"/"suspected" wording with the app's name **Unproven** (Flaky, Unproven, Failing, Stable, Not enough data), including the one-line description, which should read "separating confirmed flakiness from unproven results" or similar.
4. Nothing else in the README changes, except what is needed for those three points. Do not shorten or restyle the rest; the owner may trim later.
5. The README renders: check the headings, tables and the new note in the PR's Files changed view or a local Markdown preview, and every relative link (`docs/SPEC.md`, `docs/dev/README.md`, `docs/eval/lab-detection.md`, `LICENSE`) still resolves.
6. Commit message plain, no Claude attribution. The commit author is the owner's noreply address (check `git log --format=%ae -1`).

**Details:**
- Review findings: PR #2 changes only `README.md` (51 to about 370 lines), has no checks (the CI path filter skips README-only changes, which is intended), and everything else in it was verified accurate against `e2e/privacy.spec.ts`, the lab report and the scripts. Evidence for the commit point: `src/ui/copy.ts` key `import.noCommit` ("No commit info found in {file}. Evidence across commits will be limited."), no commit-label input in `src/ui`, and DEV-12 and DEV-13 reports.
- Work on the PR's branch: `git fetch origin && git switch CliffordVillanoy-patch-1` (create a local tracking branch). Do not touch `main`.
- Optional, only if trivial and in the same commit: none. Screenshots, trimming and Node version are left for the owner.

**Skills/Plugins:** superpowers:verification-before-completion.

**Limitations/Restrictions:**
- README text only; no code, no workflows, no other docs.
- Pushing to the PR branch needs the owner's approval, asked directly in the dev chat as before. Do not merge the PR; the owner merges it on GitHub.
- A README-only push starts no CI and no deploy (path filter).

**Definition of Done:**
- The three points fixed in one commit on `CliffordVillanoy-patch-1`, pushed with the owner's approval, and the PR shows the new commit.
- Development report sent to the planning chat with the diff summary (lines changed) and the exact new "v0 limitation" note.

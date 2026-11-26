# Security Policy

FlakeLens runs entirely in your browser. There is no backend, no account and no upload, so most security questions come down to what the page does with the files you give it.

## Reporting a vulnerability

Please report it privately. Do not open a public issue.

1. Open the [Security tab](https://github.com/CliffordVillanoy/flakelens/security) of this repository.
2. Choose **Report a vulnerability**, or go straight to the [private report form](https://github.com/CliffordVillanoy/flakelens/security/advisories/new).
3. Describe what you found, the steps to reproduce it, and what an attacker could do with it.

Do not include real test reports, secrets or personal data. If a report is needed to show the problem, shrink it to the smallest file that still triggers it and replace names, paths and commit SHAs.

## What I will do

This is a one-person project, so these are plain intentions, not a service level.

- I aim to reply within 7 days to say the report arrived and whether I can reproduce it.
- I aim to fix confirmed problems that put users at real risk quickly, and to tell you when the fix is live.
- I will credit you in the fix notes if you want that. There is no bounty.

## Supported versions

Only the latest version on GitHub Pages is supported: <https://cliffordvillanoy.github.io/flakelens/>. Older builds are not kept.

## In scope

- Cross-site scripting or any way a crafted report (test names, messages, file names) can run code or inject markup.
- Anything that sends data out of the browser. The app is meant to make no network requests beyond its own files.
- Stored data problems: reading, changing or wiping IndexedDB or settings from another page, or a stored row that crashes the app.
- Exports (Markdown, CSV, JSON) that can carry an executable or clickable payload from a hostile report.
- Weaknesses in the build or the GitHub Actions workflows in this repository.

## Out of scope

- Findings that need a server, an account or a login. FlakeLens has none.
- Attacks that need the person to already run malicious code on their own machine or in their own browser profile.
- Denial of service from a very large file that the person chooses to open on their own machine, beyond the limits the app already states.
- Missing HTTP security headers that GitHub Pages does not let a project set (see the accepted risks below).
- Reports from automated scanners without a working example.

## Known and accepted risks

These were found in a security review and are accepted for now. They are listed so you do not need to report them again.

- **Non-cryptographic IDs.** Run, test and import IDs use a fast 53-bit hash, not SHA-256. A deliberately crafted file could make two runs look the same. Only the person importing a file can do this to their own data. It will be revisited before any sync or sharing feature.
- **Content Security Policy in a meta tag.** GitHub Pages cannot send headers, so the policy is a `<meta>` tag and cannot include `frame-ancestors`. The page could be framed by another site. No account or server state is at stake. A host that supports headers would close this.
- **Shared `github.io` origin.** Browser storage is shared by every page under the same `github.io` user address. Other scripted pages published there could read or clear FlakeLens data.

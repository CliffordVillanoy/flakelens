# FlakeLens UX 09: Squint Test and 5-Second Self-Test

Run 2026-11-20 in the UI/UX chat. This was the first review of rendered boards rather than source.

## Method

- **Rendering:** the canvas needs a claude.ai sign-in, and Claude in Chrome was not connected. So the boards were rendered locally with `docs/ux/wireframes/_preview.html`, a small preview that expands the board templates.
- **Squint:** a 6px CSS blur (`?squint=1`) at 1280 × 900, in both themes, on Start, Tests and Test detail.
- **The question:** what draws the eye first, and is it the thing the user came for?
- **To run it again:** use the launch config `wireframe-preview`, then open `http://localhost:8765/_preview.html?board=Tests.dc.html&squint=1`.

## Findings and fixes

| Board | Draws the eye first (before) | Intended focus | Fix | After |
|---|---|---|---|---|
| Tests (dark and light) | The selected **"All 211" filter tile**, a solid blue block, top left | The ranked list and its status column | The selected tile keeps its 2px accent border but loses the blue fill. Updated on Tests and the State matrix | The status badge column (amber, purple, red) and the run strips lead. The green "Add your files" button is second |
| Start | The **green privacy line** and the help box, which was as heavy as the drop zone | The drop zone | The drop zone gets an accent dashed border and accent icon. The help is a plain disclosure, no box | The drop zone is the clear focal block |
| Test detail | The selected list row and the red diff lines. The **"4 of 9 commits" claim** was body-sized | The status and its evidence | The claim line goes up to 17px (the title role on the type ramp) | The claim reads as the panel's lead after the title |

**No change needed:**
- In Tests, the group header bands separate Flaky, Suspect and Failing at a glance.
- In Test detail, the run history row holds as the panel's main visual.
- The hollow failed squares remain visible as outlines when blurred.

## 5-second self-test

Each board was shown for 5 seconds, then the question was "What is this for, and what would you do?"

- **Start:** "A tool to find flaky tests. Drop reports or try a sample." Pass.
- **Tests:** "A list of tests ranked by problem type, with the flaky ones on top." Pass. The top Flaky row is not singled out beyond its group and rank 1, which is acceptable.
- **Test detail:** "Why this one test is flaky: its runs and the latest failure." Pass after the claim-size fix.

This is a self-test by the designer. It is a first pass only; the pre-launch 5-second test with real people still stands (`05-ux-methods-plan.md` B).

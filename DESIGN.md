# Groundwork: design doc

**Status:** live at https://sherol.github.io/groundwork · **Repo:** `sherol/groundwork` (`main` publishes via GitHub Pages) · **Updated:** Nov 1, 2026

## Purpose
A self-guided, body-based program for steadying the nervous system after trauma, following the order of Peter Levine's twelve-phase healing trauma program. It's a learning and practice companion to use alongside a therapist, not therapy. Exercises stay with present-moment sensation and never ask the user to revisit a traumatic memory.

## Who it's for
- **The client:** works through one phase a week at their own pace, on phone or desktop.
- **Their therapist:** receives a one-page progress report from the client.

## Program structure
**Introduction:** what trauma is, what causes it, symptoms (hyperarousal, constriction, dissociation, helplessness), how it affects the body, and the 12 phases with their audio tracks.

| Group | Phases |
| --- | --- |
| Preparation | 1 Safety & containment · 2 Grounding & centering · 3 Building resources |
| Tracking | 4 Felt sense to sensation · 5 Tracking activation · 6 Pendulation |
| Discharge | 7 Healthy aggression · 8 Healthy escape · 9 Strength & resilience · 10 Uncoupling fear |
| Completion | 11 Orientation & engagement · 12 Settling & integration |

**Every phase has the same parts:** why it matters, a ground-squirrel note, an NIV verse, a lesson, a guided exercise with an audio track, before/after activation ratings (0–10), three homework items and notes. Each phase is done when its lesson, exercise and homework are all checked off.

## Key features
- **Sploot now:** a button on every screen. It opens a grounding sequence with a paced-breathing acorn (in for 4, out for 6) and crisis line numbers. It opens automatically if an after-exercise rating is 7 or higher.
- **Gentle feedback:** guidance appears when activation rises by 3 or more, or comes down.
- **Progress:** a bar with 12 acorns. Each phase in the side list is grouped and shows how many steps are done.
- **Therapist report:** covers one phase or all 12. It includes status, before/after ratings, the check-in count, phases that raised activation, and optional notes. Save it as an HTML file (to print or save as PDF), or copy it as text or Markdown.
- **About page:** the 12 phases at a glance, in four colored groups.

## Architecture
- **Static site with no build step:** `index.html` (app), `about.html`, `sync.js` (Google Sheets sync), `config.js` (Firebase settings), `assets/`, `audio/`.
- **State:** one JSON object `{ v, checks, lesson, exercise, notes, pre, post, log, current, started, updated }`, saved in `localStorage`. Version 1 state from the old phase list is migrated automatically to version 2.
- **Optional Google Sheets sync:**
  - Signs in with Firebase Auth (the same Firebase project as mdlife) with the `drive.file` scope, so the app can see only the spreadsheet it creates.
  - The spreadsheet "Groundwork progress" has tabs for Progress, Check-ins and Notes, plus a hidden `_data` tab that holds the full state for restoring on another device.
  - When the two copies differ, the one changed most recently wins. Edits made while connecting are kept. If the spreadsheet is deleted, the app finds or creates a new one.
- **Audio:** `audio/phase-01.mp3` to `phase-12.mp3`. A phase without a file shows "not added yet".
- **Deep links:** `#intro` and `#phase-N`. The address follows the open phase.

## Design principles
- **Small doses.** Slower is faster, and the user can stop at any point.
- **Calm look:** a California-foothills palette, light and dark modes, and the Atkinson Hyperlegible font for readability.
- **Accessible:** dialogs keep keyboard focus inside them, progress changes are announced to screen readers, and the page respects reduced motion.
- **Private by default:** data never leaves the browser unless the user connects Google Sheets.

## Open items
1. **Record the 12 audio tracks.** The site is public, so use self-recorded audio, not the book's CD.
2. **Review the clinical content:** ideally with an SE practitioner, especially phases 7–10 (discharge).
3. **Test Google Sheets sync** end to end on a real account and a second device.
4. **Consider:** reminders, a trend chart of check-ins, and printable phase handouts.

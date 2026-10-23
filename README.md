<p align="center"><img src="assets/emblem.png" width="160" alt="Groundwork logo: a California ground squirrel holding an acorn"></p>

# Groundwork

A 12-phase somatic self-regulation program, following the twelve-phase healing trauma program in Peter Levine's work.

Live: https://sherol.github.io/groundwork

## What's in it

- **Introduction:** what trauma is, what causes it, its symptoms, how it affects the body, and an overview of the program with each phase's audio track.
- **12 phases** in four groups, following the order of Peter Levine's twelve-phase healing trauma program:
  - **Preparation:** 1. Safety & containment, 2. Grounding & centering, 3. Building resources
  - **Tracking:** 4. Felt sense to sensation, 5. Tracking activation, 6. Pendulation
  - **Discharge:** 7. Healthy aggression, 8. Healthy escape, 9. Strength & resilience, 10. Uncoupling fear
  - **Completion:** 11. Orientation & engagement, 12. Settling & integration

  Each phase has an explanation, a lesson, a guided exercise with an audio track, homework checkboxes and notes.
- **Guided audio:** one track per phase, played from `audio/phase-01.mp3` … `audio/phase-12.mp3` (see `audio/README.md`). No recordings are in the repo yet; until a file is added, its player is hidden and marked "not added yet".
- **Before/after activation ratings (0–10)** for each exercise, with gentle guidance when activation goes up. An after-rating of 7 or more opens Sploot now.
- **Progress bar** with 12 acorns.
- **"Sploot now"** button on every screen: about 90 seconds of grounding steps beside a paced-breathing acorn that swells as you breathe in for 4 and settles as you breathe out for 6, with crisis line numbers.
- **One-page therapist report** for one phase or the whole program, with your name and notes optional. Save it as an HTML file (open it and print or save as PDF), copy it as plain text, or copy it as Markdown.
- **A Bible verse (NIV)** for each phase.
- **Google Sheets sync** (optional).
- **About page** (`about.html`): the 12 phases at a glance, each linking straight into the program.
- **Links:** `index.html#intro` opens the introduction and `index.html#phase-1` … `#phase-12` open a phase.

## Where your data is stored

- **Always:** in your browser on this device (`localStorage`, key `groundwork-v1`). Nothing is sent anywhere unless you connect Google Sheets.
- Progress saved before the twelve-phase restructure is moved over automatically the first time the new version loads: notes, ratings and check-ins go to the new phase that covers the same ground (each note is labelled with its old phase), and ticks carry over only where the content didn't change.
- **If you click "Sync to Google Sheets":** Groundwork creates a spreadsheet called **Groundwork progress** in your Google Drive and keeps it up to date. It has these tabs:
  - **Progress:** one row per phase
  - **Check-ins:** one row per before/after rating, so you can see trends over time
  - **Notes:** your notes per phase
  - **_data** (hidden): the full app state, used to restore your progress on another device. Don't edit it.
- The app asks only for the `drive.file` permission. It can see the files it created and nothing else in your Drive.
- When you connect, if the browser copy and the spreadsheet differ, the one changed most recently wins. After that, each change is written to the spreadsheet a moment later.
- Google access lasts about an hour (the token is kept in `sessionStorage` for that tab). After that, changes keep saving in the browser; click **Reconnect Google Sheets** to sync them.
- **Disconnect** stops syncing on this device. The spreadsheet stays in your Drive.

## One-time setup

### 1. GitHub Pages

In this repo, **Settings → Pages** is set to **Deploy from a branch**: `main`, folder `/ (root)`. Every push to `main` republishes the site within a minute or two. There is no build step.

### 2. Google sign-in (for Sheets sync)

Groundwork signs in with **Firebase Authentication**, the same way `mdlife` does, using the same Firebase project (`gen-lang-client-0609175245`). The settings are in `config.js`.

1. In the [Firebase console](https://console.firebase.google.com/) for that project, go to **Authentication → Settings → Authorized domains** and make sure `sherol.github.io` is listed (it already is if `mdlife` sign-in works). Add `localhost` to test locally.
2. In the [Google Cloud console](https://console.cloud.google.com/apis/library) for the same project, enable the **Google Sheets API** and the **Google Drive API**.

The Firebase SDK (compat build, 10.12.2) loads from `gstatic.com`. To run without Google Sheets, set `firebase` to `null` in `config.js`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

There is no build step. Sign-in only works on an authorized domain, so add `localhost` in Firebase (see above) to test sync locally.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The app: content for the introduction and 12 phases, rendering, state, Sploot now and the therapist report, all inline |
| `about.html` | The 12 phases at a glance |
| `config.js` | Firebase settings for Google sign-in |
| `sync.js` | Google Sheets sync |
| `assets/` | Emblem, favicon and touch icon, plus `logo-full.png` (not used by the pages) |
| `audio/` | Guided audio, one MP3 per phase |

## Scripture

Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.

## Important

Groundwork is a self-regulation and learning tool, not therapy or a substitute for care. It is not affiliated with or endorsed by Somatic Experiencing International. The exercises stay with present-moment body sensation and never ask you to revisit a traumatic memory. Work with a trained practitioner for deeper work.

If you are in crisis in the US, call or text **988**. UK & Ireland: Samaritans **116 123**. Elsewhere: findahelpline.com.

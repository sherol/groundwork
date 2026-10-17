<p align="center"><img src="assets/emblem.png" width="160" alt="Groundwork logo: a California ground squirrel holding an acorn"></p>

# Groundwork

A 12-phase somatic self-regulation program, inspired by body-based trauma approaches including Peter Levine's work.

Live: https://sherol.github.io/groundwork

## What's in it

- **12 phases:** Arriving, Orienting, Grounding, Resourcing, Felt sense, Tracking, Your window, Pendulation, Boundaries, Completing, Connection, Integration. Each has an explanation, a lesson, a guided exercise, homework checkboxes and notes.
- **Before/after activation ratings (0–10)** for each exercise, with gentle guidance when activation goes up.
- **Progress bar** with 12 acorns.
- **"Sploot now"** grounding button on every screen, with crisis line numbers.
- **One-page therapist report** for one phase or the whole program, saved as an HTML file (open it and print or save as PDF) or copied as text.
- **A Bible verse (NIV)** for each phase.
- **Google Sheets sync** (optional).
- **About page** (`about.html`): the 12 phases at a glance.

## Where your data is stored

- **Always:** in your browser on this device (`localStorage`). Nothing is sent anywhere unless you connect Google Sheets.
- **If you click "Sync to Google Sheets":** Groundwork creates a spreadsheet called **Groundwork progress** in your Google Drive and keeps it up to date. It has these tabs:
  - **Progress:** one row per phase
  - **Check-ins:** one row per before/after rating, so you can see trends over time
  - **Notes:** your notes per phase
  - **_data** (hidden): the full app state, used to restore your progress on another device. Don't edit it.
- The app asks only for the `drive.file` permission. It can see the files it created and nothing else in your Drive.
- When the browser copy and the spreadsheet differ, the one changed most recently wins.
- Google access lasts about an hour. After that, changes keep saving in the browser; click **Reconnect Google Sheets** to sync them.

## One-time setup

### 1. GitHub Pages

In this repo, **Settings → Pages** is set to **Deploy from a branch**: `main`, folder `/ (root)`. Every push to `main` republishes the site within a minute or two. There is no build step.

### 2. Google sign-in (for Sheets sync)

Groundwork signs in with **Firebase Authentication**, the same way `mdlife` does, using the same Firebase project (`gen-lang-client-0609175245`). The settings are in `config.js`.

1. In the [Firebase console](https://console.firebase.google.com/) for that project, go to **Authentication → Settings → Authorized domains** and make sure `sherol.github.io` is listed (it already is if `mdlife` sign-in works). Add `localhost` to test locally.
2. In the [Google Cloud console](https://console.cloud.google.com/apis/library) for the same project, enable the **Google Sheets API** and the **Google Drive API**.

To run without Google Sheets, set `firebase` to `null` in `config.js`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

There is no build step: the site is `index.html`, `about.html`, `sync.js`, `config.js` and `assets/`.

## Scripture

Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.

## Important

Groundwork is a self-regulation and learning tool, not therapy or a substitute for care. It is not affiliated with or endorsed by Somatic Experiencing International. The exercises stay with present-moment body sensation and never ask you to revisit a traumatic memory. Work with a trained practitioner for deeper work.

If you are in crisis in the US, call or text **988**. UK & Ireland: Samaritans **116 123**. Elsewhere: findahelpline.com.

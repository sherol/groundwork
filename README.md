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
- **Google Sheets sync** (optional).

## Where your data is stored

- **Always:** in your browser on this device (`localStorage`). Nothing is sent anywhere unless you connect Google Sheets.
- **If you click "Sync to Google Sheets":** Groundwork creates a spreadsheet called **Groundwork progress** in your Google Drive and keeps it up to date. It has these tabs:
  - **Progress:** one row per phase
  - **Check-ins:** one row per before/after rating, so you can see trends over time
  - **Notes:** your notes per phase
  - **_data** (hidden): the full app state, used to restore your progress on another device. Don't edit it.
- The app asks only for the `drive.file` permission. It can see the files it created and nothing else in your Drive.
- When the browser copy and the spreadsheet differ, the one changed most recently wins.
- Google sign-in lasts about an hour. After that, changes keep saving in the browser; click **Reconnect Google Sheets** to sync them.

## One-time setup

### 1. GitHub Pages

In this repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. Every push to `main` then publishes the site.

### 2. Google Cloud (for Sheets sync)

`config.js` uses the same Google Cloud project and OAuth client as `mdlife` (project `gen-lang-client-0609175245`). In the [Google Cloud console](https://console.cloud.google.com/) for that project:

1. **APIs & Services → Library:** enable the **Google Sheets API** and make sure the **Google Drive API** is enabled.
2. **APIs & Services → Credentials →** open the OAuth 2.0 web client whose ID is in `config.js`. Under **Authorized JavaScript origins**, make sure `https://sherol.github.io` is listed. Add `http://localhost:8000` too if you want to test locally.
3. **OAuth consent screen:** if the app is in *Testing* mode, add your Google account under **Test users**.

To run without Google Sheets, set `googleClientId` to `""` in `config.js`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

There is no build step: the site is `index.html`, `sync.js`, `config.js` and `assets/`.

## Important

Groundwork is a self-regulation and learning tool, not therapy or a substitute for care. It is not affiliated with or endorsed by Somatic Experiencing International. The exercises stay with present-moment body sensation and never ask you to revisit a traumatic memory. Work with a trained practitioner for deeper work.

If you are in crisis in the US, call or text **988**. UK & Ireland: Samaritans **116 123**. Elsewhere: findahelpline.com.

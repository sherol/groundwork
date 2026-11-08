<p align="center"><img src="assets/emblem.png" width="160" alt="Groundwork logo: a California ground squirrel holding an acorn"></p>

# Groundwork

Self-guided tools for a steadier body and mind. The start page (`index.html`) offers four:

1. **Somatic Experiencing Method** (`somatic.html`): a 12-phase somatic self-regulation program, following the twelve-phase healing trauma program in Peter Levine's work. Described in detail below.
2. **Thought Records & Cognitive Distortions** (`thoughts.html`): how thoughts shape feelings, the seven-column thought record, 12 common thinking traps with examples and questions to ask, and a thought-record form with saved records.
3. **DBT Skills** (`dbt.html`): the four DBT modules (mindfulness, distress tolerance, emotion regulation, interpersonal effectiveness) in plain language, a "What do I need right now?" skill finder, and a daily diary card.
4. **Integrative Eating** (`eating.html`): calm, mindful meals and gut health, one class session at a time (Sessions 1 and 2 of 4 so far). Session 1: pre-meal breathing (with a guided 1-minute 4-7-8 breath), a tour of digestion and building fiber slowly. Session 2: the "paper cut" idea, calming the gut–brain connection (Nerva or free gut-directed meditations), stomach acid support (apple cider vinegar, betaine), digestive enzymes, elimination diet trials (gluten, dairy, sugar, reflux, low FODMAP, low histamine) and tests a clinician may suggest. Also: weekly homework (Session 2 on top, Session 1 folded below), an optional baking-soda-test log (one morning at a time: a result from the list, including "No baking soda", and/or the minutes it took), a fiber estimator and a daily food, fiber and symptom log (with a "Trying now" section for acid, enzyme and diet trials, doses and brands).

Everything saves in the browser first. **Sync to Google Sheets** (on every page) keeps all four sections in one spreadsheet (see below). Saved entries can also be copied as Markdown or saved as a printable HTML file.

**Each section has its own Sploot now:**
- Somatic Experiencing: the original grounding steps with the paced-breathing acorn (also opened from the start page, `somatic.html?sploot`).
- Thought Records: "A thought is not a fact": pause, name the thought, find it in the body, ground, breathe, be kind to yourself.
- DBT: "Ride the wave": STOP and TIPP (cold water, paced breathing, paired muscle relaxation), step by step.
- Integrative Eating: a **before-you-eat checklist**, opened from a button pinned to the top of the eating page (it stays in view while you scroll) and from the start page, beside a 4-7-8 breathing acorn: set the table (sit down, phone down, fork down), ground, breathe, be mindful (look, smell, gratitude, hunger check) and chew each bite 30–50 times. It starts fresh each time. Tap the acorn to restart the breath at the top of the in-breath; a brown number on its cap then counts the full rounds finished since the tap (tap again to start over). While the checklist scrolls, the acorn stays at the top of the sheet. Each session (at least 10 seconds, or anything checked) is saved and synced to a **Before-you-eat Sploot** tab in Google Sheets: date, start time, minutes, breaths, rounds since the tap, items checked, whether it ended with "Ready to eat", and the page. On a phone held sideways, the acorn stays on the left half of the screen and the checklist scrolls on the right; held upright, a tip suggests turning it.
- Each Sploot button is colored to match its section: Somatic Experiencing green, Thought Records teal, DBT plum, Integrative Eating amber.

Old links such as `index.html#intro` and `index.html#phase-3` redirect to the same place in `somatic.html`.

## Somatic Experiencing Method

Live: https://sherol.github.io/groundwork

## What's in it

- **Introduction:** what trauma is, what causes it, its symptoms, how it affects the body, and an overview of the program with each phase's audio track.
- **12 phases** in four groups, following the order of Peter Levine's twelve-phase healing trauma program:
  - **Preparation:** 1. Safety & containment, 2. Grounding & centering, 3. Building resources
  - **Tracking:** 4. Felt sense to sensation, 5. Tracking activation, 6. Pendulation
  - **Discharge:** 7. Healthy aggression, 8. Healthy escape, 9. Strength & resilience, 10. Uncoupling fear
  - **Completion:** 11. Orientation & engagement, 12. Settling & integration

  Each phase has an explanation, a lesson, a guided exercise with an audio track, homework checkboxes and notes.
- **Guided audio player** in each phase's exercise: play/pause, back and forward 15 seconds, a seek bar, speed (0.75×–1.5×) and Start over. It plays `audio/phase-NN.mp3` if one is added (see `audio/README.md`), otherwise it streams that phase's recording from Peter Levine's guided recordings at Sounds True (https://www.soundstrue.com/pages/healingtrauma). Where you stopped in each track, and your speed, are remembered on this device (`localStorage` key `groundwork-audio`, not synced). Phone lock-screen and headphone controls work too. If the recording can't load, the player says so and links to it on Sounds True.

## Source

The program follows Peter A. Levine, *Healing Trauma: A Pioneering Program for Restoring the Wisdom of Your Body* (Boulder, CO: Sounds True, 2008). Its guided recordings are © Peter A. Levine / Sounds True and are not included in this repository; the app links to them at https://www.soundstrue.com/pages/healingtrauma. Groundwork is not affiliated with or endorsed by Peter Levine or Sounds True.
- **Before/after activation ratings (0–10)** for each exercise, with gentle guidance when activation goes up. An after-rating of 7 or more opens Sploot now.
- **Progress bar** with 12 acorns.
- **"Sploot now"** button on every screen: about 90 seconds of grounding steps beside a paced-breathing acorn that swells as you breathe in for 4 and settles as you breathe out for 6, with crisis line numbers.
- **One-page therapist report** for one phase or the whole program, with your name and notes optional. Save it as an HTML file (open it and print or save as PDF), copy it as plain text, or copy it as Markdown.
- **A Bible verse (NIV)** for each phase.
- **Google Sheets sync** (optional).
- **About page** (`about.html`): the 12 phases at a glance, each linking straight into the program.
- **Links:** `somatic.html#intro` opens the introduction and `somatic.html#phase-1` … `#phase-12` open a phase. The address follows you as you move between phases, so reloading stays where you are.

## Where your data is stored

- **Always:** in your browser on this device (`localStorage`, key `groundwork-v1`). Nothing is sent anywhere unless you connect Google Sheets.
- Progress saved before the twelve-phase restructure is moved over automatically the first time the new version loads: notes, ratings and check-ins go to the new phase that covers the same ground (each note is labelled with its old phase), and ticks carry over only where the content didn't change.
- **If you click "Sync to Google Sheets"** (on any page): Groundwork creates a spreadsheet called **Groundwork progress** in your Google Drive and keeps all four sections up to date in it. It has these tabs:
  - **Progress:** one row per Somatic Experiencing phase
  - **Check-ins:** one row per before/after rating, so you can see trends over time
  - **Notes:** your notes per phase
  - **Thought records**, **DBT diary**, **Eating log**, **Baking soda test:** one row per saved entry
  - **_data** and **_tools** (hidden): the full state of every section, used to restore your progress on another device. Don't edit them.
- A spreadsheet made before the new sections existed gets their tabs added the next time it syncs.
- Merging: for Somatic Experiencing, the copy changed most recently wins (below). Thought records, diary cards and log entries from both copies are combined, and an entry deleted on one device stays deleted. For the eating homework checklist, the most recent change wins.
- The app asks only for the `drive.file` permission. It can see the files it created and nothing else in your Drive.
- When you connect, if the browser copy and the spreadsheet differ, the one changed most recently wins. Anything you change while it's connecting is kept either way. After that, each change is written to the spreadsheet a moment later. Moving between phases doesn't count as a change: it's remembered on this device and goes along with your next real change.
- If the spreadsheet is deleted while you're connected, Groundwork says so and sets it up again (finding another Groundwork spreadsheet in your Drive, or making a new one) and syncs again.
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
| `index.html` | Start page: the four tools |
| `somatic.html` | The 12-phase program: content for the introduction and 12 phases, rendering, state, Sploot now and the therapist report, all inline |
| `thoughts.html` | Thought records and cognitive distortions |
| `dbt.html` | DBT skills, skill finder and diary card |
| `eating.html` | Integrative eating and gut health |
| `assets/tools.css`, `assets/tools.js` | Shared styles and helpers (tabs, saved entries, export, the Sploot overlay and checklist, the sync controls) for the start page and the three new tools |
| `about.html` | The 12 phases at a glance |
| `config.js` | Firebase settings for Google sign-in |
| `sync.js` | Google Sheets sync for all four sections, from any page |
| `assets/` | Emblem, favicon and touch icon, plus `logo-full.png` (not used by the pages) |
| `audio/` | Guided audio, one MP3 per phase |

## Scripture

Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.

## Important

Groundwork is a self-regulation and learning tool, not therapy or a substitute for care. It is not affiliated with or endorsed by Somatic Experiencing International. The exercises stay with present-moment body sensation and never ask you to revisit a traumatic memory. Work with a trained practitioner for deeper work.

If you are in crisis in the US, call or text **988**. UK & Ireland: Samaritans **116 123**. Elsewhere: findahelpline.com.

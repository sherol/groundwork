/* Groundwork ↔ Google Sheets sync, for all four sections, from any page.
 *
 * Signs in with Firebase Authentication (Google provider), the same way mdlife
 * does, and uses the Google OAuth access token it returns. The token has only the
 * drive.file scope, so the app can only see the spreadsheet it creates. The spreadsheet
 * "Groundwork progress" has:
 *   Progress, Check-ins, Notes – the Somatic Experiencing program (readable)
 *   Thought records, DBT diary, Eating log, Baking soda test – one row per saved entry (readable)
 *   _data  – hidden; the Somatic Experiencing state as JSON
 *   _tools – hidden; the other sections' saved entries as JSON
 * The hidden tabs are used to restore on other devices. The browser copy (localStorage) is always
 * kept, so every page works offline.
 *
 * Merging when connecting:
 *   Somatic Experiencing: the copy changed most recently wins; edits made while connecting are kept (as before).
 *   Journals (thought records, diary cards, eating log, baking soda results): entries from both copies are combined
 *     by id, and entries deleted on either side stay deleted.
 *   Checklists (this week's eating homework): the copy changed most recently wins.
 */
(function () {
  const SCOPE = "https://www.googleapis.com/auth/drive.file";
  const SHEET_NAME = "Groundwork progress";
  const PREF = "groundwork-sync";      // { connected, sheetId, sheetUrl }
  const TOKEN = "groundwork-token";    // { token, exp } in sessionStorage
  const SOMATIC = "groundwork-v1";     // Somatic Experiencing state (index.html before the start page)
  const CHUNK = 40000;                 // a cell holds at most 50,000 characters

  /* Journals: localStorage key → readable tab and its columns ([header, field, kind]). */
  const JOURNALS = {
    "groundwork-thoughts": { tab: "Thought records", cols: [["Date", "date"], ["Situation", "situation"], ["Emotions", "emotions"], ["Strength before (0–100)", "before"], ["Body", "body"], ["Hot thought", "thought"], ["Belief before (0–100)", "belief"], ["Thinking traps", "traps"], ["Evidence for", "for"], ["Evidence against", "against"], ["Balanced thought", "balanced"], ["Belief in balanced thought", "newBelief"], ["Belief in hot thought after", "oldBelief"], ["Strength after (0–100)", "after"], ["Next step", "action"]] },
    "groundwork-dbt": { tab: "DBT diary", cols: [["Date", "date"], ["Sadness (0–5)", "sad"], ["Anxiety or fear", "fear"], ["Anger", "anger"], ["Shame or guilt", "shame"], ["Joy", "joy"], ["Overall distress", "distress"], ["Urges", "urges"], ["Strongest urge (0–5)", "urgeLevel"], ["Acted on it", "acted"], ["Skills used", "skills"], ["PLEASE", "please"], ["Skills helped (0–5)", "helped"], ["Notes", "notes"]] },
    "groundwork-eating": { tab: "Eating log", cols: [["Date", "date"], ["Food and drink", "food"], ["Belly breaths before", "breaths"], ["Habits", "habits"], ["Fiber (g)", "fiber"], ["Fiber supplement", "supplement"], ["Symptoms", "symptomList"], ["Gut symptoms (0–10)", "symptoms"], ["Stress (0–10)", "stress"], ["Sleep", "sleep"], ["10% better", "better"], ["10% worse", "worse"], ["Questions for clinician", "questions"]] },
    "groundwork-eating-bst": { tab: "Baking soda test", cols: [["Date", "date"], ["Time to burp", "time"], ["How long it took (minutes)", "minutes"]] },
  };
  /* Checklists: localStorage key → { value, updated } is kept under key + "-meta" for the timestamp. */
  const LISTS = ["groundwork-eating-week"];
  const SOMATIC_TABS = ["Progress", "Check-ins", "Notes"];
  const TABS = [...SOMATIC_TABS, ...Object.values(JOURNALS).map(j => j.tab), "_data", "_tools"];

  const $ = id => document.getElementById(id);
  const read = (st, k) => { try { return JSON.parse(st.getItem(k)) ?? null } catch { return null } };
  const write = (st, k, v) => { try { v == null ? st.removeItem(k) : st.setItem(k, JSON.stringify(v)) } catch {} };
  const G = () => window.Groundwork;   // present only on somatic.html

  let pref = read(localStorage, PREF) || {};
  let unavailable = false, token = null, provider = null, pending = false, timer = null, busy = false;
  const t = read(sessionStorage, TOKEN);
  if (t && t.exp > Date.now() + 60000) token = t.token;

  function status(text, isError) {
    const s = $("syncState"); if (!s) return;
    s.textContent = text; s.classList.toggle("err", !!isError);
    $("signIn").hidden = unavailable || (!!token && !!pref.sheetId);
    $("signIn").textContent = pref.connected ? "Reconnect Google Sheets" : "Sync to Google Sheets";
    $("signOut").hidden = !pref.connected;
    $("openSheet").hidden = !pref.sheetUrl;
    if (pref.sheetUrl) $("openSheet").href = pref.sheetUrl;
  }

  function firebaseConfig() { return (window.GROUNDWORK_CONFIG || {}).firebase }

  /* ---------- Google API helpers ---------- */
  async function api(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(opts.headers || {}) } });
    if (res.status === 401) { token = null; write(sessionStorage, TOKEN, null); throw Object.assign(new Error("signed out"), { code: 401 }) }
    if (!res.ok) {
      let msg = "";
      try { msg = (await res.json()).error.message || "" } catch {}
      throw Object.assign(new Error(msg), { code: res.status, api: url.includes("sheets.googleapis") ? "Google Sheets" : "Google Drive" });
    }
    return res.status === 204 ? null : res.json();
  }
  const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
  const DRIVE = "https://www.googleapis.com/drive/v3/files";

  async function findOrCreateSheet() {
    if (pref.sheetId) {
      try { return await api(`${SHEETS}/${pref.sheetId}?fields=spreadsheetId,spreadsheetUrl`) }
      catch (e) { if (e.code === 401) throw e; pref.sheetId = null }
    }
    const q = encodeURIComponent("appProperties has { key='groundwork' and value='progress' } and trashed=false");
    const found = await api(`${DRIVE}?q=${q}&fields=files(id)&spaces=drive`);
    if (found.files && found.files.length) return api(`${SHEETS}/${found.files[0].id}?fields=spreadsheetId,spreadsheetUrl`);
    const created = await api(SHEETS, { method: "POST", body: JSON.stringify({ properties: { title: SHEET_NAME }, sheets: [{ properties: { title: "Progress" } }] }) });
    await api(`${DRIVE}/${created.spreadsheetId}`, { method: "PATCH", body: JSON.stringify({ appProperties: { groundwork: "progress" } }) });
    return created;
  }

  /* Add any tabs the spreadsheet doesn't have yet (spreadsheets made before a section existed get its tab on the next sync). */
  async function ensureTabs(id) {
    const have = new Set((await api(`${SHEETS}/${id}?fields=sheets.properties.title`)).sheets.map(s => s.properties.title));
    const missing = TABS.filter(tb => !have.has(tb));
    if (!missing.length) return;
    const res = await api(`${SHEETS}/${id}:batchUpdate`, { method: "POST", body: JSON.stringify({
      requests: missing.map(title => ({ addSheet: { properties: { title, hidden: title.startsWith("_"), gridProperties: title.startsWith("_") ? {} : { frozenRowCount: 1 } } } })),
    }) });
    const added = res.replies.map(r => r.addSheet.properties).filter(p => !p.title.startsWith("_"));
    if (added.length) await api(`${SHEETS}/${id}:batchUpdate`, { method: "POST", body: JSON.stringify({
      requests: added.map(p => ({ repeatCell: {
        range: { sheetId: p.sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: .95, green: .93, blue: .87 } } },
        fields: "userEnteredFormat(textFormat,backgroundColor)",
      } })),
    }) });
  }

  async function readRemote(id) {
    const r = await api(`${SHEETS}/${id}/values:batchGet?ranges=_data!A1:A&ranges=_tools!A1:A&majorDimension=COLUMNS`);
    const parse = v => { const text = (v.values && v.values[0] || []).join(""); if (!text) return null; try { return JSON.parse(text) } catch { return null } };
    return { somatic: parse(r.valueRanges[0]), tools: parse(r.valueRanges[1]) };
  }

  /* ---------- local copies of every section ---------- */
  const somaticState = () => G() ? G().state : read(localStorage, SOMATIC);
  function toolsLocal() {
    const journals = {}, lists = {};
    for (const k in JOURNALS) journals[k] = { items: read(localStorage, k) || [], deleted: read(localStorage, k + "-deleted") || [] };
    for (const k of LISTS) lists[k] = { value: read(localStorage, k) || {}, updated: read(localStorage, k + "-meta") || "" };
    return { v: 1, journals, lists };
  }
  /* Combine the spreadsheet's copy of the journals and checklists into this browser's. Returns true if anything here changed. */
  function mergeTools(remote) {
    if (!remote) return false;
    let changed = false;
    for (const k in JOURNALS) {
      const r = remote.journals?.[k]; if (!r) continue;
      const items = read(localStorage, k) || [], deleted = read(localStorage, k + "-deleted") || [];
      const gone = new Set([...deleted, ...(r.deleted || [])]);
      const byId = new Map();
      for (const e of [...items, ...(r.items || [])]) if (e && e.id && !gone.has(e.id) && !byId.has(e.id)) byId.set(e.id, e);
      const merged = [...byId.values()].sort((a, b) => (b.t || "").localeCompare(a.t || ""));
      if (JSON.stringify(merged) !== JSON.stringify(items)) { write(localStorage, k, merged); changed = true }
      if (gone.size !== deleted.length) write(localStorage, k + "-deleted", [...gone]);
    }
    for (const k of LISTS) {
      const r = remote.lists?.[k]; if (!r) continue;
      if ((r.updated || "") > (read(localStorage, k + "-meta") || "")) { write(localStorage, k, r.value || {}); write(localStorage, k + "-meta", r.updated); changed = true }
    }
    return changed;
  }

  /* ---------- state → rows ---------- */
  const chunks = obj => { const json = JSON.stringify(obj), out = []; for (let k = 0; k < json.length; k += CHUNK) out.push([json.slice(k, k + CHUNK)]); return out };
  function somaticRows(S) {
    const g = G(), P = g.phases;
    const yes = b => (b ? "✓" : "");
    const progress = [["Phase", "Title", "Lesson read", "Exercise done", "Homework 1", "Homework 2", "Homework 3", "Steps done", "Status", "Activation before", "Activation after"]];
    P.forEach((p, i) => {
      const d = g.doneSteps(i), n = g.totalSteps(i);
      progress.push([i + 1, p.title, yes(S.lesson[i]), yes(S.exercise[i]),
        ...p.homework.map((_, j) => yes(S.checks[i + "." + j])),
        `${d} of ${n}`, d === n ? "Complete" : d ? "In progress" : "Not started", S.pre[i] ?? "", S.post[i] ?? ""]);
    });
    const checkins = [["Date and time", "Phase", "Title", "Before (0–10)", "After (0–10)", "Change"]];
    (S.log || []).forEach(r => checkins.push([new Date(r.t).toLocaleString(), r.phase + 1, P[r.phase].title, r.pre ?? "", r.post, r.pre == null ? "" : r.post - r.pre]));
    const notes = [["Phase", "Title", "Note"]];
    P.forEach((p, i) => { const n = (S.notes[i] || "").trim(); if (n) notes.push([i + 1, p.title, n]) });
    return { Progress: progress, "Check-ins": checkins, Notes: notes };
  }
  function journalRows(spec, items) {
    const cell = v => Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "✓" : "") : v ?? "";
    return [spec.cols.map(c => c[0]), ...[...items].reverse().map(e => spec.cols.map(([, f]) => f === "date" ? (e.date || (e.t || "").slice(0, 10)) : cell(e[f])))];
  }

  /* Write everything this browser has. The Somatic Experiencing readable tabs need the program's content, so they're rewritten only
     on somatic.html; elsewhere they're left as they are (its state only changes on that page, which rewrites them). */
  async function push() {
    const id = pref.sheetId, data = [], S = somaticState(), tools = toolsLocal();
    if (G()) { const r = somaticRows(S); for (const tb of SOMATIC_TABS) data.push({ range: `'${tb}'!A1`, values: r[tb] }) }
    if (S) data.push({ range: "_data!A1", values: chunks(S) });
    for (const k in JOURNALS) data.push({ range: `'${JOURNALS[k].tab}'!A1`, values: journalRows(JOURNALS[k], tools.journals[k].items) });
    data.push({ range: "_tools!A1", values: chunks(tools) });
    await api(`${SHEETS}/${id}/values:batchClear`, { method: "POST", body: JSON.stringify({ ranges: data.map(d => d.range.replace(/!A1$/, "")) }) });
    await api(`${SHEETS}/${id}/values:batchUpdate`, { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) });
  }

  /* ---------- connect, merge, save queue ---------- */
  async function connect(note) {
    status(note || "Connecting to Google Sheets…");
    // Saves wait until connecting is done. `base` is this device's Somatic Experiencing copy as connecting starts: it decides which
    // copy is newer, and anything changed here while connecting is kept on top of the spreadsheet's copy.
    busy = true;
    const base = JSON.parse(JSON.stringify(somaticState() || null));
    let ok = false;
    try {
      const sheet = await findOrCreateSheet();
      pref = { connected: true, sheetId: sheet.spreadsheetId, sheetUrl: sheet.spreadsheetUrl };
      write(localStorage, PREF, pref);
      await ensureTabs(pref.sheetId);
      const remote = await readRemote(pref.sheetId);
      const done = note ? "Set up the spreadsheet again and synced" : "Synced to Google Sheets";
      let pushSomatic = true, loaded = false;
      // Somatic Experiencing: whichever copy was changed most recently wins. Write back only if this copy won or kept edits.
      if (remote.somatic && (!base?.updated || (remote.somatic.updated || "") > base.updated)) {
        loaded = true;
        if (G()) pushSomatic = G().replaceState(remote.somatic, base);
        else { write(localStorage, SOMATIC, remote.somatic); pushSomatic = false; window.dispatchEvent(new Event("groundwork-synced")) }
      }
      // Journals and checklists: combine both copies, then write back if the spreadsheet is missing anything.
      if (mergeTools(remote.tools)) { loaded = true; window.dispatchEvent(new Event("groundwork-synced")) }
      const pushTools = JSON.stringify(toolsLocal()) !== JSON.stringify(remote.tools);
      if (pushSomatic || pushTools) { await push(); stamp(done) } else stamp(loaded ? "Loaded from Google Sheets" : "Synced to Google Sheets");
      ok = true;
    } catch (e) { fail(e) }
    busy = false;
    // Anything saved since the copy above was written goes out now.
    if (ok && pending && token) flush();
  }

  function stamp(msg) { status(msg + " · " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })) }
  function fail(e) {
    if (e.code === 401) status("Google sign-in expired. Your changes are saved here; reconnect to sync them.", true);
    else if (e.code === 403) status(`${e.api || "Google"} refused access: ${e.message || "permission denied"}`.slice(0, 300) + (/has not been used|is disabled/i.test(e.message) ? " Enable that API in Google Cloud (see README), wait a minute, then try again." : ""), true);
    else status("Couldn't reach Google Sheets. Your changes are saved here and will sync later.", true);
  }

  async function flush() {
    if (busy || !pending || !token || !pref.sheetId) return;
    busy = true; pending = false;
    status("Saving to Google Sheets…");
    try { await push(); stamp("Synced to Google Sheets") }
    catch (e) {
      // The spreadsheet was deleted, or this app can no longer reach it: find it again or make a new one, the same way connecting
      // does. Connecting writes the current state, so nothing stays queued.
      if (e.code === 404) { busy = false; pref.sheetId = null; return connect("Your Groundwork spreadsheet couldn't be found (it may have been deleted). Setting it up again…") }
      pending = true; fail(e);
    }
    busy = false;
    if (pending && token) flush();
  }

  /* Set up Firebase once. Safe to call repeatedly; returns true when sign-in is ready. */
  function init() {
    if (provider) return true;
    const cfg = firebaseConfig();
    if (!cfg) { unavailable = true; status("Saved on this device"); return false }
    if (!window.firebase || !firebase.auth) { status("Google sign-in couldn't load. Check your connection or ad blocker, then reload the page.", true); return false }
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope(SCOPE);
      return true;
    } catch (e) {
      status("Google sign-in couldn't start" + (e && e.code ? " (" + e.code + ")" : "") + ". Reload the page and try again.", true);
      return false;
    }
  }

  async function signIn() {
    if (!init()) return;
    try {
      const result = await firebase.auth().signInWithPopup(provider);
      const access = result.credential && result.credential.accessToken;
      if (!access) throw new Error("no access token");
      token = access;
      write(sessionStorage, TOKEN, { token, exp: Date.now() + 59 * 60 * 1000 });
      connect();
    } catch (e) {
      if (e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request")) status("Google sign-in was cancelled.", true);
      else if (e && e.code === "auth/unauthorized-domain") status("This site isn't on Firebase's list of authorized domains (see README).", true);
      else if (e && e.code === "auth/popup-blocked") status("Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.", true);
      else status("Google sign-in failed" + (e && e.code ? " (" + e.code + ")" : "") + ".", true);
    }
  }

  window.GroundworkSync = {
    /* Call after any saved change, on any page. Everything is read fresh from this browser when it's written. */
    queue() {
      if (!pref.connected) return;
      pending = true;
      if (!token) { status("Saved here. Reconnect Google Sheets to sync.", true); return }
      clearTimeout(timer); timer = setTimeout(flush, 1500);
    },
    ready() {
      if (init()) {
        if (pref.connected && token) connect();
        else status(pref.connected ? "Saved here. Reconnect Google Sheets to sync." : "Saved on this device", pref.connected);
      }
    },
    journals: Object.keys(JOURNALS),
  };

  if ($("signIn")) {
    $("signIn").onclick = signIn;
    $("signOut").onclick = () => {
      if (window.firebase && firebase.apps.length) firebase.auth().signOut().catch(() => {});
      token = null; pref = {}; write(localStorage, PREF, null); write(sessionStorage, TOKEN, null);
      status("Disconnected. Your spreadsheet stays in Google Drive; your progress is saved on this device.");
    };
  }
  status(pref.connected ? (token ? "Connecting…" : "Saved here. Reconnect Google Sheets to sync.") : "Saved on this device", pref.connected && !token);
})();

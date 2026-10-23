/* Groundwork ↔ Google Sheets sync.
 *
 * Signs in with Firebase Authentication (Google provider), the same way mdlife
 * does, and uses the Google OAuth access token it returns. The token has only the
 * drive.file scope, so the app can only see the spreadsheet it creates. The spreadsheet has:
 *   Progress  – one row per phase (readable summary)
 *   Check-ins – one row per before/after activation rating
 *   Notes     – one row per phase with notes
 *   _data     – hidden; the full app state as JSON, used to restore on other devices
 * The browser copy (localStorage) is always kept, so the app works offline.
 */
(function () {
  const SCOPE = "https://www.googleapis.com/auth/drive.file";
  const SHEET_NAME = "Groundwork progress";
  const PREF = "groundwork-sync";      // { connected, sheetId, sheetUrl }
  const TOKEN = "groundwork-token";    // { token, exp } in sessionStorage
  const CHUNK = 40000;                 // a cell holds at most 50,000 characters

  const $ = id => document.getElementById(id);
  const read = (st, k) => { try { return JSON.parse(st.getItem(k)) || null } catch { return null } };
  const write = (st, k, v) => { try { v == null ? st.removeItem(k) : st.setItem(k, JSON.stringify(v)) } catch {} };

  let pref = read(localStorage, PREF) || {};
  let unavailable = false, token = null, provider = null, pending = null, timer = null, busy = false;
  const t = read(sessionStorage, TOKEN);
  if (t && t.exp > Date.now() + 60000) token = t.token;

  function status(text, isError) {
    const s = $("syncState"); s.textContent = text; s.classList.toggle("err", !!isError);
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
      try { const s = await api(`${SHEETS}/${pref.sheetId}?fields=spreadsheetId,spreadsheetUrl`); return s }
      catch (e) { if (e.code === 401) throw e; pref.sheetId = null }
    }
    const q = encodeURIComponent("appProperties has { key='groundwork' and value='progress' } and trashed=false");
    const found = await api(`${DRIVE}?q=${q}&fields=files(id)&spaces=drive`);
    if (found.files && found.files.length) return api(`${SHEETS}/${found.files[0].id}?fields=spreadsheetId,spreadsheetUrl`);

    const header = { frozenRowCount: 1 };
    const created = await api(SHEETS, { method: "POST", body: JSON.stringify({
      properties: { title: SHEET_NAME },
      sheets: [
        { properties: { title: "Progress", gridProperties: header } },
        { properties: { title: "Check-ins", gridProperties: header } },
        { properties: { title: "Notes", gridProperties: header } },
        { properties: { title: "_data", hidden: true } },
      ],
    }) });
    await api(`${DRIVE}/${created.spreadsheetId}`, { method: "PATCH", body: JSON.stringify({ appProperties: { groundwork: "progress" } }) });
    const ids = (await api(`${SHEETS}/${created.spreadsheetId}?fields=sheets.properties(sheetId,title)`)).sheets.map(s => s.properties);
    await api(`${SHEETS}/${created.spreadsheetId}:batchUpdate`, { method: "POST", body: JSON.stringify({
      requests: ids.filter(p => p.title !== "_data").map(p => ({ repeatCell: {
        range: { sheetId: p.sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: .95, green: .93, blue: .87 } } },
        fields: "userEnteredFormat(textFormat,backgroundColor)",
      } })),
    }) });
    return created;
  }

  async function readRemote(id) {
    const r = await api(`${SHEETS}/${id}/values/_data!A1:A?majorDimension=COLUMNS`);
    const text = (r.values && r.values[0] || []).join("");
    if (!text) return null;
    try { return JSON.parse(text) } catch { return null }
  }

  /* ---------- state → rows ---------- */
  function rows(S) {
    const G = window.Groundwork, P = G.phases;
    const yes = b => (b ? "✓" : "");
    const progress = [["Phase", "Title", "Lesson read", "Exercise done", "Homework 1", "Homework 2", "Homework 3", "Steps done", "Status", "Activation before", "Activation after"]];
    P.forEach((p, i) => {
      const d = G.doneSteps(i), n = G.totalSteps(i);
      progress.push([i + 1, p.title, yes(S.lesson[i]), yes(S.exercise[i]),
        ...p.homework.map((_, j) => yes(S.checks[i + "." + j])),
        `${d} of ${n}`, d === n ? "Complete" : d ? "In progress" : "Not started", S.pre[i] ?? "", S.post[i] ?? ""]);
    });
    const checkins = [["Date and time", "Phase", "Title", "Before (0–10)", "After (0–10)", "Change"]];
    (S.log || []).forEach(r => checkins.push([new Date(r.t).toLocaleString(), r.phase + 1, P[r.phase].title, r.pre ?? "", r.post, r.pre == null ? "" : r.post - r.pre]));
    const notes = [["Phase", "Title", "Note"]];
    P.forEach((p, i) => { const n = (S.notes[i] || "").trim(); if (n) notes.push([i + 1, p.title, n]) });
    const json = JSON.stringify(S), data = [];
    for (let k = 0; k < json.length; k += CHUNK) data.push([json.slice(k, k + CHUNK)]);
    return { progress, checkins, notes, data };
  }

  async function push(S) {
    const id = pref.sheetId, r = rows(S);
    await api(`${SHEETS}/${id}/values:batchClear`, { method: "POST", body: JSON.stringify({ ranges: ["Progress", "Check-ins", "Notes", "_data"] }) });
    await api(`${SHEETS}/${id}/values:batchUpdate`, { method: "POST", body: JSON.stringify({
      valueInputOption: "RAW",
      data: [
        { range: "Progress!A1", values: r.progress },
        { range: "Check-ins!A1", values: r.checkins },
        { range: "Notes!A1", values: r.notes },
        { range: "_data!A1", values: r.data },
      ],
    }) });
  }

  /* ---------- connect, merge, save queue ---------- */
  async function connect(note) {
    status(note || "Connecting to Google Sheets…");
    // Saves wait until connecting is done. `base` is this device's copy as connecting starts: it decides which copy is newer, and
    // anything changed here while connecting is kept on top of the spreadsheet's copy instead of being overwritten by it.
    busy = true;
    const base = JSON.parse(JSON.stringify(window.Groundwork.state));
    let ok = false;
    try {
      const sheet = await findOrCreateSheet();
      pref = { connected: true, sheetId: sheet.spreadsheetId, sheetUrl: sheet.spreadsheetUrl };
      write(localStorage, PREF, pref);
      const remote = await readRemote(pref.sheetId);
      const done = note ? "Set up the spreadsheet again and synced" : "Synced to Google Sheets";
      // Whichever copy was changed most recently wins.
      if (remote && (!base.updated || (remote.updated || "") > base.updated)) {
        if (window.Groundwork.replaceState(remote, base)) { await push(window.Groundwork.state); stamp(done) }
        else stamp("Loaded from Google Sheets");
      } else {
        await push(window.Groundwork.state);
        stamp(done);
      }
      ok = true;
    } catch (e) { fail(e) }
    busy = false;
    // Anything saved since the copy above was written goes out now.
    if (ok && pending && token) { pending = window.Groundwork.state; flush() }
  }

  function stamp(msg) { status(msg + " · " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })) }
  function fail(e) {
    if (e.code === 401) status("Google sign-in expired. Your changes are saved here; reconnect to sync them.", true);
    else if (e.code === 403) status(`${e.api || "Google"} refused access: ${e.message || "permission denied"}`.slice(0, 300) + (/has not been used|is disabled/i.test(e.message) ? " Enable that API in Google Cloud (see README), wait a minute, then try again." : ""), true);
    else status("Couldn't reach Google Sheets. Your changes are saved here and will sync later.", true);
  }

  async function flush() {
    if (busy || !pending || !token || !pref.sheetId) return;
    busy = true; const s = pending; pending = null;
    status("Saving to Google Sheets…");
    try { await push(s); stamp("Synced to Google Sheets") }
    catch (e) {
      // The spreadsheet was deleted, or this app can no longer reach it: find it again or make a new one, the same way connecting
      // does. Connecting writes the current state, so nothing stays queued.
      if (e.code === 404) { busy = false; pref.sheetId = null; return connect("Your Groundwork spreadsheet couldn't be found (it may have been deleted). Setting it up again…") }
      pending = pending || s; fail(e);
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
    queue(s) {
      if (!pref.connected) return;
      pending = s;
      if (!token) { status("Saved here. Reconnect Google Sheets to sync.", true); return }
      clearTimeout(timer); timer = setTimeout(flush, 1500);
    },
    ready() {
      if (init()) {
        if (pref.connected && token) connect();
        else status(pref.connected ? "Saved here. Reconnect Google Sheets to sync." : "Saved on this device", pref.connected);
      }
    },
  };

  $("signIn").onclick = signIn;
  $("signOut").onclick = () => {
    if (window.firebase && firebase.apps.length) firebase.auth().signOut().catch(() => {});
    token = null; pref = {}; write(localStorage, PREF, null); write(sessionStorage, TOKEN, null);
    status("Disconnected. Your spreadsheet stays in Google Drive; progress is saved on this device.");
  };
  status(pref.connected ? (token ? "Connecting…" : "Saved here. Reconnect Google Sheets to sync.") : "Saved on this device", pref.connected && !token);
})();

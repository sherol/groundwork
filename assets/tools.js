/* Shared helpers for the Groundwork tool pages (thoughts.html, dbt.html, eating.html).
   Everything is saved in this browser only, under one localStorage key per page. */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function load(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback } catch { return fallback } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true } catch { return false } }
  /* Save a change that belongs in Google Sheets (when connected; see sync.js). */
  const synced = () => window.GroundworkSync?.queue();

  function toast(m) {
    let t = $("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t) }
    t.textContent = m; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => t.hidden = true, 2600);
  }
  async function copy(text, ok = "Copied") {
    try { await navigator.clipboard.writeText(text); toast(ok); return }
    catch {}
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.append(ta); ta.select();
    let done = false; try { done = document.execCommand("copy") } catch {}
    ta.remove(); toast(done ? ok : "Couldn't copy. Your browser blocked clipboard access.");
  }
  function download(name, text, type = "text/html") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) };
  const fmtDate = d => { const x = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00") : new Date(d); return isNaN(x) ? "" : x.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) };

  /* Tabs: buttons with role="tab" and aria-controls; the open tab is kept in the address (#tab-id) and remembered on this device. */
  function tabs(container, memoryKey) {
    const btns = [...container.querySelectorAll('[role="tab"]')];
    const show = id => {
      if (!btns.some(b => b.getAttribute("aria-controls") === id)) id = btns[0].getAttribute("aria-controls");
      btns.forEach(b => { const on = b.getAttribute("aria-controls") === id; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; $(b.getAttribute("aria-controls")).hidden = !on });
      try { history.replaceState(history.state, "", "#" + id) } catch {}
      save(memoryKey, id);
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => show(b.getAttribute("aria-controls")));
      b.addEventListener("keydown", e => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
        const n = btns[(i + d + btns.length) % btns.length]; n.focus(); show(n.getAttribute("aria-controls"));
      });
    });
    document.addEventListener("click", e => { const a = e.target.closest("[data-tab]"); if (a) { e.preventDefault(); show(a.dataset.tab); container.scrollIntoView({ behavior: "smooth" }) } });
    show(location.hash.slice(1) || load(memoryKey, ""));
    window.addEventListener("hashchange", () => { if (btns.some(b => "#" + b.getAttribute("aria-controls") === location.hash)) show(location.hash.slice(1)) });
    return show;
  }

  /* Range inputs show their value in the <output> next to them. */
  function wireRanges(root) {
    root.querySelectorAll('input[type="range"]').forEach(r => {
      const o = r.parentElement.querySelector("output"); if (!o) return;
      const set = () => o.textContent = r.value + (r.dataset.unit || ""); r.addEventListener("input", set); set();
    });
  }

  /* A journal of dated entries built from a <form>. Every named control becomes a field, labelled by the text of its .field heading
     (or data-label). Checkbox groups become lists. Entries are listed newest first with delete, plus copy/save for the whole journal. */
  /* Options for forms that don't fit that pattern: fields: [{ name, label }] lists the fields to show; collect(form) returns an array
     of entries to save at once (or null to save nothing), for forms with repeated rows such as several days of results. */
  function journal({ key, form, list, title, count, name, fields: given, collect }) {
    let items = load(key, []);
    const fields = () => {
      if (given) return given.map(f => ({ multi: false, box: false, range: false, unit: "", ...f }));
      const seen = new Map();
      form.querySelectorAll("[name]").forEach(el => {
        if (seen.has(el.name)) return;
        const label = el.dataset.label || el.closest(".field")?.querySelector("span")?.textContent.trim() || el.name;
        seen.set(el.name, { name: el.name, label, multi: el.type === "checkbox" && form.querySelectorAll(`[name="${el.name}"]`).length > 1, box: el.type === "checkbox", range: el.type === "range", unit: el.dataset.unit || "" });
      });
      return [...seen.values()];
    };
    const F = fields();
    const show = (f, v) => f.multi ? (v || []).join(", ") : f.box ? (v ? "Yes" : "") : f.range ? (v === "" || v == null ? "" : v + f.unit) : (v ?? "");
    const rowsOf = e => F.map(f => [f.label, show(f, e[f.name])]).filter(([, v]) => String(v).trim());

    function render() {
      list.innerHTML = items.length ? items.map((e, i) => `<article class="entry"><header><b>${esc(title(e))}</b><button type="button" class="btn small danger" data-del="${i}">Delete</button></header>
        <dl>${rowsOf(e).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></article>`).join("")
        : `<p class="empty">Nothing saved yet. Entries you save appear here, newest first.</p>`;
      count && (count.textContent = items.length);
    }
    form.addEventListener("submit", e => {
      e.preventDefault();
      const t = new Date().toISOString(), stamp = Date.now().toString(36);
      let entries;
      if (collect) { entries = collect(form); if (!entries || !entries.length) return }
      else {
        const fd = new FormData(form), entry = {};
        F.forEach(f => { entry[f.name] = f.multi ? fd.getAll(f.name) : f.box ? fd.has(f.name) : f.range ? +fd.get(f.name) : (fd.get(f.name) || "").trim() });
        // Untouched sliders are recorded as given only when the person moved them or the form marks them as always recorded.
        form.querySelectorAll('input[type="range"]:not([data-touched]):not([data-keep])').forEach(r => entry[r.name] = "");
        entries = [entry];
      }
      items.unshift(...entries.map((e, k) => ({ id: stamp + (entries.length > 1 ? "-" + k : ""), t, ...e })));
      save(key, items); synced(); render();
      form.reset(); form.querySelectorAll("[data-touched]").forEach(r => delete r.dataset.touched);
      form.querySelectorAll('input[type="date"]').forEach(d => d.value = today());
      form.querySelectorAll('input[type="range"]').forEach(r => r.dispatchEvent(new Event("input")));
      toast(entries.length > 1 ? `${entries.length} entries saved on this device` : "Saved on this device");
      list.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    form.addEventListener("input", e => { if (e.target.type === "range") e.target.dataset.touched = "" });
    list.addEventListener("click", e => {
      const b = e.target.closest("[data-del]"); if (!b) return;
      if (!confirm("Delete this entry? This can't be undone.")) return;
      // Remember the deleted id so syncing with another device doesn't bring the entry back.
      const [gone] = items.splice(+b.dataset.del, 1); save(key, items);
      if (gone?.id) save(key + "-deleted", [...load(key + "-deleted", []), gone.id]);
      synced(); render(); toast("Deleted");
    });
    form.querySelectorAll('input[type="date"]').forEach(d => d.value ||= today());
    wireRanges(form);
    render();
    // Entries from another device arrived through Google Sheets.
    window.addEventListener("groundwork-synced", () => { items = load(key, []); render() });

    const markdown = () => `# ${name}\n\n` + (items.length ? items.map(e => `## ${title(e)}\n\n` + rowsOf(e).map(([k, v]) => `- **${k}:** ${String(v).replace(/\n+/g, " / ")}`).join("\n")).join("\n\n") : "_No entries yet._") + "\n";
    const html = () => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title><style>body{font:13px/1.45 Verdana,sans-serif;color:#222;max-width:760px;margin:24px auto;padding:0 20px}h1{font-size:20px}h2{font-size:14px;margin:18px 0 4px;border-bottom:1px solid #e3ddca;padding-bottom:2px}dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;margin:0}dt{color:#6b6450;font-weight:bold}dd{margin:0;white-space:pre-wrap}@page{size:letter;margin:.6in}</style></head><body><h1>${esc(name)}</h1><p style="color:#777">Saved ${esc(fmtDate(new Date()))} from Groundwork. Self-reported; not a clinical record.</p>${items.map(e => `<h2>${esc(title(e))}</h2><dl>${rowsOf(e).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`).join("") || "<p>No entries yet.</p>"}</body></html>`;
    return {
      get items() { return items },
      render,
      copyMarkdown: () => copy(markdown(), "Markdown copied"),
      saveFile: () => { download(key.replace(/^groundwork-/, "groundwork-") + "-" + today() + ".html", html()); toast("Saved as file") },
    };
  }

  /* A simple persistent checklist: checkboxes with data-key inside root. */
  function checklist(root, key) {
    let s = load(key, {});
    const boxes = [...root.querySelectorAll("input[type=checkbox][data-key]")];
    const show = () => boxes.forEach(c => c.checked = !!s[c.dataset.key]);
    boxes.forEach(c => c.addEventListener("change", () => { s[c.dataset.key] = c.checked; save(key, s); save(key + "-meta", new Date().toISOString()); synced() }));
    window.addEventListener("groundwork-synced", () => { s = load(key, {}); show() });
    show();
  }

  /* ---------- Sploot: each page's own settling overlay ----------
     GW.sploot({ eyebrow, title, steps: [...] }) walks through steps one at a time beside the paced-breathing acorn.
     GW.sploot({ eyebrow, title, checklist: [{ group, items: [...] }] }) shows a to-do list (fresh each time) beside the acorn.
     breath: [{ label, n, grow }] sets the pacing (grow: true swells, false settles, null holds).
     trigger: the buttons that open it (a selector; the page's .sploot-fab by default). */
  const ACORN = `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="nutG" cx="38%" cy="38%" r="75%"><stop offset="0" stop-color="#ffe6a6"/><stop offset=".35" stop-color="#e2a64a"/><stop offset=".75" stop-color="#b06d28"/><stop offset="1" stop-color="#7c4a1d"/></radialGradient><linearGradient id="capG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a77b4f"/><stop offset="1" stop-color="#6b4a2c"/></linearGradient><pattern id="capTex" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0h12M0 0v12" stroke="#4e3420" stroke-width="2" opacity=".55"/></pattern><clipPath id="capClip"><path d="M10 80c0-36 40-54 90-54s90 18 90 54c0 10-12 14-28 14H38c-16 0-28-4-28-14Z"/></clipPath></defs><path d="M100 28c2-12 10-20 20-22" fill="none" stroke="#5a3d23" stroke-width="7" stroke-linecap="round"/><path d="M24 86H176C182 146 150 194 100 196C50 194 18 146 24 86Z" fill="url(#nutG)" stroke="#5a3d23" stroke-width="4"/><ellipse cx="60" cy="122" rx="12" ry="24" fill="#fff" opacity=".28"/><path d="M10 80c0-36 40-54 90-54s90 18 90 54c0 10-12 14-28 14H38c-16 0-28-4-28-14Z" fill="url(#capG)" stroke="#4e3420" stroke-width="4"/><rect x="6" y="20" width="188" height="78" fill="url(#capTex)" clip-path="url(#capClip)"/></svg>`;
  const CRISIS = `<div class="crisis">If you feel unsafe or overwhelmed, reach a person now. US: call or text <b>988</b> (Suicide &amp; Crisis Lifeline). UK &amp; Ireland: Samaritans <b>116 123</b>. Emergency: <b>911</b> / <b>999</b> / <b>112</b>. Elsewhere: findahelpline.com.</div>`;
/* The acorn's breathing, drawn frame by frame. (A CSS transition on transform plus filter is skipped or frozen by some mobile
     browsers, notably iPhone Safari.) Scale .5 = breathed out, 1 = breathed in. With Reduce Motion on it still breathes, over a
     smaller range, because pacing the breath is the point. */
  function orbAnimator(el) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const show = s => { el.style.transform = `scale(${reduce ? .7 + (s - .5) * .4 : s})` };
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    let raf = 0, from = .5, cur = .5, to = .5, start = 0, dur = 1;
    const frame = now => { const t = Math.min(1, (now - start) / dur); cur = from + (to - from) * ease(t); show(cur); if (t < 1) raf = requestAnimationFrame(frame) };
    return {
      go(target, seconds) { cancelAnimationFrame(raf); from = cur; to = target; dur = seconds * 1000; start = performance.now(); raf = requestAnimationFrame(frame) },
      set(s) { cancelAnimationFrame(raf); cur = to = s; show(s) },
      stop() { cancelAnimationFrame(raf) },
    };
  }
  function sploot(cfg) {
    const breath = cfg.breath || [{ label: "Breathe in", n: 4, grow: true }, { label: "Breathe out", n: 6, grow: false }];
    const pace = breath.map(b => b.n).join("-");
    const o = document.createElement("div");
    o.className = "overlay"; o.id = "splootOverlay"; o.hidden = true;
    o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-labelledby", "splootTitle");
    const items = cfg.checklist ? cfg.checklist.flatMap(g => g.items) : [];
    if (cfg.theme) o.classList.add(cfg.theme);
    if (cfg.checklist) o.classList.add("list-overlay");
    const head = `<span class="eyebrow">${esc(cfg.eyebrow)}</span><h2 id="splootTitle">${esc(cfg.title)}</h2>
      ${cfg.intro ? `<p class="ground-intro">${esc(cfg.intro)}</p>` : ""}`;
    const tap = cfg.tapRestart ? ` role="button" tabindex="0" id="spTap" aria-label="Tap the acorn to start the breath from the beginning and count rounds"` : "";
    const acorn = `<div class="breath-stage${cfg.checklist ? " small" : ""}${cfg.tapRestart ? " tappable" : ""}"${tap}><span class="ring"></span><span class="ring r2"></span><span class="ring r3"></span>
        <div class="orb" id="spOrb">${ACORN}${cfg.tapRestart ? `<span class="cap-count" id="spRounds" hidden aria-live="polite"></span>` : ""}<div class="breath-count"><b id="spNum">1</b><span id="spLabel">${esc(breath[0].label)}</span></div></div></div>
      ${cfg.tapRestart ? `<p class="tap-hint" id="spTapHint">Tap the acorn to start from the beginning and count your rounds.</p>` : ""}
      <p class="breath-meta" id="spMeta">${esc(cfg.breathText || breath.map(b => `${b.label.replace(/^Breathe /, "")} ${b.n}`).join(", "))}</p>`;
    /* A checklist Sploot has two columns: the breathing acorn, and the heading plus list. Upright on a phone (and on wider screens)
       they stack as one column; on a phone held sideways the acorn stays on the left and the list scrolls on the right. */
    o.innerHTML = cfg.checklist ? `<div class="sheet ground-sheet list-sheet">
      <div class="sp-breath">${acorn}</div>
      <div class="sp-side">${head}<p class="rotate-hint">Tip: turn your phone sideways to keep the acorn beside the list.</p><div class="todo" id="spTodo">${cfg.checklist.map(g => `<div class="todo-group"><h3>${esc(g.group)}</h3>${g.items.map(it => { const k = items.indexOf(it); return `<label class="todo-item"><input type="checkbox" data-i="${k}"><span>${it}</span></label>` }).join("")}</div>`).join("")}</div>
        <p class="todo-count" id="spCount" aria-live="polite"></p>
        <div class="row"><button class="btn primary" id="spClose" type="button">${esc(cfg.done || "Done")}</button></div></div></div>`
      : `<div class="sheet ground-sheet">${head}${acorn}<p class="ground-step" id="spStep" aria-live="polite"></p><div class="dots" id="spDots" aria-hidden="true"></div>
        <div class="row"><button class="btn" id="spPrev" type="button">Back</button><button class="btn primary" id="spNext" type="button">Next</button><button class="btn" id="spClose" type="button" style="margin-left:auto">${esc(cfg.done || "I'm steadier, close")}</button></div>
      ${cfg.crisis === false ? "" : CRISIS}</div>`;
    document.body.append(o);
    const q = id => o.querySelector("#" + id);
    let gi = 0, timer = null, ph = 0, n = 1, count = 0, last = null, rounds = null, opened = 0;
    const showStep = () => {
      q("spStep").textContent = cfg.steps[gi]; q("spPrev").disabled = gi === 0; q("spNext").hidden = gi === cfg.steps.length - 1;
      q("spDots").innerHTML = cfg.steps.map((_, k) => `<i class="${k <= gi ? "on" : ""}"></i>`).join("");
    };
    const showCount = () => { const d = o.querySelectorAll(".todo-item input:checked").length; q("spCount").textContent = d === items.length ? "All done. Enjoy your meal." : `${d} of ${items.length} done` };
    const tick = () => {
      const b = breath[ph];
      q("spNum").textContent = n; q("spLabel").textContent = b.label;
      if (n === 1 && b.grow !== null) orb.go(b.grow ? 1 : .5, b.n);
      if (++n > b.n) { n = 1; ph = (ph + 1) % breath.length; if (ph === 0) { q("spMeta").textContent = `${++count} slow breath${count > 1 ? "s" : ""} · ${cfg.breathText || pace}`; if (rounds !== null) showRounds(++rounds) } }
    };
    const orb = orbAnimator(q("spOrb"));
    /* Tapping the acorn restarts the breath at the top of the in-breath, and the cap counts the full rounds finished since the tap. */
    const showRounds = r => { const el = q("spRounds"); el.hidden = false; el.textContent = r; el.setAttribute("aria-label", `${r} round${r === 1 ? "" : "s"} since you tapped`) };
    function restart() {
      clearInterval(timer); ph = 0; n = 1; rounds = 0; showRounds(0); orb.set(.5);
      q("spTapHint") && (q("spTapHint").textContent = "Counting rounds since your tap. Tap again to start over.");
      tick(); timer = setInterval(tick, 1000);
    }
    if (cfg.tapRestart) {
      const t = q("spTap");
      t.addEventListener("click", restart);
      t.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); restart() } });
    }
    const page = () => document.querySelector(".wrap");
    const fabs = () => document.querySelectorAll(".sploot-fab");
    function open() {
      last = document.activeElement; gi = 0; ph = 0; n = 1; count = 0; rounds = null; opened = Date.now();
      if (cfg.tapRestart) { q("spRounds").hidden = true; q("spTapHint").textContent = "Tap the acorn to start from the beginning and count your rounds." }
      if (cfg.steps) showStep(); else { o.querySelectorAll(".todo-item input").forEach(c => c.checked = false); showCount() }
      o.hidden = false; page().inert = true; fabs().forEach(f => f.inert = true);
      orb.set(.5); clearInterval(timer);
      requestAnimationFrame(() => { tick(); timer = setInterval(tick, 1000) });
      (cfg.steps ? q("spNext") : o.querySelector(".todo-item input")).focus();
    }
    /* cfg.record: a localStorage key. Each session (open to close) is saved there, and synced to Google Sheets, if it lasted at least
       10 seconds or anything was checked off. */
    function record(finished) {
      if (!cfg.record || !opened) return;
      const secs = Math.round((Date.now() - opened) / 1000), done = o.querySelectorAll(".todo-item input:checked").length;
      opened = 0;
      if (secs < 10 && !done) return;
      const now = new Date(), pad = x => String(x).padStart(2, "0");
      const entry = { id: now.getTime().toString(36), t: now.toISOString(), date: today(), start: (d => `${pad(d.getHours())}:${pad(d.getMinutes())}`)(new Date(now - secs * 1000)),
        minutes: Math.round(secs / 6) / 10, breaths: count, rounds: rounds ?? "", done: items.length ? `${done} of ${items.length}` : "", finished,
        page: (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") };
      save(cfg.record, [entry, ...load(cfg.record, [])]); synced();
    }
    function close(finished) { record(finished === true);
      o.hidden = true; clearInterval(timer); orb.stop(); page().inert = false; fabs().forEach(f => f.inert = false); last?.focus?.() }
    if (cfg.steps) {
      q("spNext").onclick = () => { gi = Math.min(gi + 1, cfg.steps.length - 1); showStep() };
      q("spPrev").onclick = () => { gi = Math.max(gi - 1, 0); showStep() };
    } else o.addEventListener("change", showCount);
    q("spClose").onclick = () => close(true);
    o.addEventListener("keydown", e => {
      if (e.key === "Escape") return close(false);
      if (e.key !== "Tab") return;
      const f = [...o.querySelectorAll("button, input, a[href]")].filter(el => !el.disabled && el.getClientRects().length);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
    });
    document.querySelectorAll(cfg.trigger || ".sploot-fab").forEach(b => b.addEventListener("click", e => { e.preventDefault(); open() }));
    return { open, close };
  }

  /* Integrative Eating's Sploot: a before-you-eat checklist. Used on eating.html (button at the top) and on the start page. */
  const EATING_SPLOOT = {
  theme: "t4",
  eyebrow: "Sploot · before you eat", title: "Calm conductor checklist",
  intro: "Tick each one off as you go. The acorn paces a 4-7-8 breath: in for 4, hold for 7, out for 8.",
  breath: [{ label: "Breathe in", n: 4, grow: true }, { label: "Hold", n: 7, grow: null }, { label: "Breathe out", n: 8, grow: false }],
  breathText: "in 4, hold 7, out 8",
  crisis: false, done: "Ready to eat", tapRestart: true, record: "groundwork-eating-sploot",
  checklist: [
    { group: "Set the table", items: ["<b>Sit down</b> at a table, not standing or on the go.", "<b>Phone down</b>, face down or in another room. Screens off.", "<b>Fork down</b> until you're ready for the first bite."] },
    { group: "Ground", items: ["Feel your <b>feet on the floor</b> and your weight in the chair. Let the chair hold you.", "Soften your <b>jaw, shoulders and belly</b>."] },
    { group: "Breathe", items: ["Take <b>2–4 slow belly breaths</b> with the acorn. Let your belly rise on the in-breath.", "Notice your body shifting into <b>rest and digest</b>: a softer breath, a calmer heart."] },
    { group: "Be mindful", items: ["<b>Look</b> at your food: its colors, shapes and textures.", "<b>Smell</b> it, and notice your mouth getting ready.", "Take a moment for <b>gratitude</b> or a prayer.", "Check your <b>hunger</b>: how hungry am I, 0 to 10?"] },
    { group: "Chew", items: ["Take a small first bite and <b>chew it 30–50 times</b>, until it's smooth, before you swallow.", "<b>Put your fork down</b> between bites, and keep chewing each bite 30–50 times.", "Halfway through, <b>pause and check in</b>: how full am I now?"] },
  ],
  };

  /* The Google Sheets controls (wired up by sync.js) go at the start of the page's .links[data-sync]. */
  const bar = document.querySelector("[data-sync]");
  if (bar) bar.insertAdjacentHTML("afterbegin", `<div class="sync" id="sync"><span class="sync-state" id="syncState">Saved on this device</span><a class="btn" id="openSheet" href="#" target="_blank" rel="noopener" hidden>Open sheet</a><button class="btn" id="signIn" type="button">Sync to Google Sheets</button><button class="btn" id="signOut" type="button" hidden>Disconnect</button></div>`);

  window.GW = { $, esc, load, save, synced, toast, copy, download, today, fmtDate, tabs, journal, checklist, wireRanges, sploot, EATING_SPLOOT };
})();

/* Shared helpers for the Groundwork tool pages (thoughts.html, dbt.html, eating.html).
   Everything is saved in this browser only, under one localStorage key per page. */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function load(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback } catch { return fallback } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true } catch { return false } }

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
  function journal({ key, form, list, title, count, name }) {
    let items = load(key, []);
    const fields = () => {
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
      const fd = new FormData(form), entry = { id: Date.now().toString(36), t: new Date().toISOString() };
      F.forEach(f => { entry[f.name] = f.multi ? fd.getAll(f.name) : f.box ? fd.has(f.name) : f.range ? +fd.get(f.name) : (fd.get(f.name) || "").trim() });
      // Untouched sliders are recorded as given only when the person moved them or the form marks them as always recorded.
      form.querySelectorAll('input[type="range"]:not([data-touched]):not([data-keep])').forEach(r => entry[r.name] = "");
      items.unshift(entry); save(key, items); render();
      form.reset(); form.querySelectorAll("[data-touched]").forEach(r => delete r.dataset.touched);
      form.querySelectorAll('input[type="date"]').forEach(d => d.value = today());
      form.querySelectorAll('input[type="range"]').forEach(r => r.dispatchEvent(new Event("input")));
      toast("Saved on this device");
      list.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    form.addEventListener("input", e => { if (e.target.type === "range") e.target.dataset.touched = "" });
    list.addEventListener("click", e => {
      const b = e.target.closest("[data-del]"); if (!b) return;
      if (!confirm("Delete this entry? This can't be undone.")) return;
      items.splice(+b.dataset.del, 1); save(key, items); render(); toast("Deleted");
    });
    form.querySelectorAll('input[type="date"]').forEach(d => d.value ||= today());
    wireRanges(form);
    render();

    const markdown = () => `# ${name}\n\n` + (items.length ? items.map(e => `## ${title(e)}\n\n` + rowsOf(e).map(([k, v]) => `- **${k}:** ${String(v).replace(/\n+/g, " / ")}`).join("\n")).join("\n\n") : "_No entries yet._") + "\n";
    const html = () => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title><style>body{font:13px/1.45 Verdana,sans-serif;color:#222;max-width:760px;margin:24px auto;padding:0 20px}h1{font-size:20px}h2{font-size:14px;margin:18px 0 4px;border-bottom:1px solid #e3ddca;padding-bottom:2px}dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;margin:0}dt{color:#6b6450;font-weight:bold}dd{margin:0;white-space:pre-wrap}@page{size:letter;margin:.6in}</style></head><body><h1>${esc(name)}</h1><p style="color:#777">Saved ${esc(fmtDate(new Date()))} from Groundwork. Self-reported; not a clinical record.</p>${items.map(e => `<h2>${esc(title(e))}</h2><dl>${rowsOf(e).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`).join("") || "<p>No entries yet.</p>"}</body></html>`;
    return {
      get items() { return items },
      copyMarkdown: () => copy(markdown(), "Markdown copied"),
      saveFile: () => { download(key.replace(/^groundwork-/, "groundwork-") + "-" + today() + ".html", html()); toast("Saved as file") },
    };
  }

  /* A simple persistent checklist: checkboxes with data-key inside root. */
  function checklist(root, key) {
    const s = load(key, {});
    root.querySelectorAll("input[type=checkbox][data-key]").forEach(c => {
      c.checked = !!s[c.dataset.key];
      c.addEventListener("change", () => { s[c.dataset.key] = c.checked; save(key, s) });
    });
  }

  window.GW = { $, esc, load, save, toast, copy, download, today, fmtDate, tabs, journal, checklist, wireRanges };
})();

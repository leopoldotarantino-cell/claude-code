// Content script per Google Meet: legge i sottotitoli automatici di Meet,
// che riportano il nome di chi parla, e li salva come trascrizione.
(() => {
  const CAPTIONS = /caption|sottotitol|subt[ií]tul/i;
  const TURN_ON = /(attiva|turn on|activar|mostra|show).*(sottotitol|caption|subt[ií]tul)/i;
  const LEAVE = /abbandona|leave call|salir de la llamada|esci dalla chiamata/i;
  const SELF = /^(you|tu|tú|io)$/i;

  let settings = { myName: "Io", autoCaptions: true };
  let session = null;
  let captionsSeen = false;
  let clicks = 0;
  const entryOf = new WeakMap(); // blocco dei sottotitoli -> intervento

  chrome.storage.sync.get(settings, (s) => (settings = s));

  const captionRegion = () =>
    [...document.querySelectorAll('[role="region"][aria-label]')].find((r) => CAPTIONS.test(r.getAttribute("aria-label")));

  const inCall = () =>
    [...document.querySelectorAll("button[aria-label]")].some((b) => LEAVE.test(b.getAttribute("aria-label")));

  // Ogni intervento è un blocco con avatar + nome e il testo. Usa le classi note di Meet
  // e, se cambiano, ricade su una lettura basata sulla struttura (avatar -> blocco).
  function blocksIn(region) {
    const known = region.querySelectorAll(".nMcdL");
    if (known.length) return [...known];
    return [...region.querySelectorAll("img")].map((img) => {
      const header = img.parentElement;
      let el = header;
      while (el && el !== region && el.innerText.trim() === header.innerText.trim()) el = el.parentElement;
      return el && el !== region ? el : null;
    }).filter(Boolean);
  }

  function readBlock(block) {
    const img = block.querySelector("img");
    let header = img;
    while (header && header.parentElement !== block) header = header.parentElement;
    const name = (block.querySelector(".NWpY1d")?.innerText || header?.innerText || "").trim();
    const textEl = block.querySelector(".ygicle");
    const text = textEl ? textEl.innerText
      : [...block.children].filter((c) => c !== header).map((c) => c.innerText).join(" ");
    return { name, text: text.replace(/\s+/g, " ").trim() };
  }

  // Meet corregge e accorcia il testo mentre la persona parla: teniamo il testo completo.
  function mergeText(old, now) {
    if (!old) return now;
    const head = Math.min(30, old.length, now.length);
    if (old.slice(0, head) === now.slice(0, head)) return now.length >= old.length * 0.8 ? now : old;
    for (let k = Math.min(old.length, now.length); k >= 15; k--) {
      if (old.endsWith(now.slice(0, k))) return old + now.slice(k);
    }
    const p = old.indexOf(now.slice(0, 30));
    if (p >= 0) return old.slice(0, p) + now;
    return old + " " + now;
  }

  function startSession() {
    const code = location.pathname.split("/")[1] || "";
    session = {
      key: `call:${Date.now()}`, start: Date.now(), entries: [],
      title: `Google Meet ${code}`.trim(), date: new Date().toISOString(),
    };
  }

  function scan() {
    const region = captionRegion();
    if (region) captionsSeen = true;
    else if (settings.autoCaptions && !captionsSeen && clicks < 3 && inCall()) {
      const btn = [...document.querySelectorAll("button[aria-label]")].find((b) => TURN_ON.test(b.getAttribute("aria-label")));
      if (btn) { clicks++; btn.click(); }
    }
    if (region) {
      for (const block of blocksIn(region)) {
        const { name, text } = readBlock(block);
        if (!text) continue;
        let e = entryOf.get(block);
        if (!e || e.rawName !== name) {
          if (!session) startSession();
          e = { t: Date.now() - session.start, rawName: name, speaker: SELF.test(name) ? settings.myName : name || "Sconosciuto", text: "" };
          session.entries.push(e);
          entryOf.set(block, e);
        }
        const updated = mergeText(e.text, text);
        if (updated !== e.text) { e.text = updated; dirty = true; }
      }
    }
    badge(region);
  }

  let dirty = false;
  function save() {
    if (!dirty || !session) return;
    dirty = false;
    const { key, title, date, entries } = session;
    chrome.storage.local.set({
      [key]: { title, date, source: "meet", entries: entries.map(({ t, speaker, text }) => ({ t, speaker, text })) },
    });
  }

  let badgeEl;
  function badge(region) {
    if (!inCall() && !session) { badgeEl?.remove(); badgeEl = null; return; }
    if (!badgeEl) {
      badgeEl = document.createElement("div");
      badgeEl.style.cssText = "position:fixed;left:12px;top:12px;z-index:99999;padding:6px 12px;border-radius:99px;" +
        "font:13px system-ui,sans-serif;color:#fff;cursor:pointer;box-shadow:0 2px 8px #0005";
      badgeEl.title = "Apri l'archivio delle trascrizioni";
      badgeEl.onclick = () => chrome.runtime.sendMessage({ type: "openCalls", key: session?.key });
      document.body.appendChild(badgeEl);
    }
    const n = session ? session.entries.length : 0;
    if (region) {
      badgeEl.style.background = "#dc2626";
      badgeEl.textContent = `● Trascrizione attiva · ${n} interventi`;
    } else {
      badgeEl.style.background = "#b45309";
      badgeEl.textContent = n ? `⏸ Sottotitoli spenti · ${n} interventi salvati (premi CC per riprendere)`
        : "📝 Premi CC (sottotitoli) per avviare la trascrizione";
    }
  }

  let timer;
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 200); })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(scan, 2000);
  setInterval(save, 2000);
  window.addEventListener("pagehide", () => { scan(); dirty = true; save(); });
})();

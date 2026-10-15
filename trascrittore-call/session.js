import { getSettings, transcribe, recap } from "./groq.js";
import { Track } from "./recorder.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const startTime = Date.now();
const entries = [];        // { t, speaker, text }
const queue = [];
let settings, tracks = [], streams = [], working = false, recapText = "";

$("callTitle").textContent = params.get("title") || "";
const setStatus = (t, cls = "") => { $("status").textContent = t; $("status").className = "pill " + cls; };
const showBanner = (html) => { $("banner").innerHTML = html; $("banner").hidden = false; };

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, "0")).join(":");
};
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

// Unisce le frasi consecutive della stessa persona.
function merged() {
  const out = [];
  for (const e of [...entries].sort((a, b) => a.t - b.t)) {
    const last = out[out.length - 1];
    if (last && last.speaker === e.speaker) last.text += " " + e.text;
    else out.push({ ...e });
  }
  return out;
}

const transcriptText = () => merged().map((e) => `[${fmt(e.t)}] ${e.speaker}: ${e.text}`).join("\n\n");

function render() {
  const box = $("transcript");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = merged().map((e) =>
    `<p class="${e.speaker === settings.myName ? "me" : "them"}"><span class="t">${fmt(e.t)}</span> <b>${esc(e.speaker)}</b><br>${esc(e.text)}</p>`
  ).join("");
  if (atBottom) box.scrollTop = box.scrollHeight;
  $("pending").textContent = queue.length || working ? `(sto elaborando ${queue.length + (working ? 1 : 0)} blocchi…)` : "";
  chrome.storage.local.set({ lastSession: { title: params.get("title"), date: new Date(startTime).toISOString(), transcript: transcriptText(), recap: recapText } });
}

function enqueue(blob, speaker, t) { queue.push({ blob, speaker, t }); render(); work(); }

async function work() {
  if (working) return;
  working = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      const text = await transcribe(job.blob, settings);
      if (text) entries.push({ t: job.t, speaker: job.speaker, text });
    } catch (err) {
      showBanner(`⚠️ Errore di trascrizione: ${esc(err.message)}`);
    }
    render();
  }
  working = false;
  render();
}

async function begin() {
  const ctx = new AudioContext();
  // Catturare la scheda la silenzia: la rimandiamo alle casse/cuffie.
  ctx.createMediaStreamSource(streams[0]).connect(ctx.destination);
  await ctx.resume();
  if (ctx.state !== "running") {
    $("enableAudio").hidden = false;
    await new Promise((r) => ($("enableAudio").onclick = r));
    await ctx.resume();
    $("enableAudio").hidden = true;
  }
  tracks.push(new Track(streams[0], ctx, settings.othersName, startTime, enqueue));
  if (streams[1]) tracks.push(new Track(streams[1], ctx, settings.myName, startTime, enqueue));
  tracks.forEach((t) => t.start());
  setStatus("● In registrazione", "rec");
  $("stop").disabled = false;
}

async function stop() {
  $("stop").disabled = true;
  setStatus("Completo la trascrizione…");
  await Promise.all(tracks.map((t) => t.stop()));
  streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
  while (queue.length || working) await new Promise((r) => setTimeout(r, 300));
  setStatus("Terminata", "done");
  $("recapBtn").disabled = false;
}

async function makeRecap() {
  $("recapBtn").disabled = true;
  $("recapBox").hidden = false;
  try {
    recapText = await recap(transcriptText(), settings, (s) => ($("recap").textContent = s));
    $("recap").innerHTML = markdown(recapText);
    render();
  } catch (err) {
    $("recap").textContent = "Errore: " + err.message;
  }
  $("recapBtn").disabled = false;
}

// Markdown essenziale: titoli, elenchi, grassetto.
function markdown(md) {
  return esc(md).split("\n").map((l) => {
    l = l.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    if (/^#{1,6} /.test(l)) return `<h3>${l.replace(/^#+ /, "")}</h3>`;
    if (/^\s*[-*] /.test(l)) return `<li>${l.replace(/^\s*[-*] /, "")}</li>`;
    return l.trim() ? `<p>${l}</p>` : "";
  }).join("");
}

const fullMarkdown = () =>
  `# ${params.get("title") || "Call"} — ${new Date(startTime).toLocaleString("it-IT")}\n\n` +
  (recapText ? `# Recap\n\n${recapText}\n\n` : "") + `# Trascrizione\n\n${transcriptText()}\n`;

$("stop").onclick = stop;
$("recapBtn").onclick = makeRecap;
$("copy").onclick = () => navigator.clipboard.writeText(fullMarkdown());
$("download").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([fullMarkdown()], { type: "text/markdown" }));
  a.download = `call-${new Date(startTime).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`;
  a.click();
};
window.addEventListener("beforeunload", (e) => { if (!$("stop").disabled) e.preventDefault(); });

(async () => {
  settings = await getSettings();
  if (!settings.apiKey) {
    setStatus("Configurazione mancante", "err");
    showBanner(`Manca la chiave API Groq (gratuita). <a href="options.html" target="_blank">Apri le impostazioni</a>, poi chiudi questa finestra e riclicca l'icona.`);
    return;
  }
  try {
    streams.push(await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: params.get("streamId") } },
    }));
  } catch (err) {
    setStatus("Errore", "err");
    showBanner(`Non riesco a catturare l'audio della scheda (${esc(err.message)}). Chiudi questa finestra, torna sulla scheda della call e riclicca l'icona.`);
    return;
  }
  try {
    streams.push(await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }));
  } catch {
    showBanner("⚠️ Microfono non autorizzato: trascrivo solo gli altri partecipanti. Per includere la tua voce consenti il microfono e riavvia.");
  }
  streams[0].getAudioTracks()[0].onended = () => { if (!$("stop").disabled) stop(); };
  await begin();
})();

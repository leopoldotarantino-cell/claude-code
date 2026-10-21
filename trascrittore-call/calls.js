import { getSettings, recap } from "./groq.js";
import { fmt, esc, merged, transcriptText, callMarkdown, download, markdown, SOURCE_LABEL } from "./util.js";

const $ = (id) => document.getElementById(id);
let calls = {}, recaps = {}, current = new URLSearchParams(location.search).get("key");
const settings = await getSettings();

// Un colore stabile per ogni persona.
const COLORS = ["#2563eb", "#16a34a", "#c026d3", "#ea580c", "#0891b2", "#ca8a04", "#dc2626", "#4f46e5"];
const colorOf = (name, names) => COLORS[names.indexOf(name) % COLORS.length];

// L'altra trascrizione della stessa Meet (sottotitoli <-> backup audio), se esiste.
function partnerOf(key) {
  const c = calls[key];
  if (!c?.meetCode) return null;
  return Object.keys(calls).find((k) => k !== key && calls[k].meetCode === c.meetCode &&
    calls[k].source !== c.source && Math.abs(new Date(calls[k].date) - new Date(c.date)) < 3 * 3600e3) || null;
}

async function load() {
  const all = await chrome.storage.local.get(null);
  calls = {}; recaps = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith("call:")) calls[k] = v;
    if (k.startsWith("recap:")) recaps[k.slice(6)] = v;
  }
  if (!calls[current]) current = Object.keys(calls).sort().pop() || null;
  render();
}

function render() {
  const keys = Object.keys(calls).sort().reverse();
  $("list").innerHTML = keys.map((k) => {
    const c = calls[k];
    return `<li class="${k === current ? "active" : ""}" data-key="${esc(k)}"><b>${esc(c.title || "Call")}</b><br>
      <span class="muted">${c.source === "meet" ? "📝" : "🎙"} ${new Date(c.date).toLocaleString("it-IT")} · ${new Set(c.entries.map((e) => e.speaker)).size} persone</span></li>`;
  }).join("");
  $("empty").hidden = !!current;
  $("view").hidden = !current;
  if (!current) return;

  const call = calls[current];
  const items = merged(call.entries);
  const names = [...new Set(items.map((e) => e.speaker))];
  const last = items.length ? call.entries.reduce((m, e) => Math.max(m, e.t), 0) : 0;
  $("title").textContent = call.title || "Call";
  $("meta").textContent = `${new Date(call.date).toLocaleString("it-IT")} · durata ~${fmt(last)} · ${names.join(", ") || "nessun intervento"}`;
  const partner = partnerOf(current);
  $("sources").innerHTML = `Trascrizione da ${SOURCE_LABEL[call.source] || "audio"}` + (partner
    ? ` · <a href="#" data-key="${esc(partner)}">passa a quella da ${SOURCE_LABEL[calls[partner].source] || "audio"}</a>` : "");
  $("live").hidden = Date.now() - new Date(call.date).getTime() - last > 60000;

  const box = $("transcript");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = items.map((e) =>
    `<p style="border-left:4px solid ${colorOf(e.speaker, names)}"><span class="t">${fmt(e.t)}</span>
     <b style="color:${colorOf(e.speaker, names)}">${esc(e.speaker)}</b><br>${esc(e.text)}</p>`).join("");
  if (atBottom) box.scrollTop = box.scrollHeight;

  const r = recaps[current] || recaps[partner];
  $("recapBox").hidden = !r;
  if (r) $("recap").innerHTML = markdown(r);
}

function select(key) { current = key; history.replaceState(null, "", `?key=${encodeURIComponent(key)}`); render(); }
$("list").onclick = (e) => { const li = e.target.closest("li"); if (li) select(li.dataset.key); };
$("sources").onclick = (e) => { const a = e.target.closest("a"); if (a) { e.preventDefault(); select(a.dataset.key); } };

$("recapBtn").onclick = async () => {
  if (!settings.apiKey) { alert("Per il recap serve la chiave Groq gratuita: inseriscila nelle Impostazioni."); return; }
  const key = current, partner = partnerOf(key);
  $("recapBtn").disabled = true;
  $("recapBox").hidden = false;
  // Con il backup audio, il recap usa entrambe: nomi dai sottotitoli, parole precise dall'audio.
  const pair = partner ? [key, partner].sort((a, b) => (calls[a].source === "meet" ? -1 : 1)) : [key];
  const input = pair.map((k, i) => (partner ? `### TRASCRIZIONE ${"AB"[i]} (${SOURCE_LABEL[calls[k].source]})\n` : "") +
    transcriptText(calls[k].entries)).join("\n\n");
  try {
    const text = await recap(input, settings, (s) => ($("recap").textContent = s));
    await chrome.storage.local.set(Object.fromEntries(pair.map((k) => [`recap:${k}`, text])));
  } catch (err) {
    $("recap").textContent = "Errore: " + err.message;
  }
  $("recapBtn").disabled = false;
};

const fullMarkdown = () => {
  const p = partnerOf(current);
  return callMarkdown(calls[current], recaps[current] || recaps[p], p && calls[p]);
};
$("copy").onclick = () => navigator.clipboard.writeText(fullMarkdown());
$("download").onclick = () => download(fullMarkdown(), calls[current].date);
$("del").onclick = async () => {
  if (!confirm("Eliminare questa call?")) return;
  await chrome.storage.local.remove([current, `recap:${current}`]);
  current = null;
};

chrome.storage.onChanged.addListener((_, area) => area === "local" && load());
load();

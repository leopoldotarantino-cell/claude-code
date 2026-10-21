import { getSettings, recap } from "./groq.js";
import { fmt, esc, merged, transcriptText, callMarkdown, download, markdown } from "./util.js";

const $ = (id) => document.getElementById(id);
let calls = {}, recaps = {}, current = new URLSearchParams(location.search).get("key");
const settings = await getSettings();

// Un colore stabile per ogni persona.
const COLORS = ["#2563eb", "#16a34a", "#c026d3", "#ea580c", "#0891b2", "#ca8a04", "#dc2626", "#4f46e5"];
const colorOf = (name, names) => COLORS[names.indexOf(name) % COLORS.length];

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
      <span class="muted">${new Date(c.date).toLocaleString("it-IT")} · ${new Set(c.entries.map((e) => e.speaker)).size} persone</span></li>`;
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
  $("live").hidden = Date.now() - new Date(call.date).getTime() - last > 60000;

  const box = $("transcript");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = items.map((e) =>
    `<p style="border-left:4px solid ${colorOf(e.speaker, names)}"><span class="t">${fmt(e.t)}</span>
     <b style="color:${colorOf(e.speaker, names)}">${esc(e.speaker)}</b><br>${esc(e.text)}</p>`).join("");
  if (atBottom) box.scrollTop = box.scrollHeight;

  const r = recaps[current];
  $("recapBox").hidden = !r;
  if (r) $("recap").innerHTML = markdown(r);
}

$("list").onclick = (e) => {
  const li = e.target.closest("li");
  if (li) { current = li.dataset.key; history.replaceState(null, "", `?key=${encodeURIComponent(current)}`); render(); }
};

$("recapBtn").onclick = async () => {
  if (!settings.apiKey) { alert("Per il recap serve la chiave Groq gratuita: inseriscila nelle Impostazioni."); return; }
  const key = current;
  $("recapBtn").disabled = true;
  $("recapBox").hidden = false;
  try {
    const text = await recap(transcriptText(calls[key].entries), settings, (s) => ($("recap").textContent = s));
    await chrome.storage.local.set({ [`recap:${key}`]: text });
  } catch (err) {
    $("recap").textContent = "Errore: " + err.message;
  }
  $("recapBtn").disabled = false;
};

$("copy").onclick = () => navigator.clipboard.writeText(callMarkdown(calls[current], recaps[current]));
$("download").onclick = () => download(callMarkdown(calls[current], recaps[current]), calls[current].date);
$("del").onclick = async () => {
  if (!confirm("Eliminare questa call?")) return;
  await chrome.storage.local.remove([current, `recap:${current}`]);
  current = null;
};

chrome.storage.onChanged.addListener((_, area) => area === "local" && load());
load();

import { DEFAULTS, getSettings } from "./groq.js";

const s = await getSettings();
for (const k of Object.keys(DEFAULTS)) document.getElementById(k).value = s[k];

document.getElementById("save").onclick = async () => {
  const out = {};
  for (const k of Object.keys(DEFAULTS)) out[k] = document.getElementById(k).value.trim() || DEFAULTS[k];
  await chrome.storage.sync.set(out);
  document.getElementById("saved").textContent = "✓ Salvato";
};

const { lastSession: last } = await chrome.storage.local.get("lastSession");
if (last?.transcript) {
  const md = `# ${last.title || "Call"} — ${new Date(last.date).toLocaleString("it-IT")}\n\n` +
    (last.recap ? `# Recap\n\n${last.recap}\n\n` : "") + `# Trascrizione\n\n${last.transcript}\n`;
  document.getElementById("last").textContent = `${last.title || "Call"} — ${new Date(last.date).toLocaleString("it-IT")}`;
  document.getElementById("lastText").textContent = md;
  for (const id of ["dlLast", "copyLast"]) document.getElementById(id).hidden = false;
  document.getElementById("copyLast").onclick = () => navigator.clipboard.writeText(md);
  document.getElementById("dlLast").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    a.download = `call-${last.date.slice(0, 16).replace(/[:T]/g, "-")}.md`;
    a.click();
  };
}

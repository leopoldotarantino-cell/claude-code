import { DEFAULTS, getSettings } from "./groq.js";

const s = await getSettings();
const field = (k) => document.getElementById(k);
for (const k of Object.keys(DEFAULTS)) {
  if (typeof DEFAULTS[k] === "boolean") field(k).checked = s[k];
  else field(k).value = s[k];
}

document.getElementById("save").onclick = async () => {
  const out = {};
  for (const k of Object.keys(DEFAULTS)) {
    out[k] = typeof DEFAULTS[k] === "boolean" ? field(k).checked : field(k).value.trim() || DEFAULTS[k];
  }
  await chrome.storage.sync.set(out);
  document.getElementById("saved").textContent = "✓ Salvato";
};

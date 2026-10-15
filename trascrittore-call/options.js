import { DEFAULTS, getSettings } from "./groq.js";

const s = await getSettings();
for (const k of Object.keys(DEFAULTS)) document.getElementById(k).value = s[k];

document.getElementById("save").onclick = async () => {
  const out = {};
  for (const k of Object.keys(DEFAULTS)) out[k] = document.getElementById(k).value.trim() || DEFAULTS[k];
  await chrome.storage.sync.set(out);
  document.getElementById("saved").textContent = "✓ Salvato";
};

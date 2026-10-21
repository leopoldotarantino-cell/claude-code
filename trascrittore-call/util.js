// Funzioni condivise tra finestra di registrazione e archivio.
export const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, "0")).join(":");
};

export const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Unisce gli interventi consecutivi della stessa persona.
export function merged(entries) {
  const out = [];
  for (const e of [...entries].sort((a, b) => a.t - b.t)) {
    const last = out[out.length - 1];
    if (last && last.speaker === e.speaker) last.text += " " + e.text;
    else out.push({ ...e });
  }
  return out;
}

export const transcriptText = (entries) =>
  merged(entries).map((e) => `[${fmt(e.t)}] ${e.speaker}: ${e.text}`).join("\n\n");

export const callMarkdown = (call, recapText) =>
  `# ${call.title || "Call"} — ${new Date(call.date).toLocaleString("it-IT")}\n\n` +
  (recapText ? `# Recap\n\n${recapText}\n\n` : "") + `# Trascrizione\n\n${transcriptText(call.entries)}\n`;

export function download(text, date) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  a.download = `call-${new Date(date).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`;
  a.click();
}

// Markdown essenziale: titoli, elenchi, grassetto.
export function markdown(md) {
  return esc(md).split("\n").map((l) => {
    l = l.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    if (/^#{1,6} /.test(l)) return `<h3>${l.replace(/^#+ /, "")}</h3>`;
    if (/^\s*[-*] /.test(l)) return `<li>${l.replace(/^\s*[-*] /, "")}</li>`;
    return l.trim() ? `<p>${l}</p>` : "";
  }).join("");
}

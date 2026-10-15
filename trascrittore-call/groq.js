// Client minimale per le API Groq (gratuite, compatibili OpenAI).
const API = "https://api.groq.com/openai/v1";

export const DEFAULTS = {
  apiKey: "", language: "auto", myName: "Io", othersName: "Interlocutori",
  sttModel: "whisper-large-v3", llmModel: "llama-3.3-70b-versatile",
};

export async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.sync.get(Object.keys(DEFAULTS))) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ripete la richiesta in caso di limite raggiunto (429) o errori temporanei.
async function call(path, apiKey, body, isJson) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + path, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, ...(isJson ? { "Content-Type": "application/json" } : {}) },
      body: isJson ? JSON.stringify(body) : body(),
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 8) {
      const wait = parseFloat(res.headers.get("retry-after")) || 2 ** attempt;
      await sleep(Math.min(wait, 60) * 1000);
      continue;
    }
    throw new Error(`Groq ${res.status}: ${await res.text()}`);
  }
}

// Frasi che Whisper "inventa" sui silenzi.
const HALLUCINATIONS = [
  /amara\.org/i, /sottotitoli/i, /subt[ií]tulos/i, /grazie per la visione/i,
  /thanks? (you )?for watching/i, /gracias por ver/i, /^\W*(grazie|thank you|gracias)\W*$/i,
];

export async function transcribe(blob, s) {
  const data = await call("/audio/transcriptions", s.apiKey, () => {
    const fd = new FormData();
    fd.append("file", blob, "chunk.webm");
    fd.append("model", s.sttModel);
    fd.append("response_format", "verbose_json");
    fd.append("temperature", "0");
    if (s.language !== "auto") fd.append("language", s.language);
    return fd;
  });
  const text = (data.segments || [])
    .filter((seg) => seg.no_speech_prob < 0.6 && seg.avg_logprob > -1)
    .map((seg) => seg.text.trim())
    .join(" ")
    .trim();
  return HALLUCINATIONS.some((r) => r.test(text)) ? "" : text;
}

async function chat(s, system, user) {
  const data = await call("/chat/completions", s.apiKey, {
    model: s.llmModel, temperature: 0.2,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  }, true);
  return data.choices[0].message.content;
}

const RECAP_PROMPT = `Sei un assistente che riassume call di lavoro. La call può essere in italiano, inglese o spagnolo: rispondi SEMPRE in italiano, in Markdown, con queste sezioni:
## Sintesi (3-5 righe)
## Partecipanti (nomi e ruoli se deducibili)
## Punti chiave
## Decisioni prese
## Action item (chi / cosa / entro quando, se detto)
## Domande aperte
Non inventare nulla che non sia nella trascrizione. La trascrizione può contenere piccoli errori di riconoscimento.`;

// Le call lunghe superano i limiti del piano gratuito: si riassumono a pezzi e poi si unisce.
export async function recap(transcript, s, onStatus = () => {}) {
  const MAX = 18000;
  if (transcript.length <= MAX) return chat(s, RECAP_PROMPT, transcript);
  const parts = [];
  let cur = "";
  for (const line of transcript.split("\n")) {
    if (cur.length + line.length > MAX && cur) { parts.push(cur); cur = ""; }
    cur += line + "\n";
  }
  if (cur) parts.push(cur);
  const notes = [];
  for (let i = 0; i < parts.length; i++) {
    onStatus(`Analizzo parte ${i + 1} di ${parts.length}…`);
    notes.push(await chat(s,
      "Estrai in italiano, in elenco puntato, tutti i fatti, decisioni, action item, nomi e domande aperte di questa porzione di call. Sii completo ma conciso.",
      parts[i]));
  }
  onStatus("Scrivo il recap finale…");
  return chat(s, RECAP_PROMPT + "\nRiceverai appunti già estratti dalle varie parti della call, in ordine.",
    notes.map((n, i) => `### Parte ${i + 1}\n${n}`).join("\n\n"));
}

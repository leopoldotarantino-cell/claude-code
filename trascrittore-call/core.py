"""Trascrizione call con riconoscimento speaker (OpenAI) + recap."""
import math
import os
import tempfile

from openai import OpenAI
from pydub import AudioSegment

TRANSCRIBE_MODEL = os.getenv("TRANSCRIBE_MODEL", "gpt-4o-transcribe-diarize")
RECAP_MODEL = os.getenv("RECAP_MODEL", "gpt-4o")
MAX_CHUNK_SEC = 20 * 60  # i file oltre ~25MB vanno spezzati

client = OpenAI()


def _chunks(path):
    """Converte in mp3 mono e spezza in blocchi da max 20 minuti."""
    audio = AudioSegment.from_file(path).set_channels(1).set_frame_rate(16000)
    n = max(1, math.ceil(len(audio) / 1000 / MAX_CHUNK_SEC))
    for i in range(n):
        part = audio[i * MAX_CHUNK_SEC * 1000:(i + 1) * MAX_CHUNK_SEC * 1000]
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        part.export(tmp.name, format="mp3", bitrate="64k")
        yield tmp.name, i * MAX_CHUNK_SEC


def transcribe(path, language="it", progress=None):
    """Ritorna una lista di segmenti {speaker, start, end, text}."""
    segments, chunks = [], list(_chunks(path))
    for idx, (chunk, offset) in enumerate(chunks):
        with open(chunk, "rb") as f:
            res = client.audio.transcriptions.create(
                model=TRANSCRIBE_MODEL,
                file=f,
                language=language,
                response_format="diarized_json",
                chunking_strategy="auto",
            )
        os.unlink(chunk)
        for s in res.segments:
            # gli speaker sono stimati per blocco: prefisso per non confonderli
            spk = s.speaker if len(chunks) == 1 else f"{s.speaker} (parte {idx + 1})"
            segments.append({"speaker": spk, "start": s.start + offset,
                             "end": s.end + offset, "text": s.text.strip()})
        if progress:
            progress((idx + 1) / len(chunks))
    return _merge(segments)


def _merge(segments):
    """Unisce segmenti consecutivi dello stesso speaker."""
    out = []
    for s in segments:
        if out and out[-1]["speaker"] == s["speaker"]:
            out[-1]["end"] = s["end"]
            out[-1]["text"] += " " + s["text"]
        else:
            out.append(dict(s))
    return out


def fmt_time(sec):
    sec = int(sec)
    return f"{sec // 3600:02d}:{sec % 3600 // 60:02d}:{sec % 60:02d}"


def to_text(segments, names=None):
    names = names or {}
    return "\n\n".join(
        f"[{fmt_time(s['start'])}] {names.get(s['speaker'], s['speaker'])}: {s['text']}"
        for s in segments)


def recap(transcript):
    """Recap strutturato della call in italiano."""
    res = client.chat.completions.create(
        model=RECAP_MODEL,
        messages=[
            {"role": "system", "content": (
                "Sei un assistente che riassume call di lavoro. Rispondi in italiano, in Markdown, "
                "con queste sezioni: **Sintesi** (3-5 righe), **Partecipanti e ruoli** (dedotti), "
                "**Punti chiave**, **Decisioni prese**, **Action item** (chi / cosa / entro quando, "
                "se detto), **Domande aperte**. Non inventare nulla che non sia nella trascrizione.")},
            {"role": "user", "content": transcript},
        ],
    )
    return res.choices[0].message.content

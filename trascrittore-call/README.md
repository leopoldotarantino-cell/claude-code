# Trascrittore Call

Carichi la registrazione di una call e ottieni:
1. **Trascrizione con le voci separate** (Speaker A, B, … rinominabili) e timestamp
2. **Recap**: sintesi, partecipanti, punti chiave, decisioni, action item, domande aperte

Usa le API OpenAI: `gpt-4o-transcribe-diarize` (il modello Whisper di nuova generazione che riconosce chi parla) e `gpt-4o` per il recap.

## Installazione
```bash
# serve ffmpeg: macOS `brew install ffmpeg`, Ubuntu `sudo apt install ffmpeg`
cd trascrittore-call
pip install -r requirements.txt
export OPENAI_API_KEY=sk-...
```

## Uso
**Interfaccia web:** `streamlit run app.py` → apri http://localhost:8501, carica il file, premi *Trascrivi*, poi *Genera recap*.

**Da terminale:** `python cli.py call.m4a -o call.md`

## Note
- Formati: mp3, wav, m4a, mp4, webm, ogg, mov, aac. Le call lunghe vengono spezzate in blocchi da 20 minuti automaticamente; in quel caso gli speaker sono etichettati per blocco (es. "A (parte 2)") e puoi unificarli dando lo stesso nome.
- Modelli configurabili con le variabili `TRANSCRIBE_MODEL` e `RECAP_MODEL`.
- Costo indicativo: circa 0,006 $/minuto di audio + pochi centesimi per il recap.

# 🎙️ Trascrittore Call (estensione Chrome)

Trascrive le call **mentre le fai**, distinguendo **ogni partecipante con il suo nome**, e alla fine genera il **recap**: sintesi, decisioni, action item e domande aperte. Lingue: italiano, inglese, spagnolo.

## Come funziona

**Google Meet: modalità consigliata, gratis e senza chiave.**
L'estensione legge i sottotitoli automatici di Meet, che sanno esattamente chi sta parlando. Così ottieni una trascrizione con i nomi veri di tutti i partecipanti, anche 5 o 10 persone:
```
[00:03:12] Manuel Lodi: allora partiamo dal budget…
[00:03:20] Giulia Rossi: io avrei una proposta…
[00:03:31] Leopoldo: va bene, procediamo
```

**Altre piattaforme (Teams web, Zoom web…).**
Clicca l'icona sulla scheda della call: l'estensione registra l'audio e lo trascrive con Whisper (Groq, gratis). In questo caso distingue solo **te** dagli **altri**.

## Installazione (una volta sola)

1. **Chiave gratuita per il recap:** vai su https://console.groq.com/keys, accedi con Google, clicca *Create API Key* e copia la chiave (inizia con `gsk_`).
2. **Scarica ed estrai** la cartella `trascrittore-call`.
3. **Carica l'estensione:** apri `chrome://extensions`, attiva **Modalità sviluppatore**, clicca **Carica estensione non pacchettizzata** e seleziona la cartella.
4. **Fissa l'icona:** clicca il puzzle 🧩, poi la puntina accanto a *Trascrittore Call*.
5. **Configura:** tasto destro sull'icona → **Opzioni**. Incolla la chiave, scrivi il tuo nome e salva.

> Aggiornamento: estrai la nuova versione al posto della vecchia cartella e premi ↻ su `chrome://extensions`. Le call salvate restano.

## Uso con Google Meet

1. Entra nella call. In alto a sinistra compare il badge dell'estensione.
2. L'estensione attiva da sola i **sottotitoli (CC)**. Se non succede, premi tu **CC**. Il badge diventa rosso: **● Trascrizione attiva**.
3. **Lingua:** imposta quella della call nelle impostazioni dei sottotitoli di Meet (icona ⚙️ accanto a CC). Se cambia lingua a metà call, cambiala anche lì.
4. **Archivio:** clicca il badge, o l'icona dell'estensione, per aprire l'archivio. Lì vedi la trascrizione in diretta, con un colore per persona.
5. **Recap:** a fine call premi **📌 Genera recap**, poi **Copia** o **Scarica .md**.

Puoi rimpicciolire i sottotitoli di Meet, ma lasciali accesi: se li spegni, la trascrizione si mette in pausa.
Se ricarichi la pagina o rientri nella stessa Meet entro 3 ore, la trascrizione continua quella già iniziata.

### Backup audio (consigliato per le call importanti)

Durante la Meet clicca l'**icona dell'estensione**: si apre una finestrina che registra anche l'audio e lo trascrive con Whisper. Il badge mostra **🎙 Backup audio attivo**.
- Così hai **due trascrizioni** della stessa call: se una non funziona, c'è l'altra.
- **Sottotitoli 📝:** hanno il nome di ogni persona.
- **Audio 🎙:** è più preciso su cifre, nomi propri e termini tecnici, ma distingue solo te dagli altri.
- **Recap:** usa entrambe. Nell'archivio passi da una all'altra con il link sopra la trascrizione.
- **Fine call:** premi **■ Termina** nella finestrina.
- **Disattivarlo:** togli la spunta nelle Opzioni; a quel punto l'icona apre solo l'archivio.

Consumo indicativo: pochi MB per i sottotitoli e circa 50–100 MB per il backup audio, contro i 500 MB – 1 GB di Meet. Il backup usa la quota gratuita di Groq (circa 8 ore di audio al giorno).

## Limiti

- **Precisione:** è quella dei sottotitoli di Meet. Buona, ma nomi propri e termini tecnici possono uscire storpiati.
- **Aggiornamenti di Meet:** se Google cambia la pagina, la lettura può smettere di funzionare (il badge resta su "Premi CC"). In quel caso va aggiornata l'estensione.
- **Dove funziona:** solo con Meet nel browser Chrome, non dall'app sul telefono.
- **Privacy:** le trascrizioni restano nel tuo Chrome. Solo per il recap il testo viene inviato a Groq. Avvisa i partecipanti che stai trascrivendo.

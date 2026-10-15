# 🎙️ Trascrittore Call (estensione Chrome)

Trascrive **in tempo reale** le call che fai dal browser (Google Meet, Microsoft Teams web, Zoom web, WhatsApp Web, ecc.) in **italiano, inglese o spagnolo**. Separa la **tua voce** da quella degli **altri partecipanti** e a fine call genera il **recap**: sintesi, decisioni, action item e domande aperte.

È gratis: usa le API di **Groq** (Whisper large-v3 per la trascrizione, Llama 3.3 70B per il recap), che hanno un piano gratuito senza carta di credito.

## Installazione (5 minuti, una volta sola)

1. **Chiave gratuita:** vai su https://console.groq.com/keys, accedi con Google e clicca *Create API Key*. Copia la chiave (inizia con `gsk_`).
2. **Scarica l'estensione:** scarica questa cartella `trascrittore-call` sul computer.
3. **Installa in Chrome:** apri `chrome://extensions`, attiva **Modalità sviluppatore** (in alto a destra), clicca **Carica estensione non pacchettizzata** e seleziona la cartella.
4. **Fissa l'icona:** clicca l'icona del puzzle 🧩 e poi la puntina accanto a *Trascrittore Call*.
5. **Configura:** tasto destro sull'icona → **Opzioni**. Incolla la chiave, scegli la lingua e il tuo nome, poi salva.

## Uso

1. Entra nella call nel browser.
2. Su quella scheda clicca l'icona **Trascrittore Call**: si apre una finestrina.
3. La prima volta Chrome ti chiede il permesso per il **microfono**: consentilo (serve a trascrivere la tua voce).
4. La trascrizione compare man mano, con qualche secondo di ritardo. Puoi ridurre la finestrina e continuare la call.
5. A fine call premi **■ Termina**, poi **📌 Genera recap**.
6. **Copia** o **Scarica .md** per salvare recap e trascrizione. L'ultima sessione viene comunque salvata in automatico.

## Consigli e limiti

- **Usa le cuffie.** Senza cuffie il microfono capta anche le voci degli altri, che rischiano di comparire due volte.
- **Voci:** la tua voce è etichettata con il tuo nome, gli altri come "Interlocutori". Se dall'altra parte parlano in più persone, il recap prova a distinguerle dai nomi citati.
- **App desktop:** funziona con le call aperte nel browser. Se usi l'app desktop di Zoom o Teams, entra nella stessa call dal browser (es. "Partecipa dal browser").
- **Limiti del piano gratuito Groq:** circa 8 ore di audio al giorno. Una call di 60 minuti ci sta comodamente. Se si raggiunge il limite al minuto, l'estensione aspetta e riprova da sola.
- **Privacy:** l'audio viene inviato a Groq per la trascrizione. Avvisa i partecipanti che stai trascrivendo la call.

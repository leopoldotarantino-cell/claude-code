// Registra uno stream audio a blocchi, tagliando nelle pause così da non spezzare le frasi.
const LEVEL = 0.01;      // soglia di volume per considerare "voce"
const MIN_LEN = 8000;    // un blocco dura almeno 8s…
const MAX_LEN = 28000;   // …e al massimo 28s
const PAUSE = 700;       // pausa che chiude il blocco

export class Track {
  constructor(stream, ctx, speaker, startTime, onChunk) {
    Object.assign(this, { stream, speaker, startTime, onChunk });
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize);
  }

  start() {
    this.begin();
    this.timer = setInterval(() => this.tick(), 100);
  }

  begin() {
    const rec = new MediaRecorder(this.stream, { mimeType: "audio/webm;codecs=opus" });
    const parts = [];
    const t0 = Date.now() - this.startTime;
    this.voiced = 0; this.silence = 0; this.began = Date.now();
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    this.done = new Promise((resolve) => {
      rec.onstop = () => {
        if (rec.voiced >= 500) this.onChunk(new Blob(parts, { type: "audio/webm" }), this.speaker, t0);
        resolve();
      };
    });
    rec.start();
    this.rec = rec;
  }

  tick() {
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (const v of this.buf) sum += v * v;
    if (Math.sqrt(sum / this.buf.length) > LEVEL) { this.voiced += 100; this.silence = 0; } else this.silence += 100;
    const len = Date.now() - this.began;
    if ((len >= MIN_LEN && this.silence >= PAUSE) || len >= MAX_LEN) this.cut();
  }

  cut() {
    this.rec.voiced = this.voiced;
    this.rec.stop();
    this.begin();
  }

  async stop() {
    clearInterval(this.timer);
    this.rec.voiced = this.voiced;
    this.rec.stop();
    await this.done;
  }
}

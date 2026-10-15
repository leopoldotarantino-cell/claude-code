import os
import tempfile

import streamlit as st

st.set_page_config(page_title="Trascrittore Call", page_icon="🎙️", layout="wide")
st.title("🎙️ Trascrittore Call")

key = os.getenv("OPENAI_API_KEY") or st.sidebar.text_input("OpenAI API key", type="password")
language = st.sidebar.selectbox("Lingua", ["it", "en", "es", "fr", "de"])
if not key:
    st.info("Inserisci la tua OpenAI API key nella barra laterale.")
    st.stop()
os.environ["OPENAI_API_KEY"] = key

import core  # noqa: E402  (dopo aver impostato la key)

file = st.file_uploader("Carica la registrazione della call",
                        type=["mp3", "wav", "m4a", "mp4", "webm", "ogg", "mov", "aac"])

if file and st.button("Trascrivi", type="primary"):
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(file.name)[1], delete=False) as tmp:
        tmp.write(file.getbuffer())
    bar = st.progress(0.0, "Trascrizione in corso…")
    st.session_state.segments = core.transcribe(tmp.name, language, lambda p: bar.progress(p))
    os.unlink(tmp.name)
    bar.empty()
    st.session_state.pop("recap", None)

if "segments" in st.session_state:
    segs = st.session_state.segments
    st.subheader("Nomi degli speaker")
    speakers = sorted({s["speaker"] for s in segs})
    cols = st.columns(min(len(speakers), 4))
    names = {sp: cols[i % len(cols)].text_input(sp, sp) for i, sp in enumerate(speakers)}
    text = core.to_text(segs, names)

    t1, t2 = st.tabs(["📝 Trascrizione", "📌 Recap"])
    with t1:
        for s in segs:
            st.markdown(f"`{core.fmt_time(s['start'])}` **{names[s['speaker']]}**: {s['text']}")
        st.download_button("Scarica trascrizione (.txt)", text, "trascrizione.txt")
    with t2:
        if st.button("Genera recap") or "recap" in st.session_state:
            if "recap" not in st.session_state:
                with st.spinner("Genero il recap…"):
                    st.session_state.recap = core.recap(text)
            st.markdown(st.session_state.recap)
            st.download_button("Scarica tutto (.md)",
                               f"# Recap\n\n{st.session_state.recap}\n\n# Trascrizione\n\n{text}",
                               "call.md")

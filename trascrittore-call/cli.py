"""Uso: python cli.py registrazione.m4a [--lang it] [-o output.md]"""
import argparse

import core

p = argparse.ArgumentParser()
p.add_argument("file")
p.add_argument("--lang", default="it")
p.add_argument("-o", "--output", default="call.md")
a = p.parse_args()

segs = core.transcribe(a.file, a.lang, lambda x: print(f"  {x:.0%}"))
text = core.to_text(segs)
summary = core.recap(text)
with open(a.output, "w") as f:
    f.write(f"# Recap\n\n{summary}\n\n# Trascrizione\n\n{text}\n")
print(f"Salvato in {a.output}")

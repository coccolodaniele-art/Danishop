"""Crea la pagina web di Sintesi Mercati AI (dist/sintesi-mercati-ai/index.html).

Uso:  python crea_pagina.py https://<indirizzo-intermediario>.workers.dev

- modello.html          interfaccia e logica (traduzione per il browser di sintesi_mercati_ai.py)
- dati_programma.json   fonti, domini, parole chiave e istruzioni per l'IA, esportati dal programma desktop
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "dist", "sintesi-mercati-ai", "index.html")

proxy = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else ""
if not proxy.startswith("https://"):
    sys.exit("Indica l'indirizzo https dell'intermediario Cloudflare.")
t = open(os.path.join(HERE, "modello.html"), encoding="utf-8").read()
data = json.load(open(os.path.join(HERE, "dati_programma.json"), encoding="utf-8"))
js = json.dumps(data, ensure_ascii=False).replace("</", "<" + "\/")
assert t.count("__DATA__") == 1 and t.count("'__PROXY_URL__'") == 1
t = t.replace("__DATA__", js).replace("'__PROXY_URL__'", json.dumps(proxy)).replace("/*__DEBUG__*/", "")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w", encoding="utf-8").write(t)
print("Pagina creata:", os.path.normpath(OUT))

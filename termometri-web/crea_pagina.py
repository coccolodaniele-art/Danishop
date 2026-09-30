"""Crea la versione web di SP500 Vertical Thermometers (dist/sp500-thermometers/).

Uso:  python crea_pagina.py https://<indirizzo-intermediario>

- modello.html          interfaccia (stesso aspetto e comportamento del programma desktop)
- logica.js             logica, tradotta riga per riga da sp500_vertical_thermometer.py
- dati_programma.json   costanti, elenchi e prompt esportati dal programma desktop
                        (rigenerarlo con esporta_dati.py dopo ogni modifica al programma)

Scarica anche una copia degli elenchi ufficiali dei ticker SEC (sec_tickers.json): la
pagina la usa solo se www.sec.gov rifiuta la lettura tramite l'intermediario.
"""
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "dist", "sp500-thermometers")
SEC_FILES = [
    "https://www.sec.gov/files/company_tickers.json",
    "https://www.sec.gov/files/company_tickers_exchange.json",
]
SEC_HEADERS = {
    "User-Agent": "SP500VerticalThermometer/1.1 desktop-contact",
    "Accept": "application/json",
    "Accept-Encoding": "identity",
    "Connection": "close",
}

proxy = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else ""
if not proxy.startswith("https://"):
    sys.exit("Indica l'indirizzo https dell'intermediario.")

page = open(os.path.join(HERE, "modello.html"), encoding="utf-8").read()
logic = open(os.path.join(HERE, "logica.js"), encoding="utf-8").read()
data = json.load(open(os.path.join(HERE, "dati_programma.json"), encoding="utf-8"))
assert "</script" not in logic.lower()
js_data = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
assert page.count("/*__LOGICA__*/") == 1 and page.count("__DATA__") == 1 and page.count("'__PROXY_URL__'") == 1
page = page.replace("/*__LOGICA__*/", logic).replace("__DATA__", js_data).replace("'__PROXY_URL__'", json.dumps(proxy))

os.makedirs(OUT_DIR, exist_ok=True)
with open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8") as f:
    f.write(page)
print("Pagina creata:", os.path.normpath(os.path.join(OUT_DIR, "index.html")))

snapshot = {"files": {}}
for url in SEC_FILES:
    request = urllib.request.Request(url, headers=SEC_HEADERS)
    with urllib.request.urlopen(request, timeout=60) as response:
        snapshot["files"][url.rsplit("/", 1)[1]] = json.loads(response.read().decode("utf-8"))
with open(os.path.join(OUT_DIR, "sec_tickers.json"), "w", encoding="utf-8") as f:
    json.dump(snapshot, f, ensure_ascii=False, separators=(",", ":"))
print("Copia elenchi SEC aggiornata:", ", ".join(snapshot["files"]))

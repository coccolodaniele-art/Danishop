"""Controlla le traduzioni del sito (dist/lang/<lingua>.json) rispetto all'italiano.

L'italiano è la lingua base: i contenuti stanno in dist/data.json (modificabili dal Gestore)
e i testi dell'interfaccia in UI_IT dentro dist/app.js. Ogni file di lingua contiene, oltre
alle traduzioni, "source": l'impronta del testo italiano da cui è nata ogni traduzione.
Così si vede subito quali testi sono cambiati in italiano dopo l'ultima traduzione.

Uso:
    python admin/traduzioni.py              elenca le traduzioni mancanti o da aggiornare
    python admin/traduzioni.py firma        dopo aver tradotto: registra le impronte
                                            dell'italiano attuale per i testi tradotti
                                            (tutte le lingue; oppure: firma en de)
"""

import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
LANG_DIR = os.path.join(DIST, "lang")
LANGS = ["en", "es", "de", "fr", "pt"]

# Gli stessi elenchi sono in TR_FIELDS dentro dist/app.js.
FIELDS = {
    "settings": ["tagline", "homeEyebrow", "homeTitle", "homeIntro", "homePoints", "painPoints", "services", "steps",
                 "certsIntro", "ctaTitle", "ctaText", "aboutTitle", "aboutIntro", "about", "skills", "values",
                 "siteAbout", "aboutCta", "programsIntro", "tradingIntro", "toolsIntro", "gamesIntro", "city"],
    "programs": ["name", "tagline", "platform", "description", "features", "trialLabel", "trialInfo", "requirements"],
    "certificates": ["title"],
}


def fingerprint(text):
    return hashlib.sha256(str(text).encode("utf-8")).hexdigest()[:12]


def italian_texts():
    """Tutti i testi italiani da tradurre: {chiave: (gruppo, id, campo, testo)}."""
    with open(os.path.join(DIST, "data.json"), encoding="utf-8") as fh:
        data = json.load(fh)
    out = {}
    for field in FIELDS["settings"]:
        text = data.get("settings", {}).get(field, "")
        if text:
            out[f"settings.{field}"] = ("settings", None, field, text)
    for group in ("programs", "certificates"):
        for item in data.get(group, []):
            for field in FIELDS[group]:
                text = item.get(field, "")
                if text:
                    out[f"{group}.{item['id']}.{field}"] = (group, item["id"], field, text)
    return out


def ui_keys():
    with open(os.path.join(DIST, "app.js"), encoding="utf-8") as fh:
        src = fh.read()
    block = src[src.index("const UI_IT = {"):]
    block = block[:block.index("\n  };")]
    return re.findall(r"(\w+): ['\"`]", block)


def load(lang):
    path = os.path.join(LANG_DIR, f"{lang}.json")
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def translated(pack, group, item_id, field):
    node = pack.get(group, {})
    if item_id is not None:
        node = node.get(item_id, {})
    return node.get(field, "")


def check():
    """{lingua: {"mancanti": [...], "cambiati": [...]}} per le lingue con qualcosa da fare."""
    texts = italian_texts()
    keys = ui_keys()
    report = {}
    for lang in LANGS:
        pack = load(lang)
        if pack is None:
            report[lang] = {"mancanti": ["(file della lingua mancante)"], "cambiati": []}
            continue
        source = pack.get("source", {})
        missing, changed = [], []
        for key, (group, item_id, field, text) in texts.items():
            if not translated(pack, group, item_id, field):
                missing.append(key)
            elif source.get(key) != fingerprint(text):
                changed.append(key)
        missing += [f"ui.{k}" for k in keys if k not in pack.get("ui", {})]
        if missing or changed:
            report[lang] = {"mancanti": missing, "cambiati": changed}
    return report


def sign(langs):
    texts = italian_texts()
    for lang in langs:
        pack = load(lang)
        if pack is None:
            print(f"{lang}: file mancante")
            continue
        pack["source"] = {key: fingerprint(text) for key, (group, item_id, field, text) in texts.items()
                          if translated(pack, group, item_id, field)}
        with open(os.path.join(LANG_DIR, f"{lang}.json"), "w", encoding="utf-8") as fh:
            json.dump(pack, fh, ensure_ascii=False, indent=1)
            fh.write("\n")
        print(f"{lang}: impronte registrate per {len(pack['source'])} testi")


def summary():
    """Una riga per chi sincronizza: vuota se le traduzioni sono in pari."""
    report = check()
    if not report:
        return ""
    parts = [f"{lang.upper()} {len(r['mancanti']) + len(r['cambiati'])}" for lang, r in report.items()]
    return "Traduzioni da aggiornare (" + ", ".join(parts) + "): python admin/traduzioni.py"


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    if args and args[0] == "firma":
        sign(args[1:] or LANGS)
        sys.exit(0)
    report = check()
    if not report:
        print("Tutte le traduzioni sono aggiornate.")
    for lang, r in report.items():
        print(f"\n[{lang}]")
        for key in r["mancanti"]:
            print("  manca:   ", key)
        for key in r["cambiati"]:
            print("  cambiato:", key)

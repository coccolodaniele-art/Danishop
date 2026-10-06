"""Crea le immagini di anteprima dei link condivisi (WhatsApp, LinkedIn, Facebook, email...)
e le pagine da condividere per ogni lingua.

Per ogni lingua del sito:
  - dist/og/og-<lingua>-<versione>.jpg   immagine 1200x630 (foto, titolo della Home, bollino)
  - dist/<lingua>/index.html             pagina con l'anteprima in quella lingua, che apre
                                          subito il sito in quella lingua (es. coccolodigital.com/it)
La Home (dist/index.html, il semplice coccolodigital.com) usa l'anteprima nella lingua HOME_LANG.

La parte centrale quadrata dell'immagine contiene da sola foto, titolo e bollino: quando
WhatsApp mostra l'anteprima piccola ritaglia proprio quel quadrato.

Il numero di versione cambia a ogni esecuzione: i nomi nuovi costringono WhatsApp e gli altri
a riscaricare l'immagine invece di usare quella vecchia che tengono in memoria.

Usa la foto e i testi di dist/data.json e dist/lang/*.json, e Google Chrome senza finestra.
Rifallo se cambi la foto, il titolo della Home o il bollino:
    python admin/crea_anteprima.py
"""

import glob
import html
import json
import os
import re
import shutil
import subprocess
import tempfile
import time

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
SITE = "https://coccolodigital.com"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LANGS = ["it", "en", "es", "de", "fr", "pt"]
HOME_LANG = "it"  # lingua dell'anteprima del semplice coccolodigital.com (scelta dell'utente)
LOCALES = {"it": "it_IT", "en": "en_GB", "es": "es_ES", "de": "de_DE", "fr": "fr_FR", "pt": "pt_BR"}

TEMPLATE = r"""<!doctype html><html lang="{{LANG}}"><head><meta charset="utf-8">
<link rel="stylesheet" href="{{FONTS}}">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:Inter,sans-serif;color:#e6f6f4;position:relative;
background:radial-gradient(ellipse 45% 65% at 50% 0%,rgba(20,184,166,.35),transparent 70%),radial-gradient(ellipse 40% 60% at 100% 100%,rgba(14,165,233,.3),transparent 70%),radial-gradient(ellipse 40% 60% at 0% 100%,rgba(20,184,166,.22),transparent 70%),linear-gradient(135deg,#0b2530,#12384a)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) 1.2px,transparent 1.2px);background-size:26px 26px}
.brand{position:absolute;left:48px;top:44px;display:flex;align-items:center;gap:12px}
.mark{width:46px;height:46px;border-radius:12px;background:#0b2530;border:1px solid rgba(94,234,212,.35);display:grid;place-items:center}
.mark svg{width:24px;height:24px;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.brand b{display:block;font-size:22px;font-weight:700;color:#fff;letter-spacing:-.02em}
.brand small{display:block;font-family:"JetBrains Mono",monospace;font-size:12.5px;color:#7fb5bd;margin-top:2px}
.site{position:absolute;right:48px;bottom:40px;font-family:"JetBrains Mono",monospace;font-size:17px;color:#9fd8d2;letter-spacing:.01em}
.center{position:absolute;left:285px;top:0;width:630px;height:630px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px 36px}
.photo{width:196px;height:196px;border-radius:50%;padding:5px;background:linear-gradient(135deg,#5eead4,#38bdf8);box-shadow:0 18px 40px rgba(0,0,0,.35)}
.photo img{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 20%;border:4px solid #0b2530}
.name{margin-top:14px;font-size:19px;font-weight:600;color:#bdeee6}
h1{margin-top:12px;font-size:44px;line-height:1.08;font-weight:800;letter-spacing:-.035em;color:#fff;text-wrap:balance}
h1 span{background:linear-gradient(90deg,#5eead4,#7dd3fc);-webkit-background-clip:text;background-clip:text;color:transparent}
.badge{margin-top:20px;display:inline-flex;align-items:center;gap:9px;padding:10px 20px;border-radius:999px;background:linear-gradient(135deg,#0f766e,#0e7490);color:#fff;font-size:19px;font-weight:700;box-shadow:0 10px 26px rgba(15,118,110,.45);border:1px solid rgba(94,234,212,.4)}
.badge svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
</style></head><body><div class="dots"></div>
<div class="brand"><span class="mark"><svg viewBox="0 0 24 24"><path d="M5 7l5 5-5 5" stroke="#5eead4"/><path d="M12 18h7" stroke="#38bdf8"/></svg></span><span><b>Coccolo Digital</b></span></div>
<div class="center">
  <div class="photo"><img src="{{PHOTO}}" alt=""></div>
  <div class="name">Daniele Coccolo</div>
  <h1 id="t">{{TITLE}}</h1>
  <div class="badge"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>{{BADGE}}</div>
</div>
<div class="site">coccolodigital.com</div>
<script>
// Il titolo si rimpicciolisce finché tutto sta nel quadrato centrale.
(function () {
  var t = document.getElementById('t'), c = document.querySelector('.center'), s = 44;
  while ((c.scrollHeight > 630 || t.offsetHeight > 150) && s > 26) { s -= 1; t.style.fontSize = s + 'px'; }
})();
</script>
</body></html>"""

SHARE_PAGE = """<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="{site}/?lang={lang}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Coccolo Digital">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{site}/{lang}/">
<meta property="og:image" content="{site}/{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{alt}">
<meta property="og:locale" content="{locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{site}/{image}">
<meta http-equiv="refresh" content="0; url=/?lang={lang}">
<script>location.replace('/?lang={lang}' + location.hash);</script>
</head>
<body><p><a href="/?lang={lang}">Coccolo Digital</a></p></body>
</html>
"""


def ui_it(key):
    """Testo italiano dell'interfaccia, preso da UI_IT in dist/app.js."""
    src = open(os.path.join(DIST, "app.js"), encoding="utf-8").read()
    m = re.search(key + r""": (['"])(.*?)(?<!\\)\1""", src)
    return m.group(2).replace("\\'", "'") if m else ""


def texts(lang, data):
    if lang == "it":
        s = data["settings"]
        return {"title": s["homeTitle"], "tagline": s["tagline"], "badge": ui_it("heroBadge"), "description": ui_it("metaDescription")}
    pack = json.load(open(os.path.join(DIST, "lang", f"{lang}.json"), encoding="utf-8"))
    return {"title": pack["settings"]["homeTitle"], "tagline": pack["settings"]["tagline"],
            "badge": pack["ui"]["heroBadge"], "description": pack["ui"]["metaDescription"]}


def render(page, out_png, tmp):
    # Un profilo nuovo a ogni giro: con uno già usato Chrome a volte non finisce di caricare.
    profile = os.path.join(tmp, "profilo-" + os.path.basename(out_png))
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
                    f"--user-data-dir={profile}", "--window-size=1200,630", "--virtual-time-budget=6000",
                    f"--screenshot={out_png}", "file:///" + page.replace(os.sep, "/")], capture_output=True, timeout=120)


def main():
    data = json.load(open(os.path.join(DIST, "data.json"), encoding="utf-8"))
    photo = data["settings"]["photo"]
    version = time.strftime("%Y%m%d%H%M")
    os.makedirs(os.path.join(DIST, "og"), exist_ok=True)
    old = glob.glob(os.path.join(DIST, "og", "og-*.jpg"))
    fonts = "file:///" + os.path.join(DIST, "fonts", "fonts.css").replace(os.sep, "/")
    tmp = tempfile.mkdtemp()
    made, info = {}, {}
    try:
        for lang in LANGS:
            tx = texts(lang, data)
            title = html.escape(tx["title"]).replace("*", "\0")
            title = re.sub("\0(.+?)\0", r"<span>\1</span>", title).replace("\0", "")
            page = os.path.join(tmp, f"og-{lang}.html")
            open(page, "w", encoding="utf-8").write(
                TEMPLATE.replace("{{LANG}}", lang).replace("{{FONTS}}", fonts).replace("{{PHOTO}}", photo)
                .replace("{{TITLE}}", title)
                .replace("{{BADGE}}", html.escape(tx["badge"])))
            png = os.path.join(tmp, f"og-{lang}.png")
            render(page, png, tmp)
            name = f"og/og-{lang}-{version}.jpg"
            Image.open(png).convert("RGB").save(os.path.join(DIST, name), quality=86, optimize=True, progressive=True)
            made[lang] = name
            plain = tx["title"].replace("*", "")
            info[lang] = {"title": f"Coccolo Digital · {tx['tagline']}", "description": tx["description"],
                          "alt": f"Coccolo Digital — {plain} Daniele Coccolo"}
            os.makedirs(os.path.join(DIST, lang), exist_ok=True)
            open(os.path.join(DIST, lang, "index.html"), "w", encoding="utf-8").write(SHARE_PAGE.format(
                lang=lang, site=SITE, image=name, locale=LOCALES[lang],
                title=html.escape(f"Coccolo Digital · {tx['tagline']}"),
                description=html.escape(tx["description"]),
                alt=html.escape(f"Coccolo Digital — {plain} Daniele Coccolo")))
            print(f"{lang}: {name}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # Anteprima della Home (il semplice coccolodigital.com) nella lingua HOME_LANG.
    idx = os.path.join(DIST, "index.html")
    s = open(idx, encoding="utf-8").read()
    home = info[HOME_LANG]
    values = {
        'property="og:image"': SITE + "/" + made[HOME_LANG],
        'name="twitter:image"': SITE + "/" + made[HOME_LANG],
        'property="og:title"': home["title"],
        'property="og:description"': home["description"],
        'property="og:image:alt"': home["alt"],
        'property="og:locale"': LOCALES[HOME_LANG],
    }
    for attr, value in values.items():
        s = re.sub(r'(<meta ' + re.escape(attr) + r' content=")[^"]*(")',
                   lambda m, v=value: m.group(1) + html.escape(v, quote=True) + m.group(2), s)
    alternates = "".join(f'  <meta property="og:locale:alternate" content="{LOCALES[l]}">\n' for l in LANGS if l != HOME_LANG)
    s = re.sub(r'(  <meta property="og:locale:alternate" content="[^"]*">\n)+', lambda m: alternates, s)
    open(idx, "w", encoding="utf-8").write(s)
    for f in old:
        if os.path.relpath(f, DIST).replace(os.sep, "/") not in made.values():
            os.remove(f)
    # Il vecchio indirizzo dell'immagine resta valido, con l'immagine nuova.
    shutil.copyfile(os.path.join(DIST, made[HOME_LANG]), os.path.join(DIST, "og-image.jpg"))
    print("Home:", made[HOME_LANG])


if __name__ == "__main__":
    main()

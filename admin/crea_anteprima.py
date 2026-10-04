"""Crea dist/og-image.jpg: l'immagine di anteprima che compare quando qualcuno condivide
il link del sito (WhatsApp, LinkedIn, Facebook, email...).

Usa la foto salvata in dist/data.json e Google Chrome in modalità senza finestra.
Rifallo se cambi la foto o lo slogan:
    python admin/crea_anteprima.py
"""

import json
import os
import shutil
import subprocess
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dist", "og-image.jpg")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

TEMPLATE = r'''<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=JetBrains+Mono:wght@500&display=swap">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:Inter,sans-serif;color:#e6f6f4;position:relative;
background:radial-gradient(ellipse 55% 70% at 100% 0%,rgba(14,165,233,.38),transparent 70%),radial-gradient(ellipse 50% 70% at 0% 100%,rgba(20,184,166,.32),transparent 70%),linear-gradient(135deg,#0b2530,#12384a)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.09) 1.2px,transparent 1.2px);background-size:26px 26px}
.wrap{position:absolute;inset:0;display:grid;grid-template-columns:1fr 330px;gap:56px;align-items:center;padding:0 72px}
.brand{display:flex;align-items:center;gap:16px;margin-bottom:34px}
.mark{width:58px;height:58px;border-radius:14px;background:#0b2530;border:1px solid rgba(94,234,212,.35);display:grid;place-items:center}
.mark svg{width:30px;height:30px;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.brand b{font-size:30px;font-weight:700;letter-spacing:-.02em;color:#fff}
.brand small{display:block;font-family:"JetBrains Mono",monospace;font-size:15px;color:#7fb5bd;margin-top:2px}
h1{font-size:62px;line-height:1.04;font-weight:800;letter-spacing:-.045em;color:#fff}
h1 span{background:linear-gradient(90deg,#5eead4,#7dd3fc);-webkit-background-clip:text;background-clip:text;color:transparent}
.tags{display:flex;gap:10px;margin-top:34px}
.tags i{font-style:normal;font-family:"JetBrains Mono",monospace;font-size:17px;color:#bdeee6;padding:7px 14px;border-radius:9px;background:rgba(94,234,212,.1);border:1px solid rgba(94,234,212,.28)}
.ph{position:relative;width:310px;height:388px}
.ph:before{content:"";position:absolute;inset:18px -18px -18px 18px;border:1px solid rgba(94,234,212,.4);border-radius:20px;background:radial-gradient(rgba(94,234,212,.35) 1.2px,transparent 1.2px) 0 0/13px 13px}
.ph img{position:relative;width:100%;height:100%;object-fit:cover;object-position:50% 20%;border-radius:20px;border:2px solid rgba(255,255,255,.2);box-shadow:0 30px 60px rgba(0,0,0,.4)}
.name{position:absolute;left:18px;bottom:-14px;background:#fff;color:#0b2530;font-weight:700;font-size:19px;padding:9px 16px;border-radius:11px;box-shadow:0 12px 30px rgba(0,0,0,.3)}
.name small{display:block;font-weight:500;font-size:13px;color:#0f766e}
</style></head><body><div class="dots"></div>
<div class="wrap"><div>
<div class="brand"><span class="mark"><svg viewBox="0 0 24 24"><path d="M5 7l5 5-5 5" stroke="#5eead4"/><path d="M12 18h7" stroke="#38bdf8"/></svg></span><span><b>Coccolo Digital</b><small>Custom automations &amp; software</small></span></div>
<h1>Stop doing by hand what a computer can do <span>on its own.</span></h1>
<div class="tags"><i>Python</i><i>Excel</i><i>SQL</i><i>AI</i></div>
</div>
<div class="ph"><img src="{{PHOTO}}"><div class="name">Daniele Coccolo<small>Automation developer · Italy</small></div></div>
</div></body></html>'''


def main():
    with open(os.path.join(ROOT, "dist", "data.json"), encoding="utf-8") as fh:
        photo = json.load(fh)["settings"]["photo"]
    tmp = tempfile.mkdtemp()
    try:
        page = os.path.join(tmp, "og.html")
        shot = os.path.join(tmp, "og.png")
        with open(page, "w", encoding="utf-8") as fh:
            fh.write(TEMPLATE.replace("{{PHOTO}}", photo))
        # Un profilo nuovo a ogni giro: con uno già usato Chrome a volte non finisce di caricare.
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        f"--user-data-dir={os.path.join(tmp, 'profilo')}", "--window-size=1200,630",
                        "--virtual-time-budget=6000", f"--screenshot={shot}", "file:///" + page.replace(os.sep, "/")],
                       capture_output=True, timeout=120)
        Image.open(shot).convert("RGB").save(OUT, quality=88, optimize=True, progressive=True)
        print("Creata", OUT)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()

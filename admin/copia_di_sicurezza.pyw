"""Copia di sicurezza completa: un unico file .zip con tutto il sito e i sorgenti dei
programmi, da copiare su una chiavetta, un disco esterno o un cloud (es. Google Drive).

Doppio clic sull'icona "Copia di sicurezza sito" sul desktop. Il file viene creato in
Desktop\\COPIE DI SICUREZZA SITO, con data e ora nel nome.

Contenuto:
- tutta la cartella SITO E-COMMERCE (sito, Gestore, backup di data.json, cronologia
  delle modifiche, versioni web dei programmi, codice del proxy Deno, Codequest);
- i sorgenti di SP500 Vertical Thermometers (fondamentali specifici);
- i sorgenti di Sintesi Mercati AI (programmi vari).

Non vengono copiate le chiavi API (gemini_api_key.txt, groq_api_key.txt) e la chiave delle
statistiche (admin/.insight.json): sono personali e si rigenerano. Restano fuori anche gli
strumenti scaricabili del servizio statistiche (insight/node_modules, si rimettono con
"npm install") e i suoi dati di prova locali (insight/.wrangler).
"""
import datetime as dt
import os
import subprocess
import sys
import threading
import zipfile
from pathlib import Path
from tkinter import Label, Tk, messagebox, ttk

DESKTOP = Path(r"C:\Users\PC\Desktop")
DEST_DIR = DESKTOP / "COPIE DI SICUREZZA SITO"

# (cartella da copiare, nome dentro lo zip)
SOURCES = [
    (DESKTOP / "SITO E-COMMERCE", "SITO E-COMMERCE"),
    (DESKTOP / "fondamentali specifici" / "SP500VerticalThermometer", "PROGRAMMI DESKTOP/SP500VerticalThermometer"),
    (DESKTOP / "programmi vari" / "Sintesi Mercati AI", "PROGRAMMI DESKTOP/Sintesi Mercati AI"),
]
# Esclusi: chiavi personali, file temporanei e doppioni pesanti gia' presenti altrove
# (gli .exe dei programmi sono comunque inclusi nella cartella SITO E-COMMERCE).
SKIP_FILES = {"gemini_api_key.txt", "groq_api_key.txt", ".insight.json", ".dev.vars"}
SKIP_DIRS = {"__pycache__", "build", "dist", "node_modules", ".wrangler"}
KEEP_DIST_UNDER = "desktop-software-store"  # la cartella dist del sito va SEMPRE copiata

LEGGIMI = """COPIA DI SICUREZZA DEL SITO - {data}

Contenuto
- SITO E-COMMERCE\\desktop-software-store: il sito completo (e' anche su GitHub,
  repository coccolodaniele-art/Danishop). La cartella dist e' il sito pubblicato;
  dist\\data.json contiene programmi, foto, attestati, libri, dati personali e IBAN;
  backup\\ contiene le copie automatiche di data.json; .git contiene tutta la
  cronologia delle modifiche.
- SITO E-COMMERCE\\desktop-software-store\\insight: il servizio delle statistiche
  (Cloudflare Worker "danishop-insight" + database D1), istruzioni in insight\\LEGGIMI.md.
- SITO E-COMMERCE\\desktop-software-store\\cloudflare\\sintesi-proxy-deno.ts: il codice
  del proxy (Deno Deploy, progetto formal-goose-2584) usato da Sintesi Mercati AI e
  da SP500 Vertical Thermometers.
- PROGRAMMI DESKTOP: i sorgenti Python dei programmi desktop.

Per ripristinare
1. Estrai lo zip sul Desktop (le cartelle tornano al loro posto:
   SITO E-COMMERCE, e i sorgenti in PROGRAMMI DESKTOP da spostare in
   "fondamentali specifici" e "programmi vari").
2. Il sito online si aggiorna da solo con un git push dalla cartella
   desktop-software-store (vedi CLAUDE.md).

Le chiavi API non sono incluse: si rigenerano su https://aistudio.google.com/apikey
Neanche la chiave delle statistiche (admin\\.insight.json): per ricrearla vedi
desktop-software-store\\insight\\LEGGIMI.md (npx wrangler secret put ADMIN_KEY).

ATTENZIONE: questa copia contiene i tuoi dati personali e l'IBAN. Conservala in un
posto privato (chiavetta tua, cloud personale), non condividerla.
"""


def collect_files():
    files = []
    for src, arc_root in SOURCES:
        if not src.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(src):
            rel_dir = Path(dirpath).relative_to(src)
            keep = []
            for d in dirnames:
                if d in SKIP_DIRS and not (d == "dist" and rel_dir.parts[:1] == (KEEP_DIST_UNDER,)):
                    continue
                keep.append(d)
            dirnames[:] = keep
            for name in filenames:
                if name in SKIP_FILES or ".exe.bak" in name.lower():
                    continue
                full = Path(dirpath) / name
                files.append((full, f"{arc_root}/{(rel_dir / name).as_posix()}".replace("/./", "/")))
    return files


def main() -> None:
    root = Tk()
    root.title("Copia di sicurezza del sito")
    root.geometry("460x150")
    root.resizable(False, False)
    Label(root, text="Creo la copia di sicurezza completa del sito...", font=("Segoe UI", 11)).pack(pady=(22, 10))
    bar = ttk.Progressbar(root, length=400, mode="determinate")
    bar.pack()
    status = Label(root, text="", font=("Segoe UI", 9), fg="#555555")
    status.pack(pady=8)

    result = {}

    def work():
        try:
            DEST_DIR.mkdir(exist_ok=True)
            stamp = dt.datetime.now().strftime("%Y-%m-%d_%H-%M")
            target = DEST_DIR / f"Copia_sito_{stamp}.zip"
            files = collect_files()
            total = len(files)
            with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
                zf.writestr("LEGGIMI.txt", LEGGIMI.format(data=dt.datetime.now().strftime("%d/%m/%Y %H:%M")))
                for i, (full, arc) in enumerate(files, 1):
                    try:
                        zf.write(full, arc)
                    except (PermissionError, OSError):
                        result.setdefault("saltati", []).append(str(full))
                    if i % 25 == 0 or i == total:
                        root.after(0, lambda i=i: (bar.configure(value=i * 100 / max(total, 1)),
                                                   status.configure(text=f"{i} / {total} file")))
            # verifica che lo zip sia leggibile e integro
            with zipfile.ZipFile(target) as zf:
                bad = zf.testzip()
            if bad:
                raise RuntimeError(f"File danneggiato nello zip: {bad}")
            result["path"] = target
            result["count"] = total
        except Exception as exc:  # noqa: BLE001
            result["error"] = str(exc)
        root.after(0, finish)

    def finish():
        root.withdraw()
        if "error" in result:
            messagebox.showerror("Copia di sicurezza", f"La copia non e' riuscita:\n{result['error']}")
        else:
            path = result["path"]
            size = path.stat().st_size / 1024 / 1024
            extra = ""
            if result.get("saltati"):
                extra = f"\n\nAttenzione: {len(result['saltati'])} file in uso non sono stati copiati."
            messagebox.showinfo(
                "Copia di sicurezza",
                f"Copia creata ({result['count']} file, {size:.0f} MB):\n{path}\n\n"
                "Ora copiala su una chiavetta, un disco esterno o su Google Drive.\n"
                "Contiene i tuoi dati personali e l'IBAN: tienila in un posto privato." + extra)
            subprocess.Popen(["explorer", "/select,", str(path)])
        root.destroy()

    threading.Thread(target=work, daemon=True).start()
    root.mainloop()


if __name__ == "__main__":
    main()

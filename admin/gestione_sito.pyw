"""Gestione sito: apre l'area admin e tiene allineate la copia del sito su questo PC e quella online.

Le modifiche fatte dall'area admin vengono scritte in dist/data.json; ogni modifica alla cartella
del sito (anche fatta a mano o da Claude) viene registrata e inviata online da sincronizza.py.

Avviato dall'icona sul desktop. Resta in ascolto solo su questo computer (127.0.0.1)
e si chiude quando chiudi la finestra (o dopo un'ora di inattività).
"""

import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sincronizza  # noqa: E402

HOST = "127.0.0.1"
PORT = 5500
IDLE_TIMEOUT = 60 * 60
MAX_BODY = 80 * 1024 * 1024

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
DATA_FILE = os.path.join(DIST, "data.json")
BACKUP_DIR = os.path.join(ROOT, "backup")
INSIGHT_CONFIG = os.path.join(ROOT, "admin", ".insight.json")
ADMIN_URL = f"http://localhost:{PORT}/#admin"
ALLOWED_ORIGINS = {f"http://localhost:{PORT}", f"http://{HOST}:{PORT}"}

WATCH_INTERVAL = 15
RETRY_INTERVAL = 120

last_activity = time.time()
sync_timer = None
sync_timer_lock = threading.Lock()


def schedule_sync(message=None, delay=3):
    """Pubblica dopo qualche secondo di calma, così più salvataggi di fila diventano un solo invio."""
    global sync_timer
    with sync_timer_lock:
        if sync_timer:
            sync_timer.cancel()
        sync_timer = threading.Timer(delay, lambda: sincronizza.sync(message))
        sync_timer.daemon = True
        sync_timer.start()


def watch_changes():
    """Si accorge delle modifiche fatte fuori dall'area admin e le pubblica; ritenta se internet mancava.

    Pubblica solo quando i file modificati sono rimasti fermi per un intero controllo, così
    una modifica ancora in corso (più file toccati uno dopo l'altro) va online tutta insieme.
    """
    previous = None
    last_retry = 0.0
    while True:
        time.sleep(WATCH_INTERVAL)
        try:
            current = sincronizza.changes_fingerprint()
            if current and current == previous:
                sincronizza.sync("Modifica alla struttura del sito")
                current = None
            elif not current and sincronizza.unpushed_commits() > 0 and time.time() - last_retry > RETRY_INTERVAL:
                last_retry = time.time()
                sincronizza.sync()
            previous = current
        except Exception:  # noqa: BLE001
            pass


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        global last_activity
        last_activity = time.time()
        if self.path == "/api/ping":
            return self._json(200, {"ok": True, "app": "gestione-sito"})
        if self.path == "/api/sync-status":
            return self._json(200, sincronizza.read_status())
        if self.path.startswith(("/api/insight?", "/api/insight-export?")):
            return self._insight()
        return super().do_GET()

    def do_POST(self):
        global last_activity
        last_activity = time.time()
        if self.path not in ("/api/save-data", "/api/sync"):
            return self._json(404, {"ok": False, "error": "Non trovato"})
        # Accetta solo richieste dalla pagina del sito aperta su questo computer.
        if self.headers.get("Origin") not in ALLOWED_ORIGINS:
            return self._json(403, {"ok": False, "error": "Origine non consentita"})
        if self.path == "/api/sync":
            return self._json(200, sincronizza.sync())
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self._json(413, {"ok": False, "error": "Dati troppo grandi"})
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(data, dict) or not isinstance(data.get("settings"), dict):
                raise ValueError("Formato non valido")
            save_data(data)
        except Exception as exc:  # noqa: BLE001
            return self._json(400, {"ok": False, "error": str(exc)})
        schedule_sync("Aggiornamento contenuti dal Gestore")
        return self._json(200, {"ok": True})

    def _insight(self):
        """Legge le statistiche del sito dal servizio online e le passa all'area admin."""
        url = urllib.parse.urlsplit(self.path)
        try:
            days = min(max(int(urllib.parse.parse_qs(url.query).get("days", ["30"])[0]), 1), 366)
        except ValueError:
            days = 30
        export = url.path == "/api/insight-export"
        try:
            status, body, ctype = insight_request("export" if export else "stats", days)
        except InsightError as exc:
            return self._json(503, {"ok": False, "error": str(exc)})
        if status != 200 or not export:
            if not ctype.startswith("application/json"):
                body = json.dumps({"ok": False, "error": f"Il servizio statistiche ha risposto con errore {status}"}).encode()
            return self._raw(status, body, "application/json; charset=utf-8")
        name = f"statistiche_sito_{datetime.now():%Y-%m-%d}_{days}giorni.csv"
        return self._raw(200, body, "text/csv; charset=utf-8", {"Content-Disposition": f'attachment; filename="{name}"'})

    def _raw(self, status, body, ctype, headers=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class InsightError(Exception):
    pass


def insight_config():
    """Indirizzo e chiave del servizio statistiche, salvati solo su questo PC (admin/.insight.json)."""
    try:
        with open(INSIGHT_CONFIG, encoding="utf-8") as fh:
            cfg = json.load(fh)
    except FileNotFoundError:
        raise InsightError("Le statistiche non sono ancora collegate: manca il file admin/.insight.json") from None
    except (OSError, ValueError):
        raise InsightError("Il file admin/.insight.json non è leggibile") from None
    if not cfg.get("url") or not cfg.get("key"):
        raise InsightError("Nel file admin/.insight.json mancano l'indirizzo o la chiave")
    return cfg["url"].rstrip("/"), cfg["key"]


def insight_request(kind, days):
    """Chiede al servizio online il riepilogo (stats) o tutti gli eventi in CSV (export)."""
    base, key = insight_config()
    req = urllib.request.Request(
        f"{base}/{kind}?days={days}",
        headers={"Authorization": f"Bearer {key}", "User-Agent": "GestioneSito/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as res:
            return res.status, res.read(), res.headers.get("Content-Type", "")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(), exc.headers.get("Content-Type", "")
    except (urllib.error.URLError, TimeoutError, OSError):
        raise InsightError("Impossibile raggiungere il servizio statistiche: controlla la connessione a internet") from None


def save_data(data):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    if os.path.exists(DATA_FILE):
        stamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        shutil.copy2(DATA_FILE, os.path.join(BACKUP_DIR, f"data_{stamp}.json"))
        backups = sorted(f for f in os.listdir(BACKUP_DIR) if f.startswith("data_"))
        for old in backups[:-20]:
            os.remove(os.path.join(BACKUP_DIR, old))
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
    os.replace(tmp, DATA_FILE)


def already_running():
    try:
        with urllib.request.urlopen(f"http://{HOST}:{PORT}/api/ping", timeout=1) as res:
            return json.load(res).get("app") == "gestione-sito"
    except Exception:  # noqa: BLE001
        return False


def port_busy():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((HOST, PORT)) == 0


def show_error(msg):
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, msg, "Gestione sito", 0x10)
    except Exception:  # noqa: BLE001
        print(msg, file=sys.stderr)


def find_browser():
    """Cerca Chrome o Edge, che possono aprire il sito in una finestra da applicazione."""
    candidates = []
    try:
        import winreg
        for exe in ("chrome.exe", "msedge.exe"):
            for hive in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
                try:
                    key = rf"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{exe}"
                    with winreg.OpenKey(hive, key) as k:
                        candidates.append(winreg.QueryValue(k, None))
                except OSError:
                    pass
    except ImportError:
        pass
    for base in (os.environ.get("PROGRAMFILES"), os.environ.get("PROGRAMFILES(X86)"), os.environ.get("LOCALAPPDATA")):
        if base:
            candidates.append(os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"))
            candidates.append(os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"))
    return next((c for c in candidates if c and os.path.isfile(c)), None)


def open_app_window():
    """Apre l'area admin in una finestra senza barra degli indirizzi né schede.

    Usa un profilo dedicato, così la finestra è un processo a sé: quando la chiudi
    il programma lo sa e si spegne. Restituisce il processo, o None se ha usato il browser normale.
    """
    browser = find_browser()
    if not browser:
        webbrowser.open(ADMIN_URL)
        return None
    profile = os.path.join(os.environ.get("LOCALAPPDATA", ROOT), "GestioneSito", "profilo")
    os.makedirs(profile, exist_ok=True)
    return subprocess.Popen([
        browser,
        f"--app={ADMIN_URL}",
        f"--user-data-dir={profile}",
        "--window-size=1200,860",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-sync",
    ])


def main():
    if already_running():
        open_app_window()
        return
    if port_busy():
        show_error(f"La porta {PORT} è già usata da un altro programma.\nChiudilo e riprova.")
        return

    server = ThreadingHTTPServer((HOST, PORT), Handler)

    def watchdog():
        while True:
            time.sleep(30)
            if time.time() - last_activity > IDLE_TIMEOUT:
                server.shutdown()
                return

    def run_window():
        started = time.time()
        proc = open_app_window()
        if proc is None:
            return
        proc.wait()
        # Se il processo è terminato subito, la finestra è stata affidata a un'istanza
        # già aperta: in quel caso ci pensa il controllo di inattività.
        if time.time() - started > 5:
            server.shutdown()

    threading.Thread(target=watchdog, daemon=True).start()
    threading.Thread(target=run_window, daemon=True).start()
    threading.Thread(target=watch_changes, daemon=True).start()
    schedule_sync("Modifiche in sospeso", delay=1)
    server.serve_forever()
    # Finestra chiusa: pubblica le ultime modifiche prima di uscire.
    with sync_timer_lock:
        if sync_timer:
            sync_timer.cancel()
    try:
        sincronizza.sync("Aggiornamento contenuti dal Gestore")
    except Exception:  # noqa: BLE001
        pass


if __name__ == "__main__":
    main()

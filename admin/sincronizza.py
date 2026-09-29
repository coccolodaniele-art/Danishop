"""Sincronizza la copia del sito su questo PC con quella online.

Registra tutte le modifiche della cartella del sito (git commit) e le invia a GitHub
(git push): da lì la copia online si aggiorna da sola.

Uso da riga di comando:
    python admin/sincronizza.py "Descrizione della modifica"
"""

import json
import os
import subprocess
import sys
import threading
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUS_FILE = os.path.join(ROOT, "admin", ".stato_sincronizzazione.json")
BRANCH = "main"
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

_lock = threading.Lock()


def git(*args, timeout=120):
    res = subprocess.run(
        ["git", "-c", "core.quotepath=off", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        creationflags=NO_WINDOW,
    )
    return res.returncode, (res.stdout + res.stderr).strip()


def ensure_identity():
    for key, default in (("user.name", "Gestione sito"), ("user.email", "gestione-sito@users.noreply.github.com")):
        code, out = git("config", key)
        if code != 0 or not out:
            git("config", key, default)


def remote_url():
    code, out = git("remote", "get-url", "origin")
    return out if code == 0 else ""


def has_changes():
    code, out = git("status", "--porcelain")
    return code == 0 and bool(out)


def unpushed_commits():
    if not remote_url():
        return 0
    code, out = git("rev-list", "--count", f"origin/{BRANCH}..HEAD")
    if code != 0:
        # Il ramo online non esiste ancora: tutto è da inviare.
        code, out = git("rev-list", "--count", "HEAD")
    try:
        return int(out)
    except ValueError:
        return 0


def read_status():
    try:
        with open(STATUS_FILE, encoding="utf-8") as fh:
            status = json.load(fh)
    except (OSError, ValueError):
        status = {}
    status["remote"] = remote_url()
    status["pending"] = has_changes()
    status["unpushed"] = unpushed_commits()
    return status


def write_status(**fields):
    status = {}
    try:
        with open(STATUS_FILE, encoding="utf-8") as fh:
            status = json.load(fh)
    except (OSError, ValueError):
        pass
    status.update(fields)
    with open(STATUS_FILE, "w", encoding="utf-8") as fh:
        json.dump(status, fh, ensure_ascii=False, indent=1)


def sync(message=None):
    """Registra e invia le modifiche. Restituisce un dizionario con l'esito."""
    with _lock:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        result = {"ok": True, "committed": False, "pushed": False, "error": "", "time": now}
        ensure_identity()

        if has_changes():
            git("add", "-A")
            code, out = git("commit", "-m", message or f"Aggiornamento del {now}")
            if code != 0:
                result.update(ok=False, error=out[-500:])
                write_status(lastError=result["error"], lastAttempt=now)
                return result
            result["committed"] = True
            write_status(lastCommit=now)

        if not remote_url():
            result["error"] = "Copia online non ancora collegata"
            write_status(lastAttempt=now, lastError=result["error"])
            return result

        if unpushed_commits() > 0:
            code, out = git("push", "-u", "origin", BRANCH, timeout=300)
            if code != 0:
                result.update(ok=False, error=out[-500:])
                write_status(lastAttempt=now, lastError=result["error"])
                return result
            result["pushed"] = True

        write_status(lastAttempt=now, lastPush=now if result["pushed"] else read_status().get("lastPush"), lastError="")
        return result


if __name__ == "__main__":
    msg = " ".join(sys.argv[1:]).strip() or None
    outcome = sync(msg)
    if outcome["error"]:
        print("Attenzione:", outcome["error"])
    print(
        ("Modifiche registrate. " if outcome["committed"] else "Nessuna nuova modifica. ")
        + ("Copia online aggiornata." if outcome["pushed"] else "")
    )
    sys.exit(0 if outcome["ok"] else 1)

"""Gestore di prova per la scheda Insight, senza finestra e senza sincronizzazione.

Serve il sito sulla porta 5502 e legge le statistiche dal servizio avviato in locale
(npx wrangler dev --port 8788). Uso: python insight/test/gestore_prova.py
Poi apri http://localhost:5502/?insight=http://127.0.0.1:8788 per generare visite di prova.
"""

import importlib.machinery
import os
from http.server import ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
gestore = importlib.machinery.SourceFileLoader(
    "gestione_sito", os.path.join(ROOT, "admin", "gestione_sito.pyw")).load_module()
gestore.insight_config = lambda: (
    os.environ.get("INSIGHT_URL", "http://127.0.0.1:8788"),
    os.environ.get("INSIGHT_KEY", "chiave-di-prova-locale"),
)

if __name__ == "__main__":
    print("Gestore di prova su http://localhost:5502")
    ThreadingHTTPServer(("127.0.0.1", 5502), gestore.Handler).serve_forever()

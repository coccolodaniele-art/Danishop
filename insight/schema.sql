-- Database delle statistiche del sito (Cloudflare D1).
-- Nessun indirizzo IP né cookie: ogni visitatore è un codice anonimo che cambia ogni giorno.

CREATE TABLE IF NOT EXISTS events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,          -- momento dell'evento (millisecondi)
  day     TEXT    NOT NULL,          -- giorno in ora italiana, AAAA-MM-GG
  hour    INTEGER NOT NULL,          -- ora italiana 0-23
  type    TEXT    NOT NULL,          -- view | time | click
  section TEXT,                      -- scheda del sito (shop, libri, programmi, ...)
  name    TEXT,                      -- per i click: tipo di azione (open-item, play-game, ...)
  label   TEXT,                      -- per i click: su cosa (titolo articolo, nome programma, ...)
  value   REAL,                      -- secondi (time), totale ordine, profondità di scorrimento
  scroll  INTEGER,                   -- per time: quanto in basso è arrivato (0-100)
  sid     TEXT,                      -- visita (una apertura del sito)
  vid     TEXT,                      -- visitatore anonimo del giorno
  entry   INTEGER DEFAULT 0,         -- 1 = prima pagina vista nella visita
  ref     TEXT,                      -- sito di provenienza (solo il dominio)
  utm     TEXT,                      -- campagna (utm_source)
  country TEXT,
  device  TEXT,
  browser TEXT,
  os      TEXT,
  lang    TEXT,
  screen  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_events_day ON events (day, type);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
CREATE INDEX IF NOT EXISTS idx_events_sid ON events (sid);

CREATE TABLE IF NOT EXISTS salts (
  day  TEXT PRIMARY KEY,
  salt TEXT NOT NULL
);

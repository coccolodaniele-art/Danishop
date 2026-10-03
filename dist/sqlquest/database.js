/* SQLQuest - database di esercitazione (SQLite).
   Un piccolo negozio online (clienti, prodotti, categorie, ordini, righe d'ordine) e il suo
   personale (dipendenti). Ogni esercizio parte da una copia nuova di questi dati. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SQLQ_DB = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return `
CREATE TABLE categorie (
  id   INTEGER PRIMARY KEY,
  nome TEXT NOT NULL
);
INSERT INTO categorie (id, nome) VALUES
  (1, 'Elettronica'), (2, 'Libri'), (3, 'Casa'), (4, 'Sport'), (5, 'Giochi');

CREATE TABLE prodotti (
  id           INTEGER PRIMARY KEY,
  nome         TEXT NOT NULL,
  categoria_id INTEGER REFERENCES categorie(id),
  prezzo       REAL NOT NULL,
  disponibili  INTEGER NOT NULL
);
INSERT INTO prodotti (id, nome, categoria_id, prezzo, disponibili) VALUES
  (1,  'Smartphone Nova X',      1, 499.00, 25),
  (2,  'Cuffie Wireless Pulse',  1,  89.90, 60),
  (3,  'Laptop Orbit 14',        1, 1099.00, 8),
  (4,  'Smartwatch Fit 2',       1, 149.50,  0),
  (5,  'Romanzo Il mare d''inverno', 2, 18.50, 120),
  (6,  'Manuale di Python',      2,  34.90, 45),
  (7,  'Atlante del mondo',      2,  42.00, 12),
  (8,  'Lampada da tavolo Luce', 3,  39.90, 30),
  (9,  'Set di pentole Chef',    3, 129.00, 15),
  (10, 'Tappeto Nordico',        3,  89.00,  0),
  (11, 'Pallone da calcio Pro',  4,  29.90, 80),
  (12, 'Tappetino Yoga',         4,  24.50, 50),
  (13, 'Bicicletta City',        4, 349.00,  5),
  (14, 'Puzzle 1000 pezzi',      5,  15.90, 70),
  (15, 'Scacchiera in legno',    5,  59.00, 20),
  (16, 'Drone Mini Sky',      NULL, 199.00, 10);

CREATE TABLE clienti (
  id              INTEGER PRIMARY KEY,
  nome            TEXT NOT NULL,
  cognome         TEXT NOT NULL,
  citta           TEXT,
  email           TEXT,
  data_iscrizione TEXT NOT NULL
);
INSERT INTO clienti (id, nome, cognome, citta, email, data_iscrizione) VALUES
  (1,  'Marco',     'Rossi',    'Milano',  'marco.rossi@email.it',    '2023-01-15'),
  (2,  'Giulia',    'Bianchi',  'Roma',    'giulia.b@email.it',       '2023-02-20'),
  (3,  'Luca',      'Ferrari',  'Torino',  NULL,                      '2023-03-05'),
  (4,  'Sara',      'Esposito', 'Napoli',  'sara.esposito@email.it',  '2023-04-12'),
  (5,  'Andrea',    'Romano',   'Milano',  'andrea.romano@email.it',  '2023-06-30'),
  (6,  'Francesca', 'Colombo',  'Bologna', 'francesca.c@email.it',    '2023-09-18'),
  (7,  'Matteo',    'Ricci',    'Firenze', NULL,                      '2024-01-08'),
  (8,  'Chiara',    'Marino',   'Roma',    'chiara.marino@email.it',  '2024-02-25'),
  (9,  'Davide',    'Greco',    'Palermo', 'davide.greco@email.it',   '2024-05-14'),
  (10, 'Elena',     'Bruno',    'Udine',   'elena.bruno@email.it',    '2024-07-01'),
  (11, 'Paolo',     'Gallo',    'Milano',  NULL,                      '2024-09-10'),
  (12, 'Laura',     'Conti',    'Venezia', 'laura.conti@email.it',    '2024-11-22');

CREATE TABLE ordini (
  id          INTEGER PRIMARY KEY,
  cliente_id  INTEGER NOT NULL REFERENCES clienti(id),
  data_ordine TEXT NOT NULL,
  stato       TEXT NOT NULL
);
INSERT INTO ordini (id, cliente_id, data_ordine, stato) VALUES
  (1,  1,  '2024-01-10', 'consegnato'),
  (2,  2,  '2024-01-22', 'consegnato'),
  (3,  1,  '2024-02-14', 'consegnato'),
  (4,  4,  '2024-03-03', 'consegnato'),
  (5,  5,  '2024-03-28', 'annullato'),
  (6,  6,  '2024-04-15', 'consegnato'),
  (7,  2,  '2024-05-02', 'consegnato'),
  (8,  8,  '2024-05-20', 'consegnato'),
  (9,  1,  '2024-06-11', 'consegnato'),
  (10, 9,  '2024-07-07', 'consegnato'),
  (11, 4,  '2024-08-19', 'consegnato'),
  (12, 10, '2024-09-02', 'consegnato'),
  (13, 5,  '2024-10-14', 'spedito'),
  (14, 2,  '2024-11-25', 'consegnato'),
  (15, 8,  '2024-12-12', 'spedito'),
  (16, 6,  '2025-01-09', 'in lavorazione'),
  (17, 10, '2025-01-20', 'in lavorazione'),
  (18, 1,  '2025-02-03', 'in lavorazione');

CREATE TABLE dettagli_ordine (
  ordine_id       INTEGER NOT NULL REFERENCES ordini(id),
  prodotto_id     INTEGER NOT NULL REFERENCES prodotti(id),
  quantita        INTEGER NOT NULL,
  prezzo_unitario REAL NOT NULL,
  PRIMARY KEY (ordine_id, prodotto_id)
);
INSERT INTO dettagli_ordine (ordine_id, prodotto_id, quantita, prezzo_unitario) VALUES
  (1, 1, 1, 499.00), (1, 2, 1, 89.90),
  (2, 5, 2, 18.50),  (2, 6, 1, 34.90),
  (3, 11, 2, 29.90),
  (4, 3, 1, 1099.00),
  (5, 13, 1, 349.00),
  (6, 8, 2, 39.90),  (6, 14, 1, 15.90),
  (7, 9, 1, 129.00),
  (8, 2, 2, 89.90),  (8, 12, 1, 24.50),
  (9, 7, 1, 42.00),  (9, 5, 1, 18.50),
  (10, 15, 1, 59.00), (10, 14, 2, 15.90),
  (11, 1, 1, 499.00),
  (12, 12, 2, 24.50), (12, 11, 1, 29.90),
  (13, 4, 1, 149.50),
  (14, 6, 2, 34.90),
  (15, 3, 1, 1099.00), (15, 2, 1, 89.90),
  (16, 8, 1, 39.90),
  (17, 13, 1, 349.00),
  (18, 2, 1, 89.90), (18, 14, 3, 15.90);

CREATE TABLE dipendenti (
  id              INTEGER PRIMARY KEY,
  nome            TEXT NOT NULL,
  cognome         TEXT NOT NULL,
  ruolo           TEXT NOT NULL,
  reparto         TEXT NOT NULL,
  stipendio       INTEGER NOT NULL,
  responsabile_id INTEGER REFERENCES dipendenti(id),
  data_assunzione TEXT NOT NULL
);
INSERT INTO dipendenti (id, nome, cognome, ruolo, reparto, stipendio, responsabile_id, data_assunzione) VALUES
  (1,  'Roberto',   'Neri',     'Direttore',              'Direzione', 5200, NULL, '2015-03-01'),
  (2,  'Anna',      'Fontana',  'Responsabile vendite',   'Vendite',   3400, 1,    '2017-06-15'),
  (3,  'Stefano',   'Moretti',  'Venditore',              'Vendite',   2100, 2,    '2019-09-01'),
  (4,  'Valentina', 'Barbieri', 'Venditrice',             'Vendite',   2250, 2,    '2020-02-10'),
  (5,  'Giorgio',   'Lombardi', 'Responsabile magazzino', 'Magazzino', 2900, 1,    '2016-11-20'),
  (6,  'Silvia',    'Rinaldi',  'Magazziniera',           'Magazzino', 1850, 5,    '2021-04-12'),
  (7,  'Fabio',     'Caruso',   'Magazziniere',           'Magazzino', 1800, 5,    '2022-01-17'),
  (8,  'Martina',   'Ferri',    'Responsabile IT',        'IT',        3800, 1,    '2018-05-07'),
  (9,  'Luca',      'Santoro',  'Sviluppatore',           'IT',        3100, 8,    '2020-10-01'),
  (10, 'Elisa',     'Marini',   'Sviluppatrice',          'IT',        3100, 8,    '2023-03-13');
`;
});

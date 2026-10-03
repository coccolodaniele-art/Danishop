// Prove automatiche di SQLQuest: ogni esercizio deve accettare la sua soluzione (e varianti
// corrette scritte in modo diverso) e rifiutare risposte sbagliate. Uso: node test_lezioni.js
const initSqlJs = require('sql.js');
const path = require('path');
const DIST = path.join(__dirname, '..', 'dist', 'sqlquest');
const SCHEMA = require(path.join(DIST, 'database.js'));
const { moduli, lezioni } = require(path.join(DIST, 'lezioni.js'));
const Motore = require(path.join(DIST, 'motore.js'));

// Soluzioni alternative corrette, scritte in un altro modo: devono essere accettate.
const ALTERNATIVE = {
  'base-1': ['select * from PRODOTTI'],
  'base-6': ['SELECT * FROM clienti ORDER BY id LIMIT 5'],
  'filtri-3': ['SELECT nome, prezzo FROM prodotti WHERE prezzo < 200 AND categoria_id IN (1)'],
  'filtri-4': ["SELECT nome, cognome, citta FROM clienti WHERE citta = 'Roma' OR citta = 'Napoli' OR citta = 'Palermo'"],
  'filtri-5': ["SELECT * FROM ordini WHERE data_ordine >= '2024-03-01' AND data_ordine <= '2024-06-30'"],
  'filtri-8': ["SELECT id, data_ordine, stato FROM ordini WHERE NOT stato = 'consegnato'", "SELECT id, data_ordine, stato FROM ordini WHERE stato != 'consegnato'"],
  'ordine-1': ['SELECT nome, prezzo FROM prodotti ORDER BY prezzo ASC'],
  'ordine-3': ['SELECT nome, prezzo FROM prodotti ORDER BY 2 DESC LIMIT 3'],
  'ordine-4': ['SELECT nome, prezzo FROM prodotti ORDER BY prezzo DESC LIMIT 3, 3'],
  'funzioni-2': ['SELECT UPPER(citta), LENGTH(citta) FROM clienti GROUP BY citta'],
  'funzioni-4': ["SELECT nome, cognome, SUBSTR(data_iscrizione, 1, 4) AS anno FROM clienti WHERE data_iscrizione LIKE '2024%'"],
  'funzioni-6': ["SELECT nome, cognome, IFNULL(email, 'non disponibile') FROM clienti"],
  'aggrega-1': ['SELECT COUNT(id) FROM clienti'],
  'aggrega-5': ['SELECT citta, COUNT(*) AS n FROM clienti GROUP BY citta HAVING n >= 2'],
  'join-1': ['SELECT prodotti.nome, categorie.nome FROM prodotti INNER JOIN categorie ON categorie.id = prodotti.categoria_id'],
  'join-4': ['SELECT c.nome, c.cognome, COUNT(o.id) FROM clienti c LEFT JOIN ordini o ON c.id = o.cliente_id GROUP BY c.nome, c.cognome'],
  'join-5': ['SELECT nome FROM prodotti WHERE id NOT IN (SELECT prodotto_id FROM dettagli_ordine)'],
  'sub-2': ["SELECT DISTINCT c.nome, c.cognome FROM clienti c JOIN ordini o ON o.cliente_id = c.id WHERE o.stato = 'in lavorazione'"],
  'sub-3': ['SELECT c.nome, c.cognome FROM clienti c LEFT JOIN ordini o ON o.cliente_id = c.id WHERE o.id IS NULL'],
  'avanzato-2': ['SELECT nome FROM dipendenti UNION SELECT nome FROM clienti'],
  'modifica-1': ["INSERT INTO clienti (nome, cognome, citta, email, data_iscrizione) VALUES ('Giovanni', 'Verdi', 'Trieste', 'giovanni.verdi@email.it', '2025-03-01')"],
  'modifica-2': ['UPDATE prodotti SET prezzo = prezzo + prezzo * 0.1 WHERE categoria_id = 2'],
  'modifica-3': ["DELETE FROM ordini WHERE stato IN ('annullato')"],
  'modifica-4': ['UPDATE prodotti SET disponibili = 0 WHERE NOT EXISTS (SELECT 1 FROM dettagli_ordine d WHERE d.prodotto_id = prodotti.id)'],
  'modifica-5': ['create table fornitori (id integer primary key, nome text not null, citta text)'],
  'modifica-7': ['CREATE INDEX idx_ordini_cliente ON ordini(cliente_id)']
};

// Risposte sbagliate e il messaggio che devono produrre.
const SBAGLIATE = {
  'base-3': [['SELECT nome, prezzo FROM prodotti', /colonne devono chiamarsi/]],
  'ordine-1': [['SELECT nome, prezzo FROM prodotti ORDER BY prezzo DESC', /ordine sbagliato/]],
  'filtri-1': [["SELECT * FROM clienti WHERE citta = 'milano'", /1 colonna|righe/]],
  'filtri-7': [['SELECT nome, cognome FROM clienti WHERE email = NULL', /righe/]],
  'join-1': [['SELECT nome FROM prodotti JOIN categorie ON categoria_id = categorie.id', /ambigu|esiste in più tabelle/]],
  'aggrega-5': [['SELECT citta, COUNT(*) FROM clienti WHERE COUNT(*) >= 2 GROUP BY citta', /HAVING/]],
  'base-2': [['SELECT nome, prezo FROM prodotti', /non esiste/], ['SELEC nome FROM prodotti', /sintassi/]],
  'modifica-3': [['DELETE FROM ordini', /righe/]]
};

(async () => {
  const SQL = await initSqlJs();
  let errori = 0;
  const fail = (msg) => { errori++; console.log('  ✗ ' + msg); };

  const idModuli = new Set(moduli.map((m) => m.id));
  const ids = new Set();
  for (const l of lezioni) {
    if (ids.has(l.id)) fail(`id ripetuto ${l.id}`);
    ids.add(l.id);
    if (!idModuli.has(l.modulo)) fail(`${l.id}: modulo sconosciuto ${l.modulo}`);
    for (const k of ['titolo', 'teoria', 'esempio', 'compito', 'suggerimento', 'soluzione']) if (!l[k]) fail(`${l.id}: manca ${k}`);
    if (l.tipo === 'modifica' && !l.verifica) fail(`${l.id}: manca la query di verifica`);

    let atteso;
    try { atteso = Motore.attesoDi(SQL, SCHEMA, l); } catch (e) { fail(`${l.id}: ${e.message}`); continue; }
    if (!atteso || !atteso.righe.length) fail(`${l.id}: il risultato atteso è vuoto`);

    const ok = Motore.verifica(SQL, SCHEMA, l, l.soluzione);
    if (!ok.ok) fail(`${l.id}: la soluzione non viene accettata (${ok.motivo})`);
    for (const alt of ALTERNATIVE[l.id] || []) {
      const r = Motore.verifica(SQL, SCHEMA, l, alt);
      if (!r.ok) fail(`${l.id}: alternativa rifiutata "${alt}" → ${r.motivo}`);
    }
    for (const [sql, attesa] of SBAGLIATE[l.id] || []) {
      const r = Motore.verifica(SQL, SCHEMA, l, sql);
      if (r.ok) fail(`${l.id}: risposta sbagliata accettata "${sql}"`);
      else if (!attesa.test(r.motivo)) fail(`${l.id}: messaggio inatteso per "${sql}" → ${r.motivo}`);
    }
    if (Motore.verifica(SQL, SCHEMA, l, 'SELECT 1').ok) fail(`${l.id}: "SELECT 1" viene accettato`);
    if (Motore.verifica(SQL, SCHEMA, l, '  -- niente\n').ok) fail(`${l.id}: risposta vuota accettata`);

    const db = Motore.nuovoDb(SQL, SCHEMA);
    const es = Motore.esegui(db, l.esempio);
    db.close();
    if (!es.ok) fail(`${l.id}: l'esempio dà errore (${es.originale})`);

    // Negli esercizi in cui conta l'ordine, l'ordinamento della soluzione non deve avere pareggi
    // sulle colonne visibili (altrimenti due risposte giuste potrebbero uscire in ordine diverso).
    if (l.ordinato) {
      const k = atteso.righe.map((r) => JSON.stringify(r));
      if (new Set(k).size !== k.length) fail(`${l.id}: righe identiche in un esercizio ordinato`);
    }
    console.log(`${ok.ok ? '✓' : '✗'} ${l.id.padEnd(11)} ${String(atteso.righe.length).padStart(3)} righe × ${atteso.colonne.length} col  ${l.titolo}`);
  }
  console.log(`\n${lezioni.length} esercizi in ${moduli.length} moduli · ${errori ? errori + ' problemi' : 'tutto a posto'}`);
  process.exit(errori ? 1 : 0);
})();

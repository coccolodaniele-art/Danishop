/* SQLQuest - motore: esegue le query su una copia nuova del database e confronta il
   risultato con quello della soluzione. Funziona nel browser e in Node (per i test). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Motore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function nuovoDb(SQL, schema) {
    const db = new SQL.Database();
    db.exec(schema);
    return db;
  }

  // Esegue uno o più comandi. Restituisce l'ultimo risultato con colonne (anche se vuoto)
  // e quante righe sono state modificate in tutto.
  function esegui(db, sql) {
    const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
    let ultimo = null;
    let comandi = 0;
    // total_changes() conta tutte le righe modificate dall'apertura del database: la differenza
    // prima/dopo dà quelle cambiate da questi comandi (CREATE e SELECT non contano).
    const totale = () => db.exec('SELECT total_changes()')[0].values[0][0];
    const prima = totale();
    try {
      for (const stmt of db.iterateStatements(sql)) {
        comandi++;
        const colonne = stmt.getColumnNames();
        const righe = [];
        while (stmt.step()) righe.push(stmt.get());
        if (colonne.length) ultimo = { colonne, righe };
        stmt.free();
      }
    } catch (err) {
      return { ok: false, errore: traduciErrore(String(err && err.message || err)), originale: String(err && err.message || err) };
    }
    const tempo = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
    return { ok: true, risultato: ultimo, modificate: totale() - prima, comandi, tempo };
  }

  // Messaggi di SQLite tradotti in italiano, con un consiglio pratico.
  function traduciErrore(msg) {
    const m = String(msg);
    let r;
    if ((r = /no such column: (.+)/i.exec(m))) return `La colonna "${r[1]}" non esiste. Controlla il nome nella scheda Tabelle (e l'alias della tabella, se ne usi uno).`;
    if ((r = /no such table: (.+)/i.exec(m))) return `La tabella "${r[1]}" non esiste. Le tabelle disponibili sono nella scheda Tabelle.`;
    if ((r = /near "(.+?)": syntax error/i.exec(m))) return `Errore di sintassi vicino a "${r[1]}". Controlla virgole, apici e l'ordine delle clausole (SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT).`;
    if (/incomplete input/i.test(m)) return 'La query è incompleta: manca qualcosa alla fine (una parentesi, un apice o una parte della clausola).';
    if ((r = /ambiguous column name: (.+)/i.exec(m))) return `La colonna "${r[1]}" esiste in più tabelle: scrivi anche il nome (o l'alias) della tabella, ad esempio c.${r[1]}.`;
    if (/misuse of aggregate/i.test(m)) return 'Funzione di aggregazione usata nel posto sbagliato: per filtrare su COUNT, SUM, AVG… usa HAVING invece di WHERE.';
    if (/misuse of window function/i.test(m)) return 'Funzione finestra (OVER) usata nel posto sbagliato: non si può usare in WHERE; mettila in una subquery o in una CTE.';
    if ((r = /no such function: (.+)/i.exec(m))) return `La funzione "${r[1]}" non esiste in SQLite (il motore SQL usato qui).`;
    if ((r = /table (.+) already exists/i.exec(m))) return `La tabella "${r[1]}" esiste già.`;
    if ((r = /UNIQUE constraint failed: (.+)/i.exec(m))) return `Valore già presente: la colonna ${r[1]} non ammette doppioni.`;
    if ((r = /NOT NULL constraint failed: (.+)/i.exec(m))) return `Manca un valore obbligatorio: la colonna ${r[1]} non può essere vuota (NULL).`;
    if (/SELECTs to the left and right of UNION do not have the same number of result columns/i.test(m)) return 'Le SELECT unite con UNION devono avere lo stesso numero di colonne.';
    if (/(\d+) values for (\d+) columns/i.test(m)) return 'Il numero di valori non corrisponde al numero di colonne indicate.';
    if (/unrecognized token/i.test(m)) return 'C\'è un carattere non riconosciuto: controlla di aver chiuso gli apici dei testi (\'testo\').';
    return 'Errore SQL: ' + m;
  }

  const normale = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
  const chiave = (riga) => JSON.stringify(riga.map(normale));

  // Confronta due risultati. opzioni: ordinato (conta l'ordine delle righe), colonne (contano i nomi).
  function confrontaRisultati(atteso, ottenuto, opzioni = {}) {
    if (!ottenuto) return { ok: false, motivo: 'La tua query non restituisce una tabella di risultati: per questo esercizio serve un SELECT.' };
    const na = atteso.colonne.length, no = ottenuto.colonne.length;
    if (na !== no) {
      return { ok: false, motivo: `Il risultato atteso ha ${na} ${na === 1 ? 'colonna' : 'colonne'}, il tuo ne ha ${no}. Controlla quali colonne scrivi dopo SELECT.` };
    }
    if (opzioni.colonne) {
      const diverse = atteso.colonne.filter((c, i) => c.toLowerCase() !== String(ottenuto.colonne[i]).toLowerCase());
      if (diverse.length) {
        return { ok: false, motivo: `Le colonne devono chiamarsi: ${atteso.colonne.join(', ')}. Usa AS per dare il nome giusto (le tue: ${ottenuto.colonne.join(', ')}).` };
      }
    }
    const ra = atteso.righe.length, ro = ottenuto.righe.length;
    if (ra !== ro) {
      return { ok: false, motivo: `Il risultato atteso ha ${ra} ${ra === 1 ? 'riga' : 'righe'}, il tuo ne ha ${ro}. ${ro > ra ? 'Forse manca un filtro (WHERE) o un raggruppamento.' : 'Forse il filtro è troppo restrittivo.'}` };
    }
    const ka = atteso.righe.map(chiave), ko = ottenuto.righe.map(chiave);
    const sa = [...ka].sort(), so = [...ko].sort();
    const stesseRighe = sa.every((k, i) => k === so[i]);
    if (!stesseRighe) {
      return { ok: false, motivo: 'Il numero di righe è giusto, ma alcuni valori sono diversi da quelli attesi. Confronta con "Risultato atteso".' };
    }
    if (opzioni.ordinato && !ka.every((k, i) => k === ko[i])) {
      return { ok: false, motivo: 'Le righe sono giuste ma nell\'ordine sbagliato: controlla ORDER BY (ASC per crescente, DESC per decrescente).' };
    }
    return { ok: true };
  }

  // Risultato di riferimento di un esercizio (quello prodotto dalla soluzione).
  function attesoDi(SQL, schema, lezione) {
    const db = nuovoDb(SQL, schema);
    try {
      const r = esegui(db, lezione.soluzione);
      if (!r.ok) throw new Error('Soluzione non valida: ' + r.originale);
      if (lezione.tipo === 'modifica') {
        const v = esegui(db, lezione.verifica);
        if (!v.ok) throw new Error('Verifica non valida: ' + v.originale);
        return v.risultato;
      }
      return r.risultato;
    } finally {
      db.close();
    }
  }

  // Controlla la risposta dell'utente a un esercizio.
  function verifica(SQL, schema, lezione, sqlUtente) {
    if (!String(sqlUtente || '').replace(/--.*$/gm, '').trim()) return { ok: false, motivo: 'Scrivi prima la tua query nell\'editor.' };
    const atteso = attesoDi(SQL, schema, lezione);
    const db = nuovoDb(SQL, schema);
    try {
      const r = esegui(db, sqlUtente);
      if (!r.ok) return { ok: false, motivo: r.errore, errore: true };
      if (lezione.tipo === 'modifica') {
        const v = esegui(db, lezione.verifica);
        if (!v.ok) return { ok: false, motivo: 'Dopo i tuoi comandi il controllo non riesce: ' + v.errore };
        const c = confrontaRisultati(atteso, v.risultato, { ordinato: true });
        if (!c.ok) c.motivo = 'I dati non sono come previsto dopo i tuoi comandi. ' + c.motivo.replace(/Il risultato atteso/, 'Il controllo atteso').replace(/il tuo ne ha/, 'si ottengono');
        return c;
      }
      return confrontaRisultati(atteso, r.risultato, { ordinato: !!lezione.ordinato, colonne: !!lezione.colonne });
    } finally {
      db.close();
    }
  }

  return { nuovoDb, esegui, traduciErrore, confrontaRisultati, attesoDi, verifica };
});

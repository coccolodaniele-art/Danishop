// Controllo delle mini-lezioni di SQLQuest.
// Uso: node verifica_mini_sql.js <file.js> <NOME_OGGETTO> [moduli separati da virgola]
//   es. node verifica_mini_sql.js ../dist/sqlquest/mini-lezioni.js SQL_MINI_LESSONS
//       node verifica_mini_sql.js ../../MINI_SQL_CODEX.js MINI_SQL_CODEX join,sub,avanzato,modifica
// Controlla: chiavi esatte, forma, HTML ammesso, righe dell'esempio <= 38 caratteri e <= 12 righe,
// l'esempio gira sul database del simulatore senza errori e mostra una tabella con almeno una riga,
// e NON viene accettato come soluzione dell'esercizio (deve essere un esempio diverso).
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const DIST = path.join(__dirname, '..', 'dist', 'sqlquest');
const SCHEMA = require(path.join(DIST, 'database.js'));
const { lezioni } = require(path.join(DIST, 'lezioni.js'));
const Motore = require(path.join(DIST, 'motore.js'));

const [file, nome, filtro] = process.argv.slice(2);
if (!file || !nome) { console.log('Uso: node verifica_mini_sql.js <file.js> <NOME_OGGETTO> [moduli]'); process.exit(2); }
const src = fs.readFileSync(file, 'utf8');
const window = {};
const obj = new Function('window', src + `\nreturn typeof ${nome} !== 'undefined' ? ${nome} : window.${nome};`)(window);
const moduli = filtro ? filtro.split(',') : null;
const ids = lezioni.filter((l) => !moduli || moduli.includes(l.modulo)).map((l) => l.id);

(async () => {
  const SQL = await initSqlJs();
  let errori = 0, ok = 0;
  const err = (id, m) => { errori++; console.log(`✗ ${id}: ${m}`); };
  for (const k of Object.keys(obj)) if (!ids.includes(k)) err(k, 'chiave in più');
  const tagNo = /<(?!\/?(code|b|i)>)[^>]*>/;
  const norm = (s) => String(s).replace(/--.*$/gm, '').replace(/\s+/g, ' ').replace(/\s*;\s*$/, '').trim().toLowerCase();
  for (const id of ids) {
    const m = obj[id];
    const l = lezioni.find((x) => x.id === id);
    if (!m) { err(id, 'manca'); continue; }
    for (const f of ['goal', 'idea']) if (typeof m[f] !== 'string' || !m[f].trim()) err(id, `${f} vuoto`);
    if (!m.example || typeof m.example.code !== 'string' || !m.example.code.trim()) { err(id, 'example.code mancante'); continue; }
    if (!Array.isArray(m.steps) || m.steps.length < 3 || m.steps.length > 5) err(id, `steps: ${m.steps && m.steps.length} (servono 3-5)`);
    if (!Array.isArray(m.traps) || m.traps.length < 1 || m.traps.length > 3) err(id, `traps: ${m.traps && m.traps.length} (servono 1-3)`);
    const testi = [m.goal, m.idea, m.example.note || '', ...(m.steps || []), ...(m.traps || [])];
    for (const t of testi) {
      if (typeof t !== 'string') { err(id, 'testo non stringa'); continue; }
      const x = t.match(tagNo); if (x) err(id, `HTML non ammesso: ${x[0]}`);
    }
    const righe = m.example.code.split('\n');
    righe.forEach((r, n) => { if (r.length > 38) err(id, `riga ${n + 1} lunga ${r.length}: ${r}`); });
    if (righe.length > 12) err(id, `esempio di ${righe.length} righe (massimo 12)`);
    if (/<|>/.test(m.example.code) && /&lt;|&gt;/.test(m.example.code)) err(id, 'example.code è testo puro: niente &lt; &gt;');

    const db = Motore.nuovoDb(SQL, SCHEMA);
    let r;
    try { r = Motore.esegui(db, m.example.code); } finally { db.close(); }
    if (!r.ok) { err(id, `l'esempio dà errore: ${r.originale}`); continue; }
    if (!r.risultato) { err(id, "l'esempio non termina con un SELECT che mostra una tabella"); continue; }
    if (!r.risultato.righe.length) { err(id, "l'esempio restituisce 0 righe"); continue; }
    if (norm(m.example.code) === norm(l.soluzione)) { err(id, "l'esempio è identico alla soluzione"); continue; }
    const v = Motore.verifica(SQL, SCHEMA, l, m.example.code);
    if (v.ok) { err(id, "l'esempio viene accettato come soluzione dell'esercizio: deve essere diverso"); continue; }
    ok++;
    console.log(`✓ ${id.padEnd(11)} ${String(r.risultato.righe.length).padStart(3)} righe × ${r.risultato.colonne.length} col`);
  }
  console.log(`\n${ok}/${ids.length} esempi validi, ${errori} problemi.`);
  process.exit(errori ? 1 : 0);
})();

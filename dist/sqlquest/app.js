/* SQLQuest - interfaccia: corso a esercizi e laboratorio libero. */
(() => {
  'use strict';

  const SCHEMA = window.SQLQ_DB;
  const { moduli, lezioni } = window.SQLQ_LEZIONI;
  const Motore = window.Motore;
  const STORAGE_KEY = 'sqlquest_v1';
  const MAX_RIGHE = 500;
  const LAB_ESEMPI = [
    ['Tutte le tabelle del database', "SELECT name AS tabella, type AS tipo\nFROM sqlite_master\nWHERE type IN ('table', 'view')\nORDER BY name;"],
    ['I 5 clienti che hanno speso di più', "SELECT c.nome, c.cognome, ROUND(SUM(d.quantita * d.prezzo_unitario), 2) AS speso\nFROM clienti c\nJOIN ordini o ON o.cliente_id = c.id\nJOIN dettagli_ordine d ON d.ordine_id = o.id\nWHERE o.stato <> 'annullato'\nGROUP BY c.id\nORDER BY speso DESC\nLIMIT 5;"],
    ['Vendite mese per mese', "SELECT strftime('%Y-%m', o.data_ordine) AS mese,\n       COUNT(DISTINCT o.id) AS ordini,\n       ROUND(SUM(d.quantita * d.prezzo_unitario), 2) AS incasso\nFROM ordini o\nJOIN dettagli_ordine d ON d.ordine_id = o.id\nGROUP BY mese\nORDER BY mese;"],
    ['Crea una tabella e riempila', "CREATE TABLE note (\n  id INTEGER PRIMARY KEY,\n  testo TEXT NOT NULL,\n  creata TEXT DEFAULT (date('now'))\n);\nINSERT INTO note (testo) VALUES ('Imparare le JOIN'), ('Ripassare GROUP BY');\nSELECT * FROM note;"]
  ];

  let SQL = null;
  let labDb = null;
  let editor = null;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- stato salvato nel browser ---------- */
  const state = Object.assign({ fatti: {}, aiuti: {}, codice: {}, corrente: lezioni[0].id, lab: '', modo: 'corso', aperti: {} }, leggi());
  function leggi() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (_) { return {}; } }
  function salva() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* memoria piena o disattivata */ } }
  const lezioneCorrente = () => lezioni.find((l) => l.id === state.corrente) || lezioni[0];
  const aiuti = (id) => (state.aiuti[id] = state.aiuti[id] || { sugg: false, sol: false });

  /* ---------- editor ---------- */
  function creaEditor() {
    const ta = $('editor');
    if (window.CodeMirror) {
      editor = CodeMirror.fromTextArea(ta, {
        mode: 'text/x-sqlite', lineNumbers: true, matchBrackets: true, indentUnit: 2, tabSize: 2,
        lineWrapping: true, extraKeys: { 'Ctrl-Enter': esegui, 'Cmd-Enter': esegui, Tab: (cm) => cm.replaceSelection('  ') }
      });
      editor.on('change', ricordaCodice);
    } else {
      // riserva se l'editor colorato non si carica: una semplice area di testo
      editor = {
        getValue: () => ta.value, setValue: (v) => { ta.value = v; }, focus: () => ta.focus(),
        replaceSelection: (t) => { const s = ta.selectionStart; ta.setRangeText(t, s, ta.selectionEnd, 'end'); }
      };
      ta.addEventListener('input', ricordaCodice);
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); esegui(); } });
    }
  }
  let caricando = false;
  function ricordaCodice() {
    if (caricando) return;
    if (state.modo === 'lab') state.lab = editor.getValue();
    else state.codice[state.corrente] = editor.getValue();
    salva();
  }
  function impostaCodice(testo) { caricando = true; editor.setValue(testo); caricando = false; }

  /* ---------- barra laterale e progressi ---------- */
  function disegnaSidebar() {
    const corrente = lezioneCorrente();
    $('sidebar').innerHTML = moduli.map((m) => {
      const lista = lezioni.filter((l) => l.modulo === m.id);
      const fatte = lista.filter((l) => state.fatti[l.id]).length;
      const aperto = state.aperti[m.id] ?? (m.id === corrente.modulo);
      return `<div class="mod${aperto ? ' open' : ''}" data-mod="${m.id}">
        <button class="mod-head" type="button" data-toggle="${m.id}">
          <span class="mod-ico">${m.icona}</span>
          <span class="mod-title">${esc(m.titolo)}<small>${esc(m.descrizione)}</small></span>
          <span class="mod-count${fatte === lista.length ? ' full' : ''}">${fatte}/${lista.length}</span>
        </button>
        <div class="mod-list">${lista.map((l) => {
          const f = state.fatti[l.id];
          const n = lezioni.indexOf(l) + 1;
          return `<button type="button" class="les${f ? ' done' : ''}${l.id === corrente.id && state.modo === 'corso' ? ' active' : ''}" data-les="${l.id}">
            <span class="dot">${f ? '✓' : n}</span><span class="name">${esc(l.titolo)}</span>${f ? `<span class="stars">${'★'.repeat(f.stelle)}</span>` : ''}</button>`;
        }).join('')}</div>
      </div>`;
    }).join('') + `<div class="side-foot">I progressi restano salvati in questo browser. <button type="button" id="btnAzzera">Azzera i progressi</button></div>`;
    const fatti = Object.keys(state.fatti).filter((id) => lezioni.some((l) => l.id === id)).length;
    const xp = Object.values(state.fatti).reduce((a, f) => a + (f.xp || 0), 0);
    $('progTesto').textContent = `${fatti} / ${lezioni.length}`;
    $('xpTesto').textContent = `${xp} XP`;
    $('progBar').style.width = `${(fatti / lezioni.length) * 100}%`;
  }

  /* ---------- pannello lezione ---------- */
  function disegnaLezione() {
    const l = lezioneCorrente();
    const m = moduli.find((x) => x.id === l.modulo);
    const i = lezioni.indexOf(l);
    const a = aiuti(l.id);
    const f = state.fatti[l.id];
    $('lesson').innerHTML = `
      <div class="crumb"><span>${m.icona} ${esc(m.titolo)}</span><span>esercizio ${i + 1} di ${lezioni.length}</span>
        <span class="lvl" title="Difficoltà">${'●'.repeat(l.livello)}${'○'.repeat(5 - l.livello)}</span><span class="xp">+${l.xp} XP</span></div>
      <h1>${esc(l.titolo)}</h1>
      <div class="theory">${l.teoria}</div>
      <div class="example">
        <p class="lbl">Esempio da provare</p>
        <div class="code-show">${esc(l.esempio)}</div>
        <div class="row"><button class="btn" type="button" data-act="esempio">▶ Esegui l'esempio</button><button class="btn" type="button" data-act="copia-esempio">Copia nell'editor</button></div>
      </div>
      <div class="task">
        <h2>Esercizio</h2>
        <p class="text">${l.compito}</p>
        ${l.tipo === 'modifica' ? '<p class="note">Ogni esecuzione riparte dai dati originali: puoi riprovare quante volte vuoi.</p>' : ''}
        ${l.ordinato ? '<p class="note">Qui conta anche l\'ordine delle righe.</p>' : ''}
        <div class="row">
          <button class="btn" type="button" data-act="sugg">💡 Suggerimento</button>
          <button class="btn" type="button" data-act="atteso">👁 Risultato atteso</button>
          <button class="btn" type="button" data-act="sol">🔑 Soluzione</button>
        </div>
        ${a.sugg ? `<div class="help hint">💡 ${esc(l.suggerimento)}</div>` : ''}
        ${a.sol ? `<div class="help sol"><b>Soluzione</b><div class="code-show">${esc(l.soluzione)}</div><button class="btn" type="button" data-act="copia-sol">Copia nell'editor</button></div>` : ''}
        <div id="feedback">${f ? `<div class="feedback ok">✅ Esercizio completato <b class="stars">${'★'.repeat(f.stelle)}${'☆'.repeat(3 - f.stelle)}</b> · ${f.xp} XP</div>` : ''}</div>
      </div>
      <div class="lesson-nav">
        <button class="btn" type="button" data-act="prec" ${i === 0 ? 'disabled' : ''}>← Precedente</button>
        <button class="btn${f ? ' primary' : ''}" type="button" data-act="succ" ${i === lezioni.length - 1 ? 'disabled' : ''}>Successivo →</button>
      </div>`;
    // Se l'esempio è già scritto nella teoria, i pulsanti vanno sotto quello e il riquadro non si ripete.
    const norm = (t) => t.replace(/\s+/g, ' ').trim();
    const pre = [...$('lesson').querySelectorAll('.theory pre')].find((p) => norm(p.textContent) === norm(l.esempio));
    const box = $('lesson').querySelector('.example');
    if (pre && box) {
      const azioni = box.querySelector('.row');
      azioni.classList.add('inline');
      pre.after(azioni);
      box.remove();
    }
    $('lesson').scrollTop = 0;
  }

  function disegnaLab() {
    $('lesson').innerHTML = `
      <div class="crumb"><span>🧪 Laboratorio libero</span></div>
      <h1>Sperimenta liberamente</h1>
      <div class="theory">
        <p>Qui puoi scrivere qualsiasi comando SQL sul database del negozio: leggere, creare tabelle, inserire, modificare e cancellare. Le modifiche <b>restano</b> finché non ripristini il database.</p>
        <p>Nella scheda <b>Tabelle</b>, a destra, trovi tutte le tabelle con le loro colonne: clicca un nome per inserirlo nell'editor, o <b>Anteprima</b> per vedere le prime righe.</p>
        <p class="tip">Puoi scrivere più comandi uno dopo l'altro, separati da punto e virgola: viene mostrato il risultato dell'ultimo SELECT.</p>
      </div>
      <div class="example lab-tips">
        <p class="lbl">Idee da provare (clicca per copiarle)</p>
        ${LAB_ESEMPI.map(([t, q], k) => `<p style="margin:10px 0 4px;font-weight:600;font-size:13.5px">${esc(t)}</p><div class="code-show" data-lab="${k}">${esc(q)}</div>`).join('')}
      </div>
      <div class="row" style="margin-top:14px"><button class="btn" type="button" data-act="lab-reset">↺ Ripristina il database originale</button></div>`;
    $('lesson').scrollTop = 0;
  }

  function vaiA(id) {
    state.corrente = id;
    const l = lezioneCorrente();
    state.aperti[l.modulo] = true;
    salva();
    disegnaSidebar();
    disegnaLezione();
    impostaCodice(state.codice[id] ?? '');
    $('fileName').innerHTML = `<b>esercizio-${lezioni.indexOf(l) + 1}.sql</b>`;
    mostraVuoto();
    document.body.classList.remove('show-menu');
  }

  function cambiaModo(modo) {
    state.modo = modo;
    salva();
    document.querySelectorAll('.modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === modo));
    if (modo === 'lab') {
      if (!labDb) labDb = Motore.nuovoDb(SQL, SCHEMA);
      disegnaLab();
      impostaCodice(state.lab || '');
      $('fileName').innerHTML = '<b>laboratorio.sql</b>';
      $('btnCheck').hidden = true;
      mostraVuoto();
      disegnaSidebar();
    } else {
      $('btnCheck').hidden = false;
      vaiA(state.corrente);
    }
  }

  /* ---------- risultati ---------- */
  let schedaOut = 'ris';
  function mostraScheda(s) {
    schedaOut = s;
    document.querySelectorAll('.out-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === s));
    if (s === 'tab') mostraTabelle();
  }
  function mostraVuoto() {
    mostraScheda('ris');
    $('outInfo').textContent = '';
    $('out').innerHTML = `<div class="empty-out">Scrivi una query nell'editor e premi <b>▶ Esegui</b> (o Ctrl+Invio) per vederne il risultato.<br>Quando pensi di aver risolto l'esercizio premi <b>✓ Verifica</b>.</div>`;
  }
  function formatta(v) {
    if (v === null || v === undefined) return '<span class="null">NULL</span>';
    if (typeof v === 'number') return esc(Number.isInteger(v) ? v : Math.round(v * 1e6) / 1e6);
    if (v instanceof Uint8Array) return '<span class="null">[dati binari]</span>';
    return esc(v);
  }
  function tabellaHtml(ris) {
    if (!ris.colonne.length) return '';
    if (!ris.righe.length) return `<div class="msg info">La query è corretta ma non ha trovato nessuna riga.</div><table class="res"><tr>${ris.colonne.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></table>`;
    const righe = ris.righe.slice(0, MAX_RIGHE);
    return `<table class="res"><thead><tr>${ris.colonne.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${righe.map((r) => `<tr>${r.map((v) => `<td${typeof v === 'number' ? ' class="num"' : ''}>${formatta(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>${ris.righe.length > MAX_RIGHE ? `<p class="more">Mostrate le prime ${MAX_RIGHE} righe di ${ris.righe.length}.</p>` : ''}`;
  }
  function mostraEsito(r, etichetta) {
    mostraScheda('ris');
    if (!r.ok) {
      $('outInfo').textContent = '';
      $('out').innerHTML = `${etichetta ? `<p class="label">${esc(etichetta)}</p>` : ''}<div class="msg err">⚠ ${esc(r.errore)}</div>`;
      return;
    }
    const n = r.risultato ? r.risultato.righe.length : 0;
    $('outInfo').textContent = r.risultato ? `${n} ${n === 1 ? 'riga' : 'righe'} · ${Math.max(1, Math.round(r.tempo))} ms` : `${Math.max(1, Math.round(r.tempo))} ms`;
    let html = etichetta ? `<p class="label">${esc(etichetta)}</p>` : '';
    if (r.modificate > 0) html += `<div class="msg info">✔ ${r.modificate} ${r.modificate === 1 ? 'riga modificata' : 'righe modificate'}.</div>`;
    if (r.risultato) html += tabellaHtml(r.risultato);
    else if (!r.modificate) html += `<div class="msg info">✔ Comando eseguito${r.comandi ? '' : ' (nessun comando trovato)'}.</div>`;
    $('out').innerHTML = html;
  }

  function mostraTabelle() {
    const db = state.modo === 'lab' ? labDb : Motore.nuovoDb(SQL, SCHEMA);
    try {
      const elenco = db.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name")[0];
      const nomi = elenco ? elenco.values : [];
      $('outInfo').textContent = `${nomi.length} ${nomi.length === 1 ? 'tabella' : 'tabelle'}`;
      $('out').innerHTML = `<div class="tables">${nomi.map(([nome, tipo]) => {
        const col = db.exec(`SELECT name, type, pk FROM pragma_table_info('${nome.replace(/'/g, "''")}')`)[0];
        const fk = db.exec(`SELECT "from", "table" FROM pragma_foreign_key_list('${nome.replace(/'/g, "''")}')`)[0];
        const fks = Object.fromEntries((fk ? fk.values : []).map(([c, t]) => [c, t]));
        let righe = '?';
        try { righe = db.exec(`SELECT COUNT(*) FROM "${nome.replace(/"/g, '""')}"`)[0].values[0][0]; } catch (_) { /* vista non valida */ }
        return `<div class="tcard"><h3>${tipo === 'view' ? '👁' : '▦'} <button type="button" class="ins" data-ins="${esc(nome)}" style="border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer">${esc(nome)}</button><small>${righe} righe</small></h3>
          <ul>${(col ? col.values : []).map(([c, t, pk]) => `<li><button type="button" data-ins="${esc(c)}">${esc(c)}</button><span class="type">${esc(t || '')}</span>${pk ? '<span class="key" title="Chiave primaria">PK</span>' : ''}${fks[c] ? `<span class="key fk" title="Collegata a ${esc(fks[c])}">→ ${esc(fks[c])}</span>` : ''}</li>`).join('')}</ul>
          <button class="btn" type="button" data-anteprima="${esc(nome)}">Anteprima</button></div>`;
      }).join('')}</div>`;
    } finally {
      if (state.modo !== 'lab') db.close();
    }
  }

  /* ---------- azioni ---------- */
  function esegui() {
    const sql = editor.getValue();
    if (!sql.replace(/--.*$/gm, '').trim()) { toast('Scrivi prima una query'); return; }
    if (state.modo === 'lab') { mostraEsito(Motore.esegui(labDb, sql)); return; }
    const db = Motore.nuovoDb(SQL, SCHEMA);
    try {
      const r = Motore.esegui(db, sql);
      const l = lezioneCorrente();
      if (r.ok && l.tipo === 'modifica' && !r.risultato) {
        // dopo un INSERT/UPDATE/DELETE mostra come sono diventati i dati
        const v = Motore.esegui(db, l.verifica);
        if (v.ok) { v.modificate = r.modificate; mostraEsito(v, 'Dati dopo i tuoi comandi'); return; }
      }
      mostraEsito(r);
    } finally {
      db.close();
    }
  }

  function verifica() {
    const l = lezioneCorrente();
    const sql = editor.getValue();
    let esito;
    try { esito = Motore.verifica(SQL, SCHEMA, l, sql); } catch (e) { esito = { ok: false, motivo: String(e.message || e) }; }
    if (sql.replace(/--.*$/gm, '').trim()) esegui();
    const box = $('feedback');
    if (!esito.ok) {
      box.innerHTML = `<div class="feedback ko">✗ Non ancora. ${esc(esito.motivo)}</div>`;
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const a = aiuti(l.id);
    const stelle = a.sol ? 1 : a.sugg ? 2 : 3;
    const xp = Math.round(l.xp * stelle / 3);
    const prima = state.fatti[l.id];
    if (!prima || stelle > prima.stelle) state.fatti[l.id] = { stelle, xp, data: new Date().toISOString().slice(0, 10) };
    salva();
    const f = state.fatti[l.id];
    const ultimo = lezioni.indexOf(l) === lezioni.length - 1;
    box.innerHTML = `<div class="feedback ok">✅ <b>Corretto!</b> <b class="stars">${'★'.repeat(stelle)}${'☆'.repeat(3 - stelle)}</b> · +${f.xp} XP${stelle < 3 ? ' <span style="color:#5a7480">(3 stelle se lo risolvi senza aiuti)</span>' : ''}
      <div class="row" style="margin-top:10px">${ultimo ? '<b>🎉 Hai completato tutto il percorso!</b>' : '<button class="btn primary" type="button" data-act="succ">Prossimo esercizio →</button>'}</div></div>`;
    toast(`Esercizio superato! +${f.xp} XP`, true);
    disegnaSidebar();
    const nav = document.querySelector('.lesson-nav [data-act="succ"]');
    if (nav) nav.classList.add('primary');
  }

  function mostraAtteso() {
    const l = lezioneCorrente();
    const ris = Motore.attesoDi(SQL, SCHEMA, l);
    mostraScheda('ris');
    $('outInfo').textContent = `${ris.righe.length} ${ris.righe.length === 1 ? 'riga' : 'righe'}`;
    $('out').innerHTML = `<p class="label expected">Risultato atteso${l.tipo === 'modifica' ? ' (dati dopo i comandi giusti)' : ''}</p>${tabellaHtml(ris)}`;
  }

  let toastTimer = null;
  function toast(testo, buono) {
    const t = $('toast');
    t.textContent = testo;
    t.classList.toggle('good', !!buono);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function collegaEventi() {
    $('btnRun').addEventListener('click', esegui);
    $('btnCheck').addEventListener('click', verifica);
    $('btnReset').addEventListener('click', () => { impostaCodice(''); ricordaCodice(); editor.focus(); });
    $('menuBtn').addEventListener('click', () => document.body.classList.toggle('show-menu'));
    document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => cambiaModo(b.dataset.mode)));
    document.querySelectorAll('.out-tabs button').forEach((b) => b.addEventListener('click', () => mostraScheda(b.dataset.tab)));

    $('sidebar').addEventListener('click', (e) => {
      const t = e.target.closest('[data-toggle]');
      if (t) {
        const m = t.dataset.toggle;
        const box = t.closest('.mod');
        box.classList.toggle('open');
        state.aperti[m] = box.classList.contains('open');
        salva();
        return;
      }
      const les = e.target.closest('[data-les]');
      if (les) { if (state.modo === 'lab') { state.corrente = les.dataset.les; cambiaModo('corso'); } else vaiA(les.dataset.les); return; }
      if (e.target.id === 'btnAzzera' && confirm('Vuoi davvero azzerare tutti i progressi e le query salvate?')) {
        state.fatti = {}; state.aiuti = {}; state.codice = {}; salva(); vaiA(lezioni[0].id); toast('Progressi azzerati');
      }
    });

    $('lesson').addEventListener('click', (e) => {
      const lab = e.target.closest('[data-lab]');
      if (lab) { impostaCodice(LAB_ESEMPI[+lab.dataset.lab][1]); ricordaCodice(); editor.focus(); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const l = lezioneCorrente();
      const i = lezioni.indexOf(l);
      switch (b.dataset.act) {
        case 'esempio': {
          const db = Motore.nuovoDb(SQL, SCHEMA);
          try { mostraEsito(Motore.esegui(db, l.esempio), 'Risultato dell\'esempio'); } finally { db.close(); }
          break;
        }
        case 'copia-esempio': impostaCodice(l.esempio); ricordaCodice(); editor.focus(); break;
        case 'copia-sol': impostaCodice(l.soluzione); ricordaCodice(); editor.focus(); break;
        case 'sugg': aiuti(l.id).sugg = true; salva(); ridisegnaAiuti(); break;
        case 'sol':
          if (aiuti(l.id).sol || confirm('Vuoi vedere la soluzione? Se poi completi l\'esercizio otterrai 1 stella invece di 3.')) {
            aiuti(l.id).sol = true; salva(); ridisegnaAiuti();
          }
          break;
        case 'atteso': mostraAtteso(); break;
        case 'prec': if (i > 0) vaiA(lezioni[i - 1].id); break;
        case 'succ': if (i < lezioni.length - 1) vaiA(lezioni[i + 1].id); break;
        case 'lab-reset':
          if (confirm('Ripristinare il database originale? Le tabelle e i dati che hai cambiato nel laboratorio andranno persi.')) {
            labDb.close(); labDb = Motore.nuovoDb(SQL, SCHEMA); toast('Database ripristinato'); mostraVuoto();
          }
          break;
      }
    });

    $('out').addEventListener('click', (e) => {
      const ins = e.target.closest('[data-ins]');
      if (ins) { editor.replaceSelection(ins.dataset.ins); editor.focus(); return; }
      const ant = e.target.closest('[data-anteprima]');
      if (ant) {
        const nome = ant.dataset.anteprima;
        const q = `SELECT * FROM ${/^[a-z_][a-z0-9_]*$/i.test(nome) ? nome : `"${nome.replace(/"/g, '""')}"`} LIMIT 20;`;
        const db = state.modo === 'lab' ? labDb : Motore.nuovoDb(SQL, SCHEMA);
        try { mostraEsito(Motore.esegui(db, q), `Anteprima di ${nome} (prime 20 righe)`); } finally { if (state.modo !== 'lab') db.close(); }
      }
    });
  }

  // Ridisegna solo il riquadro dell'esercizio, mantenendo la posizione di lettura.
  function ridisegnaAiuti() {
    const top = $('lesson').scrollTop;
    const fb = $('feedback') ? $('feedback').innerHTML : '';
    disegnaLezione();
    $('feedback').innerHTML = fb;
    $('lesson').scrollTop = top;
    const h = document.querySelector('.task .help:last-of-type');
    if (h) h.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------- avvio ---------- */
  async function avvia() {
    creaEditor();
    try {
      SQL = await initSqlJs({ locateFile: (f) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/${f}` });
    } catch (e) {
      $('loading').innerHTML = '<div>⚠ Non riesco a caricare il motore SQL.<br><small>Controlla la connessione a internet e ricarica la pagina.</small></div>';
      return;
    }
    collegaEventi();
    $('loading').hidden = true;
    cambiaModo(state.modo === 'lab' ? 'lab' : 'corso');
  }
  avvia();
})();

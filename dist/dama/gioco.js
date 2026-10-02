/* Dama: menu, damiera, mosse del giocatore e del computer, salvataggio e statistiche. Le regole sono in regole.js. */
(function () {
  'use strict';
  const R = window.Regole;
  const $ = (sel) => document.querySelector(sel);
  const ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const attesa = (ms) => new Promise((ok) => setTimeout(ok, ridotto ? 0 : ms));

  /* ---------------- Salvataggi ---------------- */
  const store = {
    get(k, def) {
      try { const v = localStorage.getItem('dama.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set(k, v) { try { localStorage.setItem('dama.' + k, JSON.stringify(v)); } catch (e) { /* niente */ } },
    del(k) { try { localStorage.removeItem('dama.' + k); } catch (e) { /* niente */ } }
  };

  const TEMI = { legno: ['#f0d9b5', '#b58863'], noce: ['#ecd2a8', '#8b5a2b'], verde: ['#eeeed2', '#769656'], blu: ['#dee3e6', '#7f98a6'] };
  const imp = Object.assign({ tema: 'legno', suggerite: true, numeri: false, suoni: true, livello: 2, colore: 1, giraLocale: false }, store.get('impostazioni', {}));
  const salvaImp = () => store.set('impostazioni', imp);
  const statistiche = store.get('statistiche', {});
  const stat = (l) => (statistiche['l' + l] = Object.assign({ vinte: 0, perse: 0, patte: 0 }, statistiche['l' + l]));
  const riassunto = (st) => `${st.vinte} ${st.vinte === 1 ? 'vinta' : 'vinte'} · ${st.patte} ${st.patte === 1 ? 'patta' : 'patte'} · ${st.perse} ${st.perse === 1 ? 'persa' : 'perse'}`;

  /* ---------------- Stato ---------------- */
  let P = null;           // partita: { modo: 'ai'|'due', livello, umano, giraLocale, mosse: [{ da, percorso, x }], fine }
  let stati = [];         // posizioni dopo ogni mossa (stati[0] = iniziale)
  let chiavi = [];        // per la triplice ripetizione
  let sel = null;         // { da, prefisso: [] } pedina scelta e tratto di presa già indicato
  let occupato = false;   // animazione in corso
  let pensa = false;      // il computer sta pensando
  let girata = false;     // damiera vista dal lato del Nero
  let ultima = null;      // ultima mossa giocata (per evidenziarla)
  let suggerita = null;
  let richiesta = 0;      // per ignorare risposte del computer non più valide
  const pezzi = new Map(); // casella -> elemento della pedina

  const stato = () => stati[stati.length - 1];
  const mioTurno = () => P && !P.fine && !occupato && !pensa && (P.modo === 'due' || stato().turno === P.umano);

  /* ---------------- Computer (Web Worker) ---------------- */
  let worker = null;
  const inAttesa = new Map();
  let idW = 0;
  try {
    worker = new Worker('regole.js');
    worker.onmessage = (e) => { const f = inAttesa.get(e.data.id); inAttesa.delete(e.data.id); if (f) f(e.data.mossa); };
    worker.onerror = () => {
      worker = null;
      for (const [id, f] of inAttesa) { inAttesa.delete(id); f(null); }
    };
  } catch (e) { worker = null; }

  function chiediMossa(s, opz) {
    return new Promise((ok) => {
      const fallback = () => setTimeout(() => ok(R.cerca(s, opz)), 20);
      if (!worker) { fallback(); return; }
      const id = ++idW;
      inAttesa.set(id, (m) => (m === null && !worker ? fallback() : ok(m)));
      worker.postMessage({ id, stato: s, opz });
    });
  }
  // La mossa ricevuta dal worker è una copia: si recupera quella "vera" tra le mosse legali.
  const legale = (s, m) => (m ? R.mosse(s).find((x) => R.stessaMossa(x, m)) : null);

  /* ---------------- Damiera ---------------- */
  const board = $('#board');
  const strato = $('#pieces');
  const quadri = [];
  for (let i = 0; i < 64; i++) {
    const d = document.createElement('div');
    d.dataset.i = i;
    board.appendChild(d);
    quadri.push(d);
  }
  const casellaDi = (i) => (girata ? 63 - i : i);   // indice a schermo -> casella
  const schermoDi = (q) => (girata ? 63 - q : q);

  function applicaTema() {
    const t = TEMI[imp.tema] || TEMI.legno;
    document.documentElement.style.setProperty('--light', t[0]);
    document.documentElement.style.setProperty('--dark', t[1]);
  }

  function nuovoPezzo(v) {
    const el = document.createElement('div');
    el.className = 'pz ' + (v > 0 ? 'b' : 'n') + (Math.abs(v) === 2 ? ' dama' : '');
    el.innerHTML = '<div class="disco sotto"></div><div class="disco sopra"></div><svg class="corona" viewBox="0 0 24 16" aria-hidden="true"><path d="M2 14.5L1 4l6 5 5-7.5L17 9l6-5-1 10.5Z"/></svg>';
    return el;
  }
  function posiziona(el, q) {
    const i = schermoDi(q);
    el.style.transform = `translate(${(i & 7) * 100}%, ${(i >> 3) * 100}%)`;
  }

  function disegnaPezzi() {
    strato.innerHTML = '';
    pezzi.clear();
    const b = stato().b;
    for (const q of R.SCURE) {
      if (!b[q]) continue;
      const el = nuovoPezzo(b[q]);
      posiziona(el, q);
      strato.appendChild(el);
      pezzi.set(q, el);
    }
    // Pedina scelta a metà di una presa multipla: si vede già sull'ultima casella indicata.
    if (sel && sel.prefisso.length) {
      const el = pezzi.get(sel.da);
      if (el) posiziona(el, sel.prefisso[sel.prefisso.length - 1]);
      for (const q of presiDelPrefisso()) { const p = pezzi.get(q); if (p) p.classList.add('segnata'); }
    }
  }

  function candidate() {
    if (!sel) return [];
    return R.mosse(stato()).filter((m) => m.da === sel.da && sel.prefisso.every((q, k) => m.percorso[k] === q));
  }
  function presiDelPrefisso() {
    const c = candidate();
    return c.length ? c[0].prese.slice(0, sel.prefisso.length) : [];
  }
  function bersagli() {
    const out = new Map();
    if (!sel) return out;
    const k = sel.prefisso.length;
    for (const m of candidate()) if (m.percorso.length > k) out.set(m.percorso[k], m.prese.length > 0);
    return out;
  }

  function disegnaCaselle() {
    const tg = imp.suggerite ? bersagli() : new Map();
    const evid = new Set(ultima ? [ultima.da, ...ultima.percorso] : []);
    const via = new Set(sel ? sel.prefisso : []);
    for (let i = 0; i < 64; i++) {
      const q = casellaDi(i);
      const d = quadri[i];
      d.dataset.q = q;
      let cls = 'sq';
      if (R.scura(q)) cls += ' d';
      if (evid.has(q) && !sel) cls += ' last';
      if (sel && q === sel.da) cls += ' sel';
      if (via.has(q)) cls += ' via';
      if (suggerita && (q === suggerita.da || q === suggerita.a)) cls += ' hintsq';
      d.className = cls;
      let h = '';
      if (imp.numeri && R.scura(q)) h += `<span class="num">${R.NUM[q]}</span>`;
      if (tg.has(q)) h += `<span class="tg${tg.get(q) ? ' cap' : ''}"></span>`;
      d.innerHTML = h;
    }
  }

  function render() {
    disegnaCaselle();
    disegnaPezzi();
    disegnaBarre();
    disegnaStato();
    disegnaMosse();
    disegnaAzioni();
  }

  /* ---------------- Barre dei giocatori, stato, mosse ---------------- */
  function nomeLato(lato) {
    if (P.modo === 'due') return lato === 1 ? 'Bianco' : 'Nero';
    return lato === P.umano ? 'Tu' : 'Computer';
  }
  function disegnaBarre() {
    const n = R.conta(stato().b);
    const barra = (el, lato) => {
      const ped = lato === 1 ? n.pb : n.pn, dame = lato === 1 ? n.db : n.dn;
      const presi = 12 - (lato === 1 ? n.pn + n.dn : n.pb + n.db);
      const sotto = P.modo === 'ai' ? (lato === P.umano ? (lato === 1 ? 'Bianco' : 'Nero') : `${lato === 1 ? 'Bianco' : 'Nero'} · ${R.LIVELLI[P.livello].nome}`) : (lato === 1 ? 'Muove per primo' : '');
      el.className = 'pbar' + (!P.fine && stato().turno === lato ? ' turn' : '');
      el.innerHTML = `<span class="ico"></span>
        <span class="pname"><b>${nomeLato(lato)}</b><small>${sotto}</small></span>
        <span class="count"><b>${ped}</b> ${ped === 1 ? 'pedina' : 'pedine'}${dame ? ` · <b>${dame}</b> ${dame === 1 ? 'dama' : 'dame'}` : ''}<br><small>${presi} ${presi === 1 ? 'pezzo preso' : 'pezzi presi'}</small></span>`;
      const ico = nuovoPezzo(lato * (dame ? 2 : 1));
      ico.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;transform:none';
      el.querySelector('.ico').appendChild(ico);
    };
    barra($('#barTop'), girata ? 1 : -1);
    barra($('#barBottom'), girata ? -1 : 1);
  }

  const MOTIVI = {
    pezzi: 'tutti i pezzi presi',
    bloccato: 'nessuna mossa possibile',
    quaranta: '40 mosse senza prese né pedine mosse',
    ripetizione: 'stessa posizione ripetuta tre volte',
    abbandono: 'partita abbandonata'
  };
  function testoFine() {
    const f = P.fine;
    if (f.vincitore === 0) return { t: 'Patta', e: '🤝' };
    if (P.modo === 'ai') return f.vincitore === P.umano ? { t: 'Hai vinto!', e: '🏆' } : { t: 'Ha vinto il computer', e: '🤖' };
    return { t: f.vincitore === 1 ? 'Vince il Bianco' : 'Vince il Nero', e: '🏆' };
  }

  function disegnaStato() {
    const el = $('#gameStatus');
    el.classList.toggle('end', !!P.fine);
    if (P.fine) {
      const f = testoFine();
      el.innerHTML = `<span>${f.e}</span><span>${f.t}<small>${MOTIVI[P.fine.motivo] || ''}</small></span>`;
      return;
    }
    if (pensa) { el.innerHTML = '<span class="spinner"></span><span>Il computer pensa…</span>'; return; }
    const s = stato();
    const l = R.mosse(s);
    const obbligo = l.length && l[0].prese.length;
    const chi = P.modo === 'ai' ? 'Tocca a te' : `Tocca al ${s.turno === 1 ? 'Bianco' : 'Nero'}`;
    const extra = obbligo ? `Presa obbligatoria${l[0].prese.length > 1 ? `: ${l[0].prese.length} pezzi` : ''}` : (sel ? 'Tocca una casella evidenziata' : 'Scegli una pedina');
    el.innerHTML = `<span class="dot"></span><span>${chi}<small>${extra}</small></span>`;
  }

  function disegnaMosse() {
    const box = $('#moves');
    if (!P.mosse.length) { box.innerHTML = '<div class="empty-moves">Le mosse della partita compariranno qui.</div>'; return; }
    let h = '';
    P.mosse.forEach((m, k) => {
      if (k % 2 === 0) h += `<span class="n">${k / 2 + 1}.</span>`;
      const testo = [m.da, ...m.percorso].map((q) => R.NUM[q]).join(m.x ? 'x' : '-');
      h += `<span class="m${k === P.mosse.length - 1 ? ' cur' : ''}">${testo}</span>`;
    });
    box.innerHTML = h;
    box.scrollTop = box.scrollHeight;
  }

  function disegnaAzioni() {
    const a = $('#actions');
    if (P.fine) {
      a.innerHTML = `<button class="btn primary wide" type="button" data-a="rivincita">↻ ${P.modo === 'ai' ? 'Rivincita' : 'Nuova partita'}</button>
        <button class="btn" type="button" data-a="gira">⇅ Gira damiera</button>
        <button class="btn" type="button" data-a="menu">Menu</button>`;
      return;
    }
    const puoAnnullare = P.modo === 'ai' ? P.mosse.length >= (P.umano === 1 ? 1 : 2) : P.mosse.length > 0;
    a.innerHTML = `<button class="btn" type="button" data-a="annulla"${puoAnnullare && !occupato ? '' : ' disabled'}>↶ Annulla mossa</button>
      <button class="btn" type="button" data-a="aiuto"${mioTurno() ? '' : ' disabled'}>💡 Suggerimento</button>
      <button class="btn" type="button" data-a="gira">⇅ Gira damiera</button>
      ${P.modo === 'ai' ? '<button class="btn bad" type="button" data-a="abbandona">⚑ Abbandona</button>' : '<button class="btn" type="button" data-a="nuova">✦ Nuova partita</button>'}`;
  }

  $('#actions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    const a = b.dataset.a;
    if (a === 'annulla') annulla();
    else if (a === 'aiuto') suggerisci();
    else if (a === 'gira') { girata = !girata; sel = null; render(); }
    else if (a === 'abbandona') confermaAbbandono();
    else if (a === 'nuova') confermaNuova();
    else if (a === 'rivincita') rivincita();
    else if (a === 'menu') mostraMenu();
  });

  /* ---------------- Mosse del giocatore ---------------- */
  function seleziona(q) {
    const l = R.mosse(stato());
    const v = stato().b[q];
    if (Math.sign(v) !== stato().turno) return false;
    if (l.some((m) => m.da === q)) {
      sel = { da: q, prefisso: [] };
      suggerita = null;
      render();
      return true;
    }
    if (l.length && l[0].prese.length) {
      toast('La presa è obbligatoria: devi prendere con una delle pedine evidenziate.');
      const da = new Set(l.map((m) => m.da));
      for (const d of da) { const el = pezzi.get(d); if (el) { el.classList.remove('obbligo'); void el.offsetWidth; el.classList.add('obbligo'); } }
    } else toast('Questa pedina per ora non può muoversi.');
    suono('no');
    return false;
  }

  // Tocco su una casella con una pedina già scelta: avanza nella presa o esegue la mossa.
  function scegli(q) {
    const c = candidate();
    const k = sel.prefisso.length;
    let next = c.filter((m) => m.percorso[k] === q);
    if (!next.length) next = c.filter((m) => m.a === q);
    if (!next.length) return false;
    if (next.every((m) => R.stessaMossa(m, next[0]))) { esegui(next[0]); return true; }
    if (next[0].percorso[k] === q) {
      sel.prefisso.push(q);
      suono('muovi');
      render();
      return true;
    }
    toast('Ci sono più strade per arrivare lì: tocca le caselle una alla volta.');
    return true;
  }

  function tocca(q) {
    if (!mioTurno()) return;
    if (sel && scegli(q)) return;
    if (sel && q === sel.da && !sel.prefisso.length) { sel = null; render(); return; }
    if (stato().b[q] && Math.sign(stato().b[q]) === stato().turno) { seleziona(q); return; }
    if (sel) { sel = null; render(); }
  }

  /* Trascinamento */
  let drag = null;
  const wrap = document.querySelector('.board-wrap');
  function casellaSotto(e) {
    const r = wrap.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x >= r.width || y >= r.height) return -1;
    return casellaDi(Math.floor(y / (r.height / 8)) * 8 + Math.floor(x / (r.width / 8)));
  }
  wrap.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (!mioTurno()) return;
    const q = casellaSotto(e);
    if (q < 0) return;
    e.preventDefault();
    const visibile = sel ? (sel.prefisso.length ? sel.prefisso[sel.prefisso.length - 1] : sel.da) : -1;
    // Tocco su una casella di arrivo: si muove subito.
    if (sel && q !== visibile && bersagli().has(q)) { tocca(q); return; }
    if (sel && q !== visibile && candidate().some((m) => m.a === q)) { tocca(q); return; }
    let giaScelta = sel && q === visibile;
    if (!giaScelta) {
      const v = stato().b[q];
      if (!(v && Math.sign(v) === stato().turno)) { tocca(q); return; }
      if (sel && sel.prefisso.length) { tocca(q); return; }
      if (!seleziona(q)) return;
    }
    const el = pezzi.get(sel.da);
    if (!el) return;
    drag = { id: e.pointerId, el, x0: e.clientX, y0: e.clientY, mosso: false, giaScelta };
    try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.mosso && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    drag.mosso = true;
    const r = wrap.getBoundingClientRect();
    const s = r.width / 8;
    drag.el.classList.add('trascina');
    drag.el.style.transform = `translate(${e.clientX - r.left - s / 2}px, ${e.clientY - r.top - s / 2}px)`;
    const q = casellaSotto(e);
    quadri.forEach((d) => d.classList.toggle('over', Number(d.dataset.q) === q && q >= 0));
  });
  function fineDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    quadri.forEach((x) => x.classList.remove('over'));
    d.el.classList.remove('trascina');
    if (!d.mosso) {
      if (d.giaScelta && sel && !sel.prefisso.length) { sel = null; render(); }
      return;
    }
    const q = e.type === 'pointercancel' ? -1 : casellaSotto(e);
    if (q >= 0 && sel && scegli(q)) return;
    render();
  }
  wrap.addEventListener('pointerup', fineDrag);
  wrap.addEventListener('pointercancel', fineDrag);

  /* ---------------- Esecuzione delle mosse ---------------- */
  // gia = tratti del percorso già indicati dal giocatore (la pedina è già lì).
  async function anima(m, gia) {
    const el = pezzi.get(m.da);
    if (!el) return;
    el.classList.add('muove');
    let k = gia;
    for (let j = 0; j < k; j++) { const p = pezzi.get(m.prese[j]); if (p) p.classList.add('presa'); }
    for (; k < m.percorso.length; k++) {
      posiziona(el, m.percorso[k]);
      await attesa(m.prese.length ? 190 : 170);
      if (m.prese[k] != null) { const p = pezzi.get(m.prese[k]); if (p) p.classList.add('presa'); suono('presa'); }
    }
    if (m.promuove) { el.classList.add('dama'); }
    await attesa(m.prese.length ? 160 : 40);
  }

  async function esegui(m) {
    occupato = true;
    suggerita = null;
    const prima = stato();
    const gia = sel && sel.da === m.da ? sel.prefisso.length : 0;
    sel = null;
    disegnaCaselle();
    await anima(m, gia);
    const nuovo = R.applica(prima, m);
    P.mosse.push({ da: m.da, percorso: m.percorso.slice(), x: m.prese.length > 0 });
    stati.push(nuovo);
    chiavi.push(R.chiave(nuovo));
    ultima = m;
    if (!m.prese.length) suono('muovi');
    if (m.promuove) setTimeout(() => suono('dama'), 120);
    occupato = false;
    const e = R.esito(nuovo, chiavi);
    if (e) termina(e);
    if (P.modo === 'due' && P.giraLocale && !P.fine) girata = nuovo.turno === -1;
    render();
    salva();
    if (!P.fine) prossimo();
  }

  function prossimo() {
    if (P.fine || P.modo !== 'ai' || stato().turno === P.umano) return;
    pensa = true;
    render();
    const id = ++richiesta;
    const t0 = Date.now();
    const s = stato();
    chiediMossa(s, { livello: P.livello }).then((m) => {
      if (id !== richiesta) return;
      const mossa = legale(s, m) || R.mosse(s)[0];
      setTimeout(() => {
        if (id !== richiesta) return;
        pensa = false;
        esegui(mossa);
      }, Math.max(0, 450 - (Date.now() - t0)));
    });
  }

  function termina(e) {
    P.fine = e;
    if (P.modo === 'ai') {
      const st = stat(P.livello);
      if (e.vincitore === 0) st.patte++;
      else if (e.vincitore === P.umano) st.vinte++;
      else st.perse++;
      store.set('statistiche', statistiche);
    }
    const f = testoFine();
    const vinto = P.modo === 'due' ? e.vincitore !== 0 : e.vincitore === P.umano;
    setTimeout(() => suono(vinto ? 'vittoria' : e.vincitore === 0 ? 'dama' : 'sconfitta'), 250);
    setTimeout(() => {
      if (!P || P.fine !== e) return;
      const st = P.modo === 'ai' ? stat(P.livello) : null;
      openModal(`
        <div class="big">${f.e}</div>
        <h2 class="center">${f.t}</h2>
        <p class="center muted">${MOTIVI[e.motivo] ? MOTIVI[e.motivo].charAt(0).toUpperCase() + MOTIVI[e.motivo].slice(1) : ''}</p>
        ${st ? `<p class="center muted small">Contro ${R.LIVELLI[P.livello].nome}: ${riassunto(st)}</p>` : ''}
        <div class="modal-actions stack">
          <button class="btn primary" type="button" data-m="rivincita">${P.modo === 'ai' ? 'Rivincita' : 'Nuova partita'}</button>
          <button class="btn" type="button" data-m="chiudi">Guarda la damiera</button>
          <button class="btn" type="button" data-m="menu">Torna al menu</button>
        </div>`);
    }, ridotto ? 100 : 700);
  }

  function annulla() {
    if (occupato || !P.mosse.length || P.fine) return;
    richiesta++;
    pensa = false;
    sel = null;
    suggerita = null;
    let tolte = 0;
    do {
      P.mosse.pop(); stati.pop(); chiavi.pop();
      tolte++;
    } while (P.modo === 'ai' && P.mosse.length && stato().turno !== P.umano);
    ricalcolaUltima();
    if (P.modo === 'due' && P.giraLocale) girata = stato().turno === -1;
    render();
    salva();
    prossimo();
    return tolte;
  }

  function ricalcolaUltima() {
    ultima = null;
    if (P.mosse.length) {
      const m = P.mosse[P.mosse.length - 1];
      ultima = { da: m.da, percorso: m.percorso };
    }
  }

  function suggerisci() {
    if (!mioTurno()) return;
    const id = richiesta;
    const s = stato();
    chiediMossa(s, { profondita: 10, tempo: 900 }).then((m) => {
      if (id !== richiesta || stato() !== s || !m) return;
      suggerita = m;
      sel = null;
      disegnaCaselle();
      disegnaStato();
      setTimeout(() => { if (suggerita === m) { suggerita = null; disegnaCaselle(); } }, 2600);
    });
  }

  /* ---------------- Partite ---------------- */
  function avvia(conf) {
    richiesta++;
    pensa = false;
    occupato = false;
    sel = null;
    suggerita = null;
    ultima = null;
    P = conf;
    stati = [R.iniziale()];
    chiavi = [R.chiave(stati[0])];
    girata = P.modo === 'ai' ? P.umano === -1 : false;
    mostraGioco();
    salva();
    prossimo();
  }

  function nuovaAI() {
    const umano = imp.colore === 0 ? (Math.random() < 0.5 ? 1 : -1) : imp.colore;
    avvia({ modo: 'ai', livello: imp.livello, umano, mosse: [], fine: null, colore: imp.colore });
  }
  function nuovaDue() { avvia({ modo: 'due', giraLocale: imp.giraLocale, mosse: [], fine: null }); }
  function rivincita() {
    closeModal();
    if (P.modo === 'ai') {
      const umano = P.colore === 0 ? (Math.random() < 0.5 ? 1 : -1) : P.umano;
      avvia({ modo: 'ai', livello: P.livello, umano, mosse: [], fine: null, colore: P.colore });
    } else avvia({ modo: 'due', giraLocale: P.giraLocale, mosse: [], fine: null });
  }

  function salva() { if (P) store.set('partita', P); }

  // Ricostruisce una partita salvata rigiocando le mosse.
  function ripristina(salvata) {
    if (!salvata || !Array.isArray(salvata.mosse)) return false;
    let s = R.iniziale();
    const st = [s], ch = [R.chiave(s)];
    for (const c of salvata.mosse) {
      const m = R.mosse(s).find((x) => R.stessaMossa(x, c));
      if (!m) return false;
      s = R.applica(s, m);
      st.push(s);
      ch.push(R.chiave(s));
    }
    P = salvata;
    stati = st;
    chiavi = ch;
    return true;
  }

  function confermaAbbandono() {
    openModal(`<h2>Abbandonare la partita?</h2><p class="muted">Conterà come una sconfitta nelle statistiche.</p>
      <div class="modal-actions"><button class="btn" type="button" data-m="chiudi">Continua a giocare</button><button class="btn bad" type="button" data-m="abbandona">Abbandona</button></div>`);
  }
  function confermaNuova() {
    if (!P.mosse.length) { nuovaDue(); return; }
    openModal(`<h2>Nuova partita?</h2><p class="muted">La partita in corso andrà persa.</p>
      <div class="modal-actions"><button class="btn" type="button" data-m="chiudi">Annulla</button><button class="btn primary" type="button" data-m="nuovadue">Ricomincia</button></div>`);
  }

  /* ---------------- Schermate ---------------- */
  function mostraGioco() {
    closeModal();
    $('#scrMenu').hidden = true;
    $('#scrGame').hidden = false;
    $('#btnHome').hidden = false;
    ricalcolaUltima();
    render();
    window.scrollTo(0, 0);
  }

  function mostraMenu() {
    closeModal();
    richiesta++;
    pensa = false;
    sel = null;
    $('#scrGame').hidden = true;
    $('#scrMenu').hidden = false;
    $('#btnHome').hidden = true;
    disegnaMenu();
  }

  function disegnaMenu() {
    $('#levels').innerHTML = R.LIVELLI.map((l, i) => `<button type="button" data-l="${i}" class="${imp.livello === i ? 'on' : ''}"><b>${i + 1}</b>${l.nome}</button>`).join('');
    $('#levelDesc').textContent = R.LIVELLI[imp.livello].desc;
    document.querySelectorAll('#colorPick button').forEach((b) => b.classList.toggle('on', Number(b.dataset.color) === imp.colore));
    $('#flipLocal').checked = imp.giraLocale;
    const st = stat(imp.livello);
    const tot = st.vinte + st.perse + st.patte;
    $('#aiStats').textContent = tot ? `Contro ${R.LIVELLI[imp.livello].nome}: ${riassunto(st)}` : '';
    const salvata = store.get('partita', null);
    const inCorso = salvata && !salvata.fine && salvata.mosse && salvata.mosse.length;
    $('#btnResume').hidden = !(inCorso && salvata.modo === 'ai');
    $('#btnResumeLocal').hidden = !(inCorso && salvata.modo === 'due');
  }

  $('#levels').addEventListener('click', (e) => {
    const b = e.target.closest('[data-l]');
    if (!b) return;
    imp.livello = Number(b.dataset.l);
    salvaImp();
    disegnaMenu();
  });
  $('#colorPick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    imp.colore = Number(b.dataset.color);
    salvaImp();
    disegnaMenu();
  });
  $('#flipLocal').addEventListener('change', (e) => { imp.giraLocale = e.target.checked; salvaImp(); });
  $('#btnPlayAI').addEventListener('click', nuovaAI);
  $('#btnPlayLocal').addEventListener('click', nuovaDue);
  const riprendi = () => {
    if (ripristina(store.get('partita', null))) {
      girata = P.modo === 'ai' ? P.umano === -1 : (P.giraLocale && stato().turno === -1);
      mostraGioco();
      prossimo();
    } else { store.del('partita'); disegnaMenu(); toast('Non è stato possibile riprendere la partita.'); }
  };
  $('#btnResume').addEventListener('click', riprendi);
  $('#btnResumeLocal').addEventListener('click', riprendi);
  $('#btnHome').addEventListener('click', mostraMenu);

  function disegnaHero() {
    const disposizione = [0, -1, 0, -2, 1, 0, 0, 0, 0, 0, 0, -1, 1, 0, 2, 0];
    $('#heroBoard').innerHTML = disposizione.map((v, i) => {
      const scura = (((i >> 2) + (i & 3)) & 1) === 0;
      let pz = '';
      if (v) { const el = nuovoPezzo(v); el.style.cssText = 'width:100%;height:100%;transform:none'; pz = el.outerHTML; }
      return `<div class="${scura ? 'd' : ''}">${pz}</div>`;
    }).join('');
  }

  /* ---------------- Finestre ---------------- */
  function openModal(html) {
    $('#modalBox').innerHTML = html;
    $('#modal').hidden = false;
    const b = $('#modalBox').querySelector('.btn.primary, button');
    if (b) b.focus({ preventScroll: true });
  }
  function closeModal() { $('#modal').hidden = true; }
  $('#modal').addEventListener('click', (e) => {
    if (e.target === $('#modal')) { closeModal(); return; }
    const b = e.target.closest('[data-m]');
    if (!b) return;
    const a = b.dataset.m;
    if (a === 'chiudi') closeModal();
    else if (a === 'rivincita') rivincita();
    else if (a === 'menu') mostraMenu();
    else if (a === 'abbandona') {
      closeModal();
      richiesta++;
      pensa = false;
      sel = null;
      termina({ vincitore: -P.umano, motivo: 'abbandono' });
      render();
      salva();
    } else if (a === 'nuovadue') { closeModal(); nuovaDue(); }
  });

  function finestraImpostazioni() {
    const sw = (nome, val) => `<label class="opt-row"><span>${nome}</span><span class="switch"><input type="checkbox" data-o="${val}" ${imp[val] ? 'checked' : ''}><span></span></span></label>`;
    const html = () => `
      <h2>Impostazioni</h2>
      <div class="label">Colori della damiera</div>
      <div class="themes">${Object.entries(TEMI).map(([n, c]) => `<button type="button" data-t="${n}" class="${imp.tema === n ? 'on' : ''}" title="${n}" aria-label="${n}"><i style="background:${c[0]}"></i><i style="background:${c[1]}"></i><i style="background:${c[1]}"></i><i style="background:${c[0]}"></i></button>`).join('')}</div>
      <div>
        ${sw('Mostra le mosse possibili', 'suggerite')}
        ${sw('Numeri delle caselle', 'numeri')}
        ${sw('Suoni', 'suoni')}
      </div>
      <div class="modal-actions"><button class="btn primary" type="button" data-m="chiudi">Fatto</button></div>`;
    openModal(html());
  }
  $('#modalBox').addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]');
    if (!t) return;
    imp.tema = t.dataset.t;
    salvaImp();
    applicaTema();
    $('#modalBox').querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b === t));
  });
  $('#modalBox').addEventListener('change', (e) => {
    const o = e.target.dataset && e.target.dataset.o;
    if (!o) return;
    imp[o] = e.target.checked;
    salvaImp();
    if (P && !$('#scrGame').hidden) disegnaCaselle();
  });

  function finestraRegole() {
    openModal(`
      <h2>Regole della dama italiana</h2>
      <ul>
        <li>Si gioca sulle caselle scure. Ogni giocatore ha 12 pedine; <b>muove per primo il Bianco</b>.</li>
        <li>Le pedine si muovono di una casella in diagonale, <b>solo in avanti</b>.</li>
        <li>Si prende saltando un pezzo avversario vicino, se la casella dopo è libera. Si può continuare a prendere con lo stesso pezzo (presa multipla).</li>
        <li><b>La presa è obbligatoria.</b> Le pedine prendono solo in avanti e <b>non possono prendere le dame</b>.</li>
        <li>La pedina che arriva sull'ultima riga diventa <b>dama</b>: si muove e prende di una casella in tutte e quattro le direzioni. Se ci arriva durante una presa, si ferma lì.</li>
      </ul>
      <h3>Quale presa scegliere</h3>
      <ol>
        <li>quella che prende più pezzi;</li>
        <li>a parità, quella fatta con la dama invece che con la pedina;</li>
        <li>a parità, quella che prende più dame;</li>
        <li>a parità, quella che incontra prima una dama.</li>
      </ol>
      <h3>Fine della partita</h3>
      <p class="muted small">Vince chi prende tutti i pezzi avversari o lascia l'avversario senza mosse. È patta se la stessa posizione si ripete tre volte o se per 40 mosse a testa si muovono solo dame senza prese.</p>
      <h3>Come si gioca qui</h3>
      <p class="muted small">Tocca una pedina e poi la casella di arrivo, oppure trascinala. Nelle prese multiple puoi toccare direttamente l'arrivo, o le caselle una alla volta. Da tastiera: Ctrl+Z annulla la mossa.</p>
      <div class="modal-actions"><button class="btn primary" type="button" data-m="chiudi">Ho capito</button></div>`);
  }
  $('#btnSettings').addEventListener('click', finestraImpostazioni);
  $('#btnRules').addEventListener('click', finestraRegole);

  document.addEventListener('keydown', (e) => {
    if (!$('#modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (!P || $('#scrGame').hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); annulla(); }
    else if (e.key === 'Escape' && sel) { sel = null; render(); }
  });

  /* ---------------- Avvisi e suoni ---------------- */
  function toast(text, ms) {
    const box = $('#toasts');
    while (box.children.length > 1) box.firstChild.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    box.appendChild(t);
    setTimeout(() => t.remove(), ms || 2800);
  }

  let audio = null;
  function suono(tipo) {
    if (!imp.suoni) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime;
      if (tipo === 'muovi' || tipo === 'presa') {
        // "toc" di legno
        const dur = 0.07;
        const buf = audio.createBuffer(1, Math.floor(audio.sampleRate * dur), audio.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
        const src = audio.createBufferSource();
        src.buffer = buf;
        const f = audio.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = tipo === 'presa' ? 700 : 1100;
        f.Q.value = 1.4;
        const g = audio.createGain();
        g.gain.value = tipo === 'presa' ? 0.9 : 0.6;
        src.connect(f); f.connect(g); g.connect(audio.destination);
        src.start(t);
        return;
      }
      const note = { dama: [784, 988, 1175], vittoria: [523, 659, 784, 1047], sconfitta: [392, 330, 262], no: [160] }[tipo] || [600];
      note.forEach((hz, k) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = tipo === 'no' ? 'triangle' : 'sine';
        o.frequency.value = hz;
        const st = t + k * 0.11;
        const vol = tipo === 'no' ? 0.1 : 0.09;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(vol, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.45);
        o.connect(g); g.connect(audio.destination);
        o.start(st); o.stop(st + 0.5);
      });
    } catch (e) { /* audio non disponibile */ }
  }

  /* ---------------- Avvio ---------------- */
  applicaTema();
  disegnaHero();
  disegnaMenu();
})();

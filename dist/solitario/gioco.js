/* Solitario: grafica, trascinamento delle carte, salvataggio e statistiche. Le regole sono in regole.js. */
(function () {
  'use strict';
  const R = window.Regole;
  const $ = (sel) => document.querySelector(sel);
  const ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Salvataggi (localStorage, con protezione se non disponibile) ---------------- */
  const store = {
    get(k, def) {
      try { const v = localStorage.getItem('solitario.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set(k, v) { try { localStorage.setItem('solitario.' + k, JSON.stringify(v)); } catch (e) { /* niente */ } },
    del(k) { try { localStorage.removeItem('solitario.' + k); } catch (e) { /* niente */ } }
  };

  const DORSI = { blu: ['#2c64c9', '#1f4fa8'], rosso: ['#c43442', '#a5222f'], verde: ['#25875a', '#1d6b45'], viola: ['#7a4fc9', '#5f3aa6'] };
  const TAVOLI = { verde: ['#2a8a57', '#17583a'], blu: ['#2f6fa8', '#183e66'], bordeaux: ['#8a2f45', '#4f1624'], grafite: ['#4a5468', '#262c38'] };
  const impostazioni = Object.assign({ pesca: 1, suoni: true, auto: true, dorso: 'blu', tavolo: 'verde' }, store.get('impostazioni', {}));
  const salvaImpostazioni = () => store.set('impostazioni', impostazioni);

  const STAT_VUOTE = { giocate: 0, vinte: 0, serie: 0, serieMax: 0, tempo: null, punti: null, mosse: null };
  const statistiche = store.get('statistiche', {});
  const stat = (p) => (statistiche['p' + p] = Object.assign({}, STAT_VUOTE, statistiche['p' + p]));
  const salvaStat = () => store.set('statistiche', statistiche);

  /* ---------------- Stato della partita ---------------- */
  let game = null;          // stato delle regole (vedi regole.js)
  let storia = [];          // stati precedenti per "Annulla"
  let meta = null;          // { iniziata, finita, giornaliera }
  let tempoAccum = 0;       // millisecondi giocati
  let tempoDa = null;       // inizio del tratto in corso
  let occupato = false;     // durante la distribuzione e il completamento automatico
  let generazione = 0;      // cambia a ogni nuova partita: ferma le animazioni rimaste in sospeso
  let timerDistribuzione = null;
  let G = null;             // geometria del tavolo
  const ultimaPos = new Map();
  const elevaTimer = new Map();

  const table = $('#table');
  const carte = [];         // elemento DOM di ogni carta, per id
  const slot = { stock: null, found: [], tab: [] };

  /* ---------------- Costruzione del tavolo ---------------- */
  function creaTavolo() {
    const mk = (cls, txt) => {
      const d = document.createElement('div');
      d.className = 'slot ' + cls;
      d.textContent = txt || '';
      table.appendChild(d);
      return d;
    };
    slot.stock = mk('stock', '↻');
    for (let i = 0; i < 4; i++) slot.found.push(mk('found', 'A'));
    for (let i = 0; i < 7; i++) slot.tab.push(mk('tab', 'K'));
    for (let id = 0; id < 52; id++) {
      const el = document.createElement('div');
      el.className = 'card';
      el.dataset.id = id;
      const sym = R.SIMBOLI[R.seme(id)] + '︎';
      const lab = R.VALORI[R.valore(id) - 1];
      const mid = R.valore(id) > 10 ? `<div class="fig"><b>${lab}</b><i>${sym}</i></div>` : `<div class="m">${sym}</div>`;
      el.innerHTML = `<div class="inner"><div class="face${R.rossa(id) ? ' rossa' : ''}"><span class="v">${lab}</span><span class="s">${sym}</span>${mid}</div><div class="back"></div></div>`;
      table.appendChild(el);
      carte[id] = el;
    }
  }

  function applicaAspetto() {
    const d = DORSI[impostazioni.dorso] || DORSI.blu;
    const t = TAVOLI[impostazioni.tavolo] || TAVOLI.verde;
    const st = document.documentElement.style;
    st.setProperty('--back-1', d[0]); st.setProperty('--back-2', d[1]);
    st.setProperty('--felt-1', t[0]); st.setProperty('--felt-2', t[1]);
  }

  /* ---------------- Geometria ---------------- */
  function geometria() {
    const W = table.clientWidth;
    const docTop = table.getBoundingClientRect().top + window.scrollY;
    const altezza = window.innerHeight - docTop - 12;
    const g = Math.round(Math.max(4, Math.min(14, W * 0.014)));
    // Carte grandi quanto permette la larghezza, ma non così alte da far uscire dallo schermo una colonna lunga.
    const cw = Math.floor(Math.min((W - g * 8) / 7, 108, Math.max(56, (altezza - 40) / 5.5)));
    const ch = Math.round(cw * 1.42);
    const left = Math.round((W - (7 * cw + 6 * g)) / 2);
    const f = Math.min(cw * 0.3, 24);
    const topY = g;
    const tabY = topY + ch + Math.round(g * 1.8);
    const avail = Math.max(altezza, tabY + ch * 3);
    const offDown = Math.max(4, Math.round(ch * 0.09));
    const upStd = Math.max(f * 1.25 + 6, ch * 0.2);
    const upMin = f * 1.05 + 3;
    const offUp = game.tab.map((col) => {
      const giu = col.filter((c) => !c.up).length;
      const su = col.length - giu;
      if (su < 2) return upStd;
      const spazio = avail - tabY - ch - g - giu * offDown;
      return Math.max(upMin, Math.min(upStd, spazio / (su - 1)));
    });
    const fanX = Math.min(cw * 0.3, (cw + g) / 2 - 2);
    return { W, g, cw, ch, f, left, topY, tabY, avail, offDown, offUp, fanX, x: (i) => left + i * (cw + g) };
  }

  // Posizione di ogni carta: id -> { x, y, z }
  function posizioni() {
    const P = new Map();
    let H = G.tabY + G.ch;
    game.stock.forEach((c, k) => P.set(c.id, { x: G.x(0) - Math.min(2, Math.floor(k / 8)), y: G.topY - Math.min(2, Math.floor(k / 8)), z: 1 + k }));
    const ventaglio = game.pesca === 3 ? Math.min(game.ventaglio || 1, game.waste.length) : 1;
    game.waste.forEach((c, k) => {
      const dalFondo = game.waste.length - 1 - k;
      const pos = dalFondo < ventaglio ? ventaglio - 1 - dalFondo : 0;
      P.set(c.id, { x: G.x(1) + pos * G.fanX, y: G.topY, z: 60 + k });
    });
    game.found.forEach((f, i) => f.forEach((c, k) => P.set(c.id, { x: G.x(3 + i), y: G.topY, z: 60 + k })));
    game.tab.forEach((col, i) => {
      let y = G.tabY;
      col.forEach((c, k) => {
        P.set(c.id, { x: G.x(i), y, z: 100 + k });
        y += c.up ? G.offUp[i] : G.offDown;
      });
      if (col.length) H = Math.max(H, P.get(col[col.length - 1].id).y + G.ch);
    });
    G.H = Math.max(G.avail, H + G.g);
    return P;
  }

  /* ---------------- Disegno ---------------- */
  function render(opz = {}) {
    G = geometria();
    const P = posizioni();
    table.style.setProperty('--cw', G.cw + 'px');
    table.style.setProperty('--ch', G.ch + 'px');
    table.style.setProperty('--f', G.f + 'px');
    table.style.height = G.H + 'px';

    const place = (el, x, y) => { el.style.transform = `translate(${x}px, ${y}px)`; };
    place(slot.stock, G.x(0), G.topY);
    slot.stock.classList.toggle('finito', !game.waste.length);
    slot.found.forEach((el, i) => place(el, G.x(3 + i), G.topY));
    slot.tab.forEach((el, i) => place(el, G.x(i), G.tabY));

    const mobili = new Set();
    if (game.waste.length) mobili.add(game.waste[game.waste.length - 1].id);
    game.found.forEach((f) => { if (f.length) mobili.add(f[f.length - 1].id); });
    game.tab.forEach((col) => col.forEach((c) => { if (c.up) mobili.add(c.id); }));
    const su = new Set();
    [game.waste, ...game.found, ...game.tab].forEach((p) => p.forEach((c) => { if (c.up && !(opz.coperte && opz.coperte.has(c.id))) su.add(c.id); }));

    const eleva = opz.eleva || new Set();
    for (let id = 0; id < 52; id++) {
      const el = carte[id];
      const p = P.get(id);
      const prima = ultimaPos.get(id);
      const cambia = !prima || prima.x !== p.x || prima.y !== p.y;
      el.classList.toggle('up', su.has(id));
      el.classList.toggle('mobile', su.has(id) && mobili.has(id) && !occupato);
      el.setAttribute('aria-label', su.has(id) ? R.nome(id) : 'Carta coperta');
      place(el, p.x, p.y);
      if (!opz.subito && (cambia || eleva.has(id))) {
        el.style.zIndex = 400 + p.z;
        clearTimeout(elevaTimer.get(id));
        elevaTimer.set(id, setTimeout(() => { el.style.zIndex = p.z; elevaTimer.delete(id); }, 320 + (opz.ritardo ? opz.ritardo(id) : 0)));
      } else if (!elevaTimer.has(id) || opz.subito) {
        clearTimeout(elevaTimer.get(id));
        elevaTimer.delete(id);
        el.style.zIndex = p.z;
      }
      ultimaPos.set(id, p);
    }
    aggiornaInfo();
  }

  function renderSubito() {
    table.classList.add('subito');
    render({ subito: true });
    void table.offsetHeight;
    table.classList.remove('subito');
  }

  function fmtTempo(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  const secondi = () => Math.floor((tempoAccum + (tempoDa ? Date.now() - tempoDa : 0)) / 1000);

  function aggiornaInfo() {
    if (!game) return;
    const sec = secondi();
    $('#infoTime').textContent = fmtTempo(sec);
    $('#infoMoves').textContent = game.mosse;
    $('#infoScore').textContent = meta.finita && meta.puntiFinali != null ? meta.puntiFinali : R.punteggio(game, sec, false);
    $('#infoDeal').textContent = (meta.giornaliera ? 'Partita del giorno' : 'Partita n. ' + game.seed) + ' · Pesca ' + game.pesca;
    $('#btnUndo').disabled = !storia.length || occupato || meta.finita;
    $('#btnHint').disabled = occupato || meta.finita;
    $('#btnFinish').hidden = occupato || meta.finita || !R.finibile(game);
  }

  /* ---------------- Tempo ---------------- */
  function avviaTempo() {
    if (!meta.iniziata) {
      meta.iniziata = true;
      stat(game.pesca).giocate++;
      salvaStat();
    }
    if (!tempoDa && !meta.finita && document.visibilityState !== 'hidden') tempoDa = Date.now();
  }
  function fermaTempo() {
    if (tempoDa) { tempoAccum += Date.now() - tempoDa; tempoDa = null; }
  }

  /* ---------------- Salvataggio della partita ---------------- */
  function salva() {
    const ms = tempoAccum + (tempoDa ? Date.now() - tempoDa : 0);
    store.set('partita', { game, storia: storia.slice(-80), meta, ms });
  }

  /* ---------------- Mosse ---------------- */
  function trova(id) {
    if (game.stock.some((c) => c.id === id)) return { pila: 'stock' };
    if (game.waste.length && game.waste[game.waste.length - 1].id === id) return { pila: 'waste' };
    if (game.waste.some((c) => c.id === id)) return { pila: 'waste-sotto' };
    for (let i = 0; i < 4; i++) {
      const f = game.found[i];
      const k = f.findIndex((c) => c.id === id);
      if (k >= 0) return k === f.length - 1 ? { pila: 'found', i } : { pila: 'found-sotto' };
    }
    for (let i = 0; i < 7; i++) {
      const n = game.tab[i].findIndex((c) => c.id === id);
      if (n >= 0) return { pila: 'tab', i, n };
    }
    return null;
  }

  function esegui(src, dst, opz = {}) {
    const prima = R.clona(game);
    const esito = R.muovi(game, src, dst);
    if (!esito) return false;
    storia.push(prima);
    if (storia.length > 300) storia.shift();
    avviaTempo();
    suono(dst.pila === 'found' ? 'base' : 'posa');
    if (esito.scoperta != null) setTimeout(() => suono('gira'), 140);
    dopoMossa(opz.eleva || new Set(esito.carte));
    return true;
  }

  function pesca() {
    if (occupato || meta.finita) return;
    const prima = R.clona(game);
    const r = R.pesca(game);
    if (!r) return;
    storia.push(prima);
    if (storia.length > 300) storia.shift();
    avviaTempo();
    suono(r.tipo === 'rigiro' ? 'rigiro' : 'pesca');
    dopoMossa(new Set(game.waste.slice(-3).map((c) => c.id)));
  }

  function dopoMossa(eleva) {
    togliAiuto();
    render({ eleva });
    salva();
    if (R.vinta(game)) { vittoria(); return; }
    if (R.finibile(game)) {
      if (impostazioni.auto && !occupato) completaAutomaticamente();
      return;
    }
    if (!occupato && R.bloccata(game) && meta.avvisoBlocco !== game.mosse) {
      meta.avvisoBlocco = game.mosse;
      toast('Non ci sono più mosse utili: annulla qualche mossa o inizia una nuova partita.', 5000);
    }
  }

  function annulla() {
    if (occupato || meta.finita || !storia.length) return;
    togliAiuto();
    game = storia.pop();
    suono('pesca');
    render();
    salva();
  }

  function completaAutomaticamente() {
    occupato = true;
    aggiornaInfo();
    const gen = generazione;
    const passo = () => {
      if (gen !== generazione) return;
      const m = R.passoAutomatico(game);
      if (!m) { occupato = false; dopoMossa(new Set()); return; }
      const prima = R.clona(game);
      R.muovi(game, m.src, m.dst);
      storia.push(prima);
      suono('base');
      render({ eleva: new Set([game.found[m.dst.i][game.found[m.dst.i].length - 1].id]) });
      if (R.vinta(game)) { occupato = false; salva(); vittoria(); return; }
      setTimeout(passo, ridotto ? 30 : 95);
    };
    passo();
  }

  /* ---------------- Trascinamento e tocchi ---------------- */
  let drag = null;

  table.addEventListener('pointerdown', (e) => {
    if (drag || occupato || !game || meta.finita || !$('#modal').hidden) return;
    if (e.button !== undefined && e.button !== 0) return;
    // Il mazzo si riconosce dalla posizione: così funziona anche se sopra sta ancora passando la carta appena pescata.
    const tr = table.getBoundingClientRect();
    const lx = e.clientX - tr.left, ly = e.clientY - tr.top;
    if (lx >= G.x(0) && lx <= G.x(0) + G.cw && ly >= G.topY && ly <= G.topY + G.ch) { e.preventDefault(); pesca(); return; }
    const cardEl = e.target.closest('.card');
    if (!cardEl) {
      if (e.target.closest('.slot.stock')) { e.preventDefault(); pesca(); }
      return;
    }
    const id = Number(cardEl.dataset.id);
    const loc = trova(id);
    if (!loc) return;
    if (loc.pila === 'stock') { e.preventDefault(); pesca(); return; }
    let src = null;
    if (loc.pila === 'waste') src = { pila: 'waste' };
    else if (loc.pila === 'found') src = { pila: 'found', i: loc.i };
    else if (loc.pila === 'tab' && game.tab[loc.i][loc.n].up) src = loc;
    if (!src) return;
    const ids = R.carteDa(game, src).map((c) => c.id);
    if (!R.sequenzaValida(R.carteDa(game, src))) { scuoti(ids); return; }
    e.preventDefault();
    const pos = ids.map((cid) => ultimaPos.get(cid));
    drag = { pointerId: e.pointerId, src, ids, pos, x0: e.clientX, y0: e.clientY, mosso: false };
    try { cardEl.setPointerCapture(e.pointerId); } catch (err) { /* niente */ }
  });

  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.mosso) {
      if (Math.hypot(dx, dy) < 6) return;
      drag.mosso = true;
      togliAiuto();
      drag.ids.forEach((cid, k) => {
        const el = carte[cid];
        el.classList.add('trascina');
        clearTimeout(elevaTimer.get(cid));
        elevaTimer.delete(cid);
        el.style.zIndex = 1000 + k;
      });
    }
    drag.dx = dx; drag.dy = dy;
    drag.ids.forEach((cid, k) => {
      const p = drag.pos[k];
      carte[cid].style.transform = `translate(${p.x + dx}px, ${p.y + dy}px)`;
    });
  });

  function fineTrascina(e, annullato) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    d.ids.forEach((cid) => carte[cid].classList.remove('trascina'));
    if (!d.mosso) {
      if (annullato) return;
      // Tocco: la carta va da sola nel posto migliore (le carte sulle basi si spostano solo trascinandole).
      if (d.src.pila === 'found') return;
      const dst = R.destinazioneMigliore(game, d.src);
      if (dst) esegui(d.src, dst);
      else { scuoti(d.ids); suono('no'); }
      return;
    }
    const dst = annullato ? null : destinazioneTrascina(d);
    if (!dst || !esegui(d.src, dst, { eleva: new Set(d.ids) })) render({ eleva: new Set(d.ids) });
  }
  window.addEventListener('pointerup', (e) => fineTrascina(e, false));
  window.addEventListener('pointercancel', (e) => fineTrascina(e, true));

  // Pila sotto la carta trascinata: quella con la sovrapposizione maggiore tra le mosse valide.
  function destinazioneTrascina(d) {
    const p = d.pos[0];
    const r = { x: p.x + d.dx, y: p.y + d.dy, w: G.cw, h: G.ch };
    const area = (x, y, w, h) => Math.max(0, Math.min(r.x + r.w, x + w) - Math.max(r.x, x)) * Math.max(0, Math.min(r.y + r.h, y + h) - Math.max(r.y, y));
    let best = null, bestA = 0;
    const prova = (dst, x, y, h) => {
      if (!R.legale(game, d.src, dst)) return;
      const a = area(x, y, G.cw, h);
      if (a > bestA) { bestA = a; best = dst; }
    };
    if (d.ids.length === 1) for (let i = 0; i < 4; i++) prova({ pila: 'found', i }, G.x(3 + i), G.topY, G.ch);
    for (let i = 0; i < 7; i++) {
      const col = game.tab[i];
      const y = col.length ? ultimaPos.get(col[col.length - 1].id).y : G.tabY;
      prova({ pila: 'tab', i }, G.x(i), col.length ? y : G.tabY, G.ch);
    }
    return best;
  }

  function scuoti(ids) {
    ids.forEach((cid) => {
      const el = carte[cid];
      el.classList.remove('no');
      void el.offsetWidth;
      el.classList.add('no');
      setTimeout(() => el.classList.remove('no'), 360);
    });
  }

  /* ---------------- Suggerimento ---------------- */
  let aiuto = { mosse: -1, k: 0, timer: null };
  function togliAiuto() {
    clearTimeout(aiuto.timer);
    table.querySelectorAll('.aiuto').forEach((el) => el.classList.remove('aiuto'));
  }
  function suggerisci() {
    if (occupato || meta.finita) return;
    togliAiuto();
    const lista = R.suggerimenti(game);
    if (!lista.length) { toast('Nessuna mossa disponibile: annulla qualche mossa o inizia una nuova partita.'); return; }
    if (aiuto.mosse !== game.mosse) { aiuto.mosse = game.mosse; aiuto.k = 0; }
    const m = lista[aiuto.k % lista.length];
    aiuto.k++;
    const evidenzia = [];
    if (m.pesca) {
      evidenzia.push(game.stock.length ? carte[game.stock[game.stock.length - 1].id] : slot.stock);
      if (!m.utile) toast('Non ci sono più mosse utili: annulla qualche mossa o inizia una nuova partita.', 4000);
      else toast(m.rigiro ? 'Rigira il mazzo' : (game.pesca === 1 ? 'Pesca una carta' : 'Pesca dal mazzo'), 1600);
    } else {
      R.carteDa(game, m.src).forEach((c) => evidenzia.push(carte[c.id]));
      const pila = m.dst.pila === 'found' ? game.found[m.dst.i] : game.tab[m.dst.i];
      if (pila.length) evidenzia.push(carte[pila[pila.length - 1].id]);
      else evidenzia.push(m.dst.pila === 'found' ? slot.found[m.dst.i] : slot.tab[m.dst.i]);
    }
    evidenzia.forEach((el) => el.classList.add('aiuto'));
    aiuto.timer = setTimeout(togliAiuto, 1800);
  }

  /* ---------------- Nuova partita ---------------- */
  function oggi() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function nuovaPartita(seed, pescaN, giornaliera) {
    if (meta && meta.iniziata && !meta.finita) {
      stat(game.pesca).serie = 0;
      salvaStat();
    }
    fermaCascata();
    togliAiuto();
    closeModal();
    generazione++;
    if (timerDistribuzione) {
      clearTimeout(timerDistribuzione);
      timerDistribuzione = null;
      carte.forEach((el) => { el.style.transitionDelay = ''; });
    }
    occupato = false;
    game = R.nuovaPartita(seed, pescaN);
    storia = [];
    meta = { iniziata: false, finita: false, giornaliera: !!giornaliera };
    tempoAccum = 0; tempoDa = null;
    distribuisci();
    salva();
  }

  // Animazione della distribuzione: tutte le carte partono dal mazzo.
  function distribuisci() {
    G = geometria();
    table.classList.add('subito');
    for (let id = 0; id < 52; id++) {
      const el = carte[id];
      el.classList.remove('up');
      el.style.transform = `translate(${G.x(0)}px, ${G.topY}px)`;
      el.style.zIndex = 1;
      ultimaPos.set(id, { x: G.x(0), y: G.topY });
    }
    void table.offsetHeight;
    table.classList.remove('subito');
    if (ridotto) { render({ subito: true }); return; }
    const ordine = new Map();
    let k = 0;
    for (let riga = 0; riga < 7; riga++) for (let col = riga; col < 7; col++) ordine.set(game.tab[col][riga].id, k++);
    const ritardo = (id) => (ordine.has(id) ? ordine.get(id) * 35 : 0);
    // Le carte scoperte si girano solo quando sono arrivate.
    const coperte = new Set();
    game.tab.forEach((col) => col.forEach((c) => { if (c.up) coperte.add(c.id); }));
    for (let id = 0; id < 52; id++) carte[id].style.transitionDelay = ritardo(id) + 'ms';
    occupato = true;
    render({ ritardo, coperte });
    suono('pesca');
    timerDistribuzione = setTimeout(() => {
      timerDistribuzione = null;
      for (let id = 0; id < 52; id++) carte[id].style.transitionDelay = '';
      occupato = false;
      render();
      suono('gira');
    }, k * 35 + 260);
  }

  /* ---------------- Vittoria ---------------- */
  let cascata = [];
  let animazioni = [];
  function fermaCascata() {
    cascata.forEach((t) => clearTimeout(t));
    cascata = [];
    animazioni.forEach((a) => a.cancel());
    animazioni = [];
  }

  function vittoria() {
    fermaTempo();
    occupato = false;
    meta.finita = true;
    const sec = secondi();
    const punti = R.punteggio(game, sec, true);
    meta.puntiFinali = punti;
    const st = stat(game.pesca);
    st.vinte++;
    st.serie++;
    st.serieMax = Math.max(st.serieMax, st.serie);
    const record = [];
    if (st.tempo == null || sec < st.tempo) { if (st.tempo != null) record.push('tempo'); st.tempo = sec; }
    if (st.punti == null || punti > st.punti) { if (st.punti != null) record.push('punteggio'); st.punti = punti; }
    if (st.mosse == null || game.mosse < st.mosse) { if (st.mosse != null) record.push('mosse'); st.mosse = game.mosse; }
    salvaStat();
    salva();
    render();
    suono('vittoria');
    if (!ridotto) avviaCascata();
    setTimeout(() => {
      openModal(`
        <div class="big">🏆</div>
        <h2 class="center">Hai vinto!</h2>
        <div class="stats">
          <div class="stat"><b>${fmtTempo(sec)}</b><span>Tempo</span></div>
          <div class="stat"><b>${game.mosse}</b><span>Mosse</span></div>
          <div class="stat"><b>${punti}</b><span>Punti</span></div>
        </div>
        ${record.length ? `<p class="center warn">Nuovo record: ${record.join(', ')}!</p>` : ''}
        <p class="center muted small">Partite vinte: ${st.vinte} su ${st.giocate} · Serie di vittorie: ${st.serie}</p>
        <div class="modal-actions stack">
          <button class="btn primary" type="button" data-act="nuova">Nuova partita</button>
          <button class="btn" type="button" data-act="chiudi">Chiudi</button>
        </div>`, { leggero: true });
    }, ridotto ? 200 : 1300);
  }

  // Le carte saltano giù dalle basi, come nel vecchio Solitario di Windows.
  function avviaCascata() {
    const ordine = [];
    for (let v = 13; v >= 1; v--) for (let i = 0; i < 4; i++) { const c = game.found[i][v - 1]; if (c) ordine.push(c.id); }
    const sc = G.cw / 70;
    ordine.forEach((id, k) => {
      cascata.push(setTimeout(() => {
        const p = ultimaPos.get(id);
        let x = p.x, y = p.y;
        let vx = (2 + Math.random() * 4) * sc * (Math.random() < 0.5 ? -1 : 1);
        let vy = -(2 + Math.random() * 6) * sc;
        const gr = 0.55 * sc, pavimento = G.H - G.ch;
        const frames = [{ transform: `translate(${x}px, ${y}px)` }];
        for (let f = 0; f < 420 && x > -G.cw && x < G.W; f++) {
          vy += gr; x += vx; y += vy;
          if (y > pavimento) { y = pavimento; vy = -vy * 0.72; }
          frames.push({ transform: `translate(${x}px, ${y}px)` });
        }
        const el = carte[id];
        el.style.zIndex = 2000 + k;
        if (el.animate) animazioni.push(el.animate(frames, { duration: frames.length * 16, easing: 'linear', fill: 'forwards' }));
      }, k * 110));
    });
  }

  /* ---------------- Finestre ---------------- */
  let onModalClick = null;
  function openModal(html, opz = {}) {
    const m = $('#modal');
    $('#modalBox').innerHTML = html;
    m.classList.toggle('leggero', !!opz.leggero);
    m.hidden = false;
    onModalClick = opz.onClick || null;
    const primo = $('#modalBox').querySelector('.btn.primary, button');
    if (primo) primo.focus({ preventScroll: true });
  }
  function closeModal() { $('#modal').hidden = true; onModalClick = null; }

  $('#modal').addEventListener('click', (e) => {
    if (e.target === $('#modal')) { closeModal(); return; }
    const b = e.target.closest('[data-act]');
    if (onModalClick && onModalClick(e) === true) return;
    if (!b) return;
    if (b.dataset.act === 'chiudi') closeModal();
    else if (b.dataset.act === 'nuova') nuovaPartita(seedCasuale(), impostazioni.pesca, false);
  });

  const seedCasuale = () => 1 + Math.floor(Math.random() * 999999);

  function finestraNuova() {
    let scelta = impostazioni.pesca;
    const inCorso = meta.iniziata && !meta.finita;
    const html = () => `
      <h2>Nuova partita</h2>
      <div class="label">Come si pesca</div>
      <div class="seg">
        <button type="button" data-p="1" class="${scelta === 1 ? 'on' : ''}">Pesca 1 carta</button>
        <button type="button" data-p="3" class="${scelta === 3 ? 'on' : ''}">Pesca 3 carte</button>
      </div>
      <p class="muted small">${scelta === 1 ? 'Più facile: dal mazzo esce una carta alla volta.' : 'La versione classica, più difficile: escono tre carte alla volta e si può usare solo quella in cima.'}</p>
      ${inCorso ? '<p class="warn">La partita in corso conterà come persa nelle statistiche.</p>' : ''}
      <div class="modal-actions stack">
        <button class="btn primary" type="button" data-x="nuova">Distribuisci le carte</button>
        <button class="btn" type="button" data-x="giorno">Partita del giorno</button>
        <button class="btn" type="button" data-x="ricomincia">Ricomincia questa partita</button>
        <button class="btn" type="button" data-act="chiudi">Annulla</button>
      </div>`;
    const click = (e) => {
      const p = e.target.closest('[data-p]');
      if (p) {
        scelta = Number(p.dataset.p);
        $('#modalBox').innerHTML = html();
        return true;
      }
      const x = e.target.closest('[data-x]');
      if (!x) return false;
      impostazioni.pesca = scelta;
      salvaImpostazioni();
      if (x.dataset.x === 'nuova') nuovaPartita(seedCasuale(), scelta, false);
      else if (x.dataset.x === 'giorno') nuovaPartita(oggi(), scelta, true);
      else if (x.dataset.x === 'ricomincia') nuovaPartita(game.seed, scelta, meta.giornaliera);
      return true;
    };
    openModal(html(), { onClick: click });
  }

  function finestraImpostazioni() {
    const sw = (tipo, nome, colori) => `<button type="button" class="swatch${impostazioni[tipo] === nome ? ' on' : ''}" data-${tipo}="${nome}" title="${nome}" aria-label="${nome}" style="background:${tipo === 'dorso' ? `repeating-linear-gradient(45deg, ${colori[0]} 0 4px, ${colori[1]} 4px 8px)` : `radial-gradient(circle at 50% 30%, ${colori[0]}, ${colori[1]})`}"></button>`;
    const html = () => `
      <h2>Impostazioni</h2>
      <div class="label">Dorso delle carte</div>
      <div class="swatches">${Object.entries(DORSI).map(([n, c]) => sw('dorso', n, c)).join('')}</div>
      <div class="label">Colore del tavolo</div>
      <div class="swatches">${Object.entries(TAVOLI).map(([n, c]) => sw('tavolo', n, c)).join('')}</div>
      <label class="check"><input type="checkbox" data-opt="suoni" ${impostazioni.suoni ? 'checked' : ''}> Suoni</label>
      <label class="check"><input type="checkbox" data-opt="auto" ${impostazioni.auto ? 'checked' : ''}> Completa da solo quando tutte le carte sono scoperte</label>
      <p class="muted small">Il numero di carte da pescare (1 o 3) si sceglie quando inizi una nuova partita.</p>
      <div class="modal-actions"><button class="btn primary" type="button" data-act="chiudi">Fatto</button></div>`;
    openModal(html(), {
      onClick: (e) => {
        const b = e.target.closest('[data-dorso], [data-tavolo]');
        if (b) {
          if (b.dataset.dorso) impostazioni.dorso = b.dataset.dorso;
          if (b.dataset.tavolo) impostazioni.tavolo = b.dataset.tavolo;
          salvaImpostazioni();
          applicaAspetto();
          $('#modalBox').innerHTML = html();
          return true;
        }
        return false;
      }
    });
  }

  $('#modalBox').addEventListener('change', (e) => {
    const o = e.target.dataset && e.target.dataset.opt;
    if (!o) return;
    impostazioni[o] = e.target.checked;
    salvaImpostazioni();
    if (o === 'suoni' && impostazioni.suoni) suono('base');
    if (o === 'auto') aggiornaInfo();
  });

  function finestraStatistiche() {
    let p = game.pesca;
    const html = () => {
      const st = stat(p);
      const perc = st.giocate ? Math.round((st.vinte / st.giocate) * 100) + '%' : '–';
      const v = (x, f) => (x == null ? '–' : f ? f(x) : x);
      return `
        <h2>Statistiche</h2>
        <div class="seg">
          <button type="button" data-sp="1" class="${p === 1 ? 'on' : ''}">Pesca 1 carta</button>
          <button type="button" data-sp="3" class="${p === 3 ? 'on' : ''}">Pesca 3 carte</button>
        </div>
        <div class="stats">
          <div class="stat"><b>${st.giocate}</b><span>Giocate</span></div>
          <div class="stat"><b>${st.vinte}</b><span>Vinte</span></div>
          <div class="stat"><b>${perc}</b><span>Vittorie</span></div>
          <div class="stat"><b>${st.serie}</b><span>Serie attuale</span></div>
          <div class="stat"><b>${st.serieMax}</b><span>Serie migliore</span></div>
          <div class="stat"><b>${v(st.tempo, fmtTempo)}</b><span>Tempo migliore</span></div>
          <div class="stat"><b>${v(st.punti)}</b><span>Punti record</span></div>
          <div class="stat"><b>${v(st.mosse)}</b><span>Meno mosse</span></div>
        </div>
        <p class="muted small">Le statistiche restano salvate nel browser di questo dispositivo.</p>
        <div class="modal-actions">
          <button class="btn danger small" type="button" data-reset="1">Azzera</button>
          <button class="btn primary" type="button" data-act="chiudi">Chiudi</button>
        </div>`;
    };
    openModal(html(), {
      onClick: (e) => {
        const b = e.target.closest('[data-sp]');
        if (b) { p = Number(b.dataset.sp); $('#modalBox').innerHTML = html(); return true; }
        if (e.target.closest('[data-reset]')) {
          if (window.confirm('Vuoi azzerare le statistiche di "Pesca ' + p + '"?')) {
            statistiche['p' + p] = Object.assign({}, STAT_VUOTE);
            salvaStat();
            $('#modalBox').innerHTML = html();
          }
          return true;
        }
        return false;
      }
    });
  }

  function finestraRegole() {
    openModal(`
      <h2>Come si gioca</h2>
      <p>Lo scopo è portare tutte le carte sulle <b>quattro basi</b> in alto a destra: una base per seme, dall'Asso al Re.</p>
      <ul>
        <li>Nelle <b>colonne</b> le carte si mettono in ordine decrescente alternando rosso e nero (es. un 6 nero sopra un 7 rosso). Puoi spostare anche gruppi di carte già in ordine.</li>
        <li>In una colonna vuota può andare solo un <b>Re</b> (con le carte che ha sopra).</li>
        <li>Quando una carta coperta resta in cima a una colonna si gira da sola.</li>
        <li>Tocca il <b>mazzo</b> in alto a sinistra per pescare 1 o 3 carte; quando finisce, toccalo di nuovo per rigirare gli scarti.</li>
      </ul>
      <h3>Comandi</h3>
      <ul>
        <li><b>Trascina</b> le carte dove vuoi, oppure <b>toccale</b>: vanno da sole nel posto migliore.</li>
        <li><b>Suggerimento</b> mostra una mossa utile (premilo ancora per la successiva); <b>Annulla</b> torna indietro di una mossa.</li>
        <li>Da tastiera: <b>Spazio</b> pesca, <b>Ctrl+Z</b> annulla, <b>H</b> suggerimento, <b>N</b> nuova partita.</li>
      </ul>
      <h3>Punteggio</h3>
      <p class="muted small">+10 per ogni carta sulle basi, +5 dagli scarti alle colonne, +5 per ogni carta scoperta, −15 riportando una carta dalle basi alle colonne. Rigirare il mazzo costa 100 punti con "Pesca 1" e 20 punti (dal quarto giro) con "Pesca 3". Ogni 10 secondi si perdono 2 punti; vincendo si riceve un bonus che è più alto quanto più sei veloce.</p>
      <div class="modal-actions"><button class="btn primary" type="button" data-act="chiudi">Ho capito</button></div>`);
  }

  /* ---------------- Avvisi e suoni ---------------- */
  function toast(text, ms) {
    const box = $('#toasts');
    while (box.children.length > 1) box.firstChild.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    box.appendChild(t);
    setTimeout(() => t.remove(), ms || 2600);
  }

  let audio = null;
  function suono(tipo) {
    if (!impostazioni.suoni) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime;
      const out = audio.createGain();
      out.connect(audio.destination);
      if (tipo === 'posa' || tipo === 'pesca' || tipo === 'gira' || tipo === 'rigiro') {
        const dur = tipo === 'rigiro' ? 0.18 : 0.05;
        const buf = audio.createBuffer(1, Math.floor(audio.sampleRate * dur), audio.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
        const src = audio.createBufferSource();
        src.buffer = buf;
        const f = audio.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = tipo === 'posa' ? 1500 : tipo === 'gira' ? 3200 : 2400;
        f.Q.value = 0.9;
        out.gain.value = tipo === 'posa' ? 0.5 : 0.32;
        src.connect(f); f.connect(out);
        src.start(t);
        return;
      }
      const note = tipo === 'vittoria' ? [523, 659, 784, 1047] : tipo === 'no' ? [150] : [784, 1175];
      note.forEach((hz, k) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = tipo === 'no' ? 'triangle' : 'sine';
        o.frequency.value = hz;
        const st = t + k * (tipo === 'vittoria' ? 0.12 : 0.05);
        const vol = tipo === 'vittoria' ? 0.12 : tipo === 'no' ? 0.12 : 0.05;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(vol, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, st + (tipo === 'vittoria' ? 0.5 : 0.14));
        o.connect(g); g.connect(out);
        o.start(st); o.stop(st + 0.6);
      });
    } catch (e) { /* audio non disponibile */ }
  }

  /* ---------------- Comandi ---------------- */
  $('#btnNew').addEventListener('click', finestraNuova);
  $('#btnUndo').addEventListener('click', annulla);
  $('#btnHint').addEventListener('click', suggerisci);
  $('#btnFinish').addEventListener('click', () => { if (R.finibile(game) && !occupato) completaAutomaticamente(); });
  $('#btnSettings').addEventListener('click', finestraImpostazioni);
  $('#btnStats').addEventListener('click', finestraStatistiche);
  $('#btnRules').addEventListener('click', finestraRegole);

  document.addEventListener('keydown', (e) => {
    if (!$('#modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); annulla(); }
    else if (e.ctrlKey || e.metaKey || e.altKey) return;
    else if (k === ' ' || k === 'd') { e.preventDefault(); pesca(); }
    else if (k === 'z' || k === 'backspace') annulla();
    else if (k === 'h') suggerisci();
    else if (k === 'n') finestraNuova();
  });

  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (!meta.finita || !cascata.length) renderSubito(); }, 60);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { fermaTempo(); salva(); }
    else if (meta.iniziata && !meta.finita) tempoDa = Date.now();
  });
  window.addEventListener('pagehide', () => { fermaTempo(); salva(); });

  setInterval(aggiornaInfo, 1000);

  /* ---------------- Avvio ---------------- */
  applicaAspetto();
  creaTavolo();
  const salvata = store.get('partita', null);
  if (salvata && salvata.game && salvata.meta && !salvata.meta.finita && Array.isArray(salvata.game.tab)) {
    game = salvata.game;
    storia = Array.isArray(salvata.storia) ? salvata.storia : [];
    meta = salvata.meta;
    tempoAccum = salvata.ms || 0;
    if (meta.iniziata && document.visibilityState !== 'hidden') tempoDa = Date.now();
    renderSubito();
    if (meta.iniziata) toast('Partita ripresa da dove l\'avevi lasciata');
  } else {
    game = R.nuovaPartita(seedCasuale(), impostazioni.pesca);
    meta = { iniziata: false, finita: false, giornaliera: false };
    distribuisci();
    salva();
  }
})();

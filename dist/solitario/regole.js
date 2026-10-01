/* Solitario (Klondike): regole e logica della partita, senza grafica.
   Usato da gioco.js nel browser e da test/test_regole.js con Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Regole = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Carta = numero 0..51: seme = floor(id / 13), valore = id % 13 + 1 (1 = Asso, 13 = Re).
  const SEMI = ['picche', 'cuori', 'quadri', 'fiori'];
  const SIMBOLI = ['♠', '♥', '♦', '♣'];
  const VALORI = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const NOMI = ['Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Otto', 'Nove', 'Dieci', 'Fante', 'Regina', 'Re'];

  const seme = (id) => Math.floor(id / 13);
  const valore = (id) => (id % 13) + 1;
  const rossa = (id) => seme(id) === 1 || seme(id) === 2;
  const nome = (id) => `${NOMI[valore(id) - 1]} di ${SEMI[seme(id)]}`;

  // Punteggio "standard" (come il Solitario di Windows).
  const PUNTI = { scartiTableau: 5, versoBase: 10, scopri: 5, baseTableau: -15, rigiro1: -100, rigiro3: -20 };

  // Generatore casuale con seme (mulberry32): stesso numero di partita = stessa distribuzione.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function nuovaPartita(seed, pesca) {
    const r = rng(seed);
    const mazzo = [];
    for (let i = 0; i < 52; i++) mazzo.push(i);
    for (let i = mazzo.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]];
    }
    const s = {
      seed, pesca: pesca === 3 ? 3 : 1,
      stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []],
      ventaglio: 0, punti: 0, mosse: 0, giri: 0
    };
    // Distribuzione classica, riga per riga: la prima carta di ogni colonna è scoperta.
    for (let riga = 0; riga < 7; riga++) {
      for (let col = riga; col < 7; col++) s.tab[col].push({ id: mazzo.pop(), up: col === riga });
    }
    while (mazzo.length) s.stock.push({ id: mazzo.pop(), up: false });
    return s;
  }

  const clona = (s) => JSON.parse(JSON.stringify(s));
  const cima = (arr) => arr[arr.length - 1];

  // Pesca dal mazzo; se il mazzo è vuoto rigira gli scarti.
  function pesca(s) {
    if (s.stock.length) {
      const n = Math.min(s.pesca, s.stock.length);
      for (let k = 0; k < n; k++) {
        const c = s.stock.pop();
        c.up = true;
        s.waste.push(c);
      }
      s.ventaglio = n;
      s.mosse++;
      return { tipo: 'pesca', n };
    }
    if (s.waste.length) {
      while (s.waste.length) {
        const c = s.waste.pop();
        c.up = false;
        s.stock.push(c);
      }
      s.giri++;
      s.ventaglio = 0;
      if (s.pesca === 1) aggiungi(s, PUNTI.rigiro1);
      else if (s.giri > 3) aggiungi(s, PUNTI.rigiro3);
      s.mosse++;
      return { tipo: 'rigiro' };
    }
    return null;
  }

  function aggiungi(s, p) { s.punti = Math.max(0, s.punti + p); }

  // Origine: { pila: 'waste' } | { pila: 'found', i } | { pila: 'tab', i, n } (n = indice della prima carta spostata)
  // Destinazione: { pila: 'found', i } | { pila: 'tab', i }
  function carteDa(s, src) {
    if (src.pila === 'waste') return s.waste.length ? [cima(s.waste)] : [];
    if (src.pila === 'found') { const f = s.found[src.i]; return f && f.length ? [cima(f)] : []; }
    if (src.pila === 'tab') {
      const col = s.tab[src.i];
      if (!col || src.n < 0 || src.n >= col.length) return [];
      return col.slice(src.n);
    }
    return [];
  }

  function sequenzaValida(carte) {
    if (!carte.length) return false;
    for (let k = 0; k < carte.length; k++) {
      if (!carte[k].up) return false;
      if (k > 0) {
        const a = carte[k - 1].id, b = carte[k].id;
        if (rossa(a) === rossa(b) || valore(b) !== valore(a) - 1) return false;
      }
    }
    return true;
  }

  function accetta(s, carte, dst) {
    const c = carte[0].id;
    if (dst.pila === 'found') {
      const f = s.found[dst.i];
      if (!f || carte.length !== 1) return false;
      if (!f.length) return valore(c) === 1;
      const t = cima(f).id;
      return seme(t) === seme(c) && valore(c) === valore(t) + 1;
    }
    if (dst.pila === 'tab') {
      const col = s.tab[dst.i];
      if (!col) return false;
      if (!col.length) return valore(c) === 13;
      const t = cima(col);
      return t.up && rossa(t.id) !== rossa(c) && valore(c) === valore(t.id) - 1;
    }
    return false;
  }

  function stessaPila(src, dst) { return src.pila === dst.pila && src.i === dst.i; }

  function legale(s, src, dst) {
    if (stessaPila(src, dst)) return false;
    const carte = carteDa(s, src);
    return sequenzaValida(carte) && accetta(s, carte, dst);
  }

  // Esegue la mossa (già controllata o no) e restituisce { scoperta: id } se ha girato una carta.
  function muovi(s, src, dst) {
    if (!legale(s, src, dst)) return null;
    let carte;
    if (src.pila === 'waste') {
      carte = [s.waste.pop()];
      if (s.ventaglio > 1) s.ventaglio--;
      if (!s.waste.length) s.ventaglio = 0;
    } else if (src.pila === 'found') carte = [s.found[src.i].pop()];
    else carte = s.tab[src.i].splice(src.n);

    const arrivo = dst.pila === 'found' ? s.found[dst.i] : s.tab[dst.i];
    for (const c of carte) arrivo.push(c);

    if (src.pila === 'waste') aggiungi(s, dst.pila === 'found' ? PUNTI.versoBase : PUNTI.scartiTableau);
    else if (src.pila === 'tab' && dst.pila === 'found') aggiungi(s, PUNTI.versoBase);
    else if (src.pila === 'found' && dst.pila === 'tab') aggiungi(s, PUNTI.baseTableau);

    const esito = { carte: carte.map((c) => c.id) };
    if (src.pila === 'tab') {
      const t = cima(s.tab[src.i]);
      if (t && !t.up) {
        t.up = true;
        aggiungi(s, PUNTI.scopri);
        esito.scoperta = t.id;
      }
    }
    s.mosse++;
    return esito;
  }

  function vinta(s) { return s.found.every((f) => f.length === 13); }

  // Si può finire da soli: tutte le carte delle colonne sono scoperte e, mandando sulle basi
  // tutto quello che si può e pescando dal mazzo quando serve, si arriva alla vittoria.
  function finibile(s) {
    if (vinta(s) || !s.tab.every((col) => col.every((c) => c.up))) return false;
    const t = clona(s);
    let pescateAVuoto = 0;
    for (let k = 0; k < 3000; k++) {
      if (vinta(t)) return true;
      const m = passoAutomatico(t);
      if (!m) return false;
      if (m.pesca) {
        if (++pescateAVuoto > 2 * (t.stock.length + t.waste.length) + 6) return false;
        pesca(t);
      } else {
        muovi(t, m.src, m.dst);
        pescateAVuoto = 0;
      }
    }
    return false;
  }

  function baseLibera(s, id) {
    for (let i = 0; i < 4; i++) if (accetta(s, [{ id, up: true }], { pila: 'found', i })) return i;
    return -1;
  }

  // Una carta può salire da sola sulle basi senza danni quando le carte del colore opposto
  // di un valore più basso sono già tutte sulle basi (nessuna avrà più bisogno di appoggiarsi lì).
  function sicuraPerBase(s, id) {
    const v = valore(id);
    if (v <= 2) return true;
    const livello = [0, 0, 0, 0];
    s.found.forEach((f) => { if (f.length) livello[seme(f[0].id)] = f.length; });
    return (rossa(id) ? [0, 3] : [1, 2]).every((x) => livello[x] >= v - 1);
  }

  // Carta da mandare in automatico sulle basi (scarti o cima di una colonna), se c'è.
  function mossaSicura(s) {
    const cand = [];
    if (s.waste.length) cand.push({ src: { pila: 'waste' }, c: cima(s.waste) });
    s.tab.forEach((col, i) => { if (col.length && cima(col).up) cand.push({ src: { pila: 'tab', i, n: col.length - 1 }, c: cima(col) }); });
    for (const k of cand) {
      const i = baseLibera(s, k.c.id);
      if (i >= 0 && sicuraPerBase(s, k.c.id)) return { src: k.src, dst: { pila: 'found', i } };
    }
    return null;
  }

  // Prossima mossa del completamento automatico: la carta più bassa che può salire sulle basi,
  // altrimenti pescare dal mazzo ({ pesca: true }).
  function passoAutomatico(s) {
    let best = null;
    const prova = (src, c) => {
      const i = baseLibera(s, c.id);
      if (i >= 0 && (!best || valore(c.id) < best.v)) best = { src, dst: { pila: 'found', i }, v: valore(c.id) };
    };
    if (s.waste.length) prova({ pila: 'waste' }, cima(s.waste));
    s.tab.forEach((col, i) => { if (col.length) prova({ pila: 'tab', i, n: col.length - 1 }, cima(col)); });
    if (best) return { src: best.src, dst: best.dst };
    return s.stock.length || s.waste.length ? { pesca: true } : null;
  }

  // Destinazione migliore per un tocco su una carta: prima le basi, poi le colonne.
  function destinazioneMigliore(s, src) {
    const carte = carteDa(s, src);
    if (!sequenzaValida(carte)) return null;
    if (carte.length === 1 && src.pila !== 'found') {
      const i = baseLibera(s, carte[0].id);
      if (i >= 0) return { pila: 'found', i };
    }
    const partenza = src.pila === 'tab' ? src.i : -1;
    let vuota = null;
    for (let k = 1; k <= 7; k++) {
      const i = (partenza + k + 7) % 7;
      if (i === partenza) continue;
      const dst = { pila: 'tab', i };
      if (!accetta(s, carte, dst)) continue;
      if (s.tab[i].length) return dst;
      // Un Re già in fondo a una colonna non ha senso spostarlo in un'altra colonna vuota.
      if (!vuota && !(src.pila === 'tab' && src.n === 0)) vuota = dst;
    }
    return vuota;
  }

  // Carte che si possono raggiungere dagli scarti continuando a pescare (senza fare altre mosse).
  function raggiungibiliDalMazzo(s) {
    const stock = s.stock.map((c) => c.id);
    const waste = s.waste.map((c) => c.id);
    const viste = new Set();
    if (waste.length) viste.add(cima(waste));
    let rigiri = 0;
    for (let passi = 0; passi < 200; passi++) {
      if (stock.length) {
        const n = Math.min(s.pesca, stock.length);
        for (let k = 0; k < n; k++) waste.push(stock.pop());
        viste.add(cima(waste));
      } else if (waste.length) {
        if (++rigiri > 2) break;
        while (waste.length) stock.push(waste.pop());
      } else break;
    }
    return [...viste];
  }

  // Mosse utili in ordine di priorità (per il suggerimento e per capire se si è bloccati).
  function suggerimenti(s) {
    const out = [];
    const tops = [];
    if (s.waste.length) tops.push({ src: { pila: 'waste' }, c: cima(s.waste) });
    s.tab.forEach((col, i) => { if (col.length) tops.push({ src: { pila: 'tab', i, n: col.length - 1 }, c: cima(col) }); });

    // 1) Verso le basi
    for (const t of tops) {
      const i = baseLibera(s, t.c.id);
      if (i >= 0) out.push({ src: t.src, dst: { pila: 'found', i }, tipo: 'base' });
    }
    // 2) Tra colonne, se scopre una carta coperta o libera una colonna per un Re
    const reDisponibile = tops.some((t) => valore(t.c.id) === 13) ||
      s.tab.some((col) => col.some((c, n) => c.up && valore(c.id) === 13 && n > 0)) ||
      raggiungibiliDalMazzo(s).some((id) => valore(id) === 13);
    s.tab.forEach((col, i) => {
      const n = col.findIndex((c) => c.up);
      if (n < 0) return;
      const src = { pila: 'tab', i, n };
      const scopre = n > 0;
      if (!scopre && (valore(col[n].id) === 13 || !reDisponibile)) return;
      for (let j = 0; j < 7; j++) {
        if (j === i) continue;
        const dst = { pila: 'tab', i: j };
        if (!s.tab[j].length && !scopre) continue;
        if (legale(s, src, dst)) { out.push({ src, dst, tipo: scopre ? 'scopri' : 'libera' }); break; }
      }
    });
    // 3) Dagli scarti alle colonne
    if (s.waste.length) {
      for (let j = 0; j < 7; j++) {
        const dst = { pila: 'tab', i: j };
        if (legale(s, { pila: 'waste' }, dst)) { out.push({ src: { pila: 'waste' }, dst, tipo: 'scarti' }); break; }
      }
    }
    // 4) Spostare parte di una sequenza per mandare alla base la carta sotto
    s.tab.forEach((col, i) => {
      for (let n = col.length - 1; n > 0; n--) {
        if (!col[n].up || !col[n - 1].up) continue;
        if (baseLibera(s, col[n - 1].id) < 0) continue;
        for (let j = 0; j < 7; j++) {
          if (j === i || !s.tab[j].length) continue;
          const src = { pila: 'tab', i, n };
          const dst = { pila: 'tab', i: j };
          if (legale(s, src, dst)) { out.push({ src, dst, tipo: 'prepara' }); return; }
        }
      }
    });
    // 5) Pescare, se nel mazzo c'è qualcosa che si può usare
    if (s.stock.length || s.waste.length) {
      const attuale = s.waste.length ? cima(s.waste).id : -1;
      const utile = raggiungibiliDalMazzo(s).some((id) => {
        if (id === attuale) return false;
        const c = [{ id, up: true }];
        if (baseLibera(s, id) >= 0) return true;
        for (let j = 0; j < 7; j++) if (accetta(s, c, { pila: 'tab', i: j })) return true;
        return false;
      });
      if (utile || !out.length) out.push({ pesca: true, rigiro: !s.stock.length, utile });
    }
    return out;
  }

  // C'è almeno una mossa che fa progredire la partita?
  function bloccata(s) {
    if (vinta(s)) return false;
    const lista = suggerimenti(s);
    return !lista.some((m) => !m.pesca || m.utile);
  }

  // Punteggio finale: punti meno 2 ogni 10 secondi, più il bonus tempo se si vince.
  function punteggio(s, secondi, vittoria) {
    let p = Math.max(0, s.punti - 2 * Math.floor(secondi / 10));
    if (vittoria && secondi >= 30) p += Math.round(700000 / secondi);
    return p;
  }

  return {
    SEMI, SIMBOLI, VALORI, NOMI, PUNTI,
    seme, valore, rossa, nome, rng,
    nuovaPartita, clona, pesca, carteDa, sequenzaValida, accetta, legale, muovi,
    vinta, finibile, passoAutomatico, destinazioneMigliore, baseLibera, sicuraPerBase, mossaSicura,
    raggiungibiliDalMazzo, suggerimenti, bloccata, punteggio
  };
});

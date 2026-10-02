/* Dama italiana: regole complete e intelligenza artificiale, senza grafica.
   Lo stesso file serve alla pagina (window.Regole), al Web Worker del computer e ai test con Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Regole = api;
  // Dentro un Web Worker: risponde alle richieste di mossa del computer.
  if (typeof document === 'undefined' && typeof importScripts === 'function') {
    root.onmessage = (e) => {
      const { id, stato, opz } = e.data;
      root.postMessage({ id, mossa: api.cerca(stato, opz) });
    };
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Damiera: 64 caselle, riga 0 in alto (lato del Nero), riga 7 in basso (lato del Bianco).
  // Si gioca sulle caselle scure; l'angolo in basso a destra è scuro.
  // Valori: 0 vuota, 1 pedina bianca, 2 dama bianca, -1 pedina nera, -2 dama nera.
  const scura = (q) => (((q >> 3) + (q & 7)) & 1) === 0;
  const SCURE = [];
  const NUM = new Array(64).fill(0);   // numerazione 1..32 delle caselle scure (1-12 Nero, 21-32 Bianco)
  for (let q = 0; q < 64; q++) if (scura(q)) { SCURE.push(q); NUM[q] = SCURE.length; }

  const TUTTE = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const AVANTI_B = [[-1, -1], [-1, 1]];
  const AVANTI_N = [[1, -1], [1, 1]];
  const direzioni = (p) => (p === 2 || p === -2 ? TUTTE : p > 0 ? AVANTI_B : AVANTI_N);
  const rigaFinale = (p, q) => (p > 0 ? (q >> 3) === 0 : (q >> 3) === 7);

  function iniziale() {
    const b = new Array(64).fill(0);
    for (const q of SCURE) {
      const r = q >> 3;
      if (r < 3) b[q] = -1;
      else if (r > 4) b[q] = 1;
    }
    return { b, turno: 1, quiete: 0 };   // muove per primo il Bianco
  }

  // Tutte le sequenze di presa di un pezzo (le pedine non possono prendere le dame;
  // una pedina che arriva in fondo durante una presa diventa dama e si ferma lì).
  function preseDi(b, da) {
    const p = b[da];
    const lato = Math.sign(p);
    const dama = p === 2 || p === -2;
    const D = direzioni(p);
    const out = [];
    const percorso = [];
    const presi = [];
    const tipi = [];
    const registra = (pos) => {
      const k = tipi.indexOf(true);
      out.push({
        da, a: pos, percorso: percorso.slice(), prese: presi.slice(),
        preseDame: tipi.filter(Boolean).length, primaDama: k < 0 ? 99 : k,
        dama, promuove: !dama && rigaFinale(p, pos)
      });
    };
    const dfs = (pos) => {
      if (!dama && presi.length && rigaFinale(p, pos)) { registra(pos); return; }
      let continua = false;
      const r = pos >> 3, c = pos & 7;
      for (const [dr, dc] of D) {
        const r2 = r + 2 * dr, c2 = c + 2 * dc;
        if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) continue;
        const m = (r + dr) * 8 + (c + dc);
        const l = r2 * 8 + c2;
        const v = b[m];
        if (Math.sign(v) !== -lato) continue;
        if (!dama && (v === 2 || v === -2)) continue;
        if (presi.includes(m)) continue;
        if (b[l] !== 0 && l !== da) continue;
        continua = true;
        percorso.push(l); presi.push(m); tipi.push(v === 2 || v === -2);
        dfs(l);
        percorso.pop(); presi.pop(); tipi.pop();
      }
      if (!continua && presi.length) registra(pos);
    };
    dfs(da);
    return out;
  }

  // Regole di precedenza della dama italiana per le prese.
  function precedenza(lista) {
    let max = Math.max(...lista.map((m) => m.prese.length));
    let l = lista.filter((m) => m.prese.length === max);       // 1) il maggior numero di pezzi
    if (l.some((m) => m.dama)) l = l.filter((m) => m.dama);     // 2) con la dama piuttosto che con la pedina
    max = Math.max(...l.map((m) => m.preseDame));
    l = l.filter((m) => m.preseDame === max);                    // 3) il maggior numero di dame
    const prima = Math.min(...l.map((m) => m.primaDama));
    l = l.filter((m) => m.primaDama === prima);                  // 4) prima incontra una dama
    const viste = new Set();
    return l.filter((m) => {
      const k = m.da + ':' + m.a + ':' + m.prese.slice().sort((x, y) => x - y).join(',');
      if (viste.has(k)) return false;
      viste.add(k);
      return true;
    });
  }

  function mosse(s) {
    const b = s.b, t = s.turno;
    let prese = [];
    for (const q of SCURE) if (Math.sign(b[q]) === t) { const l = preseDi(b, q); if (l.length) prese = prese.concat(l); }
    if (prese.length) return precedenza(prese);
    const out = [];
    for (const q of SCURE) {
      const p = b[q];
      if (Math.sign(p) !== t) continue;
      const r = q >> 3, c = q & 7;
      for (const [dr, dc] of direzioni(p)) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) continue;
        const l = r2 * 8 + c2;
        if (b[l] !== 0) continue;
        out.push({ da: q, a: l, percorso: [l], prese: [], preseDame: 0, primaDama: 99, dama: p === 2 || p === -2, promuove: (p === 1 || p === -1) && rigaFinale(p, l) });
      }
    }
    return out;
  }

  function applica(s, m) {
    const b = s.b.slice();
    const p = b[m.da];
    b[m.da] = 0;
    for (const q of m.prese) b[q] = 0;
    b[m.a] = m.promuove ? 2 * Math.sign(p) : p;
    const quiete = m.prese.length || p === 1 || p === -1 ? 0 : s.quiete + 1;
    return { b, turno: -s.turno, quiete };
  }

  const chiave = (s) => s.b.join(',') + '|' + s.turno;
  const notazione = (m) => [m.da, ...m.percorso].map((q) => NUM[q]).join(m.prese.length ? 'x' : '-');
  const stessaMossa = (x, y) => x.da === y.da && x.percorso.length === y.percorso.length && x.percorso.every((q, i) => q === y.percorso[i]);

  function conta(b) {
    const n = { pb: 0, db: 0, pn: 0, dn: 0 };
    for (const q of SCURE) {
      const v = b[q];
      if (v === 1) n.pb++; else if (v === 2) n.db++; else if (v === -1) n.pn++; else if (v === -2) n.dn++;
    }
    return n;
  }

  // Fine partita: { vincitore: 1 | -1 | 0, motivo }
  // Si perde senza pezzi o senza mosse; patta per triplice ripetizione o dopo 40 mosse a testa
  // senza prese e senza movimenti di pedine.
  function esito(s, chiavi) {
    if (!mosse(s).length) {
      const n = conta(s.b);
      const finiti = s.turno === 1 ? n.pb + n.db === 0 : n.pn + n.dn === 0;
      return { vincitore: -s.turno, motivo: finiti ? 'pezzi' : 'bloccato' };
    }
    if (s.quiete >= 80) return { vincitore: 0, motivo: 'quaranta' };
    if (chiavi) {
      const k = chiave(s);
      if (chiavi.filter((x) => x === k).length >= 3) return { vincitore: 0, motivo: 'ripetizione' };
    }
    return null;
  }

  /* ---------------- Intelligenza artificiale ---------------- */

  const LIVELLI = [
    { nome: 'Principiante', desc: 'Muove spesso a caso: perfetto per imparare.', profondita: 1, tempo: 200, rumore: 120, caso: 0.45 },
    { nome: 'Facile', desc: 'Vede una mossa avanti e ogni tanto sbaglia.', profondita: 2, tempo: 300, rumore: 50, caso: 0.1 },
    { nome: 'Medio', desc: 'Gioca con attenzione, ma si può battere.', profondita: 4, tempo: 600, rumore: 12, caso: 0 },
    { nome: 'Difficile', desc: 'Calcola diverse mosse in anticipo.', profondita: 8, tempo: 1300, rumore: 0, caso: 0 },
    { nome: 'Campione', desc: 'Pensa a fondo ogni mossa: serve una vera strategia.', profondita: 40, tempo: 2600, rumore: 0, caso: 0 }
  ];

  const CENTRO = new Array(64).fill(0);
  for (const q of SCURE) {
    const r = q >> 3, c = q & 7;
    if (r >= 2 && r <= 5 && c >= 2 && c <= 5) CENTRO[q] = (r >= 3 && r <= 4 && c >= 2 && c <= 5) ? 6 : 3;
  }

  // Valutazione dal punto di vista del Bianco.
  function valuta(b) {
    let s = 0, nb = 0, nn = 0, dameB = 0, dameN = 0;
    for (const q of SCURE) {
      const v = b[q];
      if (!v) continue;
      const r = q >> 3;
      if (v === 1) {
        nb++;
        s += 100 + (7 - r) * 4 + (r === 1 ? 14 : 0) + CENTRO[q] + (r === 7 ? 7 : 0);
      } else if (v === -1) {
        nn++;
        s -= 100 + r * 4 + (r === 6 ? 14 : 0) + CENTRO[q] + (r === 0 ? 7 : 0);
      } else if (v === 2) {
        nb++; dameB++;
        s += 290 + CENTRO[q] * 2;
      } else {
        nn++; dameN++;
        s -= 290 + CENTRO[q] * 2;
      }
    }
    // In vantaggio conviene cambiare i pezzi.
    const pezzi = nb + nn;
    if (nb > nn) s += (24 - pezzi) * 3;
    else if (nn > nb) s -= (24 - pezzi) * 3;
    // Con le sole dame, avvicinarsi all'avversario per chiuderlo.
    if (dameB && !dameN && nb > nn) s += 10;
    if (dameN && !dameB && nn > nb) s -= 10;
    return s;
  }

  const VINTA = 100000;
  let inizio = 0, limite = 0, fermato = false, nodi = 0;

  function ordina(lista, migliore) {
    return lista.slice().sort((x, y) => {
      if (migliore) {
        if (stessaMossa(x, migliore)) return -1;
        if (stessaMossa(y, migliore)) return 1;
      }
      return (y.promuove - x.promuove) || (y.prese.length - x.prese.length);
    });
  }

  function negamax(s, prof, alfa, beta, ply) {
    if ((++nodi & 1023) === 0 && Date.now() - inizio > limite) fermato = true;
    if (fermato) return 0;
    if (s.quiete >= 80) return 0;
    const lista = mosse(s);
    if (!lista.length) return -VINTA + ply;
    // Le prese sono obbligatorie: finché ci sono prese si continua a calcolare (niente "effetto orizzonte").
    if (prof <= 0 && (!lista[0].prese.length || ply > 40)) return s.turno * valuta(s.b);
    for (const m of ordina(lista)) {
      const v = -negamax(applica(s, m), prof - 1, -beta, -alfa, ply + 1);
      if (fermato) return 0;
      if (v >= beta) return v;
      if (v > alfa) alfa = v;
    }
    return alfa;
  }

  // Sceglie la mossa del computer. opz: { profondita, tempo, rumore, caso } oppure { livello }
  function cerca(stato, opz = {}) {
    const cfg = opz.livello != null ? LIVELLI[opz.livello] : opz;
    const lista = mosse(stato);
    if (!lista.length) return null;
    if (lista.length === 1) return lista[0];
    if (cfg.caso && Math.random() < cfg.caso) return lista[Math.floor(Math.random() * lista.length)];
    inizio = Date.now();
    limite = cfg.tempo || 1000;
    fermato = false;
    nodi = 0;
    let migliore = null;
    const maxProf = cfg.profondita || 6;
    for (let d = 1; d <= maxProf; d++) {
      let alfa = -Infinity, scelta = null;
      for (const m of ordina(lista, migliore)) {
        // Con il "rumore" (livelli facili) ogni mossa va valutata per intero, poi si sbaglia di proposito.
        let v = -negamax(applica(stato, m), d - 1, -Infinity, cfg.rumore ? Infinity : -alfa, 1);
        if (fermato) break;
        if (cfg.rumore) v += (Math.random() * 2 - 1) * cfg.rumore;
        if (v > alfa) { alfa = v; scelta = m; }
      }
      if (fermato && !scelta) break;
      if (scelta) migliore = scelta;
      if (fermato || Math.abs(alfa) > VINTA - 1000) break;
      if (Date.now() - inizio > limite * 0.45) break;
    }
    return migliore || lista[0];
  }

  return {
    SCURE, NUM, LIVELLI, scura,
    iniziale, mosse, preseDi, applica, chiave, notazione, stessaMossa, conta, esito, valuta, cerca
  };
});

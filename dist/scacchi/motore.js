/* Motore degli scacchi: regole complete (arrocco, presa en passant, promozione,
   scacco matto, stallo, 50 mosse, triplice ripetizione, materiale insufficiente)
   e avversario artificiale con 6 livelli di difficoltà.
   Lo stesso file funziona nella pagina, in un Web Worker (per pensare senza
   bloccare la pagina) e in Node (per i test). */
(function (root) {
  'use strict';

  const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
  const WHITE = 0, BLACK = 1;
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  const KNIGHT_OFF = [-33, -31, -18, -14, 14, 18, 31, 33];
  const BISHOP_OFF = [-17, -15, 15, 17];
  const ROOK_OFF = [-16, -1, 1, 16];
  const KING_OFF = [-17, -16, -15, -1, 1, 15, 16, 17];

  const FILES = 'abcdefgh';
  const sqName = (s) => FILES[s & 7] + ((s >> 4) + 1);
  const sqFrom = (n) => (n.charCodeAt(0) - 97) + ((n.charCodeAt(1) - 49) << 4);

  // Mossa codificata in un intero: da | a<<7 | promozione<<14 | flag<<17
  const F_CAP = 1, F_EP = 2, F_CASTLE = 4, F_DOUBLE = 8, F_PROMO = 16;
  const mv = (from, to, flags, promo) => from | (to << 7) | (promo << 14) | (flags << 17);
  const mFrom = (m) => m & 127;
  const mTo = (m) => (m >> 7) & 127;
  const mPromo = (m) => (m >> 14) & 7;
  const mFlags = (m) => m >> 17;

  // Chiavi casuali (Zobrist) per riconoscere le posizioni ripetute.
  let seed = 0x2545F491;
  const rnd32 = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
  const ZP_LO = new Int32Array(16 * 128), ZP_HI = new Int32Array(16 * 128);
  for (let i = 0; i < ZP_LO.length; i++) { ZP_LO[i] = rnd32(); ZP_HI[i] = rnd32(); }
  const ZC_LO = new Int32Array(16), ZC_HI = new Int32Array(16);
  for (let i = 0; i < 16; i++) { ZC_LO[i] = rnd32(); ZC_HI[i] = rnd32(); }
  const ZE_LO = new Int32Array(8), ZE_HI = new Int32Array(8);
  for (let i = 0; i < 8; i++) { ZE_LO[i] = rnd32(); ZE_HI[i] = rnd32(); }
  const ZT_LO = rnd32(), ZT_HI = rnd32();

  // Diritti di arrocco: 1 = bianco corto, 2 = bianco lungo, 4 = nero corto, 8 = nero lungo
  const CASTLE_MASK = new Int8Array(128).fill(15);
  CASTLE_MASK[0] = 13; CASTLE_MASK[7] = 14; CASTLE_MASK[4] = 12;
  CASTLE_MASK[112] = 7; CASTLE_MASK[119] = 11; CASTLE_MASK[116] = 3;

  /* ------------------------------------------------------------------ */
  /* Posizione                                                           */
  /* ------------------------------------------------------------------ */
  function Position(fen) {
    this.b = new Int8Array(128);
    this.kings = [0, 0];
    this.stack = [];
    this.load(fen || START_FEN);
  }

  Position.prototype.load = function (fen) {
    const parts = String(fen).trim().split(/\s+/);
    const b = this.b;
    b.fill(0);
    let r = 7, f = 0, kc = [0, 0];
    for (const ch of parts[0] || '') {
      if (ch === '/') { r--; f = 0; continue; }
      if (ch >= '1' && ch <= '8') { f += +ch; continue; }
      const t = 'pnbrqk'.indexOf(ch.toLowerCase()) + 1;
      if (t <= 0 || r < 0 || f > 7) throw new Error('FEN non valida');
      const c = ch === ch.toLowerCase() ? BLACK : WHITE;
      const sq = r * 16 + f;
      b[sq] = t | (c << 3);
      if (t === KING) { this.kings[c] = sq; kc[c]++; }
      f++;
    }
    if (kc[0] !== 1 || kc[1] !== 1) throw new Error('FEN non valida');
    this.turn = parts[1] === 'b' ? BLACK : WHITE;
    const cs = parts[2] || '-';
    this.castle = (cs.includes('K') ? 1 : 0) | (cs.includes('Q') ? 2 : 0) | (cs.includes('k') ? 4 : 0) | (cs.includes('q') ? 8 : 0);
    // Tiene solo i diritti coerenti con re e torri sulle case iniziali.
    if (b[4] !== KING) this.castle &= ~3;
    if (b[7] !== ROOK) this.castle &= ~1;
    if (b[0] !== ROOK) this.castle &= ~2;
    if (b[116] !== (KING | 8)) this.castle &= ~12;
    if (b[119] !== (ROOK | 8)) this.castle &= ~4;
    if (b[112] !== (ROOK | 8)) this.castle &= ~8;
    this.ep = parts[3] && parts[3] !== '-' ? sqFrom(parts[3]) : -1;
    this.half = parseInt(parts[4], 10) || 0;
    this.full = parseInt(parts[5], 10) || 1;
    this.stack = [];
    this.computeHash();
  };

  Position.prototype.computeHash = function () {
    let lo = 0, hi = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = this.b[sq];
      if (p) { lo ^= ZP_LO[p * 128 + sq]; hi ^= ZP_HI[p * 128 + sq]; }
    }
    if (this.turn) { lo ^= ZT_LO; hi ^= ZT_HI; }
    lo ^= ZC_LO[this.castle]; hi ^= ZC_HI[this.castle];
    if (this.ep >= 0) { lo ^= ZE_LO[this.ep & 7]; hi ^= ZE_HI[this.ep & 7]; }
    this.lo = lo; this.hi = hi;
  };

  Position.prototype.fen = function () {
    const b = this.b;
    let s = '';
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = b[r * 16 + f];
        if (!p) { empty++; continue; }
        if (empty) { s += empty; empty = 0; }
        const ch = ' pnbrqk'[p & 7];
        s += (p >> 3) ? ch : ch.toUpperCase();
      }
      if (empty) s += empty;
      if (r) s += '/';
    }
    let cs = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
    return s + ' ' + (this.turn ? 'b' : 'w') + ' ' + (cs || '-') + ' ' + (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.half + ' ' + this.full;
  };

  // La casa sq è attaccata dal colore "by"?
  Position.prototype.attacked = function (sq, by) {
    const b = this.b;
    let s;
    if (by === WHITE) {
      s = sq - 15; if (!(s & 0x88) && b[s] === PAWN) return true;
      s = sq - 17; if (!(s & 0x88) && b[s] === PAWN) return true;
    } else {
      s = sq + 15; if (!(s & 0x88) && b[s] === (PAWN | 8)) return true;
      s = sq + 17; if (!(s & 0x88) && b[s] === (PAWN | 8)) return true;
    }
    const cb = by << 3;
    const kn = KNIGHT | cb, kg = KING | cb, bi = BISHOP | cb, ro = ROOK | cb, qu = QUEEN | cb;
    for (let i = 0; i < 8; i++) {
      s = sq + KNIGHT_OFF[i]; if (!(s & 0x88) && b[s] === kn) return true;
      s = sq + KING_OFF[i]; if (!(s & 0x88) && b[s] === kg) return true;
    }
    for (let i = 0; i < 4; i++) {
      let o = BISHOP_OFF[i];
      s = sq + o;
      while (!(s & 0x88)) { const p = b[s]; if (p) { if (p === bi || p === qu) return true; break; } s += o; }
      o = ROOK_OFF[i];
      s = sq + o;
      while (!(s & 0x88)) { const p = b[s]; if (p) { if (p === ro || p === qu) return true; break; } s += o; }
    }
    return false;
  };

  Position.prototype.inCheck = function () {
    return this.attacked(this.kings[this.turn], this.turn ^ 1);
  };

  // Mosse pseudo-legali (il re potrebbe restare sotto scacco: lo verifica make()).
  Position.prototype.genMoves = function (out, capsOnly) {
    const b = this.b, us = this.turn, them = us ^ 1;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (!p || (p >> 3) !== us) continue;
      const t = p & 7;
      if (t === PAWN) {
        const dir = us === WHITE ? 16 : -16;
        const promoRank = us === WHITE ? 7 : 0;
        const to = sq + dir;
        if (!(to & 0x88) && !b[to]) {
          if ((to >> 4) === promoRank) {
            for (let pr = QUEEN; pr >= KNIGHT; pr--) out.push(mv(sq, to, F_PROMO, pr));
          } else if (!capsOnly) {
            out.push(mv(sq, to, 0, 0));
            if ((sq >> 4) === (us === WHITE ? 1 : 6) && !b[to + dir]) out.push(mv(sq, to + dir, F_DOUBLE, 0));
          }
        }
        for (let k = -1; k <= 1; k += 2) {
          const t2 = to + k;
          if (t2 & 0x88) continue;
          const q = b[t2];
          if (q && (q >> 3) === them) {
            if ((t2 >> 4) === promoRank) {
              for (let pr = QUEEN; pr >= KNIGHT; pr--) out.push(mv(sq, t2, F_CAP | F_PROMO, pr));
            } else out.push(mv(sq, t2, F_CAP, 0));
          } else if (t2 === this.ep && !q) {
            out.push(mv(sq, t2, F_CAP | F_EP, 0));
          }
        }
      } else if (t === KNIGHT || t === KING) {
        const offs = t === KNIGHT ? KNIGHT_OFF : KING_OFF;
        for (let i = 0; i < 8; i++) {
          const t2 = sq + offs[i];
          if (t2 & 0x88) continue;
          const q = b[t2];
          if (!q) { if (!capsOnly) out.push(mv(sq, t2, 0, 0)); }
          else if ((q >> 3) === them) out.push(mv(sq, t2, F_CAP, 0));
        }
        if (t === KING && !capsOnly && this.castle) {
          if (us === WHITE && sq === 4) {
            if ((this.castle & 1) && !b[5] && !b[6] && b[7] === ROOK &&
              !this.attacked(4, them) && !this.attacked(5, them) && !this.attacked(6, them)) out.push(mv(4, 6, F_CASTLE, 0));
            if ((this.castle & 2) && !b[3] && !b[2] && !b[1] && b[0] === ROOK &&
              !this.attacked(4, them) && !this.attacked(3, them) && !this.attacked(2, them)) out.push(mv(4, 2, F_CASTLE, 0));
          } else if (us === BLACK && sq === 116) {
            if ((this.castle & 4) && !b[117] && !b[118] && b[119] === (ROOK | 8) &&
              !this.attacked(116, them) && !this.attacked(117, them) && !this.attacked(118, them)) out.push(mv(116, 118, F_CASTLE, 0));
            if ((this.castle & 8) && !b[115] && !b[114] && !b[113] && b[112] === (ROOK | 8) &&
              !this.attacked(116, them) && !this.attacked(115, them) && !this.attacked(114, them)) out.push(mv(116, 114, F_CASTLE, 0));
          }
        }
      } else {
        const offs = t === BISHOP ? BISHOP_OFF : t === ROOK ? ROOK_OFF : KING_OFF;
        for (let i = 0; i < offs.length; i++) {
          const o = offs[i];
          let t2 = sq + o;
          while (!(t2 & 0x88)) {
            const q = b[t2];
            if (!q) { if (!capsOnly) out.push(mv(sq, t2, 0, 0)); }
            else { if ((q >> 3) === them) out.push(mv(sq, t2, F_CAP, 0)); break; }
            t2 += o;
          }
        }
      }
    }
    return out;
  };

  // Esegue la mossa; se lascia il proprio re sotto scacco la annulla e restituisce false.
  Position.prototype.make = function (m) {
    const b = this.b, us = this.turn, them = us ^ 1;
    const from = mFrom(m), to = mTo(m), fl = mFlags(m);
    const piece = b[from];
    const capSq = (fl & F_EP) ? (us === WHITE ? to - 16 : to + 16) : to;
    const cap = b[capSq];
    this.stack.push({ m: m, cap: cap, castle: this.castle, ep: this.ep, half: this.half, lo: this.lo, hi: this.hi });
    let lo = this.lo, hi = this.hi;
    lo ^= ZP_LO[piece * 128 + from]; hi ^= ZP_HI[piece * 128 + from];
    if (cap) { lo ^= ZP_LO[cap * 128 + capSq]; hi ^= ZP_HI[cap * 128 + capSq]; b[capSq] = 0; }
    b[from] = 0;
    const placed = (fl & F_PROMO) ? (mPromo(m) | (us << 3)) : piece;
    b[to] = placed;
    lo ^= ZP_LO[placed * 128 + to]; hi ^= ZP_HI[placed * 128 + to];
    if ((piece & 7) === KING) {
      this.kings[us] = to;
      if (fl & F_CASTLE) {
        let rf, rt;
        if (to > from) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; }
        const rook = b[rf];
        b[rf] = 0; b[rt] = rook;
        lo ^= ZP_LO[rook * 128 + rf] ^ ZP_LO[rook * 128 + rt];
        hi ^= ZP_HI[rook * 128 + rf] ^ ZP_HI[rook * 128 + rt];
      }
    }
    if (this.ep >= 0) { lo ^= ZE_LO[this.ep & 7]; hi ^= ZE_HI[this.ep & 7]; }
    this.ep = -1;
    if (fl & F_DOUBLE) {
      // La casa en passant conta solo se un pedone avversario può davvero catturare.
      const ep = PAWN | (them << 3);
      if ((!((to - 1) & 0x88) && b[to - 1] === ep) || (!((to + 1) & 0x88) && b[to + 1] === ep)) {
        this.ep = (from + to) >> 1;
        lo ^= ZE_LO[this.ep & 7]; hi ^= ZE_HI[this.ep & 7];
      }
    }
    const nc = this.castle & CASTLE_MASK[from] & CASTLE_MASK[to];
    if (nc !== this.castle) {
      lo ^= ZC_LO[this.castle] ^ ZC_LO[nc]; hi ^= ZC_HI[this.castle] ^ ZC_HI[nc];
      this.castle = nc;
    }
    this.half = ((piece & 7) === PAWN || cap) ? 0 : this.half + 1;
    if (us === BLACK) this.full++;
    this.turn = them;
    lo ^= ZT_LO; hi ^= ZT_HI;
    this.lo = lo; this.hi = hi;
    if (this.attacked(this.kings[us], them)) { this.unmake(); return false; }
    return true;
  };

  Position.prototype.unmake = function () {
    const u = this.stack.pop();
    const b = this.b, m = u.m;
    this.turn ^= 1;
    const us = this.turn;
    const from = mFrom(m), to = mTo(m), fl = mFlags(m);
    const piece = (fl & F_PROMO) ? (PAWN | (us << 3)) : b[to];
    b[from] = piece;
    b[to] = 0;
    if (fl & F_EP) b[us === WHITE ? to - 16 : to + 16] = u.cap;
    else b[to] = u.cap;
    if ((piece & 7) === KING) {
      this.kings[us] = from;
      if (fl & F_CASTLE) {
        let rf, rt;
        if (to > from) { rf = from + 3; rt = from + 1; } else { rf = from - 4; rt = from - 1; }
        b[rf] = b[rt]; b[rt] = 0;
      }
    }
    this.castle = u.castle; this.ep = u.ep; this.half = u.half;
    this.lo = u.lo; this.hi = u.hi;
    if (us === BLACK) this.full--;
  };

  // "Mossa nulla" usata solo dalla ricerca (passa il turno).
  Position.prototype.makeNull = function () {
    this.stack.push({ m: 0, cap: 0, castle: this.castle, ep: this.ep, half: this.half, lo: this.lo, hi: this.hi });
    if (this.ep >= 0) { this.lo ^= ZE_LO[this.ep & 7]; this.hi ^= ZE_HI[this.ep & 7]; }
    this.ep = -1;
    this.half++;
    this.turn ^= 1;
    this.lo ^= ZT_LO; this.hi ^= ZT_HI;
  };

  Position.prototype.unmakeNull = function () {
    const u = this.stack.pop();
    this.turn ^= 1;
    this.castle = u.castle; this.ep = u.ep; this.half = u.half; this.lo = u.lo; this.hi = u.hi;
  };

  Position.prototype.legalMoves = function () {
    const all = this.genMoves([], false), out = [];
    for (const m of all) { if (this.make(m)) { this.unmake(); out.push(m); } }
    return out;
  };

  // Quante volte la posizione attuale si è già presentata (dall'ultima mossa irreversibile).
  Position.prototype.repetitions = function () {
    const st = this.stack;
    const lim = Math.max(0, st.length - this.half);
    let n = 0;
    for (let i = st.length - 2; i >= lim; i -= 2) {
      const e = st[i];
      if (e.lo === this.lo && e.hi === this.hi && e.m !== 0) n++;
    }
    return n;
  };

  Position.prototype.insufficientMaterial = function () {
    const b = this.b;
    let minors = 0, bishopColors = 0, knights = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const t = b[sq] & 7;
      if (!t || t === KING) continue;
      if (t === PAWN || t === ROOK || t === QUEEN) return false;
      minors++;
      if (t === KNIGHT) knights++;
      else bishopColors |= 1 << (((sq >> 4) + (sq & 7)) & 1);
    }
    if (minors <= 1) return true;
    return knights === 0 && bishopColors !== 3;
  };

  Position.prototype.hasNonPawn = function (color) {
    const b = this.b;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (p && (p >> 3) === color) { const t = p & 7; if (t !== PAWN && t !== KING) return true; }
    }
    return false;
  };

  Position.prototype.uci = function (m) {
    const pr = mPromo(m);
    return sqName(mFrom(m)) + sqName(mTo(m)) + (pr ? ' nbrq'[pr - 1] : '');
  };

  Position.prototype.moveFromUci = function (s) {
    if (typeof s !== 'string' || !/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(s)) return 0;
    const legal = this.legalMoves();
    for (const m of legal) if (this.uci(m) === s) return m;
    // "e7e8" senza pezzo indicato = promozione a donna
    if (s.length === 4) for (const m of legal) if (this.uci(m) === s + 'q') return m;
    return 0;
  };

  // Notazione algebrica (es. Cf3, exd5, O-O, e8=D+). Pezzi in inglese: N B R Q K.
  Position.prototype.san = function (m, legal) {
    legal = legal || this.legalMoves();
    const b = this.b, from = mFrom(m), to = mTo(m), fl = mFlags(m);
    const piece = b[from], t = piece & 7;
    let s;
    if (fl & F_CASTLE) s = to > from ? 'O-O' : 'O-O-O';
    else if (t === PAWN) {
      s = (fl & F_CAP) ? FILES[from & 7] + 'x' + sqName(to) : sqName(to);
      if (fl & F_PROMO) s += '=' + 'NBRQ'[mPromo(m) - 2];
    } else {
      s = 'NBRQK'[t - 2];
      const others = legal.filter((o) => o !== m && mTo(o) === to && b[mFrom(o)] === piece);
      if (others.length) {
        const sameFile = others.some((o) => (mFrom(o) & 7) === (from & 7));
        const sameRank = others.some((o) => (mFrom(o) >> 4) === (from >> 4));
        if (!sameFile) s += FILES[from & 7];
        else if (!sameRank) s += (from >> 4) + 1;
        else s += sqName(from);
      }
      if (fl & F_CAP) s += 'x';
      s += sqName(to);
    }
    this.make(m);
    if (this.inCheck()) s += this.legalMoves().length ? '+' : '#';
    this.unmake();
    return s;
  };

  // Stato della partita: null se si continua, altrimenti { result, reason }.
  Position.prototype.status = function () {
    const legal = this.legalMoves();
    if (!legal.length) {
      if (this.inCheck()) return { result: this.turn === WHITE ? '0-1' : '1-0', reason: 'Scacco matto' };
      return { result: '1/2-1/2', reason: 'Stallo' };
    }
    if (this.insufficientMaterial()) return { result: '1/2-1/2', reason: 'Materiale insufficiente' };
    if (this.half >= 100) return { result: '1/2-1/2', reason: 'Regola delle 50 mosse' };
    if (this.repetitions() >= 2) return { result: '1/2-1/2', reason: 'Triplice ripetizione' };
    return null;
  };

  /* ------------------------------------------------------------------ */
  /* Valutazione                                                         */
  /* ------------------------------------------------------------------ */
  // Tabelle viste dal Bianco, prima riga = ottava traversa.
  const T_PAWN = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0];
  const T_PAWN_EG = [
    0, 0, 0, 0, 0, 0, 0, 0,
    80, 80, 80, 80, 80, 80, 80, 80,
    50, 50, 50, 50, 50, 50, 50, 50,
    30, 30, 30, 30, 30, 30, 30, 30,
    20, 20, 20, 20, 20, 20, 20, 20,
    10, 10, 10, 10, 10, 10, 10, 10,
    5, 5, 5, 5, 5, 5, 5, 5,
    0, 0, 0, 0, 0, 0, 0, 0];
  const T_KNIGHT = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50];
  const T_BISHOP = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20];
  const T_ROOK = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0];
  const T_QUEEN = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20];
  const T_KING_MG = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20];
  const T_KING_EG = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50];

  const VAL_MG = [0, 100, 320, 330, 500, 950, 0];
  const VAL_EG = [0, 120, 300, 320, 520, 950, 0];
  const PHASE = [0, 0, 1, 1, 2, 4, 0];
  const PASSED_MG = [0, 5, 10, 15, 25, 40, 60, 0];
  const PASSED_EG = [0, 10, 20, 35, 60, 100, 150, 0];

  // PST[pezzo * 128 + casa] con il materiale già incluso, per Bianco e Nero.
  const PST_MG = new Int16Array(16 * 128), PST_EG = new Int16Array(16 * 128);
  (function () {
    const mg = [null, T_PAWN, T_KNIGHT, T_BISHOP, T_ROOK, T_QUEEN, T_KING_MG];
    const eg = [null, T_PAWN_EG, T_KNIGHT, T_BISHOP, T_ROOK, T_QUEEN, T_KING_EG];
    for (let t = 1; t <= 6; t++) {
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const sq = r * 16 + f;
        const wi = (7 - r) * 8 + f, bi = r * 8 + f;
        PST_MG[t * 128 + sq] = VAL_MG[t] + mg[t][wi];
        PST_EG[t * 128 + sq] = VAL_EG[t] + eg[t][wi];
        PST_MG[(t | 8) * 128 + sq] = VAL_MG[t] + mg[t][bi];
        PST_EG[(t | 8) * 128 + sq] = VAL_EG[t] + eg[t][bi];
      }
    }
  })();

  const wMaxP = new Int8Array(10), bMinP = new Int8Array(10), wMinP = new Int8Array(10), bMaxP = new Int8Array(10);
  const wCnt = new Int8Array(10), bCnt = new Int8Array(10);

  // Punteggio dal punto di vista di chi deve muovere.
  function evaluate(pos) {
    const b = pos.b;
    let mg = 0, eg = 0, phase = 0;
    let wb = 0, bb = 0, wMat = 0, bMat = 0, wPawns = 0, bPawns = 0;
    // indici 1..8 = colonne a..h (0 e 9 sono sentinelle)
    wMaxP.fill(-1); bMaxP.fill(-1); wMinP.fill(8); bMinP.fill(8); wCnt.fill(0); bCnt.fill(0);
    const rooks = [];
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (!p) continue;
      const t = p & 7;
      if (p & 8) {
        mg -= PST_MG[p * 128 + sq]; eg -= PST_EG[p * 128 + sq];
        if (t === PAWN) { const f = (sq & 7) + 1, r = sq >> 4; bCnt[f]++; if (r > bMaxP[f]) bMaxP[f] = r; if (r < bMinP[f]) bMinP[f] = r; bPawns++; }
        else if (t !== KING) { bMat += VAL_MG[t]; if (t === BISHOP) bb++; if (t === ROOK) rooks.push(sq); }
      } else {
        mg += PST_MG[p * 128 + sq]; eg += PST_EG[p * 128 + sq];
        if (t === PAWN) { const f = (sq & 7) + 1, r = sq >> 4; wCnt[f]++; if (r > wMaxP[f]) wMaxP[f] = r; if (r < wMinP[f]) wMinP[f] = r; wPawns++; }
        else if (t !== KING) { wMat += VAL_MG[t]; if (t === BISHOP) wb++; if (t === ROOK) rooks.push(sq); }
      }
      phase += PHASE[t];
    }
    if (!wPawns && !bPawns && wMat <= 330 && bMat <= 330) return 0; // nessuno può vincere
    if (wb >= 2) { mg += 30; eg += 50; }
    if (bb >= 2) { mg -= 30; eg -= 50; }
    // struttura pedonale
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if ((p & 7) !== PAWN) continue;
      const f = (sq & 7) + 1, r = sq >> 4;
      if (p & 8) {
        if (!bCnt[f - 1] && !bCnt[f + 1]) { mg += 10; eg += 15; }
        // passato: nessun pedone bianco davanti (traverse più basse) sulle colonne vicine
        if (wMinP[f - 1] >= r && wMinP[f] >= r && wMinP[f + 1] >= r) { mg -= PASSED_MG[7 - r]; eg -= PASSED_EG[7 - r]; }
      } else {
        if (!wCnt[f - 1] && !wCnt[f + 1]) { mg -= 10; eg -= 15; }
        if (bMaxP[f - 1] <= r && bMaxP[f] <= r && bMaxP[f + 1] <= r) { mg += PASSED_MG[r]; eg += PASSED_EG[r]; }
      }
    }
    for (let f = 1; f <= 8; f++) {
      if (wCnt[f] > 1) { mg -= 10 * (wCnt[f] - 1); eg -= 20 * (wCnt[f] - 1); }
      if (bCnt[f] > 1) { mg += 10 * (bCnt[f] - 1); eg += 20 * (bCnt[f] - 1); }
    }
    for (const sq of rooks) {
      const f = (sq & 7) + 1, black = b[sq] & 8;
      const own = black ? bCnt[f] : wCnt[f], opp = black ? wCnt[f] : bCnt[f];
      const bonus = !own ? (!opp ? 20 : 10) : 0;
      if (black) mg -= bonus; else mg += bonus;
    }
    if (phase > 24) phase = 24;
    let score = ((mg * phase + eg * (24 - phase)) / 24) | 0;
    // Finali senza pedoni per chi difende: spinge il re avversario verso il bordo.
    if (phase <= 8) {
      const diff = wMat - bMat;
      if (diff >= 300 && !bPawns) score += mopUp(pos.kings[0], pos.kings[1]);
      else if (diff <= -300 && !wPawns) score -= mopUp(pos.kings[1], pos.kings[0]);
    }
    // Vantaggio minimo senza pedoni (es. torre contro alfiere): quasi patta.
    if (!wPawns && score > 0 && wMat - bMat < 400 && wMat < 1300) score >>= 2;
    if (!bPawns && score < 0 && bMat - wMat < 400 && bMat < 1300) score >>= 2;
    return (pos.turn === WHITE ? score : -score) + 10;
  }

  function mopUp(winK, loseK) {
    const lf = loseK & 7, lr = loseK >> 4, wf = winK & 7, wr = winK >> 4;
    const center = Math.max(3 - lf, lf - 4) + Math.max(3 - lr, lr - 4);
    const dist = Math.abs(lf - wf) + Math.abs(lr - wr);
    return 10 * center + 4 * (14 - dist);
  }

  /* ------------------------------------------------------------------ */
  /* Ricerca                                                             */
  /* ------------------------------------------------------------------ */
  const MATE = 30000, INF = 32000, MAX_PLY = 64;
  const TT_BITS = 19, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  const EXACT = 1, LOWER = 2, UPPER = 3;
  const PIECE_VAL = [0, 100, 320, 330, 500, 950, 20000];

  function Searcher() {
    this.ttLo = new Int32Array(TT_SIZE);
    this.ttHi = new Int32Array(TT_SIZE);
    this.ttMove = new Int32Array(TT_SIZE);
    this.ttScore = new Int16Array(TT_SIZE);
    this.ttDepth = new Int8Array(TT_SIZE);
    this.ttFlag = new Int8Array(TT_SIZE);
    this.killers = new Int32Array(MAX_PLY * 2 + 4);
    this.history = new Int32Array(16 * 128);
  }

  Searcher.prototype.orderScores = function (pos, moves, ttMove, ply) {
    const b = pos.b, scores = new Array(moves.length);
    const k0 = this.killers[ply * 2], k1 = this.killers[ply * 2 + 1];
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i], fl = mFlags(m);
      let s;
      if (m === ttMove) s = 2000000;
      else if (fl & F_CAP) {
        const victim = (fl & F_EP) ? PAWN : (b[mTo(m)] & 7);
        s = 1000000 + PIECE_VAL[victim] * 10 - (b[mFrom(m)] & 7);
        if (fl & F_PROMO) s += mPromo(m) * 1000;
      } else if (fl & F_PROMO) s = mPromo(m) === QUEEN ? 950000 : -100000;
      else if (m === k0) s = 800000;
      else if (m === k1) s = 700000;
      else s = Math.min(this.history[b[mFrom(m)] * 128 + mTo(m)], 600000);
      scores[i] = s;
    }
    return scores;
  };

  function pickNext(moves, scores, i) {
    let best = i;
    for (let j = i + 1; j < moves.length; j++) if (scores[j] > scores[best]) best = j;
    if (best !== i) {
      let t = moves[i]; moves[i] = moves[best]; moves[best] = t;
      t = scores[i]; scores[i] = scores[best]; scores[best] = t;
    }
    return moves[i];
  }

  Searcher.prototype.timeUp = function () {
    if ((++this.nodes & 2047) === 0 && this.canStop && Date.now() > this.deadline) this.stop = true;
    return this.stop;
  };

  Searcher.prototype.qsearch = function (pos, alpha, beta, ply) {
    if (this.timeUp()) return 0;
    const stand = evaluate(pos);
    if (ply >= MAX_PLY) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const moves = pos.genMoves([], true);
    const scores = this.orderScores(pos, moves, 0, Math.min(ply, MAX_PLY));
    let best = stand;
    for (let i = 0; i < moves.length; i++) {
      const m = pickNext(moves, scores, i);
      const fl = mFlags(m);
      if (!(fl & F_PROMO)) {
        const victim = (fl & F_EP) ? PAWN : (pos.b[mTo(m)] & 7);
        if (stand + PIECE_VAL[victim] + 200 < alpha) continue; // anche vincendo il pezzo non basta
      }
      if (!pos.make(m)) continue;
      const s = -this.qsearch(pos, -beta, -alpha, ply + 1);
      pos.unmake();
      if (this.stop) return 0;
      if (s > best) { best = s; if (s > alpha) { alpha = s; if (s >= beta) break; } }
    }
    return best;
  };

  Searcher.prototype.search = function (pos, depth, alpha, beta, ply, canNull) {
    if (this.timeUp()) return 0;
    const inCheck = pos.inCheck();
    if (ply > 0) {
      if (pos.half >= 100 || pos.repetitions() > 0) return 0;
      if (alpha < -MATE + ply) alpha = -MATE + ply;
      if (beta > MATE - ply - 1) beta = MATE - ply - 1;
      if (alpha >= beta) return alpha;
      if (ply >= MAX_PLY) return evaluate(pos);
    }
    if (inCheck) depth++;
    if (depth <= 0) return this.qsearch(pos, alpha, beta, ply);

    const idx = pos.lo & TT_MASK;
    let ttMove = 0;
    if (this.ttLo[idx] === pos.lo && this.ttHi[idx] === pos.hi) {
      ttMove = this.ttMove[idx];
      if (ply > 0 && this.ttDepth[idx] >= depth) {
        let s = this.ttScore[idx];
        if (s > MATE - 500) s -= ply; else if (s < -MATE + 500) s += ply;
        const f = this.ttFlag[idx];
        if (f === EXACT || (f === LOWER && s >= beta) || (f === UPPER && s <= alpha)) return s;
      }
    }
    const pvNode = beta - alpha > 1;
    if (!inCheck && !pvNode && ply > 0) {
      const ev = evaluate(pos);
      if (depth <= 3 && ev - 120 * depth >= beta && Math.abs(beta) < MATE - 500) return ev;
      if (canNull && depth >= 3 && ev >= beta && pos.hasNonPawn(pos.turn)) {
        pos.makeNull();
        const s = -this.search(pos, depth - 1 - (depth > 6 ? 3 : 2), -beta, -beta + 1, ply + 1, false);
        pos.unmakeNull();
        if (this.stop) return 0;
        if (s >= beta) return s >= MATE - 500 ? beta : s;
      }
    }

    const moves = pos.genMoves([], false);
    const scores = this.orderScores(pos, moves, ttMove, ply);
    const origAlpha = alpha;
    let best = -INF, bestMove = 0, legal = 0;
    for (let i = 0; i < moves.length; i++) {
      const m = pickNext(moves, scores, i);
      if (!pos.make(m)) continue;
      legal++;
      const quiet = !(mFlags(m) & (F_CAP | F_PROMO));
      let s;
      if (legal === 1) s = -this.search(pos, depth - 1, -beta, -alpha, ply + 1, true);
      else {
        let r = 0;
        if (depth >= 3 && legal > 3 && quiet && !inCheck && scores[i] < 700000 && !pos.inCheck()) r = (legal > 10 && depth >= 6) ? 2 : 1;
        s = -this.search(pos, depth - 1 - r, -alpha - 1, -alpha, ply + 1, true);
        if (s > alpha && r > 0 && !this.stop) s = -this.search(pos, depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (s > alpha && s < beta && !this.stop) s = -this.search(pos, depth - 1, -beta, -alpha, ply + 1, true);
      }
      pos.unmake();
      if (this.stop) return 0;
      if (s > best) {
        best = s; bestMove = m;
        if (ply === 0) { this.rootBest = m; this.rootScore = s; }
        if (s > alpha) {
          alpha = s;
          if (s >= beta) {
            if (quiet) {
              if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; }
              this.history[pos.b[mFrom(m)] * 128 + mTo(m)] += depth * depth;
            }
            break;
          }
        }
      }
    }
    if (!legal) return inCheck ? -MATE + ply : 0;
    let st = best;
    if (st > MATE - 500) st += ply; else if (st < -MATE + 500) st -= ply;
    this.ttLo[idx] = pos.lo; this.ttHi[idx] = pos.hi;
    this.ttMove[idx] = bestMove; this.ttScore[idx] = st; this.ttDepth[idx] = depth;
    this.ttFlag[idx] = best >= beta ? LOWER : best > origAlpha ? EXACT : UPPER;
    return best;
  };

  // Ricerca normale a tempo (livelli alti).
  Searcher.prototype.think = function (pos, timeMs, maxDepth) {
    this.killers.fill(0);
    this.history.fill(0);
    this.nodes = 0; this.stop = false; this.canStop = false;
    const start = Date.now();
    this.deadline = start + timeMs;
    const legal = pos.legalMoves();
    if (!legal.length) return null;
    let best = legal[0], bestScore = 0, depthDone = 0;
    if (legal.length === 1) return { move: best, score: evaluate(pos), depth: 0, nodes: 0 };
    for (let d = 1; d <= maxDepth; d++) {
      this.rootBest = 0;
      this.canStop = d > 1;
      const s = this.search(pos, d, -INF, INF, 0, false);
      if (this.stop) { if (this.rootBest) { best = this.rootBest; bestScore = this.rootScore; } break; }
      best = this.rootBest || best; bestScore = s; depthDone = d;
      if (Math.abs(s) > MATE - 100 && d >= 4) break;
      if (Date.now() - start > timeMs * 0.5) break;
    }
    return { move: best, score: bestScore, depth: depthDone, nodes: this.nodes };
  };

  // Livelli bassi: valuta ogni mossa e sbaglia apposta aggiungendo un po' di "rumore".
  Searcher.prototype.thinkNoisy = function (pos, depth, noise, randomChance) {
    this.killers.fill(0);
    this.history.fill(0);
    this.nodes = 0; this.stop = false; this.canStop = false; this.deadline = Infinity;
    const legal = pos.legalMoves();
    if (!legal.length) return null;
    if (Math.random() < randomChance) {
      return { move: legal[(Math.random() * legal.length) | 0], score: 0, depth: 0, nodes: 0 };
    }
    let best = legal[0], bestNoisy = -Infinity, bestScore = 0;
    for (const m of legal) {
      pos.make(m);
      let s;
      if (depth <= 1) s =-this.qsearch(pos, -INF, INF, 1);
      else s = -this.search(pos, depth - 1, -INF, INF, 1, true);
      pos.unmake();
      const noisy = s + (Math.random() * 2 - 1) * noise;
      if (noisy > bestNoisy) { bestNoisy = noisy; best = m; bestScore = s; }
    }
    return { move: best, score: bestScore, depth: depth, nodes: this.nodes };
  };

  /* ------------------------------------------------------------------ */
  /* Livelli e aperture                                                  */
  /* ------------------------------------------------------------------ */
  const LEVELS = [
    { name: 'Principiante', desc: 'Sbaglia spesso: ideale per imparare', depth: 1, noise: 220, random: 0.3 },
    { name: 'Facile', desc: 'Vede solo le minacce più semplici', depth: 2, noise: 110, random: 0.1 },
    { name: 'Intermedio', desc: 'Gioca con attenzione, qualche svista', depth: 3, noise: 40, random: 0, book: true },
    { name: 'Avanzato', desc: 'Calcola alcune mosse in avanti', time: 700, maxDepth: 6, book: true },
    { name: 'Esperto', desc: 'Difficile da battere', time: 1600, maxDepth: 12, book: true },
    { name: 'Maestro', desc: 'Il massimo: pensa più a lungo', time: 3500, maxDepth: 40, book: true }
  ];

  // Piccolo libro di aperture classiche, per variare le partite.
  const BOOK = [
    'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7',
    'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4',
    'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8e7 e1g1 e8g8',
    'e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 d4c6 b7c6',
    'e2e4 e7e5 g1f3 g8f6 f3e5 d7d6 e5f3 f6e4 d2d4 d6d5',
    'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6',
    'e2e4 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4 g8f6 b1c3 e7e5',
    'e2e4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7 d2d3 d7d6',
    'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7 e4e5 f6d7',
    'e2e4 e7e6 d2d4 d7d5 e4e5 c7c5 c2c3 b8c6 g1f3 d8b6',
    'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6',
    'e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6 g1f3 c8f5',
    'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8',
    'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5',
    'd2d4 d7d5 g1f3 g8f6 c1f4 e7e6 e2e3 c7c5 c2c3 b8c6',
    'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8',
    'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8 f1d3 d7d5',
    'd2d4 g8f6 c2c4 e7e6 g1f3 b7b6 g2g3 c8b7 f1g2 f8e7',
    'c2c4 e7e5 b1c3 g8f6 g1f3 b8c6 g2g3 d7d5 c4d5 f6d5',
    'c2c4 g8f6 b1c3 e7e6 e2e4 d7d5 e4e5 d5d4 e5f6 d4c3',
    'g1f3 d7d5 g2g3 g8f6 f1g2 e7e6 e1g1 f8e7 d2d3 e8g8',
    'g1f3 g8f6 c2c4 c7c5 b1c3 b8c6 g2g3 g7g6 f1g2 f8g7'
  ].map((l) => l.split(' '));

  function bookMove(history) {
    const options = [];
    for (const line of BOOK) {
      if (line.length <= history.length) continue;
      let ok = true;
      for (let i = 0; i < history.length; i++) if (line[i] !== history[i]) { ok = false; break; }
      if (ok) options.push(line[history.length]);
    }
    return options.length ? options[(Math.random() * options.length) | 0] : null;
  }

  function Engine() { this.searcher = new Searcher(); }

  // startFen + mosse giocate (uci) -> mossa scelta dal computer.
  Engine.prototype.bestMove = function (startFen, moves, levelIndex, opts) {
    opts = opts || {};
    const pos = new Position(startFen || START_FEN);
    for (const u of moves || []) {
      const m = pos.moveFromUci(u);
      if (!m) throw new Error('Mossa non valida: ' + u);
      pos.make(m);
    }
    const lv = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex | 0))];
    if (lv.book && !opts.noBook && (startFen || START_FEN) === START_FEN) {
      const bm = bookMove(moves || []);
      const m = bm && pos.moveFromUci(bm);
      if (m) return { uci: bm, san: pos.san(m), score: 0, depth: 0, book: true };
    }
    const res = opts.time ? this.searcher.think(pos, opts.time, opts.maxDepth || 40)
      : lv.time ? this.searcher.think(pos, lv.time, lv.maxDepth)
        : this.searcher.thinkNoisy(pos, lv.depth, lv.noise, lv.random);
    if (!res) return null;
    return { uci: pos.uci(res.move), san: pos.san(res.move), score: res.score, depth: res.depth, nodes: res.nodes };
  };

  const api = {
    Position, Engine, LEVELS, BOOK, START_FEN, evaluate,
    sqName, sqFrom, mFrom, mTo, mPromo, mFlags,
    F_CAP, F_EP, F_CASTLE, F_DOUBLE, F_PROMO,
    PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, WHITE, BLACK, MATE
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scacchi = api;

  // Dentro un Web Worker: risponde alle richieste della pagina.
  if (typeof window === 'undefined' && typeof importScripts === 'function') {
    const engine = new Engine();
    root.onmessage = function (e) {
      const d = e.data || {};
      let res = null, error = null;
      try { res = engine.bestMove(d.startFen, d.moves, d.level, d.opts); } catch (err) { error = String(err && err.message || err); }
      root.postMessage({ id: d.id, res: res, error: error });
    };
  }
})(typeof self !== 'undefined' ? self : this);

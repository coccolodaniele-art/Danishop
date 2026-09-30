/* Interfaccia del gioco: menu, scacchiera, partita contro il computer,
   due giocatori sullo stesso dispositivo e partite online. */
(function () {
  'use strict';

  const C = window.Scacchi;
  const $ = (id) => document.getElementById(id);

  // Indirizzo del server online (Deno Deploy). Vuoto = modalità online non ancora attiva.
  const SERVER_URL = 'wss://shy-lamb-1902.coccolodaniele-art.deno.net';

  function serverUrl() {
    const q = new URLSearchParams(location.search).get('server');
    if (q && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return q; // solo per le prove in locale
    return SERVER_URL;
  }

  /* ---------------- Memoria del browser ---------------- */
  function makeStore(getStorage) {
    return {
      get(k, d) { try { const v = getStorage().getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set(k, v) { try { getStorage().setItem(k, JSON.stringify(v)); } catch (e) { /* memoria non disponibile */ } },
      del(k) { try { getStorage().removeItem(k); } catch (e) { /* */ } }
    };
  }
  const store = makeStore(() => localStorage);
  const sess = makeStore(() => sessionStorage);

  const settings = Object.assign({ sound: true, hints: true, coords: true, autoQueen: false, theme: 'legno', flipLocal: false },
    store.get('scacchi_impostazioni', {}));
  const saveSettings = () => store.set('scacchi_impostazioni', settings);

  const THEMES = {
    legno: ['#f0d9b5', '#b58863'],
    verde: ['#eeeed2', '#769656'],
    blu: ['#dee3e6', '#8ca2ad'],
    viola: ['#e8e0f3', '#9b7cc4'],
    notte: ['#c9ccd6', '#5c6479']
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- Pezzi (disegno "cburnett" di Colin M.L. Burnett, licenza GPL/BSD/CC BY-SA) ---------------- */
  const SW = 'stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  function pieceSvg(code) {
    const w = code[0] === 'w', f = w ? '#fff' : '#000', l = w ? '#000' : '#fff';
    let g;
    switch (code[1]) {
      case 'P':
        g = `<path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="${f}" ${SW}/>`;
        break;
      case 'R':
        g = `<g fill="${f}" ${SW}><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="butt"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none" stroke-linejoin="miter"/></g>` +
          (w ? '' : `<path d="M12.5 35.5h20M13 31.5h19M14 29.5h17M14 17h17M11 14h23" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="miter"/>`);
        break;
      case 'N':
        g = `<g fill="none" ${SW}><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="${f}"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.99 2.5-3c1 0 1 3 1 3" fill="${f}"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="${l}" stroke="${l}"/><path d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0z" transform="matrix(.866 .5 -.5 .866 9.693 -5.173)" fill="${l}" stroke="${l}"/>` +
          (w ? '' : `<path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#fff" stroke="none"/>`) + '</g>';
        break;
      case 'B':
        g = `<g fill="none" ${SW}><g fill="${f}" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="${l}" stroke-linejoin="miter"/></g>`;
        break;
      case 'Q':
        g = `<g fill="${f}" ${SW}><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="${l}"/></g>`;
        break;
      case 'K':
        g = `<g fill="none" ${SW}><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="${f}" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="${f}"/><path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" stroke="${l}"/>` +
          (w ? '' : `<path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5v2.1-2.1C20 18 10.85 14 6.97 19.85 4.5 25.5 13 29.5 13 29.5" stroke="#fff"/>`) + '</g>';
        break;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">${g}</svg>`;
  }
  const PIECE_URL = {};
  (function () {
    let css = '';
    for (const c of 'wb') for (const t of 'PNBRQK') {
      const code = c + t;
      PIECE_URL[code] = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pieceSvg(code)) + '")';
      css += `.p-${code}{background-image:${PIECE_URL[code]}}`;
    }
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  })();
  const pieceCode = (p) => ((p >> 3) ? 'b' : 'w') + ' PNBRQK'[p & 7];

  /* ---------------- Suoni ---------------- */
  let actx = null;
  function tone(freq, start, dur, vol, type) {
    const t = actx.currentTime + start;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function sound(kind) {
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      if (kind === 'move') { tone(420, 0, 0.09, 0.25, 'triangle'); tone(210, 0, 0.06, 0.15, 'sine'); }
      else if (kind === 'capture') { tone(300, 0, 0.12, 0.3, 'triangle'); tone(150, 0.01, 0.12, 0.25, 'square'); }
      else if (kind === 'check') { tone(880, 0, 0.12, 0.18, 'triangle'); tone(660, 0.1, 0.16, 0.18, 'triangle'); }
      else if (kind === 'start') { tone(523, 0, 0.15, 0.15); tone(784, 0.1, 0.2, 0.15); }
      else if (kind === 'end') { tone(523, 0, 0.2, 0.18); tone(659, 0.13, 0.2, 0.18); tone(784, 0.26, 0.35, 0.18); }
      else if (kind === 'notify') { tone(988, 0, 0.14, 0.18); tone(1319, 0.12, 0.25, 0.18); }
      else if (kind === 'low') { tone(1000, 0, 0.06, 0.12, 'square'); }
    } catch (e) { /* audio non disponibile */ }
  }

  /* ---------------- Utilità interfaccia ---------------- */
  function toast(text, bad) {
    const el = document.createElement('div');
    el.className = 'toast' + (bad ? ' bad' : '');
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  let modalOnClose = null;
  function openModal(html, onClose) {
    $('modalBox').innerHTML = html;
    $('modal').hidden = false;
    modalOnClose = onClose || null;
    const first = $('modalBox').querySelector('button.primary, button, input');
    if (first) setTimeout(() => first.focus(), 30);
  }
  function closeModal() {
    if ($('modal').hidden) return;
    $('modal').hidden = true;
    $('modalBox').innerHTML = '';
    const cb = modalOnClose; modalOnClose = null;
    if (cb) cb();
  }
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  function confirmBox(title, text, yesLabel, onYes) {
    openModal(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="modal-actions"><button class="btn" data-a="no">Annulla</button><button class="btn primary" data-a="yes">${esc(yesLabel)}</button></div>`);
    $('modalBox').querySelector('[data-a=no]').onclick = closeModal;
    $('modalBox').querySelector('[data-a=yes]').onclick = () => { closeModal(); onYes(); };
  }

  const itSan = (san) => san.replace(/[NBRQK]/g, (c) => ({ N: 'C', B: 'A', R: 'T', Q: 'D', K: 'R' }[c]));

  function showScreen(name) {
    for (const s of ['scrMenu', 'scrLobby', 'scrGame']) $(s).hidden = s !== name;
    $('btnHome').hidden = name === 'scrMenu';
    window.scrollTo(0, 0);
  }

  function applyTheme() {
    const t = THEMES[settings.theme] || THEMES.legno;
    document.documentElement.style.setProperty('--light', t[0]);
    document.documentElement.style.setProperty('--dark', t[1]);
  }

  /* ---------------- Computer (Web Worker) ---------------- */
  let worker = null, workerFailed = false, reqId = 0, localEngine = null;
  const pending = new Map();
  function getWorker() {
    if (worker || workerFailed) return worker;
    try {
      worker = new Worker('motore.js');
      worker.onmessage = (e) => { const cb = pending.get(e.data.id); pending.delete(e.data.id); if (cb) cb(e.data); };
      worker.onerror = (e) => {
        e.preventDefault && e.preventDefault();
        workerFailed = true; worker = null;
        const list = [...pending.entries()]; pending.clear();
        for (const [, cb] of list) cb({ retry: true });
      };
    } catch (e) { workerFailed = true; worker = null; }
    return worker;
  }
  function askEngine(payload) {
    return new Promise((resolve) => {
      const id = ++reqId;
      const w = getWorker();
      const runHere = () => setTimeout(() => {
        try { localEngine = localEngine || new C.Engine(); resolve({ id, res: localEngine.bestMove(payload.startFen, payload.moves, payload.level, payload.opts) }); }
        catch (err) { resolve({ id, error: String(err) }); }
      }, 20);
      if (!w) return runHere();
      pending.set(id, (d) => { if (d.retry) runHere(); else resolve(d); });
      w.postMessage(Object.assign({ id }, payload));
    });
  }
  function cancelEngine() {
    if (worker && pending.size) {
      worker.terminate(); worker = null;
      const list = [...pending.values()]; pending.clear();
      for (const cb of list) cb({ cancelled: true });
    }
  }

  /* ---------------- Stato della partita ---------------- */
  let G = null;
  const LV = C.LEVELS;

  function newGame(o) {
    cancelEngine();
    const startFen = o.startFen || C.START_FEN;
    G = {
      id: Math.random().toString(36).slice(2),
      mode: o.mode,                 // 'ai' | 'local' | 'online'
      startFen,
      pos: new C.Position(startFen),
      moves: [],                    // { uci, san, color, captured, from, to }
      fens: [startFen],
      view: null,                   // null = posizione attuale, altrimenti numero di semimosse
      myColor: o.myColor ?? null,   // 0 bianco, 1 nero, null = entrambi (stesso dispositivo)
      level: o.level || 0,
      orientation: o.myColor === 1 ? 1 : 0,
      result: null,
      sel: -1,
      hint: null,
      thinking: false,
      names: o.names,
      clock: o.tc ? { base: o.tc[0] * 60000, inc: o.tc[1] * 1000, w: o.tc[0] * 60000, b: o.tc[0] * 60000, running: null, since: 0 } : null,
      online: o.online || null,     // { g, opp: {id, name}, tc }
      drawOffered: false
    };
    buildBoard();
    $('chat').hidden = o.mode !== 'online';
    setBanner(null);
    closePromo();
    showScreen('scrGame');
    renderAll();
  }

  function replayMoves(ucis) {
    G.pos = new C.Position(G.startFen);
    G.moves = []; G.fens = [G.startFen];
    for (const u of ucis) {
      const m = G.pos.moveFromUci(u);
      if (!m) return false;
      pushMove(m);
    }
    return true;
  }

  function pushMove(m) {
    const pos = G.pos, legal = pos.legalMoves();
    const from = C.mFrom(m), to = C.mTo(m), fl = C.mFlags(m);
    const captured = (fl & C.F_EP) ? (C.PAWN | ((pos.turn ^ 1) << 3)) : pos.b[to];
    const rec = { uci: pos.uci(m), san: pos.san(m, legal), color: pos.turn, captured, from, to, castle: !!(fl & C.F_CASTLE) };
    pos.make(m);
    G.moves.push(rec);
    G.fens.push(pos.fen());
    return rec;
  }

  const humanTurn = () => G && !G.result && !G.thinking &&
    (G.mode === 'local' || G.pos.turn === G.myColor) && (G.mode !== 'online' || !G.online.waiting);

  // Esegue una mossa (del giocatore, del computer o arrivata dalla rete).
  function playMove(m, opts) {
    opts = opts || {};
    const mover = G.pos.turn;
    const rec = pushMove(m);
    G.sel = -1; G.view = null; G.hint = null;
    if (G.clock) {
      const k = G.clock, now = Date.now(), key = mover ? 'b' : 'w';
      if (k.running === key) k[key] = k[key] - (now - k.since) + k.inc;
      if (opts.left != null) k[key] = opts.left;
      k.running = G.moves.length >= 2 ? (mover ? 'w' : 'b') : null;
      k.since = now;
    }
    if (G.mode === 'local' && settings.flipLocal) G.orientation = G.pos.turn;
    if (G.pos.inCheck()) sound('check'); else sound(rec.captured ? 'capture' : 'move');
    render({ anim: rec });
    if (G.mode === 'online' && !opts.remote) {
      netGame({ k: 'move', ply: G.moves.length, uci: rec.uci, left: G.clock ? G.clock[mover ? 'b' : 'w'] : null });
    }
    const st = G.pos.status();
    if (st) endGame(st.result, st.reason);
    saveGame();
    if (G.mode === 'ai' && !G.result && G.pos.turn !== G.myColor) computerMove();
  }

  async function computerMove() {
    const game = G, ply = G.moves.length;
    G.thinking = true;
    renderStatus(); renderActions();
    const t0 = Date.now();
    const r = await askEngine({ startFen: G.startFen, moves: G.moves.map((x) => x.uci), level: G.level });
    if (r.cancelled || G !== game || G.moves.length !== ply || G.result) return;
    const wait = 350 - (Date.now() - t0);
    if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
    if (G !== game || G.moves.length !== ply || G.result) return;
    G.thinking = false;
    const m = r.res && G.pos.moveFromUci(r.res.uci);
    if (!m) { toast('Il computer non è riuscito a muovere.', true); renderAll(); return; }
    playMove(m);
  }

  function endGame(result, reason) {
    if (G.result) return;
    G.result = { result, reason };
    G.thinking = false;
    if (G.clock) { const k = G.clock; if (k.running) { k[k.running] -= Date.now() - k.since; k.running = null; } }
    cancelEngine();
    sound('end');
    if (G.mode === 'ai') {
      const stats = store.get('scacchi_statistiche', {});
      const s = stats[G.level] || { v: 0, p: 0, s: 0 };
      const mine = G.myColor === 0 ? '1-0' : '0-1';
      if (result === '1/2-1/2') s.p++; else if (result === mine) s.v++; else s.s++;
      stats[G.level] = s;
      store.set('scacchi_statistiche', stats);
      store.del('scacchi_partita_pc');
    }
    if (G.mode === 'online') {
      netSetStatus('libero');
      sess.del('scacchi_online');
      G.online.offerIn = null;
    }
    renderAll();
    const game = G;
    setTimeout(() => { if (G === game) showEndModal(); }, 650);
  }

  function resultText() {
    const r = G.result;
    if (r.result === '1/2-1/2') return { icon: '🤝', title: 'Patta' };
    const winner = r.result === '1-0' ? 0 : 1;
    if (G.mode === 'local') return { icon: '🏆', title: 'Vince il ' + (winner ? 'Nero' : 'Bianco') };
    return winner === G.myColor ? { icon: '🏆', title: 'Hai vinto!' } : { icon: '😔', title: 'Hai perso' };
  }

  function showEndModal() {
    if (!G || !G.result) return;
    const t = resultText();
    let actions = '';
    if (G.mode === 'online') {
      actions = (G.online.oppLeft ? '' : `<button class="btn primary" data-a="rematch">Chiedi la rivincita</button>`) +
        `<button class="btn" data-a="lobby">Torna alla sala</button>`;
    } else {
      actions = `<button class="btn primary" data-a="again">Nuova partita</button>`;
    }
    actions += `<button class="btn" data-a="pgn">Copia la partita (PGN)</button><button class="btn" data-a="close">Rivedi la scacchiera</button>`;
    openModal(`<div class="big">${t.icon}</div><h2 class="center">${esc(t.title)}</h2>
      <p class="center muted">${esc(G.result.reason)} · ${G.result.result.replace('1/2-1/2', '½-½')}</p>
      <div class="modal-actions stack">${actions}</div>`);
    const box = $('modalBox');
    const on = (a, fn) => { const b = box.querySelector(`[data-a=${a}]`); if (b) b.onclick = fn; };
    on('close', closeModal);
    on('pgn', () => { closeModal(); showPgn(); });
    on('again', () => { closeModal(); restartSame(); });
    on('rematch', () => { closeModal(); offerRematch(); });
    on('lobby', () => { closeModal(); leaveOnlineGame(); });
  }

  function restartSame() {
    if (G.mode === 'ai') newGame({ mode: 'ai', level: G.level, myColor: G.myColor, names: G.names });
    else newGame({ mode: 'local', names: G.names });
    sound('start');
    if (G.mode === 'ai' && G.myColor === 1) computerMove();
  }

  function pgnText() {
    const d = new Date();
    const date = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    const res = G.result ? G.result.result : '*';
    const tag = (k, v) => `[${k} "${String(v).replace(/["\\]/g, '')}"]\n`;
    let s = tag('Event', G.mode === 'online' ? 'Partita online' : G.mode === 'ai' ? 'Partita contro il computer' : 'Partita amichevole') +
      tag('Site', location.hostname || 'Scacchi') + tag('Date', date) + tag('White', G.names[0]) + tag('Black', G.names[1]) + tag('Result', res);
    if (G.startFen !== C.START_FEN) s += tag('SetUp', '1') + tag('FEN', G.startFen);
    if (G.result) s += tag('Termination', G.result.reason);
    s += '\n';
    const parts = [];
    G.moves.forEach((m, i) => { if (i % 2 === 0) parts.push((i / 2 + 1) + '.'); parts.push(m.san); });
    parts.push(res);
    let line = '';
    for (const p of parts) { if ((line + ' ' + p).length > 78) { s += line.trim() + '\n'; line = ''; } line += ' ' + p; }
    return s + line.trim() + '\n';
  }

  function showPgn() {
    const txt = pgnText();
    openModal(`<h2>La partita in formato PGN</h2><p class="muted small">Puoi incollarla in qualsiasi programma o sito di scacchi per analizzarla.</p>
      <textarea readonly id="pgnArea">${esc(txt)}</textarea>
      <div class="modal-actions"><button class="btn" data-a="close">Chiudi</button><button class="btn primary" data-a="copy">Copia</button></div>`);
    $('modalBox').querySelector('[data-a=close]').onclick = closeModal;
    $('modalBox').querySelector('[data-a=copy]').onclick = async () => {
      try { await navigator.clipboard.writeText(txt); toast('Partita copiata!'); }
      catch (e) { $('pgnArea').select(); document.execCommand && document.execCommand('copy'); toast('Partita copiata!'); }
    };
  }

  function saveGame() {
    if (G.mode !== 'ai' || G.result) return;
    if (!G.moves.length) { store.del('scacchi_partita_pc'); return; }
    store.set('scacchi_partita_pc', { startFen: G.startFen, moves: G.moves.map((m) => m.uci), level: G.level, myColor: G.myColor });
  }

  /* ---------------- Scacchiera ---------------- */
  let squares = [];
  function buildBoard() {
    const board = $('board');
    board.innerHTML = '';
    squares = [];
    for (let i = 0; i < 64; i++) {
      const el = document.createElement('div');
      el.className = 'sq';
      el.setAttribute('role', 'gridcell');
      board.appendChild(el);
      squares.push(el);
    }
  }
  // casa 0x88 <-> posizione sullo schermo (0..63 da in alto a sinistra)
  function sqAt(i) {
    const row = i >> 3, col = i & 7;
    return G.orientation === 0 ? (7 - row) * 16 + col : row * 16 + (7 - col);
  }
  function indexOf(sq) {
    const r = sq >> 4, f = sq & 7;
    return G.orientation === 0 ? (7 - r) * 8 + f : r * 8 + (7 - f);
  }

  function viewPos() {
    if (G.view === null) return G.pos;
    return new C.Position(G.fens[G.view]);
  }

  function targetsFrom(sq) {
    if (sq < 0) return [];
    return G.pos.legalMoves().filter((m) => C.mFrom(m) === sq);
  }

  function render(opts) {
    opts = opts || {};
    const pos = viewPos();
    const ply = G.view === null ? G.moves.length : G.view;
    const last = ply > 0 ? G.moves[ply - 1] : null;
    const targets = settings.hints && G.view === null ? targetsFrom(G.sel) : [];
    const tset = new Map(targets.map((m) => [C.mTo(m), m]));
    const checkSq = pos.inCheck() ? pos.kings[pos.turn] : -1;
    for (let i = 0; i < 64; i++) {
      const sq = sqAt(i), el = squares[i], r = sq >> 4, f = sq & 7;
      el.dataset.sq = sq;
      let cls = 'sq' + (((r + f) & 1) ? '' : ' d');
      if (last && (sq === last.from || sq === last.to)) cls += ' last';
      if (sq === G.sel && G.view === null) cls += ' sel';
      if (G.hint && (sq === G.hint.from || sq === G.hint.to)) cls += ' hintsq';
      if (sq === checkSq) cls += ' check';
      el.className = cls;
      let html = '';
      if (settings.coords) {
        if ((i & 7) === 0) html += `<span class="coord r">${r + 1}</span>`;
        if ((i >> 3) === 7) html += `<span class="coord f">${'abcdefgh'[f]}</span>`;
      }
      const p = pos.b[sq];
      if (p) html += `<div class="pc p-${pieceCode(p)}"></div>`;
      if (tset.has(sq)) html += `<span class="tg${p || (C.mFlags(tset.get(sq)) & C.F_EP) ? ' cap' : ''}"></span>`;
      el.innerHTML = html;
      el.setAttribute('aria-label', C.sqName(sq) + (p ? ' ' + pieceName(p) : ''));
    }
    if (opts.anim) animateMove(opts.anim);
    renderBars(pos, ply);
    renderMoves();
    renderStatus();
    renderActions();
  }
  const renderAll = () => render();

  function pieceName(p) {
    return ['', 'pedone', 'cavallo', 'alfiere', 'torre', 'donna', 're'][p & 7] + ((p >> 3) ? ' nero' : ' bianco');
  }

  function animateMove(rec) {
    const slide = (from, to) => {
      const el = squares[indexOf(to)].querySelector('.pc');
      if (!el) return;
      const a = indexOf(from), b = indexOf(to);
      const dx = ((a & 7) - (b & 7)) * 100, dy = ((a >> 3) - (b >> 3)) * 100;
      el.classList.add('moving');
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}%, ${dy}%)`;
      void el.offsetWidth;
      el.style.transition = 'transform .18s ease-out';
      el.style.transform = '';
      setTimeout(() => el.classList.remove('moving'), 220);
    };
    slide(rec.from, rec.to);
    if (rec.castle) {
      const rf = rec.to > rec.from ? rec.from + 3 : rec.from - 4;
      const rt = rec.to > rec.from ? rec.from + 1 : rec.from - 1;
      slide(rf, rt);
    }
  }

  /* Barre dei giocatori: nome, pezzi catturati, orologio */
  const VALUE = [0, 1, 3, 3, 5, 9, 0];
  function renderBars(pos, ply) {
    const material = [0, 0];
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = pos.b[sq];
      if (p) material[p >> 3] += VALUE[p & 7];
    }
    const caps = [[], []];
    for (let i = 0; i < ply; i++) { const m = G.moves[i]; if (m.captured) caps[m.color].push(m.captured); }
    const bottom = G.orientation, top = bottom ^ 1;
    const liveTurn = !G.result && G.view === null ? G.pos.turn : -1;
    for (const [elId, color] of [['barTop', top], ['barBottom', bottom]]) {
      const el = $(elId);
      const name = G.names[color];
      let sub = color ? 'Nero' : 'Bianco';
      if (G.mode === 'ai' && color !== G.myColor) sub += ' · ' + LV[G.level].name;
      if (G.mode === 'online' && color !== G.myColor && G.online.oppAway) sub += ' · disconnesso';
      const list = caps[color].sort((a, b) => VALUE[b & 7] - VALUE[a & 7]).map((p) => `<i class="p-${pieceCode(p)}"></i>`).join('');
      const diff = material[color] - material[color ^ 1];
      el.className = 'pbar' + (liveTurn === color ? ' turn' : '');
      el.innerHTML = `<div class="pc-ico p-${color ? 'b' : 'w'}K"></div>
        <div class="pname"><b>${esc(name)}</b><small>${esc(sub)}</small></div>
        <div class="caps">${list}${diff > 0 ? `<em>+${diff}</em>` : ''}</div>` +
        (G.clock ? `<div class="clock" data-c="${color ? 'b' : 'w'}"></div>` : '');
    }
    updateClocks();
  }

  function clockValue(key) {
    const k = G.clock;
    return k.running === key ? k[key] - (Date.now() - k.since) : k[key];
  }
  function fmtClock(ms) {
    ms = Math.max(0, ms);
    if (ms < 10000) return (ms / 1000).toFixed(1);
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0');
  }
  let lowWarned = false;
  function updateClocks() {
    if (!G || !G.clock) return;
    for (const el of document.querySelectorAll('.clock')) {
      const key = el.dataset.c, v = clockValue(key);
      el.textContent = fmtClock(v);
      el.classList.toggle('run', G.clock.running === key);
      el.classList.toggle('low', v < 20000 && G.clock.base >= 60000);
    }
  }
  setInterval(() => {
    if (!G || !G.clock || G.result || !G.clock.running) return;
    updateClocks();
    const key = G.clock.running, color = key === 'w' ? 0 : 1, v = clockValue(key);
    if (color === G.myColor && v < 10000 && !lowWarned && G.clock.base >= 120000) { lowWarned = true; sound('low'); }
    if (v <= 0 && color === G.myColor) {
      netGame({ k: 'timeout', loser: color });
      flagFall(color);
    } else if (v < -2500 && color !== G.myColor) {
      // l'avversario non ha risposto in tempo: la sua pagina potrebbe essere bloccata
      netGame({ k: 'timeout', loser: color });
      flagFall(color);
    }
  }, 100);

  function flagFall(loser) {
    const winner = loser ^ 1;
    // Chi resta con il solo re (o re e un pezzo leggero) non può dare matto: patta.
    const b = G.pos.b;
    let pieces = 0, heavy = false;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (p && (p >> 3) === winner && (p & 7) !== C.KING) { pieces++; if ((p & 7) !== C.KNIGHT && (p & 7) !== C.BISHOP) heavy = true; }
    }
    if (!heavy && pieces <= 1) endGame('1/2-1/2', 'Tempo scaduto, ma l\'avversario non può dare matto');
    else endGame(winner ? '0-1' : '1-0', 'Tempo scaduto');
  }

  /* Elenco delle mosse */
  function renderMoves() {
    const box = $('moves');
    if (!G.moves.length) { box.innerHTML = '<div class="empty-moves">Le mosse della partita compariranno qui.</div>'; return; }
    const cur = G.view === null ? G.moves.length : G.view;
    let html = '';
    G.moves.forEach((m, i) => {
      if (i % 2 === 0) html += `<div class="n">${i / 2 + 1}.</div>`;
      html += `<button type="button" data-ply="${i + 1}" class="${cur === i + 1 ? 'cur' : ''}">${esc(itSan(m.san))}</button>`;
    });
    if (G.moves.length % 2) html += '<div></div>';
    box.innerHTML = html;
    const curEl = box.querySelector('.cur');
    if (curEl) {
      const top = curEl.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - 30) box.scrollTop = top - box.clientHeight / 2;
    }
  }
  $('moves').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ply]');
    if (b) goView(+b.dataset.ply);
  });
  function goView(ply) {
    if (!G) return;
    ply = Math.max(0, Math.min(G.moves.length, ply));
    G.view = ply === G.moves.length ? null : ply;
    G.sel = -1;
    render();
  }
  document.querySelector('.nav').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-nav]');
    if (!b || !G) return;
    const cur = G.view === null ? G.moves.length : G.view;
    const n = b.dataset.nav;
    goView(n === 'first' ? 0 : n === 'prev' ? cur - 1 : n === 'next' ? cur + 1 : G.moves.length);
  });
  document.addEventListener('keydown', (e) => {
    if (!G || $('scrGame').hidden || !$('modal').hidden || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const cur = G.view === null ? G.moves.length : G.view;
    if (e.key === 'ArrowLeft') { goView(cur - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { goView(cur + 1); e.preventDefault(); }
    else if (e.key === 'Home') goView(0);
    else if (e.key === 'End') goView(G.moves.length);
  });

  /* Stato e pulsanti */
  function renderStatus() {
    const el = $('gameStatus');
    el.classList.toggle('end', !!G.result);
    let html;
    if (G.result) {
      const t = resultText();
      html = `<span>${t.icon}</span><span>${esc(t.title)} — ${esc(G.result.reason)}</span>`;
    } else if (G.mode === 'online' && G.online.waiting) {
      html = '<span class="spinner"></span><span>Recupero la partita…</span>';
    } else if (G.thinking) {
      html = '<span class="spinner"></span><span>Il computer sta pensando…</span>';
    } else {
      const turn = G.pos.turn;
      const check = G.pos.inCheck() ? ' — scacco!' : '';
      if (G.mode === 'local') html = `<span class="dot ${turn ? 'off' : 'on'}"></span><span>Muove il ${turn ? 'Nero' : 'Bianco'}${check}</span>`;
      else if (turn === G.myColor) html = `<span class="dot on"></span><span>Tocca a te${check}</span>`;
      else html = `<span class="spinner"></span><span>Tocca a ${esc(G.names[turn])}${check}</span>`;
    }
    if (G.view !== null && !G.result) html += '<span class="muted small" style="margin-left:auto">(stai rivedendo)</span>';
    el.innerHTML = html;
    renderOffer();
  }

  function renderActions() {
    const el = $('actions');
    const over = !!G.result;
    let html = '';
    if (G.mode === 'ai') {
      html += `<button class="btn" data-a="undo" ${G.moves.length ? '' : 'disabled'}>↶ Annulla mossa</button>`;
      html += `<button class="btn" data-a="hint" ${!over && humanTurn() ? '' : 'disabled'}>💡 Suggerimento</button>`;
    } else if (G.mode === 'local') {
      html += `<button class="btn" data-a="undo" ${G.moves.length ? '' : 'disabled'}>↶ Annulla mossa</button>`;
      html += `<button class="btn" data-a="hint" ${!over ? '' : 'disabled'}>💡 Suggerimento</button>`;
    } else if (!over) {
      html += `<button class="btn" data-a="draw" ${!over && G.moves.length >= 2 && !G.drawOffered ? '' : 'disabled'}>🤝 ${G.drawOffered ? 'Patta proposta' : 'Proponi patta'}</button>`;
    }
    html += `<button class="btn" data-a="flip">⇅ Gira scacchiera</button>`;
    if (!over) html += `<button class="btn bad" data-a="resign">🏳 Abbandona</button>`;
    else if (G.mode === 'online') html += G.online.oppLeft ? '' : `<button class="btn primary" data-a="rematch">Rivincita</button>`;
    else html += `<button class="btn primary" data-a="again">Nuova partita</button>`;
    if (over && G.mode === 'online') html += `<button class="btn wide" data-a="lobby">Torna alla sala</button>`;
    html += `<button class="btn ${over ? '' : 'wide'}" data-a="pgn">Copia partita (PGN)</button>`;
    el.innerHTML = html;
  }

  $('actions').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]');
    if (!b || b.disabled || !G) return;
    const a = b.dataset.a;
    if (a === 'flip') { G.orientation ^= 1; render(); }
    else if (a === 'undo') undo();
    else if (a === 'hint') hint();
    else if (a === 'pgn') showPgn();
    else if (a === 'again') restartSame();
    else if (a === 'rematch') offerRematch();
    else if (a === 'lobby') leaveOnlineGame();
    else if (a === 'draw') offerDraw();
    else if (a === 'resign') {
      confirmBox('Abbandonare la partita?', 'La partita finirà e verrà contata come persa.', 'Abbandona', () => {
        if (!G || G.result) return;
        if (G.mode === 'online') netGame({ k: 'resign' });
        const loser = G.mode === 'local' ? G.pos.turn : G.myColor;
        endGame(loser ? '1-0' : '0-1', G.mode === 'local' ? (loser ? 'Il Nero' : 'Il Bianco') + ' ha abbandonato' : 'Hai abbandonato');
      });
    }
  });

  function undo() {
    cancelEngine();
    G.thinking = false;
    let n = 1;
    if (G.mode === 'ai') {
      n = G.pos.turn === G.myColor ? 2 : 1;
      if (G.result && G.pos.turn !== G.myColor) n = 1;
    }
    const ucis = G.moves.map((m) => m.uci).slice(0, Math.max(0, G.moves.length - n));
    if (G.result) {
      // si riprende una partita finita: non conta più nelle statistiche come terminata
      G.result = null;
    }
    replayMoves(ucis);
    G.sel = -1; G.view = null; G.hint = null;
    if (G.mode === 'local' && settings.flipLocal) G.orientation = G.pos.turn;
    saveGame();
    render();
    if (G.mode === 'ai' && G.pos.turn !== G.myColor) computerMove();
  }

  async function hint() {
    const game = G, ply = G.moves.length;
    const btn = $('actions').querySelector('[data-a=hint]');
    if (btn) { btn.disabled = true; btn.textContent = '💡 Ci penso…'; }
    const r = await askEngine({ startFen: G.startFen, moves: G.moves.map((x) => x.uci), level: 4, opts: { time: 1000 } });
    if (G !== game || G.moves.length !== ply || !r.res) { if (G === game) renderActions(); return; }
    const m = G.pos.moveFromUci(r.res.uci);
    G.hint = { from: C.mFrom(m), to: C.mTo(m) };
    G.view = null;
    render();
    toast('Suggerimento: ' + itSan(r.res.san));
  }

  /* ---------------- Interazione con la scacchiera ---------------- */
  let drag = null;
  const boardEl = $('board');

  function squareFromPoint(x, y) {
    const r = boardEl.getBoundingClientRect();
    const col = Math.floor((x - r.left) / (r.width / 8)), row = Math.floor((y - r.top) / (r.height / 8));
    if (col < 0 || col > 7 || row < 0 || row > 7) return -1;
    return sqAt(row * 8 + col);
  }

  boardEl.addEventListener('pointerdown', (e) => {
    if (!G || e.button > 0) return;
    closePromo();
    if (G.view !== null) { goView(G.moves.length); return; }
    if (!humanTurn()) return;
    const sq = squareFromPoint(e.clientX, e.clientY);
    if (sq < 0) return;
    const p = G.pos.b[sq];
    const own = p && (p >> 3) === G.pos.turn;
    if (G.sel >= 0 && !own) {
      tryMove(G.sel, sq);
      return;
    }
    if (!own) { if (G.sel >= 0) { G.sel = -1; render(); } return; }
    const wasSelected = G.sel === sq;
    G.sel = sq;
    G.hint = null;
    render();
    const el = squares[indexOf(sq)];
    drag = { from: sq, x: e.clientX, y: e.clientY, moved: false, wasSelected, ghost: null, pc: el.querySelector('.pc'), over: null };
    try { boardEl.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    e.preventDefault();
  });

  boardEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      const size = boardEl.getBoundingClientRect().width / 8;
      const g = document.createElement('div');
      g.className = 'drag p-' + pieceCode(G.pos.b[drag.from]);
      g.style.width = g.style.height = size + 'px';
      document.body.appendChild(g);
      drag.ghost = g;
      if (drag.pc) drag.pc.classList.add('faded');
    }
    drag.ghost.style.left = e.clientX + 'px';
    drag.ghost.style.top = e.clientY + 'px';
    const sq = squareFromPoint(e.clientX, e.clientY);
    const overEl = sq >= 0 ? squares[indexOf(sq)] : null;
    if (drag.over !== overEl) {
      if (drag.over) drag.over.classList.remove('over');
      if (overEl && sq !== drag.from) overEl.classList.add('over');
      drag.over = overEl;
    }
  });

  function endDrag(e, cancelled) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.ghost) d.ghost.remove();
    if (d.over) d.over.classList.remove('over');
    if (d.pc) d.pc.classList.remove('faded');
    if (cancelled) return;
    const sq = squareFromPoint(e.clientX, e.clientY);
    if (d.moved) {
      if (sq >= 0 && sq !== d.from) tryMove(d.from, sq, true);
    } else if (d.wasSelected) {
      G.sel = -1; render();
    }
  }
  boardEl.addEventListener('pointerup', (e) => endDrag(e, false));
  boardEl.addEventListener('pointercancel', (e) => endDrag(e, true));

  function tryMove(from, to, dragged) {
    const cands = G.pos.legalMoves().filter((m) => C.mFrom(m) === from && C.mTo(m) === to);
    if (!cands.length) {
      const p = G.pos.b[to];
      if (p && (p >> 3) === G.pos.turn && !dragged) { G.sel = to; render(); }
      else if (!dragged) { G.sel = -1; render(); }
      return;
    }
    if (cands.length > 1) {
      if (settings.autoQueen) { playMove(cands.find((m) => C.mPromo(m) === C.QUEEN)); return; }
      askPromotion(to, (piece) => {
        const m = cands.find((x) => C.mPromo(x) === piece);
        if (m && G && humanTurn()) playMove(m);
      });
      return;
    }
    playMove(cands[0]);
  }

  let promoEl = null;
  function closePromo() { if (promoEl) { promoEl.remove(); promoEl = null; } }
  function askPromotion(to, cb) {
    closePromo();
    const color = G.pos.turn ? 'b' : 'w';
    const idx = indexOf(to), col = idx & 7, rowTop = (idx >> 3) === 0;
    const el = document.createElement('div');
    el.className = 'promo';
    el.style.left = (col * 12.5) + '%';
    if (rowTop) el.style.top = '0'; else { el.style.bottom = '0'; el.style.flexDirection = 'column-reverse'; }
    for (const [t, name] of [[C.QUEEN, 'Q'], [C.KNIGHT, 'N'], [C.ROOK, 'R'], [C.BISHOP, 'B']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'p-' + color + name;
      b.title = { Q: 'Donna', N: 'Cavallo', R: 'Torre', B: 'Alfiere' }[name];
      b.onclick = (e) => { e.stopPropagation(); closePromo(); cb(t); };
      el.appendChild(b);
    }
    $('board').parentElement.appendChild(el);
    promoEl = el;
  }

  /* ---------------- Menu ---------------- */
  let chosenLevel = Math.min(store.get('scacchi_livello', 2), LV.length - 1);
  let chosenColor = store.get('scacchi_colore', 'w');

  function renderMenu() {
    $('levels').innerHTML = LV.map((l, i) => `<button type="button" data-l="${i}" class="${i === chosenLevel ? 'on' : ''}"><b>${i + 1}</b>${esc(l.name)}</button>`).join('');
    $('levelDesc').textContent = LV[chosenLevel].desc;
    for (const b of $('colorPick').children) b.classList.toggle('on', b.dataset.color === chosenColor);
    const saved = store.get('scacchi_partita_pc', null);
    $('btnResumeAI').hidden = !(saved && saved.moves && saved.moves.length);
    if (saved) $('btnResumeAI').textContent = `Riprendi la partita (${LV[saved.level] ? LV[saved.level].name : ''})`;
    const s = store.get('scacchi_statistiche', {})[chosenLevel];
    $('aiStats').textContent = s ? `Contro "${LV[chosenLevel].name}": ${s.v} vinte · ${s.p} patte · ${s.s} perse` : '';
    $('flipLocal').checked = settings.flipLocal;
    $('nameMenu').value = myName();
  }
  $('levels').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-l]');
    if (!b) return;
    chosenLevel = +b.dataset.l;
    store.set('scacchi_livello', chosenLevel);
    renderMenu();
  });
  $('colorPick').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-color]');
    if (!b) return;
    chosenColor = b.dataset.color;
    store.set('scacchi_colore', chosenColor);
    renderMenu();
  });
  $('btnPlayAI').onclick = () => {
    const color = chosenColor === 'r' ? (Math.random() < 0.5 ? 0 : 1) : chosenColor === 'b' ? 1 : 0;
    const names = color === 0 ? ['Tu', 'Computer'] : ['Computer', 'Tu'];
    store.del('scacchi_partita_pc');
    newGame({ mode: 'ai', level: chosenLevel, myColor: color, names });
    sound('start');
    if (color === 1) computerMove();
  };
  $('btnResumeAI').onclick = () => {
    const s = store.get('scacchi_partita_pc', null);
    if (!s) return;
    const names = s.myColor === 0 ? ['Tu', 'Computer'] : ['Computer', 'Tu'];
    newGame({ mode: 'ai', level: s.level, myColor: s.myColor, names, startFen: s.startFen });
    if (!replayMoves(s.moves)) { store.del('scacchi_partita_pc'); toast('Impossibile riprendere la partita salvata.', true); showHome(); return; }
    render();
    const st = G.pos.status();
    if (st) endGame(st.result, st.reason);
    else if (G.pos.turn !== G.myColor) computerMove();
  };
  $('flipLocal').onchange = () => { settings.flipLocal = $('flipLocal').checked; saveSettings(); };
  $('btnPlayLocal').onclick = () => {
    newGame({ mode: 'local', myColor: null, names: ['Bianco', 'Nero'] });
    sound('start');
  };

  function showHome() {
    showScreen('scrMenu');
    renderMenu();
    refreshOnlineInfo();
  }

  $('btnHome').onclick = () => {
    if (!$('scrGame').hidden && G && G.mode === 'online') { leaveOnlineGame(true); return; }
    if (!$('scrGame').hidden && G && G.mode === 'ai' && G.thinking) cancelEngine();
    if (!$('scrLobby').hidden || (G && G.mode === 'online')) netDisconnect();
    G = null;
    showHome();
  };

  // Piccola scacchiera decorativa nel menu
  (function heroBoard() {
    const pcs = ['bR', 'bN', '', 'bK', '', 'bP', 'wQ', '', 'wP', '', 'wN', '', '', 'wB', '', 'wK'];
    $('heroBoard').innerHTML = pcs.map((p, i) => `<div class="${p ? 'p-' + p : ''}" style="background-color:${((i >> 2) + i) & 1 ? 'var(--dark)' : 'var(--light)'}"></div>`).join('');
    document.querySelector('.brand-icon').style.backgroundImage = PIECE_URL.bN;
  })();

  /* ---------------- Impostazioni ---------------- */
  $('btnSettings').onclick = () => {
    const sw = (id, on, label) => `<label class="opt-row"><span>${label}</span><span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></span></label>`;
    openModal(`<h2>Impostazioni</h2>
      <div>
        ${sw('optSound', settings.sound, 'Suoni')}
        ${sw('optHints', settings.hints, 'Mostra le mosse possibili')}
        ${sw('optCoords', settings.coords, 'Coordinate sulla scacchiera')}
        ${sw('optQueen', settings.autoQueen, 'Promozione automatica a donna')}
      </div>
      <div class="label">Colori della scacchiera</div>
      <div class="themes">${Object.entries(THEMES).map(([k, t]) => `<button type="button" data-t="${k}" class="${settings.theme === k ? 'on' : ''}" title="${k}"><i style="background:${t[0]}"></i><i style="background:${t[1]}"></i><i style="background:${t[1]}"></i><i style="background:${t[0]}"></i></button>`).join('')}</div>
      <p class="muted small">I pezzi sono il classico disegno "cburnett" di Colin M.L. Burnett.</p>
      <div class="modal-actions"><button class="btn primary" data-a="ok">Fatto</button></div>`);
    const box = $('modalBox');
    const bind = (id, key) => { box.querySelector('#' + id).onchange = (e) => { settings[key] = e.target.checked; saveSettings(); if (G) render(); }; };
    bind('optSound', 'sound'); bind('optHints', 'hints'); bind('optCoords', 'coords'); bind('optQueen', 'autoQueen');
    box.querySelector('.themes').onclick = (e) => {
      const b = e.target.closest('button[data-t]');
      if (!b) return;
      settings.theme = b.dataset.t; saveSettings(); applyTheme();
      for (const x of box.querySelectorAll('.themes button')) x.classList.toggle('on', x === b);
    };
    box.querySelector('[data-a=ok]').onclick = closeModal;
  };

  /* ================================================================== */
  /* ONLINE                                                              */
  /* ================================================================== */
  const TIME_CONTROLS = [[1, 0, 'Bullet'], [3, 2, 'Blitz'], [5, 0, 'Blitz'], [10, 0, 'Rapid'], [15, 10, 'Rapid'], [30, 0, 'Classica'], [null, null, 'Senza limite']];
  const QUICK = ['Ciao! 👋', 'Buona partita!', 'Bella mossa!', 'Oops 😅', 'Ci penso un attimo…', 'Grazie per la partita!'];
  const tcLabel = (tc) => tc ? `${tc[0]}+${tc[1]}` : 'senza limite di tempo';

  function randomHex(n) {
    const a = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  function myToken() {
    let t = sess.get('scacchi_token', null);
    if (!t) { t = randomHex(16); sess.set('scacchi_token', t); }
    return t;
  }
  function myName() { return store.get('scacchi_nome', ''); }
  function setMyName(n) {
    n = String(n || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
    store.set('scacchi_nome', n);
    if (net.ws && net.id) net.send({ t: 'set', name: n });
    return n;
  }

  const net = { ws: null, id: null, name: '', players: [], want: false, retry: 0, ping: null, status: 'libero', connected: false };
  const invitesIn = new Map();   // inv -> { from, name, tc, youPlay, rematch, timer }
  let inviteOut = null;          // { inv, to, name, tc, myColor, rematch, timer }
  let acceptWait = null;         // { inv, from, name, tc, youPlay, timer }

  function netConnect() {
    const url = serverUrl();
    net.want = true;
    if (!url) { renderNetState(); return; }
    if (net.ws && net.ws.readyState <= 1) return;
    let ws;
    try { ws = new WebSocket(url); } catch (e) { scheduleReconnect(); return; }
    net.ws = ws;
    renderNetState();
    ws.onopen = () => {
      net.retry = 0;
      ws.send(JSON.stringify({ t: 'hello', token: myToken(), name: myName(), status: net.status }));
      clearInterval(net.ping);
      net.ping = setInterval(() => net.send({ t: 'ping' }), 25000);
    };
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      onServer(m);
    };
    ws.onclose = () => {
      if (net.ws !== ws) return;
      net.ws = null; net.connected = false;
      clearInterval(net.ping);
      renderNetState();
      if (G && G.mode === 'online' && !G.result) setBanner('Connessione persa: riconnessione in corso…');
      if (net.want) scheduleReconnect();
    };
  }
  function scheduleReconnect() {
    if (!net.want) return;
    const delay = Math.min(10000, 1000 * Math.pow(2, net.retry++));
    setTimeout(() => { if (net.want && !net.ws) netConnect(); }, delay);
  }
  function netDisconnect() {
    net.want = false;
    clearInterval(net.ping);
    if (net.ws) { const ws = net.ws; net.ws = null; try { ws.close(); } catch (e) { /* */ } }
    net.connected = false; net.id = null; net.players = [];
    for (const i of invitesIn.values()) clearTimeout(i.timer);
    invitesIn.clear();
    if (inviteOut) { clearTimeout(inviteOut.timer); inviteOut = null; }
    acceptWait = null;
  }
  net.send = (obj) => { try { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(obj)); } catch (e) { /* */ } };
  const netTo = (id, data) => net.send({ t: 'to', to: id, data });
  function netGame(data) {
    if (!G || G.mode !== 'online') return;
    data.g = G.online.g;
    netTo(G.online.opp.id, data);
  }
  function netSetStatus(s) { net.status = s; net.send({ t: 'set', status: s }); }

  function onServer(m) {
    if (m.t === 'welcome') {
      net.id = m.id; net.connected = true; net.name = m.name;
      if (!myName()) { /* il server ha assegnato un nome provvisorio */ }
      net.players = m.players || [];
      setBanner(null);
      renderNetState(); renderLobby();
      resumeOnlineIfSaved();
      if (G && G.mode === 'online' && !G.result) { netSetStatus('gioca'); netGame({ k: 'sync-req' }); }
    } else if (m.t === 'lobby') {
      net.players = m.players || [];
      const me = net.players.find((p) => p.id === net.id);
      if (me) net.name = me.name;
      renderLobby(); renderNetState();
      watchOpponent();
    } else if (m.t === 'msg') {
      onPeer(m.from, m.name, m.data || {});
    } else if (m.t === 'error') {
      toast(m.text, true);
    }
  }

  function renderNetState() {
    const el = $('netState');
    if (!el) return;
    let cls, txt;
    if (!serverUrl()) { cls = 'off'; txt = 'Il gioco online non è ancora attivo.'; }
    else if (net.connected) { const n = net.players.length; cls = 'on'; txt = `Collegato · ${n} ${n === 1 ? 'giocatore' : 'giocatori'} in sala`; }
    else { cls = 'wait'; txt = 'Connessione al server…'; }
    el.innerHTML = `<span class="dot ${cls}"></span><span>${esc(txt)}</span>`;
  }

  const avatarColor = (id) => `hsl(${parseInt(id.slice(0, 4), 16) % 360} 70% 68%)`;

  function renderLobby() {
    if ($('scrLobby').hidden) return;
    const others = net.players.filter((p) => p.id !== net.id);
    $('playerCount').textContent = net.players.length;
    const box = $('players');
    if (!net.connected) box.innerHTML = `<div class="empty">${serverUrl() ? 'Connessione in corso…' : 'Il gioco online non è ancora attivo.'}</div>`;
    else if (!others.length) box.innerHTML = '<div class="empty">Per ora in sala ci sei solo tu.<br>Resta qui: appena entra qualcuno comparirà in questo elenco.</div>';
    else {
      box.innerHTML = others.map((p) => {
        const busy = p.status !== 'libero';
        const pendingToThem = inviteOut && inviteOut.to === p.id;
        return `<div class="player"><div class="avatar" style="background:${avatarColor(p.id)}">${esc((p.name[0] || '?').toUpperCase())}</div>
          <div class="who"><b>${esc(p.name)}</b><span class="${busy ? 'busy' : ''}">${busy ? 'sta giocando' : 'libero'}</span></div>
          <button class="btn small ${busy ? '' : 'primary'}" data-challenge="${esc(p.id)}" ${busy || inviteOut ? 'disabled' : ''}>${pendingToThem ? 'Invitato…' : 'Sfida'}</button></div>`;
      }).join('');
    }
    // inviti
    let html = '';
    if (acceptWait) html += `<div class="invite out"><span class="spinner"></span><div class="txt">Avvio la partita con <b>${esc(acceptWait.name)}</b>…</div></div>`;
    for (const [inv, i] of invitesIn) {
      if (i.rematch) continue;
      html += `<div class="invite"><div class="txt"><b>${esc(i.name)}</b> ti sfida!<small>${esc(tcLabel(i.tc))} · giochi col ${i.youPlay ? 'Nero' : 'Bianco'}</small></div>
        <button class="btn small good" data-accept="${inv}">Accetta</button><button class="btn small" data-decline="${inv}">Rifiuta</button></div>`;
    }
    if (inviteOut && !inviteOut.rematch) {
      html += `<div class="invite out"><span class="spinner"></span><div class="txt">Hai sfidato <b>${esc(inviteOut.name)}</b><small>${esc(tcLabel(inviteOut.tc))} · giochi col ${inviteOut.myColor ? 'Nero' : 'Bianco'} · in attesa di risposta</small></div>
        <button class="btn small" data-cancel="1">Annulla</button></div>`;
    }
    $('inviteArea').innerHTML = html;
  }

  $('players').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-challenge]');
    if (b && !b.disabled) challengeDialog(b.dataset.challenge);
  });
  $('inviteArea').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.accept) acceptInvite(b.dataset.accept);
    else if (b.dataset.decline) declineInvite(b.dataset.decline);
    else if (b.dataset.cancel) cancelInvite();
  });

  function challengeDialog(id) {
    const p = net.players.find((x) => x.id === id);
    if (!p) return;
    let tcIdx = store.get('scacchi_tempo', 2), col = 'r';
    const draw = () => {
      openModal(`<h2>Sfida ${esc(p.name)}</h2>
        <div class="label">Tempo per giocatore</div>
        <div class="grid-choices" id="tcs">${TIME_CONTROLS.map((t, i) => `<button type="button" data-i="${i}" class="${i === tcIdx ? 'on' : ''}">${t[0] ? t[0] + '+' + t[1] : '∞'}<small>${t[2]}</small></button>`).join('')}</div>
        <p class="muted small">Il primo numero sono i minuti a disposizione, il secondo i secondi aggiunti a ogni mossa.</p>
        <div class="label">Giochi con</div>
        <div class="seg" id="cols"><button type="button" data-c="w" class="${col === 'w' ? 'on' : ''}">Bianco</button><button type="button" data-c="r" class="${col === 'r' ? 'on' : ''}">Casuale</button><button type="button" data-c="b" class="${col === 'b' ? 'on' : ''}">Nero</button></div>
        <div class="modal-actions"><button class="btn" data-a="no">Annulla</button><button class="btn primary" data-a="go">Invia la sfida</button></div>`);
      const box = $('modalBox');
      box.querySelector('#tcs').onclick = (e) => { const b = e.target.closest('button'); if (b) { tcIdx = +b.dataset.i; draw(); } };
      box.querySelector('#cols').onclick = (e) => { const b = e.target.closest('button'); if (b) { col = b.dataset.c; draw(); } };
      box.querySelector('[data-a=no]').onclick = closeModal;
      box.querySelector('[data-a=go]').onclick = () => {
        closeModal();
        store.set('scacchi_tempo', tcIdx);
        const t = TIME_CONTROLS[tcIdx];
        const myColor = col === 'r' ? (Math.random() < 0.5 ? 0 : 1) : col === 'b' ? 1 : 0;
        sendInvite(p.id, p.name, t[0] ? [t[0], t[1]] : null, myColor, false);
      };
    };
    draw();
  }

  function sendInvite(to, name, tc, myColor, rematch) {
    if (inviteOut) clearTimeout(inviteOut.timer);
    const inv = randomHex(6);
    inviteOut = { inv, to, name, tc, myColor, rematch, timer: setTimeout(() => {
      if (inviteOut && inviteOut.inv === inv) { netTo(to, { k: 'cancel', inv }); inviteOut = null; toast(`${name} non ha risposto alla sfida.`); renderLobby(); renderOffer(); }
    }, 60000) };
    netTo(to, { k: 'invite', inv, tc, youPlay: myColor ^ 1, rematch: !!rematch });
    renderLobby();
    renderOffer();
  }
  function cancelInvite() {
    if (!inviteOut) return;
    clearTimeout(inviteOut.timer);
    netTo(inviteOut.to, { k: 'cancel', inv: inviteOut.inv });
    inviteOut = null;
    renderLobby(); renderOffer();
  }
  function acceptInvite(inv) {
    const i = invitesIn.get(inv);
    if (!i) return;
    clearTimeout(i.timer);
    invitesIn.delete(inv);
    netTo(i.from, { k: 'accept', inv });
    acceptWait = Object.assign({}, i, { inv, timer: setTimeout(() => {
      if (acceptWait && acceptWait.inv === inv) { acceptWait = null; toast('La sfida non è più valida.', true); renderLobby(); renderOffer(); }
    }, 10000) });
    renderLobby(); renderOffer();
  }
  function declineInvite(inv, silent) {
    const i = invitesIn.get(inv);
    if (!i) return;
    clearTimeout(i.timer);
    invitesIn.delete(inv);
    if (!silent) netTo(i.from, { k: 'decline', inv });
    renderLobby(); renderOffer();
  }

  const inLiveOnline = () => G && G.mode === 'online' && !G.result;

  function onPeer(from, name, d) {
    const k = d.k;
    if (k === 'invite') {
      if (typeof d.inv !== 'string') return;
      // Sfida normale: solo se sono in sala. Rivincita: solo a fine partita con lo stesso avversario.
      const ok = d.rematch
        ? !!(G && G.mode === 'online' && G.result && G.online.opp.id === from && !$('scrGame').hidden)
        : !$('scrLobby').hidden;
      if (!ok || acceptWait || inLiveOnline()) {
        netTo(from, { k: 'decline', inv: d.inv, busy: true });
        return;
      }
      const tc = Array.isArray(d.tc) && d.tc.length === 2 ? [Math.max(1, Math.min(180, +d.tc[0] || 5)), Math.max(0, Math.min(60, +d.tc[1] || 0))] : null;
      const inv = { from, name, tc, youPlay: d.youPlay === 1 ? 1 : 0, rematch: !!d.rematch };
      inv.timer = setTimeout(() => { invitesIn.delete(d.inv); renderLobby(); renderOffer(); }, 60000);
      invitesIn.set(d.inv, inv);
      // Rivincita proposta da tutti e due nello stesso momento: uno solo accetta quella dell'altro.
      if (d.rematch && inviteOut && inviteOut.rematch && inviteOut.to === from && net.id < from) {
        clearTimeout(inviteOut.timer);
        inviteOut = null;
        acceptInvite(d.inv);
        return;
      }
      sound('notify');
      if (!d.rematch && $('scrLobby').hidden) toast(`${name} ti ha sfidato!`);
      renderLobby(); renderOffer();
    } else if (k === 'cancel') {
      const i = invitesIn.get(d.inv);
      if (i && i.from === from) { declineInvite(d.inv, true); }
    } else if (k === 'decline') {
      if (inviteOut && inviteOut.inv === d.inv && inviteOut.to === from) {
        clearTimeout(inviteOut.timer);
        toast(d.busy ? `${name} al momento è occupato.` : inviteOut.rematch ? `${name} non vuole la rivincita.` : `${name} ha rifiutato la sfida.`);
        inviteOut = null;
        renderLobby(); renderOffer();
      }
    } else if (k === 'accept') {
      if (inviteOut && inviteOut.inv === d.inv && inviteOut.to === from && !inLiveOnline() && !acceptWait) {
        clearTimeout(inviteOut.timer);
        const o = inviteOut;
        inviteOut = null;
        netTo(from, { k: 'start', inv: d.inv, g: d.inv });
        startOnlineGame({ g: d.inv, opp: { id: from, name }, myColor: o.myColor, tc: o.tc });
      } else {
        netTo(from, { k: 'expired', inv: d.inv });
      }
    } else if (k === 'start') {
      if (acceptWait && acceptWait.inv === d.inv && acceptWait.from === from) {
        clearTimeout(acceptWait.timer);
        const a = acceptWait;
        acceptWait = null;
        startOnlineGame({ g: d.g, opp: { id: from, name }, myColor: a.youPlay, tc: a.tc });
      }
    } else if (k === 'expired') {
      if (acceptWait && acceptWait.inv === d.inv) {
        clearTimeout(acceptWait.timer); acceptWait = null;
        toast('La sfida non è più valida.', true);
        renderLobby(); renderOffer();
      }
    } else {
      onGameMsg(from, name, d);
    }
  }

  function onGameMsg(from, name, d) {
    if (!G || G.mode !== 'online' || d.g !== G.online.g || from !== G.online.opp.id) return;
    const o = G.online;
    switch (d.k) {
      case 'move': {
        if (G.result || o.waiting) return;
        if (d.ply <= G.moves.length) return; // già ricevuta
        if (d.ply !== G.moves.length + 1 || G.pos.turn === G.myColor) { netGame({ k: 'sync-req' }); return; }
        const m = G.pos.moveFromUci(d.uci);
        if (!m) { netGame({ k: 'sync-req' }); return; }
        playMove(m, { remote: true, left: typeof d.left === 'number' ? d.left : null });
        G.drawOffered = false;
        saveOnline();
        break;
      }
      case 'resign':
        if (!G.result) endGame(G.myColor ? '0-1' : '1-0', `${o.opp.name} ha abbandonato`);
        break;
      case 'timeout':
        if (!G.result && (d.loser === 0 || d.loser === 1)) flagFall(d.loser);
        break;
      case 'draw':
        if (G.result) return;
        if (G.drawOffered) { netGame({ k: 'draw-yes' }); endGame('1/2-1/2', 'Patta concordata'); return; }
        o.offerIn = 'draw';
        sound('notify');
        renderOffer();
        break;
      case 'draw-yes':
        if (!G.result && G.drawOffered) endGame('1/2-1/2', 'Patta concordata');
        break;
      case 'draw-no':
        G.drawOffered = false;
        toast(`${o.opp.name} ha rifiutato la patta.`);
        renderActions();
        break;
      case 'chat': {
        const i = d.i | 0;
        if (i >= 0 && i < QUICK.length) addChat(o.opp.name, QUICK[i], false);
        break;
      }
      case 'sync-req':
        netGame({ k: 'sync', moves: G.moves.map((m) => m.uci), clock: G.clock ? { w: clockValue('w'), b: clockValue('b') } : null, result: G.result });
        break;
      case 'sync': {
        if (!Array.isArray(d.moves) || d.moves.length > 1000) return;
        const mine = G.moves.map((m) => m.uci);
        const theirs = d.moves.map(String);
        const wasWaiting = o.waiting;
        o.waiting = false;
        if (theirs.length >= mine.length && mine.every((u, i) => u === theirs[i]) || wasWaiting) {
          if (theirs.length !== mine.length || wasWaiting) {
            if (!replayMoves(theirs)) { replayMoves(mine); }
          }
        }
        if (G.clock && d.clock) {
          G.clock.w = +d.clock.w || 0; G.clock.b = +d.clock.b || 0;
          G.clock.running = G.moves.length >= 2 ? (G.pos.turn ? 'b' : 'w') : null;
          G.clock.since = Date.now();
        }
        if (d.result && d.result.result && !G.result) { G.result = null; endGame(d.result.result, d.result.reason); return; }
        const st = G.pos.status();
        if (st && !G.result) endGame(st.result, st.reason);
        saveOnline();
        setBanner(null);
        render();
        break;
      }
      case 'leave':
        o.oppLeft = true;
        if (inviteOut && inviteOut.to === from) { clearTimeout(inviteOut.timer); inviteOut = null; }
        for (const [inv, i] of invitesIn) if (i.from === from) declineInvite(inv, true);
        if (G.result) { toast(`${o.opp.name} ha lasciato la partita.`); renderAll(); }
        else endGame(G.myColor ? '0-1' : '1-0', `${o.opp.name} ha lasciato la partita`);
        break;
    }
  }

  function startOnlineGame(o) {
    for (const [inv] of invitesIn) declineInvite(inv);
    const names = o.myColor === 0 ? [net.name || 'Tu', o.opp.name] : [o.opp.name, net.name || 'Tu'];
    newGame({ mode: 'online', myColor: o.myColor, names, tc: o.tc, online: { g: o.g, opp: o.opp, tc: o.tc, waiting: false } });
    lowWarned = false;
    netSetStatus('gioca');
    $('chatLog').innerHTML = '';
    saveOnline();
    sound('start');
    toast(`Partita iniziata: giochi col ${o.myColor ? 'Nero' : 'Bianco'}`);
    renderAll();
  }

  function saveOnline() {
    if (!G || G.mode !== 'online' || G.result) return;
    sess.set('scacchi_online', {
      g: G.online.g, opp: G.online.opp, tc: G.online.tc, myColor: G.myColor, names: G.names,
      moves: G.moves.map((m) => m.uci), clock: G.clock ? { w: clockValue('w'), b: clockValue('b') } : null, at: Date.now()
    });
  }

  // Dopo aver ricaricato la pagina durante una partita online: la si riprende.
  function resumeOnlineIfSaved() {
    const s = sess.get('scacchi_online', null);
    if (!s || (G && G.mode === 'online')) return;
    if (Date.now() - s.at > 5 * 60000) { sess.del('scacchi_online'); return; }
    newGame({ mode: 'online', myColor: s.myColor, names: s.names, tc: s.tc, online: { g: s.g, opp: s.opp, tc: s.tc, waiting: true } });
    replayMoves(s.moves || []);
    if (G.clock && s.clock) { G.clock.w = s.clock.w; G.clock.b = s.clock.b; }
    netSetStatus('gioca');
    netGame({ k: 'sync-req' });
    render();
    const game = G;
    setTimeout(() => {
      if (G === game && G.online.waiting) {
        G.online.waiting = false;
        render();
      }
    }, 6000);
  }

  // Se l'avversario sparisce dalla sala durante la partita, lo si aspetta per un minuto.
  function watchOpponent() {
    if (!G || G.mode !== 'online') return;
    const o = G.online;
    const present = net.players.some((p) => p.id === o.opp.id);
    if (present) {
      if (o.oppAway) { o.oppAway = null; setBanner(null); if (!G.result) toast(`${o.opp.name} è di nuovo collegato.`); render(); }
      return;
    }
    if (G.result) { if (!o.oppLeft) { o.oppLeft = true; renderActions(); } return; }
    if (!o.oppAway) { o.oppAway = Date.now(); render(); }
  }
  setInterval(() => {
    if (!G || G.mode !== 'online' || G.result || !G.online.oppAway) return;
    const left = 60 - Math.floor((Date.now() - G.online.oppAway) / 1000);
    if (left <= 0) {
      G.online.oppLeft = true;
      setBanner(null);
      endGame(G.myColor ? '0-1' : '1-0', `${G.online.opp.name} si è disconnesso`);
    } else setBanner(`${G.online.opp.name} si è disconnesso. Attendo che torni… ${left} s`);
  }, 1000);

  function setBanner(text) {
    const el = $('boardBanner');
    if (!text) { el.hidden = true; return; }
    el.textContent = text;
    el.hidden = false;
  }

  function offerDraw() {
    if (!inLiveOnline() || G.drawOffered) return;
    if (G.online.offerIn === 'draw') { G.online.offerIn = null; netGame({ k: 'draw-yes' }); endGame('1/2-1/2', 'Patta concordata'); return; }
    G.drawOffered = true;
    netGame({ k: 'draw' });
    toast('Hai proposto la patta.');
    renderActions();
  }

  function offerRematch() {
    if (!G || G.mode !== 'online' || !G.result) return;
    const o = G.online;
    // se è già arrivata una proposta di rivincita, la si accetta
    for (const [inv, i] of invitesIn) if (i.rematch && i.from === o.opp.id) { acceptInvite(inv); return; }
    if (!net.players.some((p) => p.id === o.opp.id)) { toast(`${o.opp.name} non è più in sala.`, true); return; }
    sendInvite(o.opp.id, o.opp.name, o.tc, G.myColor ^ 1, true);
    toast('Rivincita proposta: si giocherà a colori invertiti.');
  }

  // Riquadro nel pannello laterale per proposte di patta e rivincita
  function renderOffer() {
    const el = $('offer');
    if (!G || G.mode !== 'online' || $('scrGame').hidden) { el.hidden = true; return; }
    const o = G.online;
    let html = '';
    if (!G.result && o.offerIn === 'draw') {
      html = `<div><b>${esc(o.opp.name)}</b> propone la patta.</div><div class="row"><button class="btn small good" data-o="dy">Accetta</button><button class="btn small" data-o="dn">Rifiuta</button></div>`;
    } else if (G.result) {
      const rm = [...invitesIn.entries()].find(([, i]) => i.rematch && i.from === o.opp.id);
      if (rm) html = `<div><b>${esc(o.opp.name)}</b> propone la rivincita (${esc(tcLabel(rm[1].tc))}, giochi col ${rm[1].youPlay ? 'Nero' : 'Bianco'}).</div><div class="row"><button class="btn small good" data-o="ry" data-inv="${rm[0]}">Gioca la rivincita</button><button class="btn small" data-o="rn" data-inv="${rm[0]}">No, grazie</button></div>`;
      else if (inviteOut && inviteOut.rematch && inviteOut.to === o.opp.id) html = `<div class="row" style="align-items:center"><span class="spinner"></span><span>Rivincita proposta, in attesa di risposta…</span></div><div class="row"><button class="btn small" data-o="rc">Annulla</button></div>`;
      else if (acceptWait && acceptWait.from === o.opp.id) html = `<div class="row" style="align-items:center"><span class="spinner"></span><span>Avvio la rivincita…</span></div>`;
    }
    el.innerHTML = html;
    el.hidden = !html;
  }
  $('offer').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-o]');
    if (!b || !G) return;
    const a = b.dataset.o;
    if (a === 'dy') { G.online.offerIn = null; netGame({ k: 'draw-yes' }); endGame('1/2-1/2', 'Patta concordata'); }
    else if (a === 'dn') { G.online.offerIn = null; netGame({ k: 'draw-no' }); renderOffer(); }
    else if (a === 'ry') acceptInvite(b.dataset.inv);
    else if (a === 'rn') declineInvite(b.dataset.inv);
    else if (a === 'rc') cancelInvite();
  });

  function addChat(who, text, me) {
    const log = $('chatLog');
    const line = document.createElement('div');
    if (me) line.className = 'me';
    line.textContent = who + ': ' + text;
    log.appendChild(line);
    while (log.children.length > 40) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
    if (!me) sound('notify');
  }
  $('chatQuick').innerHTML = QUICK.map((q, i) => `<button type="button" data-i="${i}">${esc(q)}</button>`).join('');
  let lastChat = 0;
  $('chatQuick').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b || !G || G.mode !== 'online') return;
    if (Date.now() - lastChat < 1500) return;
    lastChat = Date.now();
    netGame({ k: 'chat', i: +b.dataset.i });
    addChat('Tu', QUICK[+b.dataset.i], true);
  });

  function leaveOnlineGame(toMenu) {
    const go = () => {
      if (G && G.mode === 'online') {
        if (!G.result) { netGame({ k: 'resign' }); endGame(G.myColor ? '0-1' : '1-0', 'Hai abbandonato'); }
        netGame({ k: 'leave' });
        if (inviteOut && inviteOut.rematch) cancelInvite();
        for (const [inv, i] of invitesIn) if (i.rematch) declineInvite(inv);
      }
      closeModal();
      sess.del('scacchi_online');
      netSetStatus('libero');
      G = null;
      if (toMenu) { netDisconnect(); showHome(); } else openLobby();
    };
    if (G && G.mode === 'online' && !G.result) confirmBox('Lasciare la partita?', 'Uscendo ora perderai la partita.', 'Esci e abbandona', go);
    else go();
  }

  function openLobby() {
    showScreen('scrLobby');
    $('nameLobby').value = myName() || net.name || '';
    renderNetState();
    renderLobby();
    netConnect();
  }

  $('btnLobby').onclick = () => {
    const n = setMyName($('nameMenu').value);
    if (!n) { $('nameMenu').focus(); toast('Scegli un nome con cui farti vedere in sala.'); return; }
    openLobby();
  };
  $('nameMenu').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnLobby').click(); });
  $('btnSaveName').onclick = () => {
    const n = setMyName($('nameLobby').value);
    $('nameLobby').value = n;
    toast(n ? 'Nome salvato.' : 'Nome rimosso: ti verrà assegnato un nome provvisorio.');
  };
  $('nameLobby').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnSaveName').click(); });

  async function refreshOnlineInfo() {
    const el = $('onlineInfo');
    const url = serverUrl();
    if (!url) { el.innerHTML = '<span class="dot off"></span><span>Il gioco online non è ancora attivo.</span>'; $('btnLobby').disabled = true; return; }
    $('btnLobby').disabled = false;
    try {
      const r = await fetch(url.replace(/^ws/, 'http').replace(/\/?$/, '/stato'), { cache: 'no-store' });
      const j = await r.json();
      const n = j.online | 0;
      el.innerHTML = `<span class="dot ${n ? 'on' : ''}"></span><span>${n ? `${n} ${n === 1 ? 'giocatore' : 'giocatori'} in sala ora` : 'Nessuno in sala in questo momento'}</span>`;
    } catch (e) {
      el.innerHTML = '<span class="dot off"></span><span>Server non raggiungibile in questo momento</span>';
    }
  }
  setInterval(() => { if (!$('scrMenu').hidden) refreshOnlineInfo(); }, 20000);

  window.addEventListener('beforeunload', () => { if (G && G.mode === 'online' && !G.result) saveOnline(); });

  /* ---------------- Avvio ---------------- */
  applyTheme();
  showHome();
  // Una partita online in corso prima di ricaricare la pagina: si torna subito a giocarla.
  if (sess.get('scacchi_online', null) && serverUrl()) { net.status = 'gioca'; netConnect(); }
})();

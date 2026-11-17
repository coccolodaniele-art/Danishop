/* ====================================================================
   SQLQUEST — stessa impostazione di CodeQuest (dist/codequest/index.html), per SQL.
   Interfaccia, livelli, XP, badge, streak, sfida giornaliera, ripasso, mini-lezioni e
   versione per telefono come in CodeQuest. Esercizi (lezioni.js), database (database.js)
   e verifica delle query (motore.js) sono quelli di SQLQuest, invariati: SQLite nel browser
   con sql.js, ogni esercizio parte da una copia nuova del database.
   ==================================================================== */

const STORAGE_KEY = 'sqlquest_save_v2';
const OLD_STORAGE_KEY = 'sqlquest_v1';           // salvataggio della versione precedente
const SOUND_KEY = 'sqlquest_sound';
const XP_FACTOR = 3;                             // XP come in CodeQuest (30-120 per lezione)
const MAX_ROWS = 500;
const STARTER = '-- Scrivi qui la tua query SQL\n';

const DEFAULT_STATE = {
  name: 'Player', createdAt: Date.now(),
  xp: 0, level: 1, totalDone: 0, stars: 0, streak: 0,
  lastActive: null, activeDays: [], badges: [],
  progress: {}, currentLesson: null,
  dailyDone: null, dailyLesson: null, dailyDate: null,
  lab: ''
};
const SCHEMA = window.SQLQ_DB;
const SRC = window.SQLQ_LEZIONI;
const Motore = window.Motore;

const TRACKS = SRC.moduli.map((m, i) => ({id: m.id, name: m.titolo, icon: m.icona, cls: 't' + i, desc: m.descrizione}));
const LESSONS = SRC.lezioni.map(l => ({
  id: l.id, track: l.modulo, title: l.titolo, diff: l.livello, xp: l.xp * XP_FACTOR,
  src: l, starter: STARTER, hint: l.suggerimento, solution: l.soluzione
}));

let S = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(raw));
    return migrateOldSave() || structuredClone(DEFAULT_STATE);
  }catch(e){ return structuredClone(DEFAULT_STATE); }
}
function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }catch(_){} }

// La versione precedente salvava { fatti: {id: {stelle, xp, data}}, codice: {id: testo}, lab }.
// Gli esercizi già risolti restano risolti, con le loro stelle; le query scritte restano nell'editor.
function migrateOldSave(){
  let old = null;
  try{ old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY)); }catch(_){ old = null; }
  if(!old || typeof old !== 'object') return null;
  const s = structuredClone(DEFAULT_STATE);
  const fatti = old.fatti || {}, codice = old.codice || {};
  for(const l of LESSONS){
    const f = fatti[l.id], c = typeof codice[l.id] === 'string' ? codice[l.id] : '';
    if(f){
      const stars = Math.max(1, Math.min(3, +f.stelle || 1));
      s.progress[l.id] = {done:true, stars, attempts:1, bestCode: c || l.solution, reviewed: f.data || null};
      s.totalDone++; s.stars += stars; s.xp += l.xp;
      if(f.data && !s.activeDays.includes(f.data)) s.activeDays.push(f.data);
    } else if(c.trim()){
      s.progress[l.id] = {done:false, stars:0, attempts:0, bestCode: c};
    }
  }
  while(s.xp >= xpTotalUpToLevel(s.level + 1)) s.level++;
  if(typeof old.lab === 'string') s.lab = old.lab;
  if(old.corrente && LESSONS.some(l => l.id === old.corrente)) s.currentLesson = old.corrente;
  s.activeDays.sort();
  s.lastActive = s.activeDays[s.activeDays.length - 1] || null;
  s.migrated = true;
  return s;
}

function xpNeededFor(level){
  return Math.round(80 + level * 40 + Math.pow(level, 1.6) * 8);
}
function xpTotalUpToLevel(lvl){
  let s = 0; for(let i=1;i<lvl;i++) s += xpNeededFor(i); return s;
}
function rankFromXP(totalXp){
  if(totalXp < 100) return {letter:'D', label:'Apprendista SQL'};
  if(totalXp < 300) return {letter:'C', label:'Interrogatore Promettente'};
  if(totalXp < 700) return {letter:'B', label:'Analista in Ascesa'};
  if(totalXp < 1400) return {letter:'A', label:'Esperto di Query'};
  if(totalXp < 2500) return {letter:'S', label:'Maestro SQL'};
  if(totalXp < 3400) return {letter:'S+', label:'Architetto di Database'};
  return {letter:'S++', label:'Leggenda di SQL'};
}

/* ============ BADGE ============ */
const BADGES = [
  {id:'first', icon:'🌱', name:'Primi passi', desc:'Completa la tua prima lezione', cond: s => s.totalDone >= 1},
  {id:'streak3', icon:'🔥', name:'In fiamme', desc:'Streak di 3 giorni', cond: s => s.streak >= 3},
  {id:'streak7', icon:'💎', name:'Settimana perfetta', desc:'Streak di 7 giorni', cond: s => s.streak >= 7},
  {id:'base', icon:'🗄️', name:'Prima query', desc:'Tutti i Primi passi', cond: s => countDoneInTrack(s,'base') >= trackSize('base')},
  {id:'filtri', icon:'🔎', name:'Detective dei dati', desc:'5 esercizi con WHERE', cond: s => countDoneInTrack(s,'filtri') >= 5},
  {id:'aggrega', icon:'📊', name:'Analista', desc:'Tutti gli esercizi su GROUP BY', cond: s => countDoneInTrack(s,'aggrega') >= trackSize('aggrega')},
  {id:'join', icon:'🔗', name:'Tessitore di tabelle', desc:'5 esercizi con JOIN', cond: s => countDoneInTrack(s,'join') >= 5},
  {id:'sub', icon:'🪆', name:'Matrioska', desc:'Tutte le subquery', cond: s => countDoneInTrack(s,'sub') >= trackSize('sub')},
  {id:'avanzato', icon:'🚀', name:'Avanzato', desc:'3 lezioni di SQL avanzato', cond: s => countDoneInTrack(s,'avanzato') >= 3},
  {id:'modifica', icon:'✏️', name:'Architetto dei dati', desc:'Tutti gli esercizi di modifica', cond: s => countDoneInTrack(s,'modifica') >= trackSize('modifica')},
  {id:'lvl5', icon:'🏆', name:'Veterano', desc:'Raggiungi livello 5', cond: s => s.level >= 5},
  {id:'lvl10', icon:'👑', name:'Esperto', desc:'Raggiungi livello 10', cond: s => s.level >= 10},
  {id:'stars20', icon:'⭐', name:'Stellato', desc:'20 stelle', cond: s => s.stars >= 20},
  {id:'stars50', icon:'🌟', name:'Brilla forte', desc:'50 stelle', cond: s => s.stars >= 50},
  {id:'done25', icon:'📚', name:'Studioso', desc:'25 esercizi', cond: s => s.totalDone >= 25},
  {id:'all', icon:'💯', name:'Completista', desc:'Completa tutte le lezioni', cond: s => s.totalDone >= LESSONS.length},
];
function countDoneInTrack(s, track){
  return LESSONS.filter(l=>l.track===track && s.progress[l.id]?.done).length;
}
function trackSize(track){ return LESSONS.filter(l=>l.track===track).length; }

/* ============ RENDERING ============ */
function renderSidebar(){
  const sb = document.getElementById('sidebar');
  sb.innerHTML = '<div class="drawer-head mobile-only"><span>📚 Lezioni</span><button class="icon-btn" id="btn-lessons-close" aria-label="Chiudi">✕</button></div>';
  document.getElementById('btn-lessons-close').onclick = () => showLessons(false);
  TRACKS.forEach((tr,idx)=>{
    const lessons = LESSONS.filter(l=>l.track===tr.id);
    const done = lessons.filter(l=>S.progress[l.id]?.done).length;
    const div = document.createElement('div');
    div.className = 'track' + (idx===0?' open':'');
    if(S.currentLesson){
      const cur = LESSONS.find(l=>l.id===S.currentLesson);
      if(cur && cur.track===tr.id) div.classList.add('open');
    }
    div.innerHTML = `
      <div class="track-head">
        <div class="track-icon ${tr.cls}">${tr.icon}</div>
        <div class="track-title">${htmlEscape(tr.name)}</div>
        <div class="track-prog">${done}/${lessons.length}</div>
        <span class="caret">▶</span>
      </div>
      <div class="track-list"></div>
    `;
    const list = div.querySelector('.track-list');
    lessons.forEach((l,i)=>{
      const prev = lessons[i-1];
      const unlocked = (i===0) || (prev && S.progress[prev.id]?.done) || S.progress[l.id]?.done;
      const prog = S.progress[l.id];
      let cls = 'lesson-item';
      if(prog?.done) cls += ' done';
      if(prog?.stars >= 3) cls += ' star';
      if(!unlocked) cls += ' locked';
      if(S.currentLesson === l.id) cls += ' active';
      const item = document.createElement('div');
      item.className = cls;
      item.innerHTML = `
        <div class="ldot">${prog?.done?'✓':(unlocked?(i+1):'🔒')}</div>
        <div class="lesson-name">${htmlEscape(l.title)}</div>
        <div class="lesson-xp">+${l.xp}</div>
      `;
      if(unlocked) item.onclick = () => loadLesson(l.id);
      list.appendChild(item);
    });
    div.querySelector('.track-head').onclick = ()=> div.classList.toggle('open');
    sb.appendChild(div);
  });
}

function renderTopStats(){
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('ui-name', S.name);
  set('ui-lvl', S.level);
  set('ui-xp', Math.max(0, Math.round(S.xp - xpTotalUpToLevel(S.level))));
  set('ui-xpneed', xpNeededFor(S.level));
  const fill = document.getElementById('ui-xpfill');
  if(fill){
    const pct = Math.min(100, 100 * (S.xp - xpTotalUpToLevel(S.level)) / xpNeededFor(S.level));
    fill.style.width = pct + '%';
  }
  set('ui-streak', S.streak);
}
function isoDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function renderAll(){
  S.streak = computeStreak();
  renderTopStats();
  renderSidebar();
  pickDailyLessonIfNeeded();
}

/* ============ EDITOR ============ */
let editor = null;
function initEditor(){
  editor = CodeMirror.fromTextArea(document.getElementById('code'), {
    mode: 'text/x-sqlite',
    theme: 'dracula',
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    extraKeys: {
      "Ctrl-Enter": ()=> runCode(),
      "Cmd-Enter": ()=> runCode(),
      "Tab": cm => cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection("  ", "end"),
      "Shift-Tab": cm => cm.indentSelection('subtract'),
    }
  });
  // il codice di ogni lezione resta salvato anche se non è ancora verificato
  editor.on('change', rememberCode);
  initHScroll();
}

let rememberTimer = null, settingCode = false;
function setCode(text){ settingCode = true; editor.setValue(text); settingCode = false; }
function rememberCode(){
  if(settingCode) return;
  clearTimeout(rememberTimer);
  rememberTimer = setTimeout(()=>{
    const code = editor.getValue();
    if(currentLesson && currentLesson.id === '__lab__'){ S.lab = code; saveState(); return; }
    if(!currentLesson || !LESSONS.includes(currentLesson)) return;
    const p = S.progress[currentLesson.id];
    if(p && p.done) return;   // per le lezioni risolte resta la query che ha superato la verifica
    S.progress[currentLesson.id] = Object.assign({done:false, stars:0, attempts:0}, p, {bestCode: code});
    saveState();
  }, 400);
}

/* Barra orizzontale grande sotto l'editor (telefono): si trascina la maniglia, si tocca la
   pista per saltare in quel punto, ◀ ▶ spostano di mezzo schermo (tenendoli premuti continua). */
function initHScroll(){
  const bar = document.getElementById('hscroll');
  const track = document.getElementById('hs-track');
  const thumb = document.getElementById('hs-thumb');
  const PAD = 3;
  const geom = () => {
    const i = editor.getScrollInfo();
    const max = Math.max(0, i.width - i.clientWidth);
    const room = track.clientWidth - 2*PAD;
    const tw = Math.min(room, Math.max(48, room * i.clientWidth / Math.max(1, i.width)));
    return {i, max, room, tw, free: Math.max(1, room - tw)};
  };
  const update = () => {
    if(!track.clientWidth) return;
    const g = geom();
    bar.classList.toggle('off', g.max < 2);
    thumb.style.width = g.tw + 'px';
    thumb.style.left = (PAD + (g.max ? g.free * g.i.left / g.max : 0)) + 'px';
  };
  const scrollTo = x => { const g = geom(); editor.scrollTo(Math.max(0, Math.min(g.max, x)), null); };
  editor.on('scroll', update);
  editor.on('update', update);
  editor.on('refresh', update);
  window.addEventListener('resize', update);

  let drag = null;
  track.addEventListener('pointerdown', e => {
    e.preventDefault();
    const g = geom();
    if(e.target !== thumb){
      const r = track.getBoundingClientRect();
      scrollTo((e.clientX - r.left - PAD - g.tw/2) / g.free * g.max);
    }
    drag = {x: e.clientX, left: editor.getScrollInfo().left};
    track.setPointerCapture(e.pointerId);
    bar.classList.add('dragging');
  });
  track.addEventListener('pointermove', e => {
    if(!drag) return;
    const g = geom();
    scrollTo(drag.left + (e.clientX - drag.x) / g.free * g.max);
  });
  const stop = () => { drag = null; bar.classList.remove('dragging'); };
  track.addEventListener('pointerup', stop);
  track.addEventListener('pointercancel', stop);

  bar.querySelectorAll('.hs-btn').forEach(b => {
    let timer = null;
    const step = () => scrollTo(editor.getScrollInfo().left + b.dataset.dir * editor.getScrollInfo().clientWidth * 0.5);
    const end = () => { clearTimeout(timer); timer = null; };
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); step();
      const again = () => { step(); timer = setTimeout(again, 120); };
      timer = setTimeout(again, 400);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(t => b.addEventListener(t, end));
  });
}

/* ============ CONSOLE ============ */
const consoleBody = document.getElementById('console-body');
let consoleTab = 'out';
let outLogs = [], dbgLogs = [], testLogs = [];

function logTo(tab, html, cls='log-info'){
  const line = `<div class="log-line ${cls}">${html}</div>`;
  if(tab==='out') outLogs.push(line);
  else if(tab==='dbg') dbgLogs.push(line);
  else testLogs.push(line);
  refreshConsole();
}
function refreshConsole(){
  if(consoleTab === 'tab'){ consoleBody.innerHTML = tablesHtml(); consoleBody.scrollTop = 0; return; }
  const logs = consoleTab==='out'?outLogs:consoleTab==='dbg'?dbgLogs:testLogs;
  consoleBody.innerHTML = logs.join('');
  // il risultato di una query si legge dall'inizio; Debug e Test seguono l'ultima riga
  consoleBody.scrollTop = consoleTab === 'out' ? 0 : consoleBody.scrollHeight;
}
function clearConsole(){ outLogs = []; dbgLogs = []; testLogs = []; refreshConsole(); }
function setConsoleTab(tab){
  consoleTab = tab;
  document.querySelectorAll('.ctab').forEach(t=>t.classList.toggle('active', t.dataset.ctab===tab));
}

document.querySelectorAll('.ctab').forEach(el=>{
  el.onclick = ()=>{ setConsoleTab(el.dataset.ctab); refreshConsole(); };
});

function htmlEscape(s){
  return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ============ MOTORE SQL (sql.js) ============ */
let SQL = null, sqlReady = false, sqlFailed = false, sqlLoading = null;
let labDb = null;   // database del laboratorio: le modifiche restano finché non lo si ripristina
function ensureSQL(){
  if(sqlReady) return Promise.resolve(SQL);
  if(sqlFailed) return Promise.reject(new Error('Motore SQL non disponibile'));
  if(sqlLoading) return sqlLoading;
  document.getElementById('py-text').textContent = 'Caricamento SQL…';
  sqlLoading = (async () => {
    try{
      if(typeof initSqlJs !== 'function') throw new Error('Script sql.js non caricato (verifica la connessione internet)');
      SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.2/${f}` });
      sqlReady = true;
      document.getElementById('py-status').classList.add('ready');
      document.getElementById('py-text').textContent = 'SQL pronto (SQLite)';
      return SQL;
    }catch(e){
      sqlFailed = true;
      document.getElementById('py-text').textContent = 'SQL non disponibile';
      const st = document.getElementById('py-status');
      if(st) st.style.background = 'var(--bad)';
      logTo('out', 'Impossibile caricare il motore SQL: ' + htmlEscape(e.message || e) + '\nServe una connessione internet: ricarica la pagina.', 'log-err');
      throw e;
    }finally{ sqlLoading = null; }
  })();
  return sqlLoading;
}
const isLab = () => !!currentLesson && currentLesson.id === '__lab__';
function newDb(){ return Motore.nuovoDb(SQL, SCHEMA); }
function getLabDb(){ if(!labDb) labDb = newDb(); return labDb; }
// Esegue sql su un database nuovo (esercizi) o su quello del laboratorio; il db nuovo viene chiuso.
function withDb(fn, useLab = isLab()){
  if(useLab) return fn(getLabDb());
  const db = newDb();
  try{ return fn(db); } finally{ db.close(); }
}
const hasSql = sql => !!String(sql || '').replace(/--.*$/gm, '').trim();

function formatValue(v){
  if(v === null || v === undefined) return '<span class="null">NULL</span>';
  if(typeof v === 'number') return htmlEscape(Number.isInteger(v) ? v : Math.round(v * 1e6) / 1e6);
  if(v instanceof Uint8Array) return '<span class="null">[dati binari]</span>';
  return htmlEscape(v);
}
function tableHtml(res, max = MAX_ROWS){
  if(!res || !res.colonne.length) return '';
  const head = `<thead><tr>${res.colonne.map(c => `<th>${htmlEscape(c)}</th>`).join('')}</tr></thead>`;
  if(!res.righe.length) return `<table class="res">${head}</table>`;
  const rows = res.righe.slice(0, max);
  return `<table class="res">${head}<tbody>${rows.map(r => `<tr>${r.map(v => `<td${typeof v === 'number' ? ' class="num"' : ''}>${formatValue(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    + (res.righe.length > max ? `<div class="tiny" style="margin-top:6px">Mostrate le prime ${max} righe di ${res.righe.length}.</div>` : '');
}
const rowsLabel = n => `${n} ${n === 1 ? 'riga' : 'righe'}`;

// Riga dell'editor da cui parte il comando che va in errore (sql.js non dà la posizione):
// si eseguono i comandi uno alla volta su una copia e si guarda dove si ferma.
function statementLines(sql, db){
  const out = [];
  let from = 0, err = null;
  const lineAt = pos => sql.slice(0, pos).split('\n').length;
  const skipBlank = pos => {
    const m = /^(\s|--[^\n]*(\n|$)|\/\*[\s\S]*?\*\/)*/.exec(sql.slice(pos));
    return pos + (m ? m[0].length : 0);
  };
  try{
    for(const st of db.iterateStatements(sql)){
      const text = st.getSQL();
      const start = sql.indexOf(text, from);
      const at = start >= 0 ? start : skipBlank(from);
      const item = {sql: text, line: lineAt(at), endLine: lineAt(at + text.length), stmt: st};
      out.push(item);
      from = at + text.length;
      try{
        const cols = st.getColumnNames();
        const rows = [];
        while(st.step()) rows.push(st.get());
        item.cols = cols; item.rows = rows;
      }catch(e){ item.error = String(e && e.message || e); err = item; break; }
      finally{ st.free(); }
    }
  }catch(e){
    // errore di sintassi: il comando che non si riesce nemmeno a leggere parte dopo l'ultimo letto
    const at = skipBlank(from);
    err = {sql: sql.slice(at).split(';')[0], line: lineAt(at), endLine: lineAt(at), error: String(e && e.message || e), parse: true};
    out.push(err);
  }
  return {items: out, err};
}
function errorLineOf(sql){
  try{
    return withDb(db => { const r = statementLines(sql, db); return r.err ? r.err.line : null; }, false);
  }catch(_){ return null; }
}

/* ============ LEZIONE CORRENTE ============ */
let currentLesson = null;

const DIFF_LABELS = ['','FACILE','BASE','MEDIO','DIFFICILE','ESPERTO'];

function testsOf(l){
  const s = l.src;
  if(s.tipo === 'modifica') return [
    'I comandi vengono eseguiti senza errori',
    'I dati dopo i tuoi comandi sono quelli attesi'
  ];
  const t = ['La query viene eseguita senza errori',
    s.colonne ? 'Stesse colonne del risultato atteso, con gli stessi nomi (usa AS)' : 'Stesso numero di colonne del risultato atteso',
    'Stesse righe e stessi valori del risultato atteso'];
  if(s.ordinato) t.push('Righe nello stesso ordine (ORDER BY)');
  return t;
}

function lessonHtml(l){
  const s = l.src;
  const norm = t => t.replace(/\s+/g, ' ').trim();
  // se l'esempio è già scritto nella teoria non si ripete: i pulsanti vanno sotto quel riquadro
  const inTheory = [...s.teoria.matchAll(/<pre>([\s\S]*?)<\/pre>/g)].some(m => norm(m[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')) === norm(s.esempio));
  const actions = `<div class="ex-actions"><button class="btn btn-primary" type="button" data-act="run-example">▶ Esegui l'esempio</button><button class="btn" type="button" data-act="copy-example">📋 Copia nell'editor</button></div><div class="res-box" id="example-result" hidden></div>`;
  let theory = s.teoria;
  if(inTheory){
    let done = false;
    theory = theory.replace(/<pre>([\s\S]*?)<\/pre>/g, (all, inner) => {
      if(done || norm(inner.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')) !== norm(s.esempio)) return all;
      done = true;
      return all + actions;
    });
  }
  const tr = TRACKS.find(t => t.id === l.track);
  return `
    <h2>${tr ? tr.icon + ' ' : ''}${htmlEscape(l.title)}</h2>
    ${theory}
    ${inTheory ? '' : `<div class="ex-box"><div class="ex-head">Esempio da provare</div><pre><code>${htmlEscape(s.esempio)}</code></pre>${actions}</div>`}
    <div class="task-box"><h3>🎯 Esercizio</h3><p>${s.compito}</p>
      ${s.tipo === 'modifica' ? '<p class="note">Ogni esecuzione riparte dai dati originali: puoi riprovare quante volte vuoi.</p>' : ''}
      ${s.ordinato ? '<p class="note">Qui conta anche l\'ordine delle righe.</p>' : ''}
    </div>`;
}

function loadLesson(id){
  const l = LESSONS.find(x=>x.id===id);
  if(!l) return;
  currentLesson = l;
  S.currentLesson = id;
  document.getElementById('lb-title').textContent = l.title;
  const diff = DIFF_LABELS[l.diff] || 'FACILE';
  const diffEl = document.getElementById('lb-diff');
  diffEl.textContent = diff;
  diffEl.className = 'diff-pill diff-' + l.diff;
  const trackInfo = TRACKS.find(t=>t.id===l.track);
  document.getElementById('lb-meta').textContent = trackInfo ? `${trackInfo.icon} ${trackInfo.name} · esercizio ${LESSONS.indexOf(l) + 1} di ${LESSONS.length}` : '';
  document.getElementById('lb-xp').textContent = `+${l.xp} XP`;
  const doneBefore = !!S.progress[l.id]?.done;
  document.getElementById('lesson-panel').innerHTML = `
    ${lessonHtml(l)}
    ${doneBefore ? `<div class="hint" style="background:#ecfdf5; border-color:#a7f3d0; color:#065f46;">✅ Hai già completato questa lezione. Ripassala quanto vuoi: guadagni un piccolo bonus XP una volta al giorno.</div>` : ''}
    <div class="lesson-help">
      ${MINI[l.id] ? `<button class="btn btn-learn" id="btn-open-mini">🎓 Mini-lezione</button>` : ''}
      <button class="btn btn-warn" id="btn-toggle-hint">💡 Mostra suggerimento</button>
      <button class="btn" id="btn-toggle-expected">👁 Risultato atteso</button>
      <button class="btn btn-ghost" id="btn-toggle-solution">🔓 Mostra soluzione</button>
    </div>
    <div id="hint-box" class="help-box" hidden>
      <h3>💡 Suggerimento</h3>
      <p>${htmlEscape(l.hint || 'Nessun suggerimento per questa lezione.')}</p>
    </div>
    <div id="expected-box" class="help-box" hidden></div>
    <div id="solution-box" class="help-box" hidden>
      <h3>🔓 Soluzione</h3>
      <pre><code id="solution-code">${htmlEscape(l.solution || 'Nessuna soluzione fornita.')}</code></pre>
      <button class="btn btn-warn" id="btn-use-solution">📋 Carica nell'editor</button>
    </div>
    <div class="tests-summary">
      <h3>🧪 Cosa controlla la verifica</h3>
      <ul>${testsOf(l).map(t=>`<li>${htmlEscape(t)}</li>`).join('')}</ul>
    </div>
  `;
  document.getElementById('btn-toggle-hint').onclick = ()=>{
    const b = document.getElementById('hint-box');
    b.hidden = !b.hidden;
    Sfx.toggle();
    document.getElementById('btn-toggle-hint').textContent = b.hidden ? '💡 Mostra suggerimento' : '💡 Nascondi suggerimento';
  };
  document.getElementById('btn-toggle-expected').onclick = toggleExpected;
  document.getElementById('btn-toggle-solution').onclick = ()=>{
    const b = document.getElementById('solution-box');
    if(b.hidden && !confirm('Sicuro di voler vedere la soluzione? Conviene provare prima da soli.')) return;
    b.hidden = !b.hidden;
    Sfx.toggle();
    document.getElementById('btn-toggle-solution').textContent = b.hidden ? '🔓 Mostra soluzione' : '🔓 Nascondi soluzione';
  };
  const btnUse = document.getElementById('btn-use-solution');
  if(btnUse) btnUse.onclick = useSolution;
  const btnMini = document.getElementById('btn-open-mini');
  if(btnMini) btnMini.onclick = openMini;

  const saved = S.progress[l.id]?.bestCode;
  if(editor){
    setCode(saved || l.starter || '');
    setTimeout(()=>editor.refresh(), 30);
  }
  clearConsole();
  setConsoleTab('out');
  refreshConsole();
  renderSidebar();
  saveState();
  showLessons(false);
  showView('lesson');
}

// Pulsanti dentro la lezione: esempio da eseguire o da copiare, idee del laboratorio
document.getElementById('lesson-panel').addEventListener('click', e => {
  const idea = e.target.closest('[data-lab]');
  if(idea && isLab()){ setCode(LAB_IDEAS[+idea.dataset.lab][1]); rememberCode(); showView('code'); setTimeout(()=>editor.focus(), 60); return; }
  const b = e.target.closest('[data-act]');
  if(!b || !currentLesson) return;
  if(b.dataset.act === 'run-example') runExample();
  else if(b.dataset.act === 'copy-example'){
    const cur = editor.getValue().trim();
    if(cur && cur !== STARTER.trim() && !confirm('Sostituire la query nell\'editor con l\'esempio?')) return;
    setCode(currentLesson.src.esempio); rememberCode();
    showView('code'); setTimeout(()=>editor.focus(), 60);
  }
  else if(b.dataset.act === 'lab-reset') resetLab();
});

async function runExample(){
  const box = document.getElementById('example-result');
  if(!box || !currentLesson) return;
  try{ await ensureSQL(); }catch(_){ toast('Motore SQL non disponibile', 'bad'); return; }
  Sfx.click();
  const r = withDb(db => Motore.esegui(db, currentLesson.src.esempio), false);
  box.hidden = false;
  if(!r.ok){ box.innerHTML = `<div class="hint" style="background:#fef2f2;border-color:#fecaca;color:#991b1b">⚠ ${htmlEscape(r.errore)}</div>`; return; }
  const n = r.risultato ? r.risultato.righe.length : 0;
  box.innerHTML = r.risultato
    ? `<div class="res-label">Risultato dell'esempio · ${rowsLabel(n)}</div>${n ? tableHtml(r.risultato, 100) : '<p>La query è corretta ma non trova nessuna riga.</p>'}`
    : `<div class="res-label">✔ Comando eseguito</div>`;
}

async function toggleExpected(){
  const b = document.getElementById('expected-box');
  if(!b.hidden){ b.hidden = true; document.getElementById('btn-toggle-expected').textContent = '👁 Risultato atteso'; return; }
  try{ await ensureSQL(); }catch(_){ toast('Motore SQL non disponibile', 'bad'); return; }
  Sfx.toggle();
  let res = null;
  try{ res = Motore.attesoDi(SQL, SCHEMA, currentLesson.src); }catch(e){ res = null; }
  const modifica = currentLesson.src.tipo === 'modifica';
  b.innerHTML = `<h3>👁 Risultato atteso</h3>
    <p class="tiny" style="margin-bottom:8px">${modifica ? 'Come devono essere i dati dopo i comandi giusti' : 'La tabella che deve uscire dalla tua query'}${res ? ' · ' + rowsLabel(res.righe.length) : ''}.</p>
    <div class="res-box">${res ? tableHtml(res, 200) : 'Non disponibile.'}</div>`;
  b.hidden = false;
  document.getElementById('btn-toggle-expected').textContent = '👁 Nascondi risultato atteso';
}

/* ============ TELEFONO: menu lezioni e schede Lezione / Codice ============ */
function showLessons(open){
  document.getElementById('app').classList.toggle('lessons-open', open);
}
function showView(view){
  const app = document.getElementById('app');
  app.dataset.view = view;
  document.querySelectorAll('#view-tabs button').forEach(b=>b.classList.toggle('on', b.dataset.view===view));
  if(view==='code' && editor) setTimeout(()=>editor.refresh(), 0);
  const lp = document.getElementById('lesson-panel');
  if(view==='lesson' && lp) lp.scrollTop = 0;
}
document.getElementById('btn-lessons').onclick = () => showLessons(true);
document.getElementById('drawer-back').onclick = () => showLessons(false);
document.querySelectorAll('#view-tabs button').forEach(b=>{ b.onclick = () => showView(b.dataset.view); });

/* ============ MINI-LEZIONE ============
   Schermata secondaria con una spiegazione veloce dell'esercizio corrente, in 4 schede.
   I contenuti stanno in mini-lezioni.js (SQL_MINI_LESSONS, per id di lezione):
   goal, idea, example {code, note}, steps [...], traps [...]. Il risultato dell'esempio
   non è scritto nel file: lo calcola il motore SQL eseguendo la query. */
const MINI = window.SQL_MINI_LESSONS || {};
const MINI_STEPS = [
  {ico:'🎯', label:'Obiettivo'},
  {ico:'🧠', label:'Concetto'},
  {ico:'🔍', label:'Esempio'},
  {ico:'🪜', label:'Come fare'}
];
let miniData = null, miniStep = 0, miniSeen = new Set();

function openMini(){
  const m = currentLesson && MINI[currentLesson.id];
  if(!m){ toast('Apri una lezione per vedere la sua mini-lezione', ''); return; }
  miniData = m;
  miniSeen = new Set();
  document.getElementById('mini-title').textContent = currentLesson.title;
  const diffEl = document.getElementById('mini-diff');
  diffEl.textContent = DIFF_LABELS[currentLesson.diff] || 'FACILE';
  diffEl.className = 'diff-pill diff-' + currentLesson.diff;
  document.getElementById('mini-steps').innerHTML = MINI_STEPS.map((s, i) =>
    `<button type="button" class="mini-step" data-step="${i}"><span class="ico">${s.ico}</span><span>${s.label}</span></button>`).join('');
  document.querySelectorAll('#mini-steps .mini-step').forEach(b => { b.onclick = () => showMiniStep(+b.dataset.step); });
  document.getElementById('mini-back').hidden = false;
  showMiniStep(0);
  Sfx.toggle();
  setTimeout(()=>{ try{ document.getElementById('mini-next').focus(); }catch(_){} }, 50);
}

function closeMini(){
  const back = document.getElementById('mini-back');
  if(back.hidden) return false;
  back.hidden = true;
  return true;
}

function miniResultHtml(code){
  if(!sqlReady) return '<div class="mini-res"><div class="msg">Il motore SQL si sta ancora caricando: riapri tra un attimo.</div></div>';
  const r = withDb(db => Motore.esegui(db, code), false);
  if(!r.ok) return `<div class="mini-res"><div class="msg" style="color:#fb7185">${htmlEscape(r.errore)}</div></div>`;
  const n = r.risultato ? r.risultato.righe.length : 0;
  return `<div class="mini-res">${r.modificate ? `<div class="msg">✔ ${r.modificate} ${r.modificate === 1 ? 'riga modificata' : 'righe modificate'}</div>` : ''}${r.risultato ? tableHtml(r.risultato, 12) + (n > 12 ? '' : '') : '<div class="msg">✔ Comando eseguito</div>'}</div>`;
}

function miniSlideHtml(m, i){
  if(i === 0) return `
    <h3>🎯 Cosa ti chiede l'esercizio</h3>
    <div class="mini-goal"><p>${m.goal}</p></div>
    <p class="mini-next-hint">Nelle prossime schede: il concetto in breve, un esempio simile e i passi da seguire.</p>`;
  if(i === 1) return `
    <h3>🧠 Il concetto in breve</h3>
    <div class="mini-idea"><p>${m.idea}</p></div>`;
  if(i === 2){
    const ex = m.example;
    return `
    <h3>🔍 Un esempio simile</h3>
    <div class="mini-code">
      <div class="mini-code-head"><span>esempio.sql</span><span>non è la soluzione 😉</span></div>
      <pre>${htmlEscape(ex.code)}</pre>
      <div class="mini-code-head out-head"><span>📤 Risultato</span></div>
      ${miniResultHtml(ex.code)}
    </div>
    ${ex.note ? `<p>${ex.note}</p>` : ''}`;
  }
  return `
    <h3>🪜 Come procedere</h3>
    <ol class="mini-list">${m.steps.map(s => `<li><span>${s}</span></li>`).join('')}</ol>
    ${m.traps && m.traps.length ? `<div class="mini-traps"><h4>⚠️ Errori da evitare</h4><ul>${m.traps.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}`;
}

function showMiniStep(i){
  if(!miniData) return;
  const last = MINI_STEPS.length - 1;
  i = Math.max(0, Math.min(last, i));
  const back = i < miniStep;
  miniStep = i;
  miniSeen.add(i);
  const body = document.getElementById('mini-body');
  body.innerHTML = `<div class="mini-slide${back ? ' back' : ''}">${miniSlideHtml(miniData, i)}</div>`;
  body.scrollTop = 0;
  document.querySelectorAll('#mini-steps .mini-step').forEach(b => {
    const n = +b.dataset.step;
    b.classList.toggle('on', n === i);
    b.classList.toggle('seen', miniSeen.has(n) && n !== i);
    b.setAttribute('aria-current', n === i ? 'step' : 'false');
  });
  document.getElementById('mini-fill').style.width = `${(i + 1) / MINI_STEPS.length * 100}%`;
  document.getElementById('mini-count').textContent = `${i + 1} / ${MINI_STEPS.length}`;
  document.getElementById('mini-prev').disabled = i === 0;
  document.getElementById('mini-next').textContent = i === last ? '💻 Vai al codice' : 'Avanti ▶';
}

function miniNext(){
  if(miniStep < MINI_STEPS.length - 1){ showMiniStep(miniStep + 1); return; }
  closeMini();
  showView('code');
  if(editor) setTimeout(()=>editor.focus(), 60);
}

document.getElementById('btn-mini').onclick = openMini;
document.getElementById('mini-close').onclick = closeMini;
document.getElementById('mini-prev').onclick = () => showMiniStep(miniStep - 1);
document.getElementById('mini-next').onclick = miniNext;
document.getElementById('mini-back').onclick = e => { if(e.target.id === 'mini-back') closeMini(); };
document.addEventListener('keydown', e => {
  if(document.getElementById('mini-back').hidden) return;
  if(e.key === 'ArrowRight'){ e.preventDefault(); showMiniStep(miniStep + 1); }
  else if(e.key === 'ArrowLeft'){ e.preventDefault(); showMiniStep(miniStep - 1); }
});
// Sul telefono si cambia scheda anche scorrendo il dito a destra o a sinistra
(function(){
  const body = document.getElementById('mini-body');
  let x0 = null, y0 = 0;
  body.addEventListener('touchstart', e => { if(e.touches.length === 1){ x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, {passive:true});
  body.addEventListener('touchend', e => {
    if(x0 === null) return;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    // non quando si scorre in orizzontale il codice o la tabella dell'esempio
    if(e.target.closest && e.target.closest('pre, .mini-res')) return;
    if(Math.abs(dx) > 60 && Math.abs(dy) < 45) showMiniStep(miniStep + (dx < 0 ? 1 : -1));
  }, {passive:true});
})();

/* ============ AZIONI ============ */
let dbgErrLine = null, dbgClearOnEdit = false;
function markErrorLine(n){
  if(!editor) return;
  if(dbgErrLine){ editor.removeLineClass(dbgErrLine, 'background', 'cq-err-line'); dbgErrLine = null; }
  if(n && n <= editor.lineCount()){
    dbgErrLine = editor.addLineClass(n - 1, 'background', 'cq-err-line');
    if(!dbgClearOnEdit){ dbgClearOnEdit = true; editor.on('change', ()=>markErrorLine(null)); }
  }
}

// Esegue la query: negli esercizi su un database nuovo, nel laboratorio su quello che conserva le modifiche.
async function runCode(){
  if(!currentLesson) { toast('Seleziona una lezione', ''); return; }
  try{ await ensureSQL(); }catch(_){ return; }
  Sfx.click();
  const code = editor.getValue();
  clearConsole();
  setConsoleTab('out');
  markErrorLine(null);
  if(!hasSql(code)){ logTo('out', 'Scrivi una query nell\'editor e premi ▶ Esegui (o Ctrl+Invio).', 'log-warn'); return; }
  const r = withDb(db => {
    const r = Motore.esegui(db, code);
    // negli esercizi di modifica, dopo INSERT/UPDATE/DELETE si vede come sono diventati i dati
    if(r.ok && !isLab() && currentLesson.src && currentLesson.src.tipo === 'modifica' && !r.risultato){
      const v = Motore.esegui(db, currentLesson.src.verifica);
      if(v.ok){ v.modificate = r.modificate; v.dopo = true; return v; }
    }
    return r;
  });
  showResult(r, code);
}

function showResult(r, code){
  if(!r.ok){
    const line = errorLineOf(code);
    if(line) logTo('out', `❌ Errore nel comando che inizia alla riga ${line}: <code>${htmlEscape((code.split('\n')[line-1] || '').trim())}</code>`, 'log-err');
    logTo('out', '⚠ ' + htmlEscape(r.errore), 'log-err');
    if(r.originale && !r.errore.includes(r.originale)) logTo('out', 'SQLite: ' + htmlEscape(r.originale), 'log-trace');
    markErrorLine(line);
    return;
  }
  const ms = Math.max(1, Math.round(r.tempo));
  if(r.modificate > 0) logTo('out', `✔ ${r.modificate} ${r.modificate === 1 ? 'riga modificata' : 'righe modificate'}.`, 'log-ok');
  if(r.risultato){
    const n = r.risultato.righe.length;
    logTo('out', `${r.dopo ? 'Dati dopo i tuoi comandi' : 'Risultato'} · ${rowsLabel(n)} × ${r.risultato.colonne.length} ${r.risultato.colonne.length === 1 ? 'colonna' : 'colonne'} · ${ms} ms`, 'log-trace');
    if(!n) logTo('out', 'La query è corretta ma non ha trovato nessuna riga.', 'log-warn');
    logTo('out', `<div class="res-scroll">${tableHtml(r.risultato)}</div>`);
  } else if(!r.modificate){
    logTo('out', `✔ Comando eseguito${r.comandi ? '' : ' (nessun comando trovato)'} · ${ms} ms`, 'log-ok');
  }
}

// Debug: i comandi uno alla volta, con il piano di esecuzione di SQLite spiegato in italiano.
function explainPlan(detail){
  const d = String(detail);
  let m;
  if((m = /^SCAN (?:TABLE )?(\S+)(?: AS (\S+))?(?: USING (?:COVERING )?INDEX (\S+))?/i.exec(d)))
    return m[3] ? `legge ${m[1]} in ordine, seguendo l'indice ${m[3]}` : `legge tutte le righe di ${m[1]}${m[2] ? ` (alias ${m[2]})` : ''}`;
  if((m = /^SEARCH (?:TABLE )?(\S+)(?: AS (\S+))? USING (?:COVERING )?INDEX (\S+)/i.exec(d))) return `cerca in ${m[1]} solo le righe giuste, usando l'indice ${m[3]}`;
  if((m = /^SEARCH (?:TABLE )?(\S+)(?: AS (\S+))? USING INTEGER PRIMARY KEY/i.exec(d))) return `trova in ${m[1]} la riga direttamente dalla chiave primaria (id)`;
  if(/USE TEMP B-TREE FOR ORDER BY/i.test(d)) return 'ordina le righe (ORDER BY)';
  if(/USE TEMP B-TREE FOR GROUP BY/i.test(d)) return 'raggruppa le righe (GROUP BY)';
  if(/USE TEMP B-TREE FOR DISTINCT/i.test(d)) return 'toglie i doppioni (DISTINCT)';
  if(/USE TEMP B-TREE FOR/i.test(d)) return 'ordina i risultati intermedi';
  if((m = /^(?:CORRELATED )?(?:SCALAR )?SUBQUERY/i.exec(d))) return /CORRELATED/i.test(d) ? 'subquery correlata: ripetuta per ogni riga' : 'esegue una subquery';
  if((m = /^LIST SUBQUERY/i.exec(d))) return 'prepara l\'elenco della subquery (IN)';
  if((m = /^(?:MATERIALIZE|CO-ROUTINE) (\S+)/i.exec(d))) return `prepara ${m[1]} (subquery o WITH)`;
  if(/^COMPOUND QUERY/i.test(d)) return 'unisce più SELECT (UNION)';
  if(/^(LEFT-MOST|UNION|UNION ALL|INTERSECT|EXCEPT) SUBQUERY/i.test(d)) return 'una delle SELECT unite';
  if(/BLOOM FILTER/i.test(d)) return 'prepara un filtro veloce per la JOIN';
  return '';
}
async function debugCode(){
  if(!currentLesson) return;
  try{ await ensureSQL(); }catch(_){ return; }
  Sfx.click();
  setConsoleTab('dbg');
  dbgLogs = [];
  markErrorLine(null);
  const code = editor.getValue();
  logTo('dbg','🐞 Debug SQL' + (isLab() ? ' (su una copia del database del laboratorio: i dati non cambiano)' : ''),'log-trace');
  if(!hasSql(code)){ logTo('dbg', 'Scrivi prima una query nell\'editor.', 'log-warn'); return; }
  logTo('dbg','─── Codice ───','log-trace');
  const lines = code.split('\n');
  // il debug lavora su una copia: nel laboratorio non cambia i dati veri
  const db = isLab() ? new SQL.Database(getLabDb().export()) : newDb();
  let res;
  try{
    res = statementLines(code, db);
    lines.forEach((line, i) => {
      const bad = res.err && res.err.line === i + 1;
      logTo('dbg', `${String(i+1).padStart(3,' ')} │ ${htmlEscape(line)}${bad ? '   ◀ errore' : ''}`, bad ? 'log-err' : 'log-trace');
    });
    logTo('dbg','─── Esecuzione comando per comando ───','log-trace');
    const planDb = isLab() ? new SQL.Database(getLabDb().export()) : newDb();
    try{
      res.items.forEach((it, k) => {
        const where = it.line === it.endLine ? `riga ${it.line}` : `righe ${it.line}-${it.endLine}`;
        const kind = (/^\s*(\w+)/.exec(it.sql) || [,''])[1].toUpperCase();
        if(it.error){
          logTo('dbg', `✗ Comando ${k+1} (${where})${kind ? ' · ' + kind : ''}: ${htmlEscape(Motore.traduciErrore(it.error))}`, 'log-err');
          return;
        }
        let plan = [];
        if(/^(SELECT|WITH)$/.test(kind)){
          try{
            const p = planDb.exec('EXPLAIN QUERY PLAN ' + it.sql)[0];
            plan = p ? p.values.map(v => explainPlan(v[3])).filter(Boolean) : [];
          }catch(_){ plan = []; }
        }
        try{ planDb.exec(it.sql); }catch(_){}
        const info = it.cols && it.cols.length
          ? `${rowsLabel(it.rows.length)} × ${it.cols.length} ${it.cols.length === 1 ? 'colonna' : 'colonne'}`
          : 'eseguito';
        logTo('dbg', `✓ Comando ${k+1} (${where}) · ${kind}: ${info}`, 'log-ok');
        [...new Set(plan)].forEach(p => logTo('dbg', `&nbsp;&nbsp;→ ${htmlEscape(p)}`, 'log-trace'));
      });
    } finally { planDb.close(); }
    if(res.err){
      logTo('dbg', `✗ Esecuzione interrotta: il comando che inizia alla riga ${res.err.line} va in errore.`, 'log-err');
      markErrorLine(res.err.line);
    } else {
      logTo('dbg', `✓ ${res.items.length} ${res.items.length === 1 ? 'comando eseguito' : 'comandi eseguiti'} senza errori. Il risultato è nella scheda 📤 Risultato (premi ▶ Esegui).`, 'log-ok');
    }
  } finally { db.close(); }
}

// Verifica: il giudizio è quello del motore di SQLQuest (Motore.verifica); qui si mostra
// a quale dei controlli elencati nella lezione si è fermata.
function failedStage(l, v){
  if(v.errore || /Scrivi prima/i.test(v.motivo || '')) return 0;
  if(l.src.tipo === 'modifica') return 1;
  if(/colonn|tabella di risultati/i.test(v.motivo || '')) return 1;
  if(/ordine sbagliato/i.test(v.motivo || '')) return 3;
  return 2;
}
async function checkCode(){
  if(!currentLesson || !LESSONS.includes(currentLesson)){
    toast('Nessun test in questa modalità','');
    return;
  }
  try{ await ensureSQL(); }catch(_){ return; }
  Sfx.click();
  setConsoleTab('tres');
  testLogs = [];
  refreshConsole();
  markErrorLine(null);
  const lesson = currentLesson;
  const code = editor.getValue();
  logTo('tres','▶ Esecuzione test...','log-trace');
  let v;
  try{ v = Motore.verifica(SQL, SCHEMA, lesson.src, code); }
  catch(e){ v = {ok:false, motivo: String(e.message || e)}; }
  // il risultato della query compare anche nella scheda Risultato
  if(hasSql(code)){
    outLogs = [];
    const r = withDb(db => Motore.esegui(db, code), false);
    if(r.ok) showResult(r, code); else { outLogs = []; }
  }
  const tests = testsOf(lesson);
  const total = tests.length;
  let passed = total;
  if(!v.ok){
    const stage = failedStage(lesson, v);
    const line = stage === 0 && hasSql(code) ? errorLineOf(code) : null;
    passed = stage;
    tests.forEach((t, i) => {
      if(i < stage) logTo('tres', `✓ ${htmlEscape(t)}`, 'log-ok');
      else if(i === stage){
        logTo('tres', `✗ ${htmlEscape(t)}`, 'log-err');
        logTo('tres', '&nbsp;&nbsp;→ ' + htmlEscape(v.motivo || 'Il risultato non è quello richiesto.'), 'log-warn');
        if(line) logTo('tres', `&nbsp;&nbsp;→ Il comando che va in errore inizia alla riga ${line}: <code>${htmlEscape((code.split('\n')[line-1] || '').trim())}</code>`, 'log-warn');
      }
      else logTo('tres', `· ${htmlEscape(t)} (non controllato)`, 'log-trace');
    });
    markErrorLine(line);
  } else {
    tests.forEach(t => logTo('tres', `✓ ${htmlEscape(t)}`, 'log-ok'));
  }
  logTo('tres', `\n— Risultato: ${passed}/${total} test passati`, passed===total?'log-ok':'log-warn');
  if(v.ok){
    onLessonSolved(lesson, code);
    const next = nextLessonOf(lesson);
    if(next) logTo('tres', `<button class="btn btn-primary" type="button" onclick="loadLesson('${next.id}'); showView('lesson');">Prossima lezione: ${htmlEscape(next.title)} →</button>`, 'log-ok');
    else if(S.totalDone >= LESSONS.length) logTo('tres', '🎉 Hai completato tutto il percorso!', 'log-ok');
  } else {
    countFailedAttempt(lesson);
    logTo('tres', '💡 Se sei bloccato: nella lezione trovi «🎓 Mini-lezione», «Mostra suggerimento», «Risultato atteso» e «Mostra soluzione».', 'log-trace');
    toast(v.errore ? 'Errore nella query. Controlla la console.' : `Test falliti: ${total-passed}/${total}`, 'bad');
    Sfx.fail();
  }
}
function nextLessonOf(lesson){
  const i = LESSONS.indexOf(lesson);
  return i >= 0 && i < LESSONS.length - 1 ? LESSONS[i + 1] : null;
}

// Le stelle dipendono dai tentativi: anche una verifica fallita e' un tentativo.
function countFailedAttempt(lesson){
  if(!lesson || !LESSONS.includes(lesson)) return;
  const prev = S.progress[lesson.id];
  if(prev && prev.done) return;
  S.progress[lesson.id] = Object.assign({done:false, stars:0, attempts:0, bestCode:''}, prev, {attempts: ((prev && prev.attempts) || 0) + 1});
  saveState();
}

function resetCode(){
  if(!currentLesson) return;
  Sfx.click();
  if(confirm('Riportare il codice al template iniziale?')){
    setCode(currentLesson.starter || '');
    rememberCode();
    toast('Codice ripristinato', '');
  }
}

/* ============ COMPLETAMENTO ============ */
function onLessonSolved(lesson, code){
  const prev = S.progress[lesson.id] || {done:false, stars:0, attempts:0, bestCode:''};
  const isFirst = !prev.done;
  const attempts = (prev.attempts||0) + 1;
  let stars = 1;
  if(attempts === 1) stars = 3;
  else if(attempts <= 3) stars = 2;
  stars = Math.max(prev.stars||0, stars);
  const today = isoDate(new Date());
  // il bonus del ripasso vale una volta al giorno per lezione
  const alreadyToday = !isFirst && prev.reviewed === today;
  S.progress[lesson.id] = { done:true, stars, attempts, bestCode: code, reviewed: today };
  let xpGain = lesson.xp;
  if(!isFirst) xpGain = alreadyToday ? 0 : Math.round(xpGain * 0.2);
  addXP(xpGain);
  if(isFirst){ S.totalDone++; }
  const deltaStars = (stars - (prev.stars||0));
  if(deltaStars>0) S.stars += deltaStars;

  if(S.dailyLesson === lesson.id && S.dailyDone !== today){
    S.dailyDone = today;
    addXP(50);
    toast('🎯 Sfida giornaliera! +50 XP bonus', 'gold');
  }

  updateStreak();
  checkBadges();
  saveState();
  renderAll();
  confettiBurst();
  Sfx.success();
  if(isFirst){
    toast(`✅ Lezione completata! +${xpGain} XP · ${'⭐'.repeat(stars)}`, 'good');
  } else if(xpGain){
    toast(`✨ Test ripassato! +${xpGain} XP`, 'good');
  } else {
    toast('✨ Test ripassato! (il bonus XP del ripasso vale una volta al giorno)', 'good');
  }
}

function addXP(amount){
  S.xp += amount;
  while(S.xp >= xpTotalUpToLevel(S.level+1)){
    S.level++;
    showLevelUp(S.level);
  }
}
function showLevelUp(lvl){
  document.getElementById('lu-title').textContent = `LIVELLO ${lvl}!`;
  document.getElementById('lu-sub').textContent = `Continui a migliorare. Bravo!`;
  document.getElementById('levelup').classList.add('show');
  bigConfetti();
  Sfx.levelup();
}
function checkBadges(silent){
  BADGES.forEach(b=>{
    if(!S.badges.includes(b.id) && b.cond(S)){
      S.badges.push(b.id);
      if(!silent){ toast(`🏆 Badge: ${b.icon} ${b.name}`, 'gold'); Sfx.badge(); }
    }
  });
}
function updateStreak(){
  const today = isoDate(new Date());
  if(!S.activeDays.includes(today)) S.activeDays.push(today);
  S.streak = computeStreak();
  S.lastActive = today;
}
// Giorni consecutivi fino a oggi; se oggi non hai ancora completato nulla la serie resta valida fino a ieri.
function computeStreak(){
  const d = new Date();
  if(!S.activeDays.includes(isoDate(d))) d.setDate(d.getDate()-1);
  let streak = 0;
  while(S.activeDays.includes(isoDate(d))){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}

/* ============ DAILY ============ */
function pickDailyLessonIfNeeded(){
  const today = isoDate(new Date());
  if(!S.dailyLesson || S.dailyDate !== today){
    const unlocked = LESSONS.filter(l=>{
      const all = LESSONS.filter(x=>x.track===l.track);
      const idx = all.indexOf(l);
      if(idx===0) return true;
      return S.progress[all[idx-1].id]?.done;
    });
    const undone = unlocked.filter(l=>!S.progress[l.id]?.done);
    const pool = undone.length ? undone : unlocked;
    if(pool.length){
      const seed = today.split('').reduce((s,c)=>s+c.charCodeAt(0),0);
      const pick = pool[seed % pool.length];
      S.dailyLesson = pick.id;
      S.dailyDate = today;
    }
  }
  saveState();
}

/* ============ SUONI (Web Audio) ============ */
const Sfx = (()=>{
  let ctx = null;
  let enabled = true;
  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; }
    }
    if(ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type='sine', vol=0.18, t0=0){
    const c = ac(); if(!c || !enabled) return;
    const t = c.currentTime + t0;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function chord(freqs, dur, type='sine', vol=0.14, t0=0){
    freqs.forEach(f => tone(f, dur, type, vol, t0));
  }
  return {
    click(){ tone(880, 0.05, 'square', 0.05); },
    success(){
      tone(523.25, 0.16, 'triangle', 0.16, 0);
      tone(659.25, 0.16, 'triangle', 0.16, 0.08);
      tone(783.99, 0.20, 'triangle', 0.18, 0.16);
      tone(1046.5, 0.30, 'triangle', 0.20, 0.26);
    },
    fail(){
      tone(220, 0.18, 'sawtooth', 0.10, 0);
      tone(155, 0.22, 'sawtooth', 0.10, 0.10);
    },
    levelup(){
      tone(523.25, 0.10, 'square', 0.14, 0.00);
      tone(659.25, 0.10, 'square', 0.14, 0.10);
      tone(783.99, 0.10, 'square', 0.14, 0.20);
      tone(1046.5, 0.10, 'square', 0.14, 0.30);
      chord([523.25, 659.25, 783.99, 1046.5], 0.45, 'triangle', 0.12, 0.42);
    },
    badge(){
      tone(1318.5, 0.08, 'sine', 0.14, 0.00);
      tone(1568.0, 0.08, 'sine', 0.14, 0.07);
      tone(1975.5, 0.12, 'sine', 0.14, 0.14);
      tone(2349.3, 0.18, 'sine', 0.12, 0.22);
    },
    toggle(){
      tone(660, 0.06, 'sine', 0.08);
    },
    setEnabled(v){ enabled = !!v; },
    isEnabled(){ return enabled; }
  };
})();

try{
  if(localStorage.getItem(SOUND_KEY) === '0') Sfx.setEnabled(false);
}catch(_){}

/* ============ TOAST & CONFETTI ============ */
function toast(text, kind=''){
  const div = document.createElement('div');
  div.className = 'toast ' + (kind==='good'?'good': kind==='bad'?'bad':kind==='gold'?'gold':'');
  div.innerHTML = `<span>${text}</span>`;
  document.getElementById('toasts').appendChild(div);
  setTimeout(()=> div.remove(), 4000);
}
const conf = document.getElementById('confetti');
const ctx = conf.getContext('2d');
function fitConf(){conf.width=innerWidth; conf.height=innerHeight;}
fitConf(); window.addEventListener('resize', fitConf);
let particles = [];
let _confettiRunning = false;
function confettiBurst(n=70){
  for(let i=0;i<n;i++){
    particles.push({
      x: innerWidth/2 + (Math.random()-.5)*200,
      y: innerHeight/2,
      vx: (Math.random()-.5)*8,
      vy: -Math.random()*10 - 3,
      g: 0.25 + Math.random()*0.2,
      size: 4 + Math.random()*6,
      color: ['#0f766e','#5eead4','#38bdf8','#3ddc97','#f59e0b'][Math.floor(Math.random()*5)],
      life: 100 + Math.random()*50
    });
  }
  if(!_confettiRunning){
    _confettiRunning = true;
    requestAnimationFrame(animateConfetti);
  }
}
function bigConfetti(){ confettiBurst(200); }
function animateConfetti(){
  ctx.clearRect(0,0,conf.width,conf.height);
  particles.forEach(p=>{
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  particles = particles.filter(p=> p.life>0 && p.y < conf.height+20);
  if(particles.length){
    requestAnimationFrame(animateConfetti);
  } else {
    ctx.clearRect(0,0,conf.width,conf.height);
    _confettiRunning = false;
  }
}

/* ============ MODAL ============ */
function openModal(html, actions){
  const back = document.getElementById('modal-back');
  const c = document.getElementById('modal-content');
  c.innerHTML = html + (actions ? `<div class="modal-actions">${actions}</div>`:'');
  back.classList.add('show');
  back.onclick = e=>{ if(e.target===back) back.classList.remove('show'); };
}
function closeModal(){ document.getElementById('modal-back').classList.remove('show'); }

/* ============ DASHBOARD ============ */
function openDashboard(){
  const rk = rankFromXP(S.xp);
  const byTrack = TRACKS.map(t=>{
    const all = LESSONS.filter(l=>l.track===t.id);
    const done = all.filter(l=>S.progress[l.id]?.done).length;
    return {name:t.icon + ' ' + t.name, done, total:all.length, pct: Math.round(100*done/all.length)};
  });

  const today = new Date();
  const dayLabels = ['L','M','M','G','V','S','D'];
  let streakHtml = '<div class="streak-row">';
  for(let i=6;i>=0;i--){
    const d = new Date(today); d.setDate(today.getDate()-i);
    const dStr = isoDate(d);
    const on = S.activeDays.includes(dStr);
    const isToday = (i===0);
    streakHtml += `<div class="day-dot${on?' on':''}${isToday?' today':''}" title="${dStr}">${dayLabels[(d.getDay()+6)%7]}</div>`;
  }
  streakHtml += '</div>';

  const badgesHtml = '<div class="badges-grid">' + BADGES.map(b=>{
    const has = S.badges.includes(b.id);
    return `<div class="badge-tile ${has?'unlocked':'locked'}" title="${b.name} — ${b.desc}">${b.icon}</div>`;
  }).join('') + '</div>';

  const dl = LESSONS.find(l=>l.id===S.dailyLesson);
  const dailyDone = S.dailyDone === isoDate(new Date());
  const dailyHtml = dl ? `
    <div class="card daily-card" style="margin:14px 0;">
      <h4>🎯 Sfida Giornaliera</h4>
      <p style="font-size:13px; margin-bottom:8px; line-height:1.5;"><b>${htmlEscape(dl.title)}</b><br><span class="tiny">${htmlEscape((TRACKS.find(t=>t.id===dl.track)||{}).name || '')}</span></p>
      <p class="reward">${dailyDone ? '✅ Completata oggi' : '+50 XP bonus'}</p>
      <button class="small-btn" onclick="loadLesson('${dl.id}'); closeModal();">${dailyDone?'Rivisita':'Vai alla sfida'}</button>
    </div>` : '';

  const html = `
    <h2>📊 Dashboard di ${htmlEscape(S.name)}</h2>
    <p class="tiny">Membro da ${new Date(S.createdAt).toLocaleDateString('it-IT')}</p>
    <div class="dash-stats">
      <div class="stat-card"><div class="big">${S.level}</div><div class="lbl">Livello</div></div>
      <div class="stat-card"><div class="big">${rk.letter}</div><div class="lbl">Rank · ${rk.label}</div></div>
      <div class="stat-card"><div class="big">${S.totalDone}/${LESSONS.length}</div><div class="lbl">Esercizi</div></div>
      <div class="stat-card"><div class="big">${S.stars}</div><div class="lbl">Stelle</div></div>
      <div class="stat-card"><div class="big">${S.streak}</div><div class="lbl">🔥 Streak</div></div>
      <div class="stat-card"><div class="big">${S.badges.length}/${BADGES.length}</div><div class="lbl">Badge</div></div>
    </div>
    ${dailyHtml}
    <h3 style="margin:14px 0 10px;font-size:14px;">Progresso per traccia</h3>
    ${byTrack.map(t=>`
      <div class="skill-row"><span class="lbl">${htmlEscape(t.name)}</span>
      <div class="skill-bar"><div class="skill-fill" style="width:${t.pct}%"></div></div>
      <span class="skill-val">${t.done}/${t.total}</span></div>
    `).join('')}
    <h3 style="margin:14px 0 8px;font-size:14px;">🔥 Streak ultimi 7 giorni</h3>
    ${streakHtml}
    <h3 style="margin:14px 0 8px;font-size:14px;">🏆 Badge (${S.badges.length}/${BADGES.length})</h3>
    ${badgesHtml}
    <h3 style="margin:14px 0 8px;font-size:14px;">⚡ Strumenti</h3>
    <div style="display:flex; flex-wrap:wrap; gap:8px;">
      <button class="btn btn-ghost" onclick="closeModal(); openLab();">🧪 Laboratorio libero</button>
      <button class="btn btn-ghost" onclick="closeModal(); exportProgress();">💾 Esporta progressi</button>
      <button class="btn btn-ghost" onclick="closeModal(); document.getElementById('import-file').click();">📥 Importa progressi</button>
      <a class="btn btn-ghost" href="../#programmi" style="text-decoration:none">← Torna al sito</a>
    </div>
  `;
  openModal(html, `<button class="btn" onclick="closeModal()">Chiudi</button>`);
}

/* ============ IMPORT / EXPORT / SETTINGS ============ */
function exportProgress(){
  const data = JSON.stringify(S, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sqlquest-progress.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  toast('Progressi esportati!','good');
}
function importProgress(file){
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const obj = JSON.parse(r.result);
      if(obj && typeof obj === 'object'){
        S = Object.assign(structuredClone(DEFAULT_STATE), obj);
        saveState(); renderAll();
        if(S.currentLesson && LESSONS.find(l=>l.id===S.currentLesson)) loadLesson(S.currentLesson);
        toast('Progressi importati!','good');
      }
    }catch(e){ toast('File non valido','bad'); }
  };
  r.readAsText(file);
}
function openSettings(){
  const soundOn = Sfx.isEnabled();
  openModal(`
    <h2>⚙️ Impostazioni</h2>
    <p><b>Nome attuale:</b> ${htmlEscape(S.name)}</p>
    <p>Cambia nome:</p>
    <input id="set-name" type="text" value="${htmlEscape(S.name)}" style="background:var(--bg-2);border:1px solid var(--line);color:var(--text);padding:8px 12px;border-radius:8px;width:100%;font-size:14px;outline:none;">
    <p style="margin-top:16px;"><b>🔊 Suoni</b></p>
    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:14px;">
      <input type="checkbox" id="set-sound" ${soundOn ? 'checked' : ''} style="width:18px; height:18px;">
      <span>Effetti sonori (chime, level-up, badge, ecc.)</span>
    </label>
    <p style="margin-top:16px;"><b>Reset progressi:</b> tutte le lezioni torneranno bloccate.</p>
    <button class="btn btn-warn" id="set-reset">⚠️ Reset Totale</button>
    <p class="tiny" style="margin-top:14px;">Salvataggio automatico in locale.</p>
  `, `<button class="btn" onclick="closeModal()">Annulla</button><button class="btn btn-primary" id="set-save">Salva</button>`);
  document.getElementById('set-save').onclick = ()=>{
    const n = document.getElementById('set-name').value.trim();
    if(n) S.name = n.slice(0,20);
    const so = document.getElementById('set-sound').checked;
    Sfx.setEnabled(so);
    try{ localStorage.setItem(SOUND_KEY, so ? '1' : '0'); }catch(_){}
    saveState(); renderAll(); closeModal();
    toast('Salvato','good');
  };
  document.getElementById('set-reset').onclick = ()=>{
    if(confirm('Azzerare TUTTI i progressi? Non si torna indietro.')){
      const oldName = S.name;
      S = structuredClone(DEFAULT_STATE);
      S.name = oldName;
      S.createdAt = Date.now();
      saveState(); renderAll(); closeModal();
      currentLesson = null;
      document.getElementById('lb-title').textContent = 'Progressi azzerati';
      document.getElementById('lb-meta').textContent = 'Seleziona una lezione per ricominciare';
      document.getElementById('lb-xp').textContent = '+0 XP';
      document.getElementById('lesson-panel').innerHTML = `<h2>🔄 Progressi azzerati</h2><p>Riparti dalla prima lezione!</p>`;
      setCode('');
      clearConsole();
      toast('Tutto azzerato','good');
    }
  };
}

/* ============ LABORATORIO (il "Playground" di CodeQuest) ============ */
const LAB_IDEAS = [
  ['Tutte le tabelle del database', "SELECT name AS tabella, type AS tipo\nFROM sqlite_master\nWHERE type IN ('table', 'view')\nORDER BY name;"],
  ['I 5 clienti che hanno speso di più', "SELECT c.nome, c.cognome,\n  ROUND(SUM(d.quantita * d.prezzo_unitario), 2) AS speso\nFROM clienti c\nJOIN ordini o ON o.cliente_id = c.id\nJOIN dettagli_ordine d ON d.ordine_id = o.id\nWHERE o.stato <> 'annullato'\nGROUP BY c.id\nORDER BY speso DESC\nLIMIT 5;"],
  ['Vendite mese per mese', "SELECT strftime('%Y-%m', o.data_ordine) AS mese,\n  COUNT(DISTINCT o.id) AS ordini,\n  ROUND(SUM(d.quantita * d.prezzo_unitario), 2) AS incasso\nFROM ordini o\nJOIN dettagli_ordine d ON d.ordine_id = o.id\nGROUP BY mese\nORDER BY mese;"],
  ['Crea una tabella e riempila', "CREATE TABLE note (\n  id INTEGER PRIMARY KEY,\n  testo TEXT NOT NULL,\n  creata TEXT DEFAULT (date('now'))\n);\nINSERT INTO note (testo)\nVALUES ('Imparare le JOIN'), ('Ripassare GROUP BY');\nSELECT * FROM note;"]
];
function openLab(){
  S.currentLesson = null;
  currentLesson = {id:'__lab__', track:null, title:'Laboratorio libero', diff:1, xp:0, starter:''};
  document.getElementById('lb-title').textContent = 'Laboratorio';
  document.getElementById('lb-diff').textContent = 'LIBERO';
  document.getElementById('lb-diff').className = 'diff-pill diff-2';
  document.getElementById('lb-meta').textContent = 'Modalità sperimentazione';
  document.getElementById('lb-xp').textContent = 'nessuno';
  document.getElementById('lesson-panel').innerHTML = `
    <h2>🧪 Laboratorio</h2>
    <p>Sperimenta liberamente con SQL sul database del negozio: leggere, creare tabelle, inserire, modificare e cancellare. Qui le modifiche <b>restano</b> finché non ripristini il database.</p>
    <p>Nella scheda <b>🗂 Tabelle</b>, sotto l'editor, trovi tutte le tabelle con le loro colonne: tocca un nome per inserirlo nell'editor, o <b>Anteprima</b> per vedere le prime righe.</p>
    <div class="hint">💡 Puoi scrivere più comandi uno dopo l'altro, separati da punto e virgola: viene mostrato il risultato dell'ultimo SELECT.</div>
    <h3>Idee da provare (tocca per copiarle nell'editor)</h3>
    <div class="lab-ideas">${LAB_IDEAS.map(([t, q], k) => `<p style="margin:12px 0 4px"><b>${htmlEscape(t)}</b></p><pre data-lab="${k}"><code>${htmlEscape(q)}</code></pre>`).join('')}</div>
    <div class="lesson-help"><button class="btn btn-warn" type="button" data-act="lab-reset">↺ Ripristina il database originale</button></div>`;
  setCode(S.lab || '-- Sperimenta liberamente!\nSELECT * FROM prodotti LIMIT 5;\n');
  clearConsole();
  setConsoleTab('out');
  refreshConsole();
  renderSidebar();
  saveState();
  showView('code');
}
function resetLab(){
  if(!confirm('Ripristinare il database originale? Le tabelle e i dati che hai cambiato nel laboratorio andranno persi.')) return;
  if(labDb){ labDb.close(); labDb = null; }
  toast('Database ripristinato', 'good');
  clearConsole();
}

/* ============ SCHEDA TABELLE ============ */
function tablesHtml(){
  if(!sqlReady) return '<div class="log-line log-trace">Il motore SQL si sta caricando…</div>';
  return withDb(db => {
    const list = db.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name")[0];
    const names = list ? list.values : [];
    const q = s => s.replace(/'/g, "''");
    return `<p class="tables-note">${names.length} ${names.length === 1 ? 'tabella' : 'tabelle'}${isLab() ? ' nel database del laboratorio' : ' (ogni esercizio parte da questi dati)'} · tocca un nome per scriverlo nell'editor</p><div class="tables">${names.map(([name, type]) => {
      const col = db.exec(`SELECT name, type, pk FROM pragma_table_info('${q(name)}')`)[0];
      const fk = db.exec(`SELECT "from", "table" FROM pragma_foreign_key_list('${q(name)}')`)[0];
      const fks = Object.fromEntries((fk ? fk.values : []).map(([c, t]) => [c, t]));
      let rows = '?';
      try{ rows = db.exec(`SELECT COUNT(*) FROM "${name.replace(/"/g, '""')}"`)[0].values[0][0]; }catch(_){}
      return `<div class="tcard"><h3>${type === 'view' ? '👁' : '▦'} <button type="button" class="ins" data-ins="${htmlEscape(name)}">${htmlEscape(name)}</button><small>${rows} righe</small></h3>
        <ul>${(col ? col.values : []).map(([c, t, pk]) => `<li><button type="button" class="ins" data-ins="${htmlEscape(c)}">${htmlEscape(c)}</button><span class="type">${htmlEscape(t || '')}</span>${pk ? '<span class="key" title="Chiave primaria">PK</span>' : ''}${fks[c] ? `<span class="key fk" title="Collegata a ${htmlEscape(fks[c])}">→ ${htmlEscape(fks[c])}</span>` : ''}</li>`).join('')}</ul>
        <button class="btn" type="button" data-preview="${htmlEscape(name)}">Anteprima</button></div>`;
    }).join('')}</div>`;
  });
}
consoleBody.addEventListener('click', e => {
  const ins = e.target.closest('[data-ins]');
  if(ins && editor){ editor.replaceSelection(ins.dataset.ins); showView('code'); editor.focus(); return; }
  const pv = e.target.closest('[data-preview]');
  if(pv){
    const name = pv.dataset.preview;
    const sql = `SELECT * FROM ${/^[a-z_][a-z0-9_]*$/i.test(name) ? name : `"${name.replace(/"/g, '""')}"`} LIMIT 20;`;
    outLogs = [];
    setConsoleTab('out');
    logTo('out', `Anteprima di ${htmlEscape(name)} (prime 20 righe)`, 'log-trace');
    const r = withDb(db => Motore.esegui(db, sql));
    if(r.ok && r.risultato) logTo('out', `<div class="res-scroll">${tableHtml(r.risultato)}</div>`);
    else logTo('out', htmlEscape(r.errore || 'Anteprima non disponibile'), 'log-err');
  }
});

/* ============ SOLUZIONE ============ */
function useSolution(){
  if(!currentLesson || !currentLesson.solution) return;
  const current = (editor.getValue() || '').trim();
  const starter = (currentLesson.starter || '').trim();
  if(current && current !== starter){
    if(!confirm('Sostituire il tuo codice corrente con la soluzione?')) return;
  }
  setCode(currentLesson.solution);
  rememberCode();
  showView('code');
  toast('Soluzione caricata. Premi ▶ per eseguirla!','');
}

/* ============ RIPASSO ============ */
function pickRandomDone(){
  const done = LESSONS.filter(l => S.progress[l.id]?.done);
  if(!done.length) return null;
  let pool = done;
  if(currentLesson){
    const filtered = done.filter(l => l.id !== currentLesson.id);
    if(filtered.length) pool = filtered;
  }
  return pool[Math.floor(Math.random()*pool.length)];
}
function doRipasso(){
  const r = pickRandomDone();
  if(!r){
    toast('Completa almeno una lezione per iniziare a ripassare', '');
    return;
  }
  toast(`🔄 Ripasso: ${htmlEscape(r.title)}`, 'gold');
  loadLesson(r.id);
  // si riparte dal codice iniziale: con la soluzione gia' nell'editor non sarebbe un ripasso
  setCode(r.starter || '');
  showView('code');
}

/* ============ EVENTI ============ */
document.getElementById('btn-run').onclick = runCode;
document.getElementById('btn-check').onclick = checkCode;
document.getElementById('btn-debug').onclick = debugCode;
document.getElementById('btn-reset').onclick = resetCode;
document.getElementById('btn-ripasso').onclick = doRipasso;
document.getElementById('btn-clear-console').onclick = clearConsole;
document.getElementById('btn-dashboard').onclick = openDashboard;
document.getElementById('btn-settings').onclick = openSettings;
document.getElementById('import-file').onchange = e=>{ const f=e.target.files[0]; if(f) importProgress(f); };

/* ============ FULLSCREEN ============ */
function goFullscreen(){
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if(req) try{ const p = req.call(el); if(p && p.catch) p.catch(()=>{}); }catch(_){}
}
function toggleFullscreen(){
  const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  if(isFs){
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(exit) exit.call(document);
  } else {
    goFullscreen();
  }
}

/* ============ START ============ */
let _appStarted = false;
function startApp(){
  if(_appStarted) return;
  _appStarted = true;
  const name = document.getElementById('welcome-name').value.trim();
  if(name) S.name = name.slice(0,20);
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('app').style.display = 'grid';
  initEditor();
  setTimeout(()=>editor && editor.refresh(), 50);
  if(S.migrated){
    // progressi della versione precedente: badge assegnati senza festeggiamenti, un avviso solo
    delete S.migrated;
    S.streak = computeStreak();
    checkBadges(true);
    if(S.totalDone) setTimeout(()=>toast(`Ho recuperato i tuoi progressi: ${S.totalDone} esercizi già completati`, 'good'), 600);
  }
  renderAll();
  if(S.currentLesson && LESSONS.find(l=>l.id===S.currentLesson)){
    loadLesson(S.currentLesson);
  }
  saveState();
  goFullscreen();
  ensureSQL().then(()=>{ if(consoleTab === 'tab') refreshConsole(); }).catch(()=>{});
}
const btnFs = document.getElementById('btn-fullscreen');
if(btnFs) btnFs.onclick = toggleFullscreen;

document.getElementById('welcome-start').onclick = startApp;
document.getElementById('welcome-name').addEventListener('keydown', e=>{ if(e.key==='Enter') startApp(); });
if(S.lastActive || S.totalDone){
  // Utente di ritorno: precompila nome e personalizza il pulsante
  if(S.name !== 'Player') document.getElementById('welcome-name').value = S.name;
  const btn = document.getElementById('welcome-start');
  if(btn) btn.textContent = S.name !== 'Player' ? `Continua, ${S.name} 🚀` : 'Continua 🚀';
}
setTimeout(()=>{ try{ document.getElementById('welcome-name').focus(); }catch(_){} }, 100);
// il motore SQL comincia a caricarsi subito, mentre si scrive il nome
ensureSQL().catch(()=>{});

document.addEventListener('keydown', e=>{ if(e.key === 'Escape'){ if(!closeMini()) closeModal(); } });

(() => {
  'use strict';

  /* =========================================================
     Dati
     ========================================================= */

  const DEFAULT_DATA = {
    version: 1,
    settings: {
      siteName: 'Il mio sito',
      tagline: 'Programmi, giochi e contatti',
      homeEyebrow: '',
      homeTitle: '',
      homeIntro: '',
      homePoints: '',
      painPoints: '',
      steps: '',
      ctaTitle: '',
      ctaText: '',
      aboutTitle: '',
      aboutIntro: '',
      aboutCta: '',
      values: '',
      siteAbout: '',
      certsIntro: '',
      photo: '',
      skills: '',
      services: '',
      programsIntro: 'I programmi che ho sviluppato: cosa fanno, come funzionano e come provarli.',
      tradingIntro: 'I miei programmi per chi investe e fa trading: dati ufficiali, analisi dei mercati e intelligenza artificiale.',
      gamesIntro: 'Giochi da fare direttamente nel browser, anche da telefono: niente da scaricare né installare.',
      toolsIntro: 'Strumenti pratici per il lavoro di tutti i giorni, da usare direttamente nel browser.',
      ownerName: '',
      email: '',
      phone: '',
      whatsapp: '',
      city: '',
      website: '',
      instagram: '',
      facebook: '',
      linkedin: '',
      about: ''
    },
    programs: [],
    certificates: []
  };

  // Sezioni della pagina Programmi: ogni programma appartiene a una delle schede.
  const PROGRAM_SECTIONS = [
    { value: 'apprendimento', route: 'programmi', nav: 'Apprendimento', title: "Programmi per l'apprendimento", introKey: 'programsIntro' },
    { value: 'finanza', route: 'trading', nav: 'Trading e finanza', title: 'Programmi per trading e finanza', introKey: 'tradingIntro' },
    { value: 'strumenti', route: 'strumenti', nav: 'Strumenti', title: 'Strumenti utili', introKey: 'toolsIntro' },
    { value: 'giochi', route: 'giochi', nav: 'Giochi', title: 'Giochi', introKey: 'gamesIntro' }
  ];
  const sectionByValue = (v) => PROGRAM_SECTIONS.find((s) => s.value === v) || PROGRAM_SECTIONS[0];

  /* =========================================================
     Lingue
     =========================================================
     L'italiano è la lingua base: i testi dell'interfaccia sono qui sotto (UI_IT) e i contenuti
     in data.json, modificabili dal Gestore. Le altre lingue stanno in lang/<codice>.json:
     "ui" (testi dell'interfaccia), "settings", "programs", "certificates" (contenuti tradotti)
     e "source" (impronta del testo italiano da cui è nata ogni traduzione, per accorgersi
     quando l'italiano cambia). L'area admin resta sempre in italiano. */

  const LANGS = [
    { code: 'it', name: 'Italiano', locale: 'it-IT' },
    { code: 'en', name: 'English', locale: 'en-GB' },
    { code: 'es', name: 'Español', locale: 'es-ES' },
    { code: 'de', name: 'Deutsch', locale: 'de-DE' },
    { code: 'fr', name: 'Français', locale: 'fr-FR' },
    { code: 'pt', name: 'Português', locale: 'pt-BR' }
  ];
  // Contenuti di data.json che vengono tradotti (gli stessi elenchi sono in admin/traduzioni.py).
  const TR_FIELDS = {
    settings: ['tagline', 'homeEyebrow', 'homeTitle', 'homeIntro', 'homePoints', 'painPoints', 'services', 'steps', 'certsIntro',
      'ctaTitle', 'ctaText', 'aboutTitle', 'aboutIntro', 'about', 'skills', 'values', 'siteAbout', 'aboutCta',
      'programsIntro', 'tradingIntro', 'toolsIntro', 'gamesIntro', 'city'],
    programs: ['name', 'tagline', 'platform', 'description', 'features', 'trialLabel', 'trialInfo', 'requirements'],
    certificates: ['title']
  };

  const UI_IT = {
    navHome: 'Home', navAbout: 'Chi sono', navLearning: 'Apprendimento', navTrading: 'Trading e finanza', navTools: 'Strumenti', navGames: 'Giochi',
    sec_apprendimento: "Programmi per l'apprendimento", sec_finanza: 'Programmi per trading e finanza', sec_strumenti: 'Strumenti utili', sec_giochi: 'Giochi',
    langLabel: 'Lingua', close: 'Chiudi', menuLabel: 'Menu',
    metaDescription: 'Daniele Coccolo crea automazioni su misura per aziende e professionisti: meno lavoro ripetitivo al computer, con Python, Excel, SQL e intelligenza artificiale.',
    emptyGames: 'Nessun gioco pubblicato', emptyGamesSub: 'A breve troverai qui i miei giochi.',
    emptyPrograms: 'Nessun programma pubblicato', emptyProgramsSub: 'A breve troverai qui i miei programmi.',
    zoom: 'Ingrandisci', zoomImage: "Ingrandisci l'immagine di {name}",
    playNow: 'Gioca ora', version: 'Versione {v}', trialMode: 'Modalità di prova',
    download: 'Scarica il programma', openProgram: 'Apri il programma', askInfo: 'Chiedi informazioni senza impegno', requirements: 'Requisiti di sistema',
    appLangNote: 'Interfaccia in italiano',
    demoAria: 'Esempio di automazione: 248 fatture elaborate in 41 secondi invece di circa 3 ore',
    demoFile: 'automazione_fatture.py', demoRunning: 'in esecuzione',
    demoStep1: 'Lette 248 fatture PDF dalla cartella', demoStep2: 'Estratti importi, date e clienti',
    demoStep3: 'Aggiornato il foglio Excel "Contabilità"', demoStep4: 'Inviato il riepilogo via email',
    demoWith: "Con l'automazione", demoWithValue: '41 secondi', demoBefore: 'Prima, a mano', demoBeforeValue: 'circa 3 ore',
    demoCaption: "Un esempio del lavoro che un'automazione può fare al posto tuo.",
    heroCta: 'Contattami gratuitamente e senza impegno',
    heroBadge: 'Prima consulenza gratuita', aboutLink: 'Scopri chi sono →',
    exampleTitle: 'Un esempio concreto',
    exampleText: "Immagina di ricevere ogni mese centinaia di fatture in PDF e di doverle ricopiare a mano in Excel: ore di lavoro ripetitivo e il rischio continuo di sbagliare un numero. Un'automazione può leggerle, estrarre i dati e aggiornare il foglio da sola, in meno di un minuto. Ogni azienda ha il suo «lavoro delle fatture»: raccontami il tuo.",
    exampleCta: 'Parliamone, senza impegno',
    painsTitle: 'Ti riconosci?', painsSub: 'Sono le attività che rubano più tempo in ufficio. E quasi sempre si possono automatizzare.',
    painsClose: 'Se hai annuito almeno una volta,', painsCloseStrong: "c'è qualcosa che posso automatizzare per te.",
    servicesTitle: 'Cosa posso fare per te', servicesSub: 'Ogni soluzione è costruita su misura per il tuo modo di lavorare, con gli strumenti che usi già.',
    stepsTitle: 'Come funziona', stepsSub: 'Semplice e trasparente, dal primo messaggio alla soluzione funzionante.',
    builtTitle: 'Cosa ho già costruito', builtSub: 'La prova concreta di quello che so fare: programmi completi che puoi provare subito, direttamente dal browser.',
    programs_one: '{n} programma', programs_other: '{n} programmi', games_one: '{n} gioco', games_other: '{n} giochi', discoverMore: 'Scopri di più',
    certsTitle: 'Formazione certificata', courses_one: '{n} corso completato', courses_other: '{n} corsi completati',
    trainingHours: '{h} di formazione', hours_one: '{n} ora', hours_other: '{n} ore',
    zoomCert: "Ingrandisci l'attestato {t}", certAlt: 'Attestato: {t}',
    verifyCert: "Verifica l'autenticità sul sito di {issuer} ↗", verifyIssuerFallback: "chi l'ha rilasciato",
    ctaDefault: 'Hai un lavoro che ti ruba ore ogni settimana?', writeMe: 'Scrivimi',
    aboutHello: 'Ciao, sono {name}', contactMe: 'Contattami senza impegno', seeProjects: 'Guarda i miei progetti',
    storyTitle: 'La mia storia', storyEmpty: 'Presentazione in arrivo.',
    factPrograms_one: 'programma pubblicato', factPrograms_other: 'programmi pubblicati',
    factGames_one: 'gioco nel browser', factGames_other: 'giochi nel browser',
    factCourses_one: 'corso certificato', factCourses_other: 'corsi certificati', factHours: 'ore di formazione',
    skillsVar: 'competenze', seeCerts: 'Vedi gli attestati →', valuesTitle: 'Come lavoro', siteTitle: 'Questo sito',
    aboutCtaDefault: 'Hai un problema da risolvere al computer? *Parliamone, senza impegno.*',
    contactsTitle: 'Contatti', contactsSub: 'Scrivimi in tutta libertà: il primo contatto è gratuito e non ti impegna a nulla. Raccontami in poche righe cosa ti fa perdere tempo o quale problema vuoi risolvere, e ti rispondo il prima possibile.',
    formTitle: 'Scrivimi senza impegno', formName: 'Il tuo nome', formMessage: 'Messaggio', formPlaceholder: 'Di cosa vuoi parlarmi?', formSend: 'Invia messaggio',
    contactsBox: 'Recapiti', cEmail: 'Email', cPhone: 'Telefono', cArea: 'Zona', cWebsite: 'Sito web', contactsEmpty: 'Contatti in arrivo.',
    formNeedMessage: 'Scrivi un messaggio', mailSubject: 'Messaggio dal sito', mailOpening: 'Si sta aprendo il tuo programma di posta'
  };

  const i18n = { lang: 'it', pack: null };
  const isLang = (c) => LANGS.some((l) => l.code === c);
  const locale = () => (LANGS.find((l) => l.code === i18n.lang) || LANGS[0]).locale;

  // Lingua iniziale: ?lang= nell'indirizzo, poi l'ultima scelta, poi la lingua del browser; altrimenti inglese.
  function pickLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (isLang(q)) return q;
    const saved = localGet('lang');
    if (isLang(saved)) return saved;
    for (const l of navigator.languages || [navigator.language || '']) {
      const c = String(l).slice(0, 2).toLowerCase();
      if (isLang(c)) return c;
    }
    return 'en';
  }

  async function loadLang(code) {
    let pack = null;
    if (code !== 'it') {
      try {
        const res = await fetch(`lang/${code}.json`, { cache: 'no-cache' });
        if (res.ok) pack = await res.json();
      } catch (_) { /* file mancante: si resta in italiano */ }
      if (!pack) code = 'it';
    }
    i18n.lang = code;
    i18n.pack = pack;
    document.documentElement.lang = code;
  }

  function t(key, vars) {
    const ui = i18n.pack && i18n.pack.ui;
    let s = ui && ui[key] != null ? ui[key] : UI_IT[key] != null ? UI_IT[key] : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  function fmtNum(n) { return Number(n).toLocaleString(locale(), { maximumFractionDigits: 1 }); }
  // Plurali: chiave_one / chiave_other, secondo le regole della lingua.
  function tn(key, n, vars) {
    const form = new Intl.PluralRules(locale()).select(n) === 'one' ? 'one' : 'other';
    return t(`${key}_${form}`, Object.assign({ n: fmtNum(n) }, vars));
  }

  // Dati visti dai visitatori: l'italiano di data.json con sopra la traduzione nella lingua scelta.
  // Un testo tolto in italiano resta tolto anche nelle altre lingue.
  function overlay(base, tr, fields) {
    if (!tr) return base;
    const out = Object.assign({}, base);
    for (const k of fields) if (base[k] && typeof tr[k] === 'string' && tr[k]) out[k] = tr[k];
    if (tr.langNote) out.langNote = tr.langNote;
    return out;
  }
  function localizedData() {
    const d = state.data;
    const p = i18n.pack;
    if (!p) return d;
    const each = (list, map, fields) => list.map((x) => overlay(x, map && map[x.id], fields));
    return Object.assign({}, d, {
      settings: overlay(d.settings, p.settings, TR_FIELDS.settings),
      programs: each(d.programs, p.programs, TR_FIELDS.programs),
      certificates: each(d.certificates, p.certificates, TR_FIELDS.certificates)
    });
  }

  async function setLang(code) {
    if (!isLang(code)) return;
    localSet('lang', code);
    const url = new URL(location.href);
    url.searchParams.set('lang', code);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    await loadLang(code);
    render();
  }
  // L'area admin esiste solo sulla copia del sito in questo PC, mai su quella online.
  const IS_LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  // Servizio che raccoglie le statistiche del sito (cartella insight/). Online è sempre attivo;
  // sul PC solo per prova, aprendo il sito con ?insight=http://127.0.0.1:8788
  const INSIGHT_URL = 'https://danishop-insight.coccolo-daniele.workers.dev';

  const state = {
    data: clone(DEFAULT_DATA),
    published: clone(DEFAULT_DATA),
    hasDraft: false,
    isAdmin: sessionGet('admin_ok') === '1' || isRemembered(),
    route: 'home',
    adminTab: 'programmi',
    insight: { days: 30, data: null, loading: false, error: '' },
    editing: null,
    localServer: false
  };

  /* ---------- IndexedDB (bozze locali dell'admin) ---------- */

  const idb = (() => {
    let dbPromise = null;
    function open() {
      if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
          const req = indexedDB.open('shop-usato', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('kv');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      return dbPromise;
    }
    async function run(mode, fn) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('kv', mode);
        const req = fn(tx.objectStore('kv'));
        tx.oncomplete = () => resolve(req && req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }
    return {
      get: (key) => run('readonly', (s) => s.get(key)).catch(() => undefined),
      set: (key, val) => run('readwrite', (s) => s.put(val, key)),
      del: (key) => run('readwrite', (s) => s.delete(key))
    };
  })();

  async function loadData() {
    let published = null;
    try {
      const res = await fetch('data.json', { cache: 'no-store' });
      if (res.ok) published = await res.json();
    } catch (_) { /* aperto da file:// o file mancante */ }
    state.published = normalize(published);

    // Le bozze servono solo all'area admin senza Gestore. Online, e nel Gestore (che salva
    // ogni modifica direttamente nel sito), fa fede data.json: una bozza rimasta in memoria
    // nel browser mostrerebbe per sempre una versione vecchia.
    const useDraft = isLocalHost() && !state.localServer;
    const draft = useDraft ? await idb.get('draft') : null;
    if (!useDraft) await idb.del('draft').catch(() => {});
    if (draft) {
      state.data = normalize(draft);
      state.hasDraft = JSON.stringify(state.data) !== JSON.stringify(state.published);
    } else {
      state.data = clone(state.published);
      state.hasDraft = false;
    }
  }

  function normalize(raw) {
    const d = clone(DEFAULT_DATA);
    if (!raw || typeof raw !== 'object') return d;
    d.settings = Object.assign(d.settings, raw.settings || {});
    d.programs = Array.isArray(raw.programs) ? raw.programs.map((p) => Object.assign({
      id: uid(), name: '', tagline: '', image: '', platform: '', version: '', description: '',
      features: '', trialLabel: '', trialInfo: '', trialUrl: '', requirements: '', category: PROGRAM_SECTIONS[0].value
    }, p)).map((p) => Object.assign(p, { category: sectionByValue(p.category).value })) : [];
    d.certificates = Array.isArray(raw.certificates) ? raw.certificates.map((c) => Object.assign(newCert(), c)) : [];
    // Articoli e libri delle schede Shop usato e Libri (tolte dal sito): non si vedono più,
    // ma restano nel file così come sono.
    if (Array.isArray(raw.items)) d.items = raw.items;
    if (Array.isArray(raw.books)) d.books = raw.books;
    return d;
  }

  function newCert() {
    return { id: uid(), title: '', issuer: '', teacher: '', tag: '', date: '', hours: '', url: '', image: '' };
  }

  function isLocalHost() { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname); }

  async function detectLocalServer() {
    if (!isLocalHost()) return;
    try {
      const res = await fetch('/api/ping', { cache: 'no-store' });
      const out = await res.json();
      state.localServer = out.app === 'gestione-sito';
    } catch (_) { state.localServer = false; }
  }

  async function saveDraft() {
    try {
      await idb.set('draft', state.data);
      state.hasDraft = JSON.stringify(state.data) !== JSON.stringify(state.published);
      // Nel Gestore sul PC ogni salvataggio va subito nel sito (e da lì online).
      if (state.localServer && state.hasDraft) await writeToSite();
      updateChrome();
      return true;
    } catch (err) {
      toast('Impossibile salvare: spazio del browser esaurito? Riduci il numero di foto.', true);
      return false;
    }
  }

  /* =========================================================
     Utilità
     ========================================================= */

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function sessionGet(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } }
  function sessionSet(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (_) {} }
  function localGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function localSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} }

  // "Ricordami": vale finché la password non cambia (il token è legato al suo hash).
  function isRemembered() {
    try {
      const stored = JSON.parse(localGet('admin_pass') || 'null');
      return !!stored && localGet('admin_remember') === stored.hash;
    } catch (_) { return false; }
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // Testo con i link (http/https) resi cliccabili; tutto il resto resta testo semplice.
  function linkify(v) {
    return esc(v).replace(/https?:\/\/[^\s<]+/g, (m) => {
      const url = m.replace(/[.,;:!?)\]]+$/, '');
      return `<a href="${url}" target="_blank" rel="noopener">${url}</a>${m.slice(url.length)}`;
    });
  }
  function safeImg(src) { return typeof src === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(src) ? src : ''; }
  function safeUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(u)) return 'https://' + u;
    return '';
  }
  const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  function money(n) { return eur.format(Number(n) || 0); }
  function num(v) { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; }

  function waNumber(n) {
    let d = String(n || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (/^3\d{8,9}$/.test(d)) d = '39' + d;
    return d;
  }

  let toastTimer = null;
  function toast(msg, isError) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  async function sha256(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return 'x' + (h >>> 0).toString(16);
  }

  function compressImage(file, maxSide = 1280, quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error('Non è un\'immagine'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non leggibile')); };
      img.src = url;
    });
  }

  const ICONS = {
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m0 0-4-4m4 4 4-4"/><path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1"/></svg>'
  };

  function noPhoto() { return `<div class="no-photo">${ICONS.photo}</div>`; }

  /* =========================================================
     Modale
     ========================================================= */

  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const modalCard = modal.querySelector('.modal-card');
  let lastFocus = null;

  function openModal(html, opts = {}) {
    lastFocus = document.activeElement;
    modalBody.innerHTML = html;
    modalCard.classList.toggle('narrow', !!opts.narrow);
    modalCard.classList.toggle('wide', !!opts.wide);
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modalCard.scrollTop = 0;
    const first = modalBody.querySelector('input, button, a');
    (first || modalCard).focus({ preventScroll: true });
  }
  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = '';
    document.body.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  /* =========================================================
     Router
     ========================================================= */

  const app = document.getElementById('app');

  function currentRoute() {
    const r = location.hash.replace(/^#\/?/, '').split('/')[0];
    if (ANCHORS[r]) return ANCHORS[r];
    if (r === 'info') return 'home';
    if (r === 'chi-sono') return 'chisono';
    return ['home', 'chisono', 'admin'].concat(PROGRAM_SECTIONS.map((x) => x.route)).includes(r) ? r : 'home';
  }

  function render() {
    state.route = currentRoute();
    state.view = localizedData();
    insight.section(state.route);
    updateChrome();
    const views = { home: renderHome, chisono: renderAbout, admin: renderAdmin };
    const section = PROGRAM_SECTIONS.find((x) => x.route === state.route);
    app.innerHTML = section ? renderPrograms(section) : views[state.route]();
    afterRender();
  }

  function updateChrome() {
    const s = (state.view || state.data).settings;
    document.getElementById('brandName').textContent = s.siteName || 'Il mio sito';
    document.getElementById('brandTagline').textContent = s.tagline || '';
    const titles = { home: s.tagline || t('navHome'), chisono: t('navAbout'), admin: 'Area admin' };
    PROGRAM_SECTIONS.forEach((x) => { titles[x.route] = t('sec_' + x.value); });
    const navKeys = { home: 'navHome', chisono: 'navAbout', programmi: 'navLearning', trading: 'navTrading', strumenti: 'navTools', giochi: 'navGames' };
    document.querySelectorAll('[data-nav]').forEach((a) => { a.querySelector('span').textContent = t(navKeys[a.dataset.nav]); });
    const pick = document.getElementById('langSelect');
    if (!pick.options.length) pick.innerHTML = LANGS.map((l) => `<option value="${l.code}">${esc(l.name)}</option>`).join('');
    pick.value = i18n.lang;
    pick.setAttribute('aria-label', t('langLabel'));
    document.getElementById('menuToggle').setAttribute('aria-label', t('menuLabel'));
    document.querySelector('meta[name="description"]').setAttribute('content', t('metaDescription'));
    document.querySelectorAll('.modal-x').forEach((b) => b.setAttribute('aria-label', t('close')));
    document.title = `${titles[state.route]} · ${s.siteName || 'Il mio sito'}`;
    document.getElementById('footerText').textContent = `© ${new Date().getFullYear()} ${s.ownerName || s.siteName || ''}`;
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === state.route));
    document.querySelector('.footer-lock').hidden = !IS_LOCAL;
    document.getElementById('draftBanner').hidden = !(state.hasDraft && state.isAdmin && state.route !== 'admin');
  }

  // Sul telefono le schede stanno in un menu che si apre con il pulsante ☰.
  const topbar = document.querySelector('.topbar');
  function setMenu(open) {
    topbar.classList.toggle('nav-open', open);
    document.getElementById('menuToggle').setAttribute('aria-expanded', String(open));
  }
  document.getElementById('menuToggle').addEventListener('click', () => setMenu(!topbar.classList.contains('nav-open')));
  document.getElementById('mainNav').addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.topbar')) setMenu(false); });

  window.addEventListener('hashchange', () => {
    setMenu(false);
    if (!modal.hidden) closeModal();
    const prev = state.route;
    render();
    if (pageAnchor()) scrollToAnchor();
    else if (prev !== state.route) window.scrollTo(0, 0);
  });

  // Indirizzi che aprono una pagina direttamente su una sua parte: #contatti (Home) e #attestati (Chi sono).
  // I vecchi link #info portano alla Home.
  const ANCHORS = { contatti: 'home', attestati: 'chisono' };
  function pageAnchor() { const r = location.hash.replace(/^#\/?/, '').split('/')[0]; return ANCHORS[r] ? r : ''; }
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: 'start' }); // morbido grazie a scroll-behavior nel CSS
  }
  function scrollToAnchor() { scrollToId(pageAnchor() || 'contatti'); }

  /* =========================================================
     Statistiche: raccolta anonima di visite e click
     =========================================================
     Niente cookie e niente dati personali: per ogni apertura del sito un codice casuale
     tenuto solo in memoria, la scheda visitata, il tempo passato e i click importanti.
     Chi visita può escludersi aprendo il sito con ?noinsight (e riattivare con ?insight=on). */

  const insight = (() => {
    const params = new URLSearchParams(location.search);
    if (params.has('noinsight')) localSet('insight_off', '1');
    if (params.get('insight') === 'on') localSet('insight_off', null);
    const testUrl = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(params.get('insight') || '') ? params.get('insight') : '';
    const endpoint = IS_LOCAL ? testUrl : INSIGHT_URL;
    const enabled = !!endpoint && localGet('insight_off') !== '1' && !navigator.webdriver;
    const sid = uid() + Math.random().toString(36).slice(2, 6);
    const queue = [];
    let timer = null;
    let first = true;
    let cur = null; // { s: sezione, acc: ms già contati, since: inizio del conteggio visibile, scroll }

    function flush() {
      clearTimeout(timer);
      timer = null;
      if (!queue.length) return;
      const body = JSON.stringify({
        sid, lang: navigator.language || '', screen: window.screen ? screen.width : 0,
        ref: document.referrer, utm: params.get('utm_source') || params.get('ref') || '',
        events: queue.splice(0, 25)
      });
      let sent = false;
      try { sent = navigator.sendBeacon && navigator.sendBeacon(endpoint + '/e', new Blob([body], { type: 'text/plain' })); } catch (_) {}
      if (!sent) fetch(endpoint + '/e', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
      if (queue.length) flush();
    }
    function push(ev, now) {
      if (!enabled) return;
      queue.push(ev);
      if (now) flush();
      else if (!timer) timer = setTimeout(flush, 1500);
    }
    function stopClock() {
      if (!cur) return;
      if (cur.since) cur.acc += Date.now() - cur.since;
      cur.since = 0;
      const secs = Math.round(cur.acc / 1000);
      if (secs >= 1) push({ t: 'time', s: cur.s, v: Math.min(secs, 1800), sc: cur.scroll });
      cur.acc = 0;
    }
    function measureScroll() {
      if (!cur) return;
      const doc = document.documentElement;
      const pct = Math.round(Math.min(1, (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1)) * 100);
      if (pct > cur.scroll) cur.scroll = pct;
    }

    if (enabled) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') { stopClock(); flush(); }
        else if (cur && !cur.since) cur.since = Date.now();
      });
      window.addEventListener('pagehide', () => { stopClock(); flush(); });
      window.addEventListener('scroll', measureScroll, { passive: true });
    }

    return {
      // Nuova scheda aperta: chiude il tempo della precedente e registra la visualizzazione.
      section(route) {
        if (!enabled || (cur && cur.s === route)) return;
        stopClock();
        cur = null;
        if (route === 'admin') return;
        cur = { s: route, acc: 0, since: document.visibilityState === 'hidden' ? 0 : Date.now(), scroll: 0 };
        push({ t: 'view', s: route, e: first ? 1 : 0 }, first);
        first = false;
        setTimeout(measureScroll, 300);
      },
      click(name, label, value) {
        if (!cur) return;
        push({ t: 'click', s: cur.s, n: name, l: String(label || '').slice(0, 120), v: value });
      }
    };
  })();

  // Quali click contano per le statistiche: programmi, giochi, contatti e i riquadri della Home.
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action], a[href]');
    if (!el) return;
    const card = el.closest('article');
    // Nelle statistiche il programma compare sempre con il nome italiano, in qualunque lingua sia il sito.
    const prog = card && card.id.startsWith('prog-') ? state.data.programs.find((p) => `prog-${p.id}` === card.id) : null;
    const cardName = prog ? prog.name : card && card.querySelector('h2') ? card.querySelector('h2').textContent.trim() : '';
    if (el.dataset.track) {
      insight.click(el.dataset.track, el.dataset.label);
      return;
    }
    if (el.dataset.action) {
      if (el.dataset.action === 'zoom-shot') insight.click('zoom-image', cardName);
      else if (el.dataset.action === 'zoom-cert') insight.click('zoom-cert', (findCert(el.dataset.id) || {}).title);
      return;
    }
    const href = el.getAttribute('href') || '';
    if (el.classList.contains('play-now')) insight.click('play-game', cardName);
    else if (card && el.closest('.trial') && /^https?:|^[\w-]+\//.test(href)) {
      insight.click(/\.(exe|msi|zip|rar|7z|dmg|apk)([?#]|$)/i.test(href) ? 'download' : 'open-program', cardName);
    } else if (href === '#contatti' && card) insight.click('ask-info', cardName);
    else if (href.startsWith('mailto:')) insight.click('contact', 'Email');
    else if (href.startsWith('tel:')) insight.click('contact', 'Telefono');
    else if (/^https:\/\/wa\.me\//.test(href)) insight.click('contact', 'WhatsApp');
    else if (/^https?:\/\//.test(href) && !href.startsWith(location.origin)) {
      try { insight.click('external-link', new URL(href).hostname.replace(/^www\./, '')); } catch (_) {}
    }
  }, true);

  /* =========================================================
     Programmi (pubblico)
     ========================================================= */

  function renderPrograms(section) {
    const s = state.view.settings;
    const list = state.view.programs.filter((p) => p.category === section.value);
    const isGames = section.value === 'giochi';
    return `
      <section class="page-head">
        <h1>${esc(t('sec_' + section.value))}</h1>
        <p>${esc(s[section.introKey])}</p>
      </section>
      ${list.length ? `<div class="programs">${list.map(isGames ? renderGame : renderProgram).join('')}</div>`
        : `<div class="empty"><strong>${esc(t(isGames ? 'emptyGames' : 'emptyPrograms'))}</strong>${esc(t(isGames ? 'emptyGamesSub' : 'emptyProgramsSub'))}</div>`}`;
  }

  // Fuori dall'italiano, ogni scheda avvisa che il programma stesso è in italiano.
  function appLangNote(p) {
    return i18n.lang === 'it' || p.multilang ? '' : `<span class="badge lang-note">${ICONS.globe} ${esc(p.langNote || t('appLangNote'))}</span>`;
  }

  function programShot(p, img) {
    return img ? `
          <button type="button" class="shot" data-action="zoom-shot" data-id="${esc(p.id)}" aria-label="${esc(t('zoomImage', { name: p.name }))}">
            <span class="shot-bar" aria-hidden="true"><i></i><i></i><i></i></span>
            <img src="${img}" alt="${esc(p.name)}" loading="lazy">
            <span class="shot-zoom" aria-hidden="true">${esc(t('zoom'))}</span>
          </button>` : `<span class="initial">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span>`;
  }

  // Scheda di un gioco: immagine, breve descrizione a lato e pulsante "Gioca ora".
  function renderGame(p) {
    const img = safeImg(p.image);
    const features = lines(p.features);
    const playUrl = safeUrl(p.trialUrl);
    const note = appLangNote(p);
    return `
      <article class="program game" id="prog-${esc(p.id)}">
        <div class="program-media${img ? ' has-shot' : ''}">${programShot(p, img)}</div>
        <div class="program-body">
          <div>
            <h2>${esc(p.name)}</h2>
            ${p.tagline ? `<p class="tagline">${esc(p.tagline)}</p>` : ''}
          </div>
          ${note ? `<div class="spec">${note}</div>` : ''}
          ${p.description ? `<div class="text">${linkify(p.description)}</div>` : ''}
          ${features.length ? `<ul class="features">${features.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          ${p.trialInfo ? `<p class="item-meta">${linkify(p.trialInfo)}</p>` : ''}
          <div class="row">
            ${playUrl ? `<a class="btn play-now" href="${esc(playUrl)}" target="_blank" rel="noopener">${ICONS.play} ${esc(p.trialLabel || t('playNow'))}</a>` : ''}
          </div>
          ${p.requirements ? `<p class="item-meta">${linkify(p.requirements)}</p>` : ''}
        </div>
      </article>`;
  }

  function renderProgram(p) {
    const img = safeImg(p.image);
    const features = lines(p.features);
    const trialUrl = safeUrl(p.trialUrl);
    const hasTrial = p.trialLabel || p.trialInfo || trialUrl;
    const note = appLangNote(p);
    const ask = `<a class="btn secondary small" href="#contatti">${esc(t('askInfo'))}</a>`;
    return `
      <article class="program" id="prog-${esc(p.id)}">
        <div class="program-media${img ? ' has-shot' : ''}">${programShot(p, img)}</div>
        <div class="program-body">
          <div>
            <h2>${esc(p.name)}</h2>
            ${p.tagline ? `<p class="tagline">${esc(p.tagline)}</p>` : ''}
          </div>
          ${p.platform || p.version || note ? `<div class="spec">
            ${p.platform ? `<span class="badge">${esc(p.platform)}</span>` : ''}
            ${p.version ? `<span class="badge">${esc(t('version', { v: p.version }))}</span>` : ''}
            ${note}
          </div>` : ''}
          ${p.description ? `<div class="text">${linkify(p.description)}</div>` : ''}
          ${features.length ? `<ul class="features">${features.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          ${hasTrial ? `
            <div class="trial">
              <h4>${esc(p.trialLabel || t('trialMode'))}</h4>
              ${p.trialInfo ? `<p>${linkify(p.trialInfo)}</p>` : ''}
              <div class="row">
                ${trialUrl ? (/\.(exe|msi|zip|rar|7z|dmg|apk)([?#]|$)/i.test(trialUrl)
                  ? `<a class="btn small" href="${esc(trialUrl)}" target="_blank" rel="noopener">${ICONS.download} ${esc(t('download'))}</a>`
                  : `<a class="btn small" href="${esc(trialUrl)}" target="_blank" rel="noopener">${ICONS.play} ${esc(t('openProgram'))}</a>`) : ''}
                ${ask}
              </div>
            </div>` : `<div>${ask}</div>`}
          ${p.requirements ? `<details><summary class="details-toggle">${esc(t('requirements'))}</summary><div class="req" style="margin-top:6px">${linkify(p.requirements)}</div></details>` : ''}
        </div>
      </article>`;
  }

  /* =========================================================
     Home (pubblico): la pubblicità per le aziende, i progetti e i contatti
     ========================================================= */

  const HOME_ICONS = {
    programmi: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    trading: '<path d="M3 20h18"/><path d="M5 16l5-5 3 3 6-7"/><path d="M15 7h4v4"/>',
    giochi: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".6"/><circle cx="17.5" cy="13.5" r=".6"/>',
    strumenti: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    servizi: '<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 5-4 14"/>',
    excel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>',
    doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
    db: '<ellipse cx="12" cy="5.5" rx="8" ry="2.5"/><path d="M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13"/><path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/>',
    ai: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8.6 8 9 4.6-.4 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'
  };
  // Icone dei servizi, nell'ordine in cui compaiono (si ripetono se i servizi sono di più).
  const SERVICE_ICONS = ['excel', 'doc', 'db', 'servizi', 'ai', 'tool'];
  const homeIcon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${HOME_ICONS[k]}</svg>`;
  const lines = (text) => String(text || '').split('\n').map((x) => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  // Righe "Titolo: descrizione" (la descrizione è facoltativa).
  const pairs = (text) => lines(text).map((l) => {
    const i = l.indexOf(':');
    const text = i > 0 ? l.slice(i + 1).trim() : '';
    return { title: i > 0 ? l.slice(0, i).trim() : l, text: text.charAt(0).toUpperCase() + text.slice(1) };
  });
  // Nei titoli le parole tra *asterischi* vengono evidenziate.
  const hl = (text) => esc(text).replace(/\*([^*]+)\*/g, '<span class="hl">$1</span>');
  const photoOf = (s) => safeImg(s.photo);

  // Finto terminale della Home: mostra il genere di lavoro che un'automazione fa da sola.
  function automationDemo() {
    const steps = [t('demoStep1'), t('demoStep2'), t('demoStep3'), t('demoStep4')];
    return `
      <figure class="demo" aria-label="${esc(t('demoAria'))}">
        <div class="demo-frame"><div class="demo-win run" aria-hidden="true">
          <div class="code-bar"><i></i><i></i><i></i><span>${esc(t('demoFile'))}</span><b class="demo-live">${esc(t('demoRunning'))}</b></div>
          <div class="demo-body">
            <div class="demo-cmd"><span class="tok-op">$</span> python ${esc(t('demoFile'))}</div>
            ${steps.map((x, i) => `<div class="demo-step" style="--i:${i}"><span class="demo-ok">✓</span>${esc(x)}</div>`).join('')}
            <div class="demo-bar"><i></i></div>
            <div class="demo-result">
              <div><small>${esc(t('demoWith'))}</small><strong>${esc(t('demoWithValue'))}</strong></div>
              <div><small>${esc(t('demoBefore'))}</small><strong class="demo-old">${esc(t('demoBeforeValue'))}</strong></div>
            </div>
          </div>
        </div></div>
        <figcaption>${esc(t('demoCaption'))}</figcaption>
      </figure>`;
  }

  function ctaBand(title) {
    const s = state.view.settings;
    return `
      <section class="cta-band">
        <div>
          <h2>${hl(title)}</h2>
          ${s.ctaText ? `<p>${esc(s.ctaText)}</p>` : ''}
        </div>
        <div class="row">
          <a class="btn light" href="#contatti" data-action="go-contacts" data-track="home-link" data-label="Banner: scrivimi">${ICONS.mail} ${esc(t('writeMe'))}</a>
          ${s.whatsapp ? `<a class="btn outline-light" href="https://wa.me/${waNumber(s.whatsapp)}" target="_blank" rel="noopener">${ICONS.chat} WhatsApp</a>` : ''}
        </div>
      </section>`;
  }

  function renderHome() {
    const s = state.view.settings;
    const points = lines(s.homePoints);
    const pains = lines(s.painPoints);
    const services = pairs(s.services);
    const steps = pairs(s.steps);
    const photo = photoOf(s);
    const bySection = (sec) => state.view.programs.filter((p) => p.category === sec.value);
    const areas = PROGRAM_SECTIONS.map((sec) => {
      const list = bySection(sec);
      return {
        key: sec.route, href: `#${sec.route}`, title: t('sec_' + sec.value), label: sec.title, text: s[sec.introKey], names: list.map((p) => p.name),
        more: list.length ? tn(sec.value === 'giochi' ? 'games' : 'programs', list.length) : t('discoverMore')
      };
    });

    return `
      <section class="hero">
        <div class="hero-text">
          <span class="hero-eyebrow">${esc(s.homeEyebrow || s.tagline || s.siteName)}</span>
          <h1>${hl(s.homeTitle || s.siteName)}</h1>
          ${s.homeIntro ? `<p class="hero-lead">${esc(s.homeIntro)}</p>` : ''}
          <a class="btn hero-cta" href="#contatti" data-action="go-contacts" data-track="home-link" data-label="Contattami gratuitamente e senza impegno">${ICONS.mail}<span>${esc(t('heroCta'))}</span>${homeIcon('arrow')}</a>
          ${points.length ? `<ul class="hero-points">${points.map((p) => `<li>${homeIcon('check')}${esc(p)}</li>`).join('')}</ul>` : ''}
        </div>
        ${photo ? `
        <figure class="home-side">
          <div class="hero-photo home-photo"><img src="${photo}" alt="${esc(s.ownerName || s.siteName)}"></div>
          <figcaption class="hero-caption">
            ${s.ownerName ? `<div class="hero-who"><strong>${esc(s.ownerName)}</strong><span>${esc(s.tagline || '')}</span></div>` : ''}
            <div class="hero-caption-row">
              <span class="hero-badge">${homeIcon('check')}${esc(t('heroBadge'))}</span>
              <a href="#chisono" data-track="home-link" data-label="Scopri chi sono">${esc(t('aboutLink'))}</a>
            </div>
          </figcaption>
        </figure>` : automationDemo()}
      </section>

      ${pains.length ? `
      <section class="home-section">
        <h2 class="section-title">${esc(t('painsTitle'))}</h2>
        <p class="section-sub">${esc(t('painsSub'))}</p>
        <div class="pains">${pains.map((p) => `
          <div class="pain"><span class="pain-ico">${homeIcon('clock')}</span><p>${esc(p)}</p></div>`).join('')}
        </div>
        <p class="pains-close">${esc(t('painsClose'))} <strong>${esc(t('painsCloseStrong'))}</strong></p>
      </section>` : ''}

      ${photo ? `
      <section class="home-section">
        <h2 class="section-title">${esc(t('exampleTitle'))}</h2>
        <div class="example">
          <div class="example-text">
            <p>${esc(t('exampleText'))}</p>
            <a class="btn secondary" href="#contatti" data-action="go-contacts" data-track="home-link" data-label="Esempio: parliamone">${esc(t('exampleCta'))} ${homeIcon('arrow')}</a>
          </div>
          ${automationDemo()}
        </div>
      </section>` : ''}

      ${services.length ? `
      <section class="home-section">
        <h2 class="section-title">${esc(t('servicesTitle'))}</h2>
        <p class="section-sub">${esc(t('servicesSub'))}</p>
        <div class="services">${services.map((x, i) => `
          <div class="service">
            <span class="area-ico">${homeIcon(SERVICE_ICONS[i % SERVICE_ICONS.length])}</span>
            <h3>${esc(x.title)}</h3>
            ${x.text ? `<p>${esc(x.text)}</p>` : ''}
          </div>`).join('')}
        </div>
      </section>` : ''}

      ${steps.length ? `
      <section class="home-section" id="metodo">
        <h2 class="section-title">${esc(t('stepsTitle'))}</h2>
        <p class="section-sub">${esc(t('stepsSub'))}</p>
        <ol class="steps">${steps.map((x, i) => `
          <li class="step">
            <span class="step-n">${String(i + 1).padStart(2, '0')}</span>
            <h3>${esc(x.title)}</h3>
            ${x.text ? `<p>${esc(x.text)}</p>` : ''}
          </li>`).join('')}
        </ol>
      </section>` : ''}

      <section class="home-section">
        <h2 class="section-title">${esc(t('builtTitle'))}</h2>
        <p class="section-sub">${esc(t('builtSub'))}</p>
        <div class="home-areas">${areas.map((a) => `
          <a class="area-card" href="${a.href}" data-track="home-link" data-label="${esc(a.label)}">
            <span class="area-ico">${homeIcon(a.key)}</span>
            <h3>${esc(a.title)}</h3>
            ${a.text ? `<p>${esc(a.text)}</p>` : ''}
            ${a.names.length ? `<span class="area-tags">${a.names.map((n) => `<span class="badge">${esc(n)}</span>`).join('')}</span>` : ''}
            <span class="area-more">${esc(a.more)} →</span>
          </a>`).join('')}
        </div>
      </section>

      ${ctaBand(s.ctaTitle || t('ctaDefault'))}

      ${renderContacts()}`;
  }

  /* ---------- Chi sono ---------- */

  function renderAbout() {
    const s = state.view.settings;
    const skills = lines(s.skills);
    const values = pairs(s.values);
    const story = String(s.about || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean); // il primo paragrafo fa da attacco
    const nPrograms = state.view.programs.filter((p) => p.category !== 'giochi').length;
    const nGames = state.view.programs.filter((p) => p.category === 'giochi').length;
    const certs = state.view.certificates.filter((c) => c.title);
    const hours = certs.reduce((a, c) => a + certHours(c), 0);
    const facts = [
      [fmtNum(nPrograms), tn('factPrograms', nPrograms)],
      [fmtNum(nGames), tn('factGames', nGames)],
      certs.length ? [fmtNum(certs.length), tn('factCourses', certs.length)] : null,
      hours ? [fmtNum(hours), t('factHours')] : null
    ].filter(Boolean);
    const skillsVar = t('skillsVar');

    // La foto grande sta nella Home; qui resta la presentazione.
    return `
      <section class="about-hero solo">
        <div class="hero-text">
          <span class="hero-eyebrow">${esc(t('navAbout'))}${s.city ? ` · ${esc(s.city)}` : ''}</span>
          <h1>${hl(s.aboutTitle || (s.ownerName ? t('aboutHello', { name: s.ownerName }) : t('navAbout')))}</h1>
          ${s.aboutIntro ? `<p class="hero-lead">${esc(s.aboutIntro)}</p>` : ''}
          <div class="row">
            <a class="btn big" href="#contatti" data-track="about-link" data-label="Contattami">${ICONS.mail} ${esc(t('contactMe'))}</a>
            <a class="btn secondary big" href="#programmi" data-track="about-link" data-label="Guarda i miei progetti">${esc(t('seeProjects'))}</a>
          </div>
        </div>
      </section>

      <section class="home-section">
        <h2 class="section-title">${esc(t('storyTitle'))}</h2>
        <div class="home-two">
          <div class="card about-story">
            ${story.length ? `<p class="about-lead">${esc(story[0])}</p>${story.slice(1).map((x) => `<p>${esc(x)}</p>`).join('')}` : `<p class="item-meta">${esc(t('storyEmpty'))}</p>`}
          </div>
          <div class="about-side">
            ${facts.length ? `<div class="home-facts about-facts">${facts.map(([n, l]) => `<div><strong>${esc(n)}</strong><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
            ${skills.length ? `
            <div class="code-card">
              <div class="code-bar" aria-hidden="true"><i></i><i></i><i></i><span>${esc(skillsVar)}.py</span></div>
              <pre><code><span class="tok-var">${esc(skillsVar)}</span> <span class="tok-op">=</span> [
${skills.map((k) => `    <span class="tok-str">"${esc(k)}"</span>,`).join('\n')}
]</code></pre>
            </div>` : ''}
            ${certs.length ? `<a class="about-certs" href="#attestati" data-action="scroll-to" data-target="attestati" data-track="about-link" data-label="Vedi gli attestati">${esc(t('seeCerts'))}</a>` : ''}
          </div>
        </div>
      </section>

      ${renderCertificates()}

      ${values.length ? `
      <section class="home-section">
        <h2 class="section-title">${esc(t('valuesTitle'))}</h2>
        <div class="services">${values.map((x) => `
          <div class="service">
            <span class="area-ico">${homeIcon('check')}</span>
            <h3>${esc(x.title)}</h3>
            ${x.text ? `<p>${esc(x.text)}</p>` : ''}
          </div>`).join('')}
        </div>
      </section>` : ''}

      ${s.siteAbout ? `
      <section class="home-section">
        <h2 class="section-title">${esc(t('siteTitle'))}</h2>
        <div class="card"><div class="text">${esc(s.siteAbout)}</div></div>
      </section>` : ''}

      ${ctaBand(s.aboutCta || t('aboutCtaDefault'))}`;
  }

  /* ---------- Formazione e attestati ---------- */

  function findCert(id) { return state.data.certificates.find((c) => c.id === id); }
  function certHours(c) { const n = parseFloat(String(c.hours || '').replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; }
  function certDate(c, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
    return /^\d{4}-\d{2}-\d{2}$/.test(c.date || '') ? new Date(c.date + 'T12:00:00').toLocaleDateString('it-IT', opts) : '';
  }

  // Nella pagina Chi sono gli attestati si vedono solo come immagini (il titolo è già scritto sull'attestato).
  function renderCertificates() {
    const s = state.view.settings;
    const list = state.view.certificates.filter((c) => c.title && safeImg(c.image));
    if (!list.length) return '';
    const total = list.reduce((a, c) => a + certHours(c), 0);
    return `
      <section class="home-section" id="attestati">
        <h2 class="section-title">${esc(t('certsTitle'))}</h2>
        <p class="section-sub">${s.certsIntro ? esc(s.certsIntro) + ' ' : ''}<strong>${esc(tn('courses', list.length))}${total ? ` · ${esc(t('trainingHours', { h: tn('hours', total) }))}` : ''}</strong></p>
        <div class="certs">${list.map((c) => `
          <button type="button" class="cert-shot" data-action="zoom-cert" data-id="${esc(c.id)}" aria-label="${esc(t('zoomCert', { t: c.title }))}">
            <img src="${safeImg(c.image)}" alt="${esc(t('certAlt', { t: c.title }))}" loading="lazy">
            <span class="shot-zoom" aria-hidden="true">${esc(t('zoom'))}</span>
          </button>`).join('')}
        </div>
      </section>`;
  }

  function renderContacts() {
    const s = state.view.settings;
    const contacts = [];
    if (s.email) contacts.push({ ico: ICONS.mail, label: t('cEmail'), text: s.email, href: `mailto:${s.email}` });
    if (s.phone) contacts.push({ ico: ICONS.phone, label: t('cPhone'), text: s.phone, href: `tel:${String(s.phone).replace(/[^\d+]/g, '')}` });
    if (s.whatsapp) contacts.push({ ico: ICONS.chat, label: 'WhatsApp', text: s.whatsapp, href: `https://wa.me/${waNumber(s.whatsapp)}`, ext: true });
    if (s.city) contacts.push({ ico: ICONS.pin, label: t('cArea'), text: s.city });
    [['website', t('cWebsite'), ICONS.globe], ['instagram', 'Instagram', ICONS.link], ['facebook', 'Facebook', ICONS.link], ['linkedin', 'LinkedIn', ICONS.link]].forEach(([k, label, ico]) => {
      const u = safeUrl(s[k]);
      if (u) contacts.push({ ico, label, text: u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), href: u, ext: true });
    });
    const list = `
      <div class="card">
        <h2>${esc(t('contactsBox'))}</h2>
        ${contacts.length ? `<ul class="contact-list">${contacts.map((c) => `
          <li>
            <span class="ico">${c.ico}</span>
            <div><small>${esc(c.label)}</small>${c.href ? `<a href="${esc(c.href)}" ${c.ext ? 'target="_blank" rel="noopener"' : ''}>${esc(c.text)}</a>` : `<strong>${esc(c.text)}</strong>`}</div>
          </li>`).join('')}</ul>` : `<p class="item-meta">${esc(t('contactsEmpty'))}</p>`}
      </div>`;
    return `
      <section class="home-section" id="contatti">
        <h2 class="section-title">${esc(t('contactsTitle'))}</h2>
        <p class="section-sub">${esc(t('contactsSub'))}</p>
        <div class="${s.email ? 'info-grid' : ''}">
          ${s.email ? `
          <div class="card">
            <h2>${esc(t('formTitle'))}</h2>
            <form id="contactForm" class="stack" novalidate>
              <label class="field"><span>${esc(t('formName'))}</span><input name="name" autocomplete="name" required></label>
              <label class="field"><span>${esc(t('formMessage'))}</span><textarea name="message" rows="5" required placeholder="${esc(t('formPlaceholder'))}"></textarea></label>
              <div class="row end"><button class="btn" type="submit">${ICONS.mail} ${esc(t('formSend'))}</button></div>
            </form>
          </div>` : ''}
          ${list}
        </div>
      </section>`;
  }

  /* =========================================================
     Area admin
     ========================================================= */

  function renderAdmin() {
    if (!IS_LOCAL) {
      return `<div class="login card"><h2>Area riservata</h2><p class="item-meta" style="margin:0">Questa sezione non è disponibile online.</p><p><a class="btn secondary" href="#home">Torna al sito</a></p></div>`;
    }
    if (!state.isAdmin) return renderLogin();
    const d = state.data;
    if (state.editing) return state.editing.type === 'cert' ? renderCertEditor(state.editing) : renderProgramEditor(state.editing);
    const tabs = [
      ['programmi', 'Programmi', d.programs.length],
      ['attestati', 'Attestati', d.certificates.length],
      ['insight', 'Insight'],
      ['dati', 'I miei dati'],
      ['pubblica', state.localServer ? 'Online' : (state.hasDraft ? 'Pubblica ●' : 'Pubblica')]
    ];
    const bodies = { programmi: adminPrograms, attestati: adminCerts, dati: adminSettings, pubblica: adminPublish, insight: adminInsight };
    return `
      <div class="admin-head">
        <h1>Area admin</h1>
        <div class="row">
          <a class="btn secondary small" href="#home">Vedi il sito</a>
          <button class="btn ghost small" data-action="logout">Esci</button>
        </div>
      </div>
      ${state.hasDraft && state.adminTab !== 'pubblica' ? `<div class="notice" style="margin-bottom:16px">Hai modifiche salvate in questo browser ma non ancora pubblicate. <a href="#admin" data-action="tab" data-tab="pubblica">Pubblica ora</a></div>` : ''}
      ${state.trCheck && state.trCheck.stale.length ? `<div class="notice" style="margin-bottom:16px"><strong>Traduzioni da aggiornare</strong> (${esc(state.trCheck.stale.join(', '))}): alcuni testi italiani sono nuovi o cambiati dopo l'ultima traduzione. Nelle altre lingue si vede ancora la traduzione precedente, o l'italiano per i testi nuovi. Chiedi a Claude: «aggiorna le traduzioni del sito».</div>` : ''}
      <div class="tabs" role="tablist">
        ${tabs.map(([k, label, count]) => `<button role="tab" class="${state.adminTab === k ? 'active' : ''}" data-action="tab" data-tab="${k}">${label}${count != null ? `<span class="count">${count}</span>` : ''}</button>`).join('')}
      </div>
      ${bodies[state.adminTab]()}`;
  }

  function renderLogin() {
    const hasPass = !!localGet('admin_pass');
    return `
      <div class="login card">
        <h2>${hasPass ? 'Accedi all\'area admin' : 'Crea la tua password admin'}</h2>
        <p class="item-meta" style="margin-top:0">${hasPass ? 'Inserisci la password per gestire programmi e dati.' : 'È il tuo primo accesso da questo computer: scegli una password (almeno 6 caratteri) per proteggere l\'area admin.'}</p>
        <form id="loginForm" class="stack" data-mode="${hasPass ? 'login' : 'setup'}">
          <label class="field"><span>Password</span><input type="password" name="pass" autocomplete="${hasPass ? 'current-password' : 'new-password'}" required minlength="6"></label>
          ${hasPass ? '' : '<label class="field"><span>Ripeti password</span><input type="password" name="pass2" autocomplete="new-password" required minlength="6"></label>'}
          <label class="row" style="gap:8px;font-size:.92rem;cursor:pointer">
            <input type="checkbox" name="remember" checked style="width:18px;height:18px;accent-color:var(--accent)">
            Ricorda la password su questo computer
          </label>
          <button class="btn block" type="submit">${hasPass ? 'Entra' : 'Crea password ed entra'}</button>
        </form>
      </div>`;
  }

  /* ---------- Programmi ---------- */

  function adminPrograms() {
    const list = state.data.programs;
    return `
      <div class="row between" style="margin-bottom:14px">
        <p class="item-meta" style="margin:0">Presenta i tuoi programmi con spiegazioni e modalità di prova. Ognuno compare nella sua scheda (Apprendimento o Trading e finanza), nell'ordine di questa lista.</p>
        <button class="btn" data-action="new-program">+ Nuovo programma</button>
      </div>
      ${list.length ? `<div class="admin-list">${list.map((p, i) => `
        <div class="admin-row">
          <div class="thumb">${safeImg(p.image) ? `<img src="${safeImg(p.image)}" alt="">` : noPhoto()}</div>
          <div class="info"><strong>${esc(p.name) || '(senza nome)'}</strong><span>${esc(sectionByValue(p.category).nav)} · ${esc(p.tagline || p.platform || '')}</span></div>
          <button class="btn ghost small" data-action="move-program" data-id="${esc(p.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su">↑</button>
          <button class="btn ghost small" data-action="move-program" data-id="${esc(p.id)}" data-dir="1" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Sposta giù">↓</button>
          <button class="btn secondary small" data-action="edit-program" data-id="${esc(p.id)}">Modifica</button>
          <button class="btn danger small" data-action="delete-program" data-id="${esc(p.id)}">Elimina</button>
        </div>`).join('')}</div>`
        : '<div class="empty"><strong>Nessun programma</strong>Clicca su "Nuovo programma" per aggiungerne uno.</div>'}`;
  }

  /* ---------- Attestati ---------- */

  function adminCerts() {
    const list = state.data.certificates;
    return `
      <div class="row between" style="margin-bottom:14px">
        <p class="item-meta" style="margin:0">Gli attestati compaiono nella Home, nella sezione "Formazione e attestati", nell'ordine di questa lista.</p>
        <button class="btn" data-action="new-cert">+ Nuovo attestato</button>
      </div>
      ${list.length ? `<div class="admin-list">${list.map((c, i) => `
        <div class="admin-row">
          <div class="thumb">${safeImg(c.image) ? `<img src="${safeImg(c.image)}" alt="">` : noPhoto()}</div>
          <div class="info"><strong>${esc(c.title) || '(senza titolo)'}</strong><span>${esc([c.issuer, certDate(c, { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(' · '))}</span></div>
          <button class="btn ghost small" data-action="move-cert" data-id="${esc(c.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Sposta su">↑</button>
          <button class="btn ghost small" data-action="move-cert" data-id="${esc(c.id)}" data-dir="1" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Sposta giù">↓</button>
          <button class="btn secondary small" data-action="edit-cert" data-id="${esc(c.id)}">Modifica</button>
          <button class="btn danger small" data-action="delete-cert" data-id="${esc(c.id)}">Elimina</button>
        </div>`).join('')}</div>`
        : '<div class="empty"><strong>Nessun attestato</strong>Clicca su "Nuovo attestato" per aggiungerne uno.</div>'}`;
  }

  function renderCertEditor(ed) {
    const c = ed.draft;
    const img = safeImg(c.image);
    return `
      <div class="admin-head">
        <h1>${ed.isNew ? 'Nuovo attestato' : 'Modifica attestato'}</h1>
        <button class="btn ghost small" data-action="cancel-edit">← Torna alla lista</button>
      </div>
      <form id="certForm" class="form-card stack" novalidate>
        <div class="form-section" style="margin-top:0">Il corso</div>
        ${field('title', 'Titolo del corso', c.title, { req: true })}
        <div class="grid-2">
          ${field('issuer', 'Rilasciato da', c.issuer, { placeholder: 'Es. Udemy' })}
          ${field('teacher', 'Docente', c.teacher, { placeholder: 'Facoltativo' })}
        </div>
        <div class="grid-2">
          ${field('date', 'Data di completamento', c.date, { type: 'date' })}
          ${field('hours', 'Durata (ore)', c.hours, { extra: 'inputmode="decimal"', placeholder: 'Es. 5,5' })}
        </div>
        <div class="grid-2">
          ${field('tag', 'Etichetta', c.tag, { placeholder: 'Es. Python, SQL, Excel', hint: 'Una parola che compare sopra il titolo.' })}
          ${field('url', 'Link di verifica', c.url, { type: 'url', placeholder: 'https://ude.my/UC-…', hint: 'Il link scritto sull\'attestato, per verificarlo.' })}
        </div>
        <div class="field">
          <span>Immagine dell'attestato</span>
          <div class="row">
            ${img ? `<div class="photo-tile cover" style="width:160px;aspect-ratio:4/3"><img src="${img}" alt=""></div>` : ''}
            <button type="button" class="btn secondary small" data-action="pick-cert-image">${img ? 'Cambia immagine' : 'Carica immagine'}</button>
            ${img ? '<button type="button" class="btn ghost small" data-action="remove-cert-image">Rimuovi</button>' : ''}
          </div>
          <small>JPG o PNG. Se hai solo il PDF, basta uno screenshot dell'attestato.</small>
          <input type="file" id="certImageInput" accept="image/*" hidden>
        </div>

        <div class="sticky-actions row end">
          <button type="button" class="btn secondary" data-action="cancel-edit">Annulla</button>
          <button type="submit" class="btn">Salva attestato</button>
        </div>
      </form>`;
  }

  async function saveCertForm(form) {
    const v = readForm(form);
    const ed = state.editing;
    if (!v.title) { toast('Inserisci il titolo del corso', true); form.elements['title'].focus(); return; }
    const cert = Object.assign(ed.draft, v);
    if (ed.isNew) state.data.certificates.push(cert);
    else state.data.certificates = state.data.certificates.map((c) => (c.id === cert.id ? cert : c));
    if (await saveDraft()) {
      state.editing = null;
      toast('Attestato salvato');
      render();
    }
  }

  /* ---------- Editor del programma ---------- */

  function field(name, label, value, opts = {}) {
    const attrs = `name="${name}" ${opts.req ? 'required' : ''} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''} ${opts.extra || ''}`;
    let control;
    if (opts.textarea) control = `<textarea ${attrs} rows="${opts.rows || 4}">${esc(value)}</textarea>`;
    else if (opts.options) control = `<select ${attrs}>${opts.options.map((o) => {
      const val = typeof o === 'string' ? o : o.value;
      const lab = typeof o === 'string' ? o : o.label;
      return `<option value="${esc(val)}" ${String(value) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`;
    }).join('')}</select>`;
    else control = `<input type="${opts.type || 'text'}" ${attrs} value="${esc(value)}">`;
    return `<label class="field"><span>${label}${opts.req ? ' *' : ''}</span>${control}${opts.hint ? `<small>${opts.hint}</small>` : ''}</label>`;
  }

  function renderProgramEditor(ed) {
    const p = ed.draft;
    const img = safeImg(p.image);
    return `
      <div class="admin-head">
        <h1>${ed.isNew ? 'Nuovo programma' : 'Modifica programma'}</h1>
        <button class="btn ghost small" data-action="cancel-edit">← Torna alla lista</button>
      </div>
      <form id="programForm" class="form-card stack" novalidate>
        <div class="form-section" style="margin-top:0">Presentazione</div>
        ${field('name', 'Nome del programma', p.name, { req: true })}
        ${field('category', 'Scheda del sito', p.category, { options: PROGRAM_SECTIONS.map((s) => ({ value: s.value, label: s.nav })), hint: 'In quale scheda compare il programma.' })}
        ${field('multilang', 'Lingue del programma', p.multilang ? '1' : '', { options: [{ value: '', label: 'Solo in italiano' }, { value: '1', label: 'In tutte le lingue del sito' }], hint: 'Se è solo in italiano, nelle altre lingue la scheda lo segnala ai visitatori.' })}
        ${field('tagline', 'Frase breve', p.tagline, { placeholder: 'Es. Gestisci il magazzino in pochi clic' })}
        <div class="grid-2">
          ${field('platform', 'Piattaforma', p.platform, { placeholder: 'Es. Windows 10/11' })}
          ${field('version', 'Versione', p.version, { placeholder: 'Es. 2.1' })}
        </div>
        <div class="field">
          <span>Immagine o screenshot</span>
          <div class="row">
            ${img ? `<div class="photo-tile cover" style="width:120px"><img src="${img}" alt=""></div>` : ''}
            <button type="button" class="btn secondary small" data-action="pick-program-image">${img ? 'Cambia immagine' : 'Carica immagine'}</button>
            ${img ? '<button type="button" class="btn ghost small" data-action="remove-program-image">Rimuovi</button>' : ''}
          </div>
          <input type="file" id="programImageInput" accept="image/*" hidden>
        </div>

        <div class="form-section">Spiegazione</div>
        ${field('description', 'Descrizione e funzionamento', p.description, { textarea: true, rows: 6, placeholder: 'A cosa serve, come funziona, a chi è rivolto…' })}
        ${field('features', 'Funzionalità principali', p.features, { textarea: true, rows: 4, hint: 'Una per riga' })}

        <div class="form-section">Modalità di prova</div>
        ${field('trialLabel', 'Titolo della prova', p.trialLabel, { placeholder: 'Es. Prova gratuita di 30 giorni' })}
        ${field('trialInfo', 'Come funziona la prova', p.trialInfo, { textarea: true, rows: 3, placeholder: 'Es. Scarica, installa e usa tutte le funzioni per 30 giorni. Limiti della versione di prova…' })}
        ${field('trialUrl', 'Link per scaricare / provare', p.trialUrl, { type: 'url', placeholder: 'https://…', hint: 'Facoltativo. Link alla versione online (si apre nel browser) o al file da scaricare.' })}

        <div class="form-section">Altro</div>
        ${field('requirements', 'Requisiti di sistema', p.requirements, { textarea: true, rows: 3 })}

        <div class="sticky-actions row end">
          <button type="button" class="btn secondary" data-action="cancel-edit">Annulla</button>
          <button type="submit" class="btn">Salva programma</button>
        </div>
      </form>`;
  }

  function readForm(form) {
    const o = {};
    new FormData(form).forEach((v, k) => { o[k] = String(v).trim(); });
    return o;
  }

  function syncEditorFromForm() {
    const form = document.getElementById('programForm') || document.getElementById('certForm');
    if (form && state.editing) Object.assign(state.editing.draft, readForm(form));
  }

  async function saveProgramForm(form) {
    const v = readForm(form);
    const ed = state.editing;
    if (!v.name) { toast('Inserisci il nome del programma', true); form.elements['name'].focus(); return; }
    const prog = Object.assign(ed.draft, v);
    if (ed.isNew) state.data.programs.push(prog);
    else state.data.programs = state.data.programs.map((p) => (p.id === prog.id ? prog : p));
    if (await saveDraft()) {
      state.editing = null;
      toast('Programma salvato');
      render();
    }
  }

  /* ---------- I miei dati ---------- */

  function adminSettings() {
    const s = state.data.settings;
    return `
      <form id="settingsForm" class="form-card stack" novalidate>
        <div class="form-section" style="margin-top:0">Il sito</div>
        <div class="grid-2">
          ${field('siteName', 'Nome del sito', s.siteName, { req: true })}
          ${field('tagline', 'Sottotitolo', s.tagline)}
        </div>

        <div class="form-section">Pagina Home (la pubblicità per le aziende)</div>
        ${field('homeEyebrow', 'Riga sopra il titolo', s.homeEyebrow, { placeholder: 'Es. Automazioni su misura per aziende e professionisti' })}
        ${field('homeTitle', 'Titolo principale', s.homeTitle, { placeholder: 'La frase grande in cima alla Home', hint: 'Le parole tra *asterischi* vengono evidenziate in colore.' })}
        ${field('homeIntro', 'Presentazione breve', s.homeIntro, { textarea: true, rows: 3, hint: 'Compare sotto il titolo, in cima alla Home.' })}
        ${field('homePoints', 'Punti di forza', s.homePoints, { textarea: true, rows: 3, hint: 'Uno per riga: brevi frasi con la spunta, sotto i pulsanti.' })}
        ${field('painPoints', 'Ti riconosci? (i problemi del cliente)', s.painPoints, { textarea: true, rows: 5, hint: 'Uno per riga. Se lasci vuoto, la sezione non compare.' })}
        ${field('services', 'Cosa posso fare per te', s.services, { textarea: true, rows: 6, hint: 'Uno per riga, nella forma "Titolo: descrizione". Se lasci vuoto, la sezione non compare.' })}
        ${field('steps', 'Come funziona', s.steps, { textarea: true, rows: 3, hint: 'Un passaggio per riga, nella forma "Titolo: descrizione".' })}
        ${field('ctaTitle', 'Banner finale: titolo', s.ctaTitle, { placeholder: 'Hai un lavoro che ti ruba ore ogni settimana?', hint: 'Il riquadro scuro prima dei contatti. Le parole tra *asterischi* vengono evidenziate.' })}
        ${field('ctaText', 'Banner finale: testo', s.ctaText, { textarea: true, rows: 2 })}

        <div class="form-section">Pagina Chi sono</div>
        <div class="field">
          <span>La tua foto</span>
          <div class="row">
            ${safeImg(s.photo) ? `<div class="photo-tile cover" style="width:96px;aspect-ratio:4/5"><img src="${safeImg(s.photo)}" alt=""></div>` : ''}
            <button type="button" class="btn secondary small" data-action="pick-home-photo">${safeImg(s.photo) ? 'Cambia foto' : 'Carica foto'}</button>
            ${safeImg(s.photo) ? '<button type="button" class="btn ghost small" data-action="remove-home-photo">Rimuovi</button>' : ''}
          </div>
          <small>Compare grande in cima alla Home, con il tuo nome e il bollino della consulenza gratuita; senza foto, al suo posto si vede l'esempio di automazione. Meglio una foto verticale. Si salva subito.</small>
          <input type="file" id="homePhotoInput" accept="image/*" hidden>
        </div>
        ${field('aboutTitle', 'Titolo', s.aboutTitle, { placeholder: 'Ciao, sono…', hint: 'Le parole tra *asterischi* vengono evidenziate in colore.' })}
        ${field('aboutIntro', 'Presentazione breve', s.aboutIntro, { textarea: true, rows: 3, hint: 'Compare sotto il titolo, accanto alla foto.' })}
        ${field('about', 'La mia storia', s.about, { textarea: true, rows: 8, placeholder: 'Qualche riga su di te, cosa fai, di cosa ti occupi…' })}
        ${field('skills', 'Competenze', s.skills, { textarea: true, rows: 4, hint: 'Una per riga: compaiono scritte come un piccolo file di codice.' })}
        ${field('values', 'Come lavoro', s.values, { textarea: true, rows: 3, hint: 'Uno per riga, nella forma "Titolo: descrizione". Se lasci vuoto, la sezione non compare.' })}
        ${field('siteAbout', 'Questo sito', s.siteAbout, { textarea: true, rows: 3, hint: 'Cosa si trova nel sito e come si usa.' })}
        ${field('certsIntro', 'Formazione certificata', s.certsIntro, { textarea: true, rows: 2, hint: 'Testo sopra gli attestati, nella pagina Chi sono (si gestiscono nella scheda Attestati).' })}
        ${field('aboutCta', 'Banner finale: titolo', s.aboutCta, { placeholder: 'Hai un problema da risolvere al computer? *Parliamone.*' })}

        <div class="form-section">Testi delle schede</div>
        ${field('programsIntro', 'Testo introduttivo della scheda Apprendimento', s.programsIntro, { textarea: true, rows: 2 })}
        ${field('tradingIntro', 'Testo introduttivo della scheda Trading e finanza', s.tradingIntro, { textarea: true, rows: 2 })}
        ${field('toolsIntro', 'Testo introduttivo della scheda Strumenti', s.toolsIntro, { textarea: true, rows: 2 })}
        ${field('gamesIntro', 'Testo introduttivo della scheda Giochi', s.gamesIntro, { textarea: true, rows: 2 })}

        <div class="form-section">Contatti (in fondo alla Home)</div>
        <div class="grid-2">
          ${field('ownerName', 'Il tuo nome', s.ownerName)}
          ${field('city', 'Città / zona', s.city)}
        </div>
        <div class="grid-2">
          ${field('email', 'Email', s.email, { type: 'email', hint: 'Qui ricevi i messaggi dal modulo della Home' })}
          ${field('phone', 'Telefono', s.phone, { type: 'tel' })}
        </div>
        <div class="grid-2">
          ${field('whatsapp', 'Numero WhatsApp', s.whatsapp, { type: 'tel' })}
          ${field('website', 'Sito web', s.website, { placeholder: 'Facoltativo' })}
        </div>
        <div class="grid-2">
          ${field('instagram', 'Instagram (link)', s.instagram, { placeholder: 'https://instagram.com/…' })}
          ${field('facebook', 'Facebook (link)', s.facebook, { placeholder: 'https://facebook.com/…' })}
        </div>
        ${field('linkedin', 'LinkedIn (link)', s.linkedin, { placeholder: 'https://linkedin.com/in/…' })}

        <div class="sticky-actions row end">
          <button type="submit" class="btn">Salva i miei dati</button>
        </div>
      </form>

      <form id="passForm" class="form-card stack" style="margin-top:20px" novalidate>
        <h2 style="margin:0">Cambia password admin</h2>
        <div class="grid-2">
          <label class="field"><span>Nuova password</span><input type="password" name="pass" autocomplete="new-password" minlength="6"></label>
          <label class="field"><span>Ripeti password</span><input type="password" name="pass2" autocomplete="new-password" minlength="6"></label>
        </div>
        <div class="row end"><button class="btn secondary" type="submit">Aggiorna password</button></div>
      </form>`;
  }

  async function saveSettingsForm(form) {
    const v = readForm(form);
    if (!v.siteName) { toast('Inserisci il nome del sito', true); return; }
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) { toast('Email non valida', true); form.elements['email'].focus(); return; }
    Object.assign(state.data.settings, v);
    if (await saveDraft()) {
      toast('Dati salvati');
      render();
    }
  }

  /* ---------- Insight (statistiche del sito) ---------- */

  const INSIGHT_PERIODS = [[1, 'Oggi'], [7, '7 giorni'], [30, '30 giorni'], [90, '3 mesi'], [365, '12 mesi']];
  const SECTION_NAMES = { home: 'Home', chisono: 'Chi sono', strumenti: 'Strumenti', programmi: 'Apprendimento', trading: 'Trading e finanza', giochi: 'Giochi', info: 'Info e contatti' };
  const CLICK_NAMES = {
    'open-program': 'Programmi aperti', 'download': 'Programmi scaricati', 'play-game': 'Giochi avviati',
    'zoom-image': 'Immagini dei programmi ingrandite', 'ask-info': 'Richieste di informazioni',
    'contact': 'Contatti cliccati', 'contact-form': 'Messaggi dal modulo', 'external-link': 'Link esterni aperti',
    'home-link': 'Clic sui riquadri della Home', 'about-link': 'Clic nella pagina Chi sono', 'zoom-cert': 'Attestati ingranditi', 'cert-verify': 'Attestati verificati'
  };
  const LABEL_GROUPS = ['open-program', 'play-game', 'home-link', 'about-link', 'zoom-cert', 'cert-verify', 'download', 'ask-info', 'contact', 'external-link', 'zoom-image'];
  const WEEKDAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const nf = new Intl.NumberFormat('it-IT');
  const fmt = (n) => nf.format(Math.round(Number(n) || 0));
  let insightTimer = null;

  function fmtDur(sec) {
    sec = Math.round(Number(sec) || 0);
    if (sec < 60) return `${sec} s`;
    if (sec < 3600) return `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, '0')} s`;
    return `${Math.floor(sec / 3600)} h ${String(Math.floor(sec % 3600 / 60)).padStart(2, '0')} min`;
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function regionName(code) {
    if (!code || code === '?' || code === 'XX' || code === 'T1') return 'Sconosciuto';
    try { return new Intl.DisplayNames(['it'], { type: 'region' }).of(code); } catch (_) { return code; }
  }
  function langName(code) {
    if (!code || code === '?') return 'Sconosciuta';
    try {
      const n = new Intl.DisplayNames(['it'], { type: 'language' }).of(code.split('-')[0]);
      return n.charAt(0).toUpperCase() + n.slice(1);
    } catch (_) { return code; }
  }
  function dayLabel(day, withWeekday) {
    const d = new Date(day + 'T12:00:00');
    return d.toLocaleDateString('it-IT', withWeekday ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
  }

  function adminInsight() {
    if (!state.localServer) {
      return `<div class="form-card stack"><h2 style="margin:0">Insight</h2>
        <div class="notice">Le statistiche si leggono tramite il Gestore: apri l'area admin dall'icona <strong>Gestione sito</strong> sul desktop.</div></div>`;
    }
    const ins = state.insight;
    return `
      <div class="ins-bar">
        <div class="chips" role="group" aria-label="Periodo">
          ${INSIGHT_PERIODS.map(([d, l]) => `<button class="chip ${ins.days === d ? 'active' : ''}" data-action="insight-days" data-days="${d}">${l}</button>`).join('')}
        </div>
        <div class="row">
          <button class="btn secondary small" data-action="insight-reload">Aggiorna</button>
          <a class="btn secondary small" href="/api/insight-export?days=${ins.days}" download>${ICONS.download} Scarica i dati (CSV)</a>
        </div>
      </div>
      <div id="insightBody">${insightBody()}</div>`;
  }

  function insightBody() {
    const ins = state.insight;
    const d = ins.data;
    if (ins.error && !d) return `<div class="notice">⚠ ${esc(ins.error)}</div>`;
    if (!d) return '<div class="empty">Carico le statistiche…</div>';
    const t = d.totals;
    const p = d.previous;
    const periodName = d.range.days === 1 ? 'oggi' : `ultimi ${d.range.days} giorni`;
    const avgDur = t.sessions ? t.seconds / t.sessions : 0;
    const kpis = [
      ['Visualizzazioni', fmt(t.views), t.views, p.views, false, 'Schede del sito aperte in totale'],
      ['Visitatori', fmt(t.visitors), t.visitors, p.visitors, false, 'Persone diverse ogni giorno, sommate sul periodo'],
      ['Visite', fmt(t.sessions), t.sessions, p.sessions, false, 'Ogni volta che qualcuno apre il sito'],
      ['Durata media visita', fmtDur(avgDur), avgDur, p.sessions ? p.seconds / p.sessions : 0, false, 'Tempo passato sul sito con la pagina in primo piano'],
      ['Pagine per visita', (t.sessions ? t.views / t.sessions : 0).toLocaleString('it-IT', { maximumFractionDigits: 1 }), t.sessions ? t.views / t.sessions : 0, p.sessions ? p.views / p.sessions : 0, false, 'Quante schede guarda in media chi entra'],
      ['Frequenza di rimbalzo', pct(t.bounces, t.sessions) + '%', pct(t.bounces, t.sessions), pct(p.bounces, p.sessions), true, 'Visite con una sola scheda vista e nessun click: più è bassa, meglio è'],
      ['Click importanti', fmt(t.clicks), t.clicks, p.clicks, false, 'Programmi, giochi, contatti, link…'],
      ['Programmi e giochi aperti', fmt(t.launches), t.launches, p.launches, false, 'Clic su Apri il programma, Scarica e Gioca ora']
    ];
    const liveSections = Object.entries(d.live.sections).map(([s, n]) => `${esc(SECTION_NAMES[s] || s)} ${n}`).join(' · ');
    const noData = !d.database.events;

    return `
      <div class="ins-live"><span class="ins-dot${d.live.visitors ? ' on' : ''}" aria-hidden="true"></span>
        <strong>${d.live.visitors === 1 ? '1 persona' : fmt(d.live.visitors) + ' persone'} sul sito adesso</strong>
        <span class="item-meta">${liveSections ? liveSections + ' · ' : ''}ultimi 5 minuti · aggiornato alle ${new Date(d.generated).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      ${noData ? `<div class="notice" style="margin-bottom:16px">Non ci sono ancora dati: le statistiche si riempiono man mano che le persone visitano il sito online.</div>` : ''}
      <div class="ins-kpis">${kpis.map(([label, val, cur, prev, inverse, help]) => {
        let delta = '<span class="ins-delta">—</span>';
        if (prev > 0) {
          const ch = Math.round((cur - prev) / prev * 100);
          const good = inverse ? ch < 0 : ch > 0;
          delta = ch === 0 ? '<span class="ins-delta">= invariato</span>'
            : `<span class="ins-delta ${good ? 'up' : 'down'}">${ch > 0 ? '▲' : '▼'} ${Math.abs(ch)}%</span>`;
        } else if (cur > 0) delta = '<span class="ins-delta up">▲ nuovo</span>';
        return `<div class="ins-kpi" title="${esc(help)}"><small>${esc(label)}</small><strong>${val}</strong>${delta}</div>`;
      }).join('')}</div>
      <p class="item-meta ins-note">Periodo: ${esc(periodName)} (${esc(dayLabel(d.range.from))} – ${esc(dayLabel(d.range.to))}). Le variazioni lo confrontano con il periodo precedente della stessa durata (${esc(dayLabel(d.range.prevFrom))} – ${esc(dayLabel(d.range.prevTo))}). Passa il mouse su un riquadro per la spiegazione.</p>

      <div class="form-card">
        <div class="ins-head"><h2>Andamento ${d.range.days === 1 ? 'di oggi, ora per ora' : 'giorno per giorno'}</h2>
          <div class="ins-legend"><span><i style="background:var(--viz-1)"></i>Visualizzazioni</span><span><i style="background:var(--viz-2)"></i>Visitatori</span></div>
        </div>
        <div id="insightTrend" class="ins-trend"></div>
      </div>

      <div class="ins-grid">
        <div class="form-card ins-wide">
          <div class="ins-head"><h2>Sezioni più visitate</h2></div>
          ${insightSections(d)}
        </div>
        <div class="form-card ins-wide">
          <div class="ins-head"><h2>Click e azioni</h2><span class="item-meta">quante volte · in quante visite</span></div>
          ${d.clicks.length ? barList(d.clicks.map((c) => ({ k: CLICK_NAMES[c.k] || c.k, n: c.n, extra: c.sessions === 1 ? '1 visita' : `${fmt(c.sessions)} visite` }))) : '<p class="item-meta">Nessun click registrato nel periodo.</p>'}
        </div>
        ${insightLabelCards(d)}
        <div class="form-card">
          <div class="ins-head"><h2>Da dove arrivano</h2><span class="item-meta">visite</span></div>
          ${barList(d.sources.referrers.map((r) => ({ k: r.k === '?' ? 'Accesso diretto o app' : r.k, n: r.n })))}
          ${d.sources.campaigns.some((r) => r.k !== '?') ? `<h3 class="ins-sub">Campagne (utm_source)</h3>${barList(d.sources.campaigns.filter((r) => r.k !== '?'))}` : ''}
        </div>
        <div class="form-card">
          <div class="ins-head"><h2>Dispositivi</h2><span class="item-meta">visite</span></div>
          ${barList(d.audience.devices)}
          <h3 class="ins-sub">Sistema operativo</h3>${barList(d.audience.os)}
          <h3 class="ins-sub">Browser</h3>${barList(d.audience.browsers)}
          <h3 class="ins-sub">Larghezza schermo</h3>${barList(d.audience.screens)}
        </div>
        <div class="form-card">
          <div class="ins-head"><h2>Paesi e lingue</h2><span class="item-meta">visite</span></div>
          ${barList(merge(d.audience.countries.map((r) => ({ k: regionName(r.k), n: r.n }))))}
          <h3 class="ins-sub">Lingua del browser</h3>${barList(merge(d.audience.languages.map((r) => ({ k: langName(r.k), n: r.n }))))}
        </div>
        <div class="form-card">
          <div class="ins-head"><h2>Orari di visita</h2><span class="item-meta">visualizzazioni</span></div>
          ${hourChart(d.hours)}
          <h3 class="ins-sub">Giorni della settimana</h3>
          ${barList([1, 2, 3, 4, 5, 6, 0].map((i) => ({ k: WEEKDAYS[i], n: d.weekdays[i] })), { keepZero: d.weekdays.some(Boolean) })}
        </div>
        <div class="form-card ins-wide">
          <div class="ins-head"><h2>Ultime attività</h2><span class="item-meta">le 40 più recenti</span></div>
          ${insightRecent(d.recent)}
        </div>
      </div>
      <p class="item-meta ins-note">
        Dati anonimi, senza cookie né indirizzi IP. Nel database: ${fmt(d.database.events)} eventi${d.database.since ? ` dal ${esc(dayLabel(d.database.since))}` : ''} (si conservano circa 13 mesi).
        Per non contare le tue visite, apri una volta il sito online da ogni tuo dispositivo con
        <a href="https://coccolodigital.com/?noinsight" target="_blank" rel="noopener">questo indirizzo</a>.
      </p>`;
  }

  // Unisce le righe che hanno lo stesso nome (es. lingue "it" e "it-it").
  function merge(rows) {
    const out = new Map();
    rows.forEach((r) => out.set(r.k, (out.get(r.k) || 0) + (Number(r.n) || 0)));
    return [...out].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
  }

  function barList(rows, opts = {}) {
    const list = rows.filter((r) => opts.keepZero || Number(r.n) > 0);
    if (!list.length) return '<p class="item-meta">Ancora nessun dato.</p>';
    const max = Math.max(...list.map((r) => Number(r.n) || 0), 1);
    const total = list.reduce((a, r) => a + (Number(r.n) || 0), 0);
    return `<div class="ins-bars">${list.map((r) => `
      <div class="ins-bar-row" title="${esc(r.k)}: ${fmt(r.n)}${total ? ` (${pct(r.n, total)}% del totale)` : ''}">
        <span class="ins-bar-label">${esc(r.k)}</span>
        <span class="ins-bar-track"><span style="width:${r.n ? Math.max(1.5, r.n / max * 100) : 0}%"></span></span>
        <span class="ins-bar-val">${fmt(r.n)}${r.extra ? `<small>${esc(r.extra)}</small>` : ''}</span>
      </div>`).join('')}</div>`;
  }

  function insightSections(d) {
    if (!d.sections.length) return '<p class="item-meta">Ancora nessun dato.</p>';
    const max = Math.max(...d.sections.map((s) => s.views), 1);
    return `<div class="ins-table-wrap"><table class="ins-table">
      <thead><tr><th>Sezione</th><th class="ins-col-bar">Visualizzazioni</th><th>Visite</th><th>Tempo medio</th><th>Scorrimento</th><th>Ingressi</th></tr></thead>
      <tbody>${d.sections.map((s) => `
        <tr>
          <td>${esc(SECTION_NAMES[s.k] || s.k)}</td>
          <td class="ins-col-bar"><span class="ins-cell-bar"><span class="ins-bar-track"><span style="width:${s.views ? Math.max(1.5, s.views / max * 100) : 0}%"></span></span><b>${fmt(s.views)}</b></span></td>
          <td>${fmt(s.sessions)}</td>
          <td>${fmtDur(s.views ? s.seconds / s.views : 0)}</td>
          <td>${s.scroll == null ? '—' : s.scroll + '%'}</td>
          <td>${fmt(s.entries)}</td>
        </tr>`).join('')}</tbody></table></div>
      <p class="item-meta ins-note" style="margin:10px 0 0">Tempo medio = tempo passato nella sezione per ogni visualizzazione. Scorrimento = fin dove si scende in media nella pagina. Ingressi = visite iniziate da quella sezione.</p>`;
  }

  function insightLabelCards(d) {
    const by = {};
    d.labels.forEach((r) => { (by[r.name] = by[r.name] || []).push(r); });
    return LABEL_GROUPS.filter((n) => by[n]).map((n) => `
      <div class="form-card">
        <div class="ins-head"><h2>${esc(CLICK_NAMES[n] || n)}</h2><span class="item-meta">i più frequenti</span></div>
        ${barList(by[n].slice(0, 10).map((r) => ({ k: r.k, n: r.n })))}
      </div>`).join('');
  }

  function hourChart(hours) {
    const max = Math.max(...hours, 1);
    return `<div class="ins-hours" role="img" aria-label="Visualizzazioni per ora del giorno">
      ${hours.map((n, h) => `<span class="ins-hour" title="Dalle ${h}:00 alle ${h}:59 · ${fmt(n)} visualizzazioni"><i style="height:${n ? Math.max(3, n / max * 100) : 0}%"></i></span>`).join('')}
    </div><div class="ins-hours-axis"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></div>`;
  }

  function insightRecent(rows) {
    if (!rows.length) return '<p class="item-meta">Ancora nessuna attività.</p>';
    return `<div class="ins-table-wrap"><table class="ins-table ins-recent">
      <thead><tr><th>Quando</th><th>Cosa</th><th>Sezione</th><th>Dettaglio</th><th>Dispositivo</th><th>Paese</th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td>${esc(new Date(r.ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))}</td>
          <td>${r.type === 'view' ? 'Visualizzazione' : esc(CLICK_NAMES[r.name] || r.name)}</td>
          <td>${esc(SECTION_NAMES[r.section] || r.section || '—')}</td>
          <td>${esc(r.label || '')}</td>
          <td>${esc([r.device, r.browser].filter(Boolean).join(' · '))}</td>
          <td>${esc(regionName(r.country))}</td>
        </tr>`).join('')}</tbody></table></div>`;
  }

  // Grafico a linee dell'andamento, disegnato sulla larghezza reale del riquadro.
  function drawTrend() {
    const box = document.getElementById('insightTrend');
    const d = state.insight.data;
    if (!box || !d) return;
    const pts = d.series;
    const hourly = d.range.days === 1;
    const W = Math.max(box.clientWidth, 280);
    const H = 240;
    const L = 40, R = 14, T = 12, B = 28;
    const maxRaw = Math.max(...pts.map((p) => p.views), 1);
    const unit = Math.pow(10, Math.floor(Math.log10(maxRaw)));
    const tick = [0.25, 0.5, 1, 2, 2.5, 5, 10].map((m) => Math.max(1, m * unit)).find((v) => v * 4 >= maxRaw);
    const top = tick * 4;
    const x = (i) => pts.length === 1 ? L + (W - L - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const line = (key) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join('');
    const every = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor((W - L) / 70))));
    const xLabel = (p) => hourly ? `${p.k}:00` : dayLabel(p.k);
    box.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Visualizzazioni e visitatori nel periodo">
        ${[0, 1, 2, 3, 4].map((i) => `<line x1="${L}" x2="${W - R}" y1="${y(tick * i)}" y2="${y(tick * i)}" class="ins-grid-line"/>
          <text x="${L - 8}" y="${y(tick * i) + 4}" text-anchor="end" class="ins-axis">${fmt(tick * i)}</text>`).join('')}
        ${pts.map((p, i) => i % every === 0
          ? `<text x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : 'middle'}" class="ins-axis">${esc(xLabel(p))}</text>` : '').join('')}
        <path d="${line('views')}L${x(pts.length - 1)},${y(0)}L${x(0)},${y(0)}Z" fill="var(--viz-1)" opacity=".12"/>
        <path d="${line('views')}" fill="none" stroke="var(--viz-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="${line('visitors')}" fill="none" stroke="var(--viz-2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <g class="ins-hover" visibility="hidden">
          <line class="ins-cross" y1="${T}" y2="${H - B}"/>
          <circle r="4.5" class="ins-pt" fill="var(--viz-1)"/>
          <circle r="4.5" class="ins-pt" fill="var(--viz-2)"/>
        </g>
        <rect x="${L - 10}" y="0" width="${W - L - R + 20}" height="${H}" fill="transparent" class="ins-hit"/>
      </svg>
      <div class="ins-tip" hidden></div>`;
    const svg = box.querySelector('svg');
    const g = svg.querySelector('.ins-hover');
    const tip = box.querySelector('.ins-tip');
    const [c1, c2] = g.querySelectorAll('circle');
    const cross = g.querySelector('line');
    const show = (clientX) => {
      const r = svg.getBoundingClientRect();
      const rel = (clientX - r.left - L) / (W - L - R);
      const i = Math.min(pts.length - 1, Math.max(0, Math.round(rel * (pts.length - 1))));
      const p = pts[i];
      g.setAttribute('visibility', 'visible');
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
      c1.setAttribute('cx', x(i)); c1.setAttribute('cy', y(p.views));
      c2.setAttribute('cx', x(i)); c2.setAttribute('cy', y(p.visitors));
      tip.hidden = false;
      tip.innerHTML = `<strong>${esc(hourly ? `Oggi, ${p.k}:00 – ${p.k}:59` : dayLabel(p.k, true))}</strong>
        <span><i style="background:var(--viz-1)"></i>Visualizzazioni <b>${fmt(p.views)}</b></span>
        <span><i style="background:var(--viz-2)"></i>Visitatori <b>${fmt(p.visitors)}</b></span>
        <span><i></i>Visite <b>${fmt(p.sessions)}</b></span>`;
      tip.style.left = (x(i) + 14 + tip.offsetWidth > W ? x(i) - 14 - tip.offsetWidth : x(i) + 14) + 'px';
    };
    const hide = () => { g.setAttribute('visibility', 'hidden'); tip.hidden = true; };
    const hit = svg.querySelector('.ins-hit');
    hit.addEventListener('pointermove', (e) => show(e.clientX));
    hit.addEventListener('pointerdown', (e) => show(e.clientX));
    hit.addEventListener('pointerleave', hide);
  }

  async function loadInsight(quiet) {
    const ins = state.insight;
    const days = ins.days;
    ins.loading = true;
    try {
      const res = await fetch(`/api/insight?days=${days}`, { cache: 'no-store' });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || 'Errore ' + res.status);
      if (days !== ins.days) return;
      ins.data = out;
      ins.error = '';
    } catch (err) {
      if (days !== ins.days) return;
      ins.error = err.message === 'Failed to fetch' ? 'Il Gestore non risponde' : err.message;
      if (quiet && ins.data) toast('Statistiche non aggiornate: ' + ins.error, true);
      else ins.data = null;
    } finally {
      ins.loading = false;
    }
    const body = document.getElementById('insightBody');
    if (body) { body.innerHTML = insightBody(); drawTrend(); }
  }

  // Mentre la scheda Insight è aperta, ricarica i numeri ogni minuto.
  function watchInsight() {
    const open = state.route === 'admin' && state.isAdmin && !state.editing && state.adminTab === 'insight' && state.localServer;
    if (!open) { clearInterval(insightTimer); insightTimer = null; return; }
    if (!state.insight.data && !state.insight.loading) loadInsight();
    else drawTrend();
    if (!insightTimer) {
      insightTimer = setInterval(() => {
        if (document.visibilityState === 'visible' && document.getElementById('insightBody')) loadInsight(true);
      }, 60000);
    }
  }
  window.addEventListener('resize', () => { clearTimeout(drawTrend.t); drawTrend.t = setTimeout(drawTrend, 150); });

  /* ---------- Pubblica ---------- */

  function adminPublish() {
    const size = new Blob([JSON.stringify(state.data)]).size;
    const status = state.hasDraft
      ? '<div class="notice">Ci sono modifiche salvate solo in questo browser, non ancora nel sito.</div>'
      : '<div class="notice ok">Tutto salvato: il file del sito contiene la stessa versione che vedi tu.</div>';
    const main = state.localServer ? `
        <h2 style="margin:0">Sito online</h2>
        <p style="margin:0">Ogni modifica salvata qui, o fatta alla cartella del sito, viene registrata su questo PC e inviata automaticamente alla copia online.</p>
        <div id="syncStatus"><div class="notice">Controllo lo stato…</div></div>
        ${state.hasDraft ? `<div class="notice">Alcune modifiche sono rimaste solo in questa finestra. <button class="btn small" data-action="publish-local">Salva nel sito</button></div>` : ''}
        <div class="row">
          <button class="btn" data-action="sync-now">${ICONS.upload} Sincronizza ora</button>
          <span class="item-meta">Dimensione contenuti: ${(size / 1024 / 1024).toFixed(2)} MB</span>
        </div>` : `
        <h2 style="margin:0">Pubblica le modifiche</h2>
        ${status}
        <p style="margin:0">Il contenuto del sito (articoli, foto, programmi e dati) è contenuto in un unico file: <code>data.json</code>. Per aggiornare il sito online:</p>
        <ol class="steps">
          <li>Clicca <strong>Scarica data.json</strong>.</li>
          <li>Sostituisci il file <code>data.json</code> nella cartella <code>dist</code> del sito con quello scaricato.</li>
          <li>Ricarica la cartella sull'hosting (o fai il deploy).</li>
        </ol>
        <p class="item-meta" style="margin:0">Suggerimento: apri l'area admin dall'icona <strong>Gestione sito</strong> sul desktop e il salvataggio diventa automatico.</p>
        <div class="row">
          <button class="btn" data-action="export">${ICONS.download} Scarica data.json</button>
          <span class="item-meta">Dimensione: ${(size / 1024 / 1024).toFixed(2)} MB</span>
        </div>`;
    return `
      <div class="form-card stack">${main}</div>

      <div class="form-card stack" style="margin-top:20px">
        <h2 style="margin:0">Backup e ripristino</h2>
        <p class="item-meta" style="margin:0">Scarica una copia di tutti i contenuti, o ricaricane una per continuare a lavorare da un altro computer.</p>
        <div class="row">
          ${state.localServer ? `<button class="btn secondary" data-action="export">${ICONS.download} Scarica una copia</button>` : ''}
          <button class="btn secondary" data-action="import">${ICONS.upload} Carica un file data.json</button>
          ${state.hasDraft ? '<button class="btn danger" data-action="discard">Annulla le modifiche non salvate</button>' : ''}
        </div>
        <input type="file" id="importInput" accept="application/json,.json" hidden>
      </div>`;
  }

  async function writeToSite() {
    try {
      const res = await fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.data)
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || 'Errore ' + res.status);
      state.published = clone(state.data);
      await idb.del('draft');
      state.hasDraft = false;
      return true;
    } catch (err) {
      toast('Salvato solo in questa finestra: il Gestore non risponde (' + err.message + ')', true);
      return false;
    }
  }

  async function publishLocal() {
    if (await writeToSite()) {
      toast('Salvato nel sito');
      render();
    }
  }

  async function syncNow(el) {
    el.disabled = true;
    el.textContent = 'Sincronizzazione…';
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const out = await res.json();
      toast(out.pushed ? 'Copia online aggiornata' : out.error ? out.error : 'Già tutto aggiornato', !out.ok);
    } catch (_) {
      toast('Il Gestore non risponde', true);
    }
    loadSyncStatus();
  }

  async function loadSyncStatus() {
    const box = document.getElementById('syncStatus');
    if (!box) return;
    let st;
    try {
      st = await (await fetch('/api/sync-status', { cache: 'no-store' })).json();
    } catch (_) {
      box.innerHTML = '<div class="notice">Impossibile leggere lo stato: il Gestore è aperto?</div>';
      return;
    }
    const when = st.lastPush ? new Date(st.lastPush.replace(' ', 'T')).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '';
    let html;
    if (!st.remote) {
      html = `<div class="notice">La copia online <strong>non è ancora collegata</strong>. Le modifiche sono comunque salvate su questo PC e verranno pubblicate appena la colleghi.</div>`;
    } else if (st.lastError && (st.pending || st.unpushed)) {
      html = `<div class="notice">⚠ Ultimo invio non riuscito (connessione assente?). Riprovo da solo ogni due minuti.<br><small style="color:var(--muted)">${esc(st.lastError.slice(0, 200))}</small></div>`;
    } else if (st.pending || st.unpushed) {
      html = '<div class="notice">Pubblicazione in corso…</div>';
      setTimeout(loadSyncStatus, 4000);
    } else {
      html = `<div class="notice ok">✓ La copia online è allineata a questo PC${when ? ` · ultimo invio ${esc(when)}` : ''}. Dopo un invio, il sito online si aggiorna in circa un minuto.</div>`;
    }
    if (st.remote) html += `<p class="item-meta" style="margin:8px 0 0">Collegato a: <code>${esc(st.remote.replace(/^https:\/\/[^@]*@/, 'https://'))}</code></p>`;
    box.innerHTML = html;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state.data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('File data.json scaricato');
  }

  async function importData(file) {
    try {
      const raw = JSON.parse(await file.text());
      if (!raw || !raw.settings) throw new Error();
      if (!confirm('Sostituire i contenuti attuali con quelli del file?')) return;
      state.data = normalize(raw);
      await saveDraft();
      toast('Dati caricati');
      render();
    } catch (_) {
      toast('File non valido', true);
    }
  }

  /* =========================================================
     Eventi
     ========================================================= */

  const actions = {
    'zoom-shot': (el) => {
      const p = state.view.programs.find((x) => x.id === el.dataset.id);
      const src = p && safeImg(p.image);
      if (!src) return;
      openModal(`
        <h2 id="modalTitle" class="shot-title">${esc(p.name)}</h2>
        <img class="shot-full" src="${src}" alt="${esc(p.name)}">`, { wide: true });
    },
    'logout': () => { sessionSet('admin_ok', null); localSet('admin_remember', null); state.isAdmin = false; state.editing = null; location.hash = '#home'; },
    'tab': (el, e) => { e.preventDefault(); state.adminTab = el.dataset.tab; state.editing = null; render(); },

    'cancel-edit': () => { state.editing = null; render(); },

    'new-program': () => {
      state.editing = { type: 'program', isNew: true, draft: {
        id: uid(), name: '', tagline: '', image: '', platform: '', version: '', description: '',
        features: '', trialLabel: '', trialInfo: '', trialUrl: '', requirements: '', category: PROGRAM_SECTIONS[0].value
      } };
      render();
      window.scrollTo(0, 0);
    },
    'edit-program': (el) => {
      const p = state.data.programs.find((x) => x.id === el.dataset.id);
      if (!p) return;
      state.editing = { type: 'program', isNew: false, draft: clone(p) };
      render();
      window.scrollTo(0, 0);
    },
    'delete-program': async (el) => {
      const p = state.data.programs.find((x) => x.id === el.dataset.id);
      if (!p || !confirm(`Eliminare "${p.name}"?`)) return;
      state.data.programs = state.data.programs.filter((x) => x.id !== p.id);
      await saveDraft();
      render();
    },
    'move-program': async (el) => {
      const list = state.data.programs;
      const i = list.findIndex((x) => x.id === el.dataset.id);
      const j = i + Number(el.dataset.dir);
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      await saveDraft();
      render();
    },
    'pick-program-image': () => document.getElementById('programImageInput').click(),
    'remove-program-image': () => { syncEditorFromForm(); state.editing.draft.image = ''; render(); },

    'zoom-cert': (el) => {
      const c = state.view.certificates.find((x) => x.id === el.dataset.id);
      const src = c && safeImg(c.image);
      if (!src) return;
      const url = safeUrl(c.url);
      openModal(`
        <h2 id="modalTitle" class="shot-title">${esc(c.title)}</h2>
        <img class="shot-full cert-full" src="${src}" alt="${esc(t('certAlt', { t: c.title }))}">
        ${url ? `<p class="cert-modal-link"><a href="${esc(url)}" target="_blank" rel="noopener" data-track="cert-verify" data-label="${esc((findCert(c.id) || c).title)}">${esc(t('verifyCert', { issuer: c.issuer || t('verifyIssuerFallback') }))}</a></p>` : ''}`, { wide: true });
    },
    'new-cert': () => {
      state.editing = { type: 'cert', isNew: true, draft: newCert() };
      render();
      window.scrollTo(0, 0);
    },
    'edit-cert': (el) => {
      const c = findCert(el.dataset.id);
      if (!c) return;
      state.editing = { type: 'cert', isNew: false, draft: clone(c) };
      render();
      window.scrollTo(0, 0);
    },
    'delete-cert': async (el) => {
      const c = findCert(el.dataset.id);
      if (!c || !confirm(`Eliminare l'attestato "${c.title}"?`)) return;
      state.data.certificates = state.data.certificates.filter((x) => x.id !== c.id);
      await saveDraft();
      render();
    },
    'move-cert': async (el) => {
      const list = state.data.certificates;
      const i = list.findIndex((x) => x.id === el.dataset.id);
      const j = i + Number(el.dataset.dir);
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      await saveDraft();
      render();
    },
    'pick-cert-image': () => document.getElementById('certImageInput').click(),
    'pick-home-photo': () => document.getElementById('homePhotoInput').click(),
    'remove-home-photo': async () => {
      if (!confirm('Togliere la foto dalla Home?')) return;
      state.data.settings.photo = '';
      if (await saveDraft()) { toast('Foto tolta'); render(); }
    },
    'remove-cert-image': () => { syncEditorFromForm(); state.editing.draft.image = ''; render(); },

    'export': exportData,
    'publish-local': publishLocal,
    'sync-now': (el) => syncNow(el),
    'insight-days': (el) => { state.insight.days = Number(el.dataset.days); state.insight.data = null; state.insight.error = ''; render(); },
    'insight-reload': () => loadInsight(true),
    'go-contacts': (el, e) => { e.preventDefault(); if (state.route === 'home') scrollToId('contatti'); else location.hash = '#contatti'; },
    'scroll-to': (el, e) => { e.preventDefault(); scrollToId(el.dataset.target); },
    'import': () => document.getElementById('importInput').click(),
    'discard': async () => {
      if (!confirm('Tornare alla versione pubblicata? Le modifiche non pubblicate andranno perse.')) return;
      await idb.del('draft');
      state.data = clone(state.published);
      state.hasDraft = false;
      render();
      toast('Modifiche annullate');
    }
  };

  function handleClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'SELECT') return;
    const fn = actions[el.dataset.action];
    if (fn) fn(el, e);
  }
  app.addEventListener('click', handleClick);
  modalBody.addEventListener('click', handleClick);

  app.addEventListener('change', async (e) => {
    const t = e.target;
    if ((t.id === 'programImageInput' || t.id === 'certImageInput') && t.files[0]) {
      syncEditorFromForm();
      try {
        state.editing.draft.image = await compressImage(t.files[0], t.id === 'certImageInput' ? 1280 : 1400, 0.82);
        render();
      } catch (err) { toast(err.message, true); }
    } else if (t.id === 'homePhotoInput' && t.files[0]) {
      // La foto si salva subito; il resto del modulo resta com'è finché non premi "Salva".
      try {
        state.data.settings.photo = await compressImage(t.files[0], 900, 0.86);
        const pending = readForm(t.form);
        if (await saveDraft()) {
          toast('Foto salvata');
          render();
          const form = document.getElementById('settingsForm');
          Object.entries(pending).forEach(([k, v]) => { if (form && form.elements[k]) form.elements[k].value = v; });
        }
      } catch (err) { toast(err.message, true); }
    } else if (t.id === 'importInput' && t.files[0]) {
      await importData(t.files[0]);
      t.value = '';
    }
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target;
    e.preventDefault();
    switch (form.id) {
      case 'contactForm': {
        const v = readForm(form);
        if (!v.message) { toast(t('formNeedMessage'), true); return; }
        const s = state.data.settings;
        location.href = `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent(t('mailSubject') + (v.name ? ' - ' + v.name : ''))}&body=${encodeURIComponent(v.message + (v.name ? '\n\n' + v.name : ''))}`;
        insight.click('contact-form', 'Modulo messaggi');
        toast(t('mailOpening'));
        break;
      }
      case 'loginForm': {
        const v = readForm(form);
        if (form.dataset.mode === 'setup') {
          if (v.pass.length < 6) return toast('La password deve avere almeno 6 caratteri', true);
          if (v.pass !== v.pass2) return toast('Le password non coincidono', true);
          const salt = uid();
          localSet('admin_pass', JSON.stringify({ salt, hash: await sha256(salt + v.pass) }));
        } else {
          const stored = JSON.parse(localGet('admin_pass') || '{}');
          if (await sha256(stored.salt + v.pass) !== stored.hash) {
            toast('Password errata', true);
            form.elements['pass'].value = '';
            form.elements['pass'].focus();
            return;
          }
        }
        sessionSet('admin_ok', '1');
        const saved = JSON.parse(localGet('admin_pass') || '{}');
        localSet('admin_remember', form.elements['remember'].checked ? saved.hash : null);
        state.isAdmin = true;
        render();
        break;
      }
      case 'passForm': {
        const v = readForm(form);
        if (v.pass.length < 6) return toast('La password deve avere almeno 6 caratteri', true);
        if (v.pass !== v.pass2) return toast('Le password non coincidono', true);
        const wasRemembered = isRemembered();
        const salt = uid();
        const hash = await sha256(salt + v.pass);
        localSet('admin_pass', JSON.stringify({ salt, hash }));
        if (wasRemembered) localSet('admin_remember', hash);
        form.reset();
        toast('Password aggiornata');
        break;
      }
      case 'programForm': await saveProgramForm(form); break;
      case 'certForm': await saveCertForm(form); break;
      case 'settingsForm': await saveSettingsForm(form); break;
    }
  });

  function afterRender() {
    loadSyncStatus();
    watchInsight();
    loopDemo();
    checkTranslations();
  }

  // Area admin: avvisa quando un testo italiano è nuovo o cambiato dopo l'ultima traduzione.
  // Confronta le impronte salvate in lang/<codice>.json ("source"), come fa admin/traduzioni.py.
  async function checkTranslations() {
    if (state.route !== 'admin' || !state.isAdmin || !(window.crypto && crypto.subtle)) return;
    const texts = {};
    TR_FIELDS.settings.forEach((f) => { if (state.data.settings[f]) texts[`settings.${f}`] = state.data.settings[f]; });
    ['programs', 'certificates'].forEach((g) => state.data[g].forEach((x) => TR_FIELDS[g].forEach((f) => { if (x[f]) texts[`${g}.${x.id}.${f}`] = x[f]; })));
    const key = JSON.stringify(texts);
    if (state.trCheck && state.trCheck.key === key) return;
    const prints = {};
    for (const [k, v] of Object.entries(texts)) prints[k] = (await sha256(v)).slice(0, 12);
    const stale = [];
    for (const l of LANGS.slice(1)) {
      let pack = null;
      try { const res = await fetch(`lang/${l.code}.json`, { cache: 'no-store' }); if (res.ok) pack = await res.json(); } catch (_) {}
      const src = (pack && pack.source) || {};
      const n = Object.keys(prints).filter((k) => src[k] !== prints[k]).length;
      if (n) stale.push(`${l.code.toUpperCase()} ${n}`);
    }
    const before = state.trCheck ? state.trCheck.stale.join() : '';
    state.trCheck = { key, stale };
    if (before !== stale.join() && state.route === 'admin') render();
  }

  // Il finto terminale della Home riparte da capo ogni tanto, per farsi notare.
  let demoTimer = null;
  function loopDemo() {
    clearInterval(demoTimer);
    if (!document.querySelector('.demo-win')) return;
    demoTimer = setInterval(() => {
      const w = document.querySelector('.demo-win');
      if (!w) { clearInterval(demoTimer); return; }
      if (document.hidden) return;
      w.classList.remove('run');
      void w.offsetWidth; // fa ripartire le animazioni CSS
      w.classList.add('run');
    }, 11000);
  }

  /* =========================================================
     Avvio
     ========================================================= */

  document.getElementById('langSelect').addEventListener('change', (e) => setLang(e.target.value));

  (async () => {
    app.innerHTML = '<div class="empty">Caricamento…</div>';
    await Promise.all([detectLocalServer(), loadLang(pickLang())]);
    await loadData();
    render();
    if (pageAnchor()) setTimeout(scrollToAnchor, 50);
  })();
})();

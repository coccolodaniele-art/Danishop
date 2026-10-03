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
      homeTitle: '',
      homeIntro: '',
      siteAbout: '',
      skills: '',
      services: '',
      programsIntro: 'I programmi che ho sviluppato: cosa fanno, come funzionano e come provarli.',
      tradingIntro: 'I miei programmi per chi investe e fa trading: dati ufficiali, analisi dei mercati e intelligenza artificiale.',
      gamesIntro: 'Giochi da fare direttamente nel browser, anche da telefono: niente da scaricare né installare.',
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
    programs: []
  };

  // Sezioni della pagina Programmi: ogni programma appartiene a una delle schede.
  const PROGRAM_SECTIONS = [
    { value: 'apprendimento', route: 'programmi', nav: 'Apprendimento', title: "Programmi per l'apprendimento", introKey: 'programsIntro' },
    { value: 'finanza', route: 'trading', nav: 'Trading e finanza', title: 'Programmi per trading e finanza', introKey: 'tradingIntro' },
    { value: 'giochi', route: 'giochi', nav: 'Giochi', title: 'Giochi', introKey: 'gamesIntro' }
  ];
  const sectionByValue = (v) => PROGRAM_SECTIONS.find((s) => s.value === v) || PROGRAM_SECTIONS[0];
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
    // Articoli e libri delle schede Shop usato e Libri (tolte dal sito): non si vedono più,
    // ma restano nel file così come sono.
    if (Array.isArray(raw.items)) d.items = raw.items;
    if (Array.isArray(raw.books)) d.books = raw.books;
    return d;
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
    if (r === 'info' || r === 'contatti') return 'home';
    return ['home', 'programmi', 'trading', 'giochi', 'admin'].includes(r) ? r : 'home';
  }

  function render() {
    state.route = currentRoute();
    insight.section(state.route);
    updateChrome();
    const views = {
      home: renderHome, admin: renderAdmin,
      programmi: () => renderPrograms(PROGRAM_SECTIONS[0]), trading: () => renderPrograms(PROGRAM_SECTIONS[1]),
      giochi: () => renderPrograms(PROGRAM_SECTIONS[2])
    };
    app.innerHTML = views[state.route]();
    afterRender();
  }

  function updateChrome() {
    const s = state.data.settings;
    document.getElementById('brandName').textContent = s.siteName || 'Il mio sito';
    document.getElementById('brandTagline').textContent = s.tagline || '';
    const titles = { home: s.tagline || 'Home', programmi: PROGRAM_SECTIONS[0].title, trading: PROGRAM_SECTIONS[1].title, giochi: PROGRAM_SECTIONS[2].title, info: 'Info e contatti', admin: 'Area admin' };
    document.title = `${titles[state.route]} · ${s.siteName || 'Il mio sito'}`;
    document.getElementById('footerText').textContent = `© ${new Date().getFullYear()} ${s.ownerName || s.siteName || ''}`;
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === state.route));
    document.querySelector('.footer-lock').hidden = !IS_LOCAL;
    document.getElementById('draftBanner').hidden = !(state.hasDraft && state.isAdmin && state.route !== 'admin');
  }

  window.addEventListener('hashchange', () => {
    if (!modal.hidden) closeModal();
    const prev = state.route;
    render();
    if (wantsContacts()) scrollToContacts();
    else if (prev !== state.route) window.scrollTo(0, 0);
  });

  // #contatti apre la Home direttamente sui contatti (anche i vecchi link #info portano alla Home).
  function wantsContacts() { return /^#\/?contatti/.test(location.hash); }
  function scrollToContacts() {
    const el = document.getElementById('contatti');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
    const cardName = card && card.querySelector('h2') ? card.querySelector('h2').textContent.trim() : '';
    if (el.dataset.track) {
      insight.click(el.dataset.track, el.dataset.label);
      return;
    }
    if (el.dataset.action) {
      if (el.dataset.action === 'zoom-shot') insight.click('zoom-image', cardName);
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
    const s = state.data.settings;
    const list = state.data.programs.filter((p) => p.category === section.value);
    return `
      <section class="page-head">
        <h1>${esc(section.title)}</h1>
        <p>${esc(s[section.introKey])}</p>
      </section>
      ${list.length ? `<div class="programs">${list.map(section.value === 'giochi' ? renderGame : renderProgram).join('')}</div>`
        : section.value === 'giochi' ? '<div class="empty"><strong>Nessun gioco pubblicato</strong>A breve troverai qui i miei giochi.</div>'
          : '<div class="empty"><strong>Nessun programma pubblicato</strong>A breve troverai qui i miei programmi.</div>'}`;
  }

  // Scheda di un gioco: immagine, breve descrizione a lato e pulsante "Gioca ora".
  function renderGame(p) {
    const img = safeImg(p.image);
    const features = String(p.features || '').split('\n').map((x) => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
    const playUrl = safeUrl(p.trialUrl);
    return `
      <article class="program game" id="prog-${esc(p.id)}">
        <div class="program-media${img ? ' has-shot' : ''}">${img ? `
          <button type="button" class="shot" data-action="zoom-shot" data-id="${esc(p.id)}" aria-label="Ingrandisci l'immagine di ${esc(p.name)}">
            <span class="shot-bar" aria-hidden="true"><i></i><i></i><i></i></span>
            <img src="${img}" alt="${esc(p.name)}" loading="lazy">
            <span class="shot-zoom" aria-hidden="true">Ingrandisci</span>
          </button>` : `<span class="initial">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span>`}</div>
        <div class="program-body">
          <div>
            <h2>${esc(p.name)}</h2>
            ${p.tagline ? `<p class="tagline">${esc(p.tagline)}</p>` : ''}
          </div>
          ${p.description ? `<div class="text">${linkify(p.description)}</div>` : ''}
          ${features.length ? `<ul class="features">${features.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          ${p.trialInfo ? `<p class="item-meta">${linkify(p.trialInfo)}</p>` : ''}
          <div class="row">
            ${playUrl ? `<a class="btn play-now" href="${esc(playUrl)}" target="_blank" rel="noopener">${ICONS.play} ${esc(p.trialLabel || 'Gioca ora')}</a>` : ''}
          </div>
          ${p.requirements ? `<p class="item-meta">${linkify(p.requirements)}</p>` : ''}
        </div>
      </article>`;
  }

  function renderProgram(p) {
    const img = safeImg(p.image);
    const features = String(p.features || '').split('\n').map((x) => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
    const trialUrl = safeUrl(p.trialUrl);
    const hasTrial = p.trialLabel || p.trialInfo || trialUrl;
    return `
      <article class="program" id="prog-${esc(p.id)}">
        <div class="program-media${img ? ' has-shot' : ''}">${img ? `
          <button type="button" class="shot" data-action="zoom-shot" data-id="${esc(p.id)}" aria-label="Ingrandisci l'immagine di ${esc(p.name)}">
            <span class="shot-bar" aria-hidden="true"><i></i><i></i><i></i></span>
            <img src="${img}" alt="${esc(p.name)}" loading="lazy">
            <span class="shot-zoom" aria-hidden="true">Ingrandisci</span>
          </button>` : `<span class="initial">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span>`}</div>
        <div class="program-body">
          <div>
            <h2>${esc(p.name)}</h2>
            ${p.tagline ? `<p class="tagline">${esc(p.tagline)}</p>` : ''}
          </div>
          ${p.platform || p.version ? `<div class="spec">
            ${p.platform ? `<span class="badge">${esc(p.platform)}</span>` : ''}
            ${p.version ? `<span class="badge">Versione ${esc(p.version)}</span>` : ''}
          </div>` : ''}
          ${p.description ? `<div class="text">${linkify(p.description)}</div>` : ''}
          ${features.length ? `<ul class="features">${features.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          ${hasTrial ? `
            <div class="trial">
              <h4>${esc(p.trialLabel || 'Modalità di prova')}</h4>
              ${p.trialInfo ? `<p>${linkify(p.trialInfo)}</p>` : ''}
              <div class="row">
                ${trialUrl ? (/\.(exe|msi|zip|rar|7z|dmg|apk)([?#]|$)/i.test(trialUrl)
                  ? `<a class="btn small" href="${esc(trialUrl)}" target="_blank" rel="noopener">${ICONS.download} Scarica il programma</a>`
                  : `<a class="btn small" href="${esc(trialUrl)}" target="_blank" rel="noopener">${ICONS.play} Apri il programma</a>`) : ''}
                <a class="btn secondary small" href="#contatti">Contattami per informazioni</a>
              </div>
            </div>` : `<div><a class="btn secondary small" href="#contatti">Contattami per informazioni</a></div>`}
          ${p.requirements ? `<details><summary class="details-toggle">Requisiti di sistema</summary><div class="req" style="margin-top:6px">${linkify(p.requirements)}</div></details>` : ''}
        </div>
      </article>`;
  }

  /* =========================================================
     Home (pubblico): chi sono, cosa faccio, il sito e i contatti
     ========================================================= */

  const HOME_ICONS = {
    programmi: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    trading: '<path d="M3 20h18"/><path d="M5 16l5-5 3 3 6-7"/><path d="M15 7h4v4"/>',
    giochi: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="15.5" cy="11.5" r=".6"/><circle cx="17.5" cy="13.5" r=".6"/>',
    servizi: '<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 5-4 14"/>'
  };
  const homeIcon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${HOME_ICONS[k]}</svg>`;
  const lines = (text) => String(text || '').split('\n').map((x) => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

  function renderHome() {
    const s = state.data.settings;
    const initials = (s.ownerName || s.siteName || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
    const skills = lines(s.skills);
    const services = lines(s.services);
    const bySection = (sec) => state.data.programs.filter((p) => p.category === sec.value);
    const nPrograms = state.data.programs.filter((p) => p.category !== 'giochi').length;
    const nGames = bySection(PROGRAM_SECTIONS[2]).length;
    const areas = PROGRAM_SECTIONS.map((sec) => {
      const list = bySection(sec);
      const isGame = sec.value === 'giochi';
      return {
        key: sec.route, href: `#${sec.route}`, title: sec.title, text: s[sec.introKey], names: list.map((p) => p.name),
        more: list.length ? `${list.length} ${isGame ? (list.length === 1 ? 'gioco' : 'giochi') : (list.length === 1 ? 'programma' : 'programmi')} →` : 'Scopri di più →'
      };
    });
    if (services.length) areas.push({ key: 'servizi', href: '#contatti', action: 'go-contacts', title: 'Servizi su misura', list: services, more: 'Parliamone →' });

    return `
      <section class="hero">
        <div class="hero-text">
          <span class="hero-eyebrow">${s.ownerName ? `Ciao, sono ${esc(s.ownerName)}` : esc(s.siteName)}${s.city ? ` · ${esc(s.city)}` : ''}</span>
          <h1>${esc(s.homeTitle || s.siteName)}</h1>
          ${s.homeIntro ? `<p>${esc(s.homeIntro)}</p>` : ''}
          <div class="row">
            <a class="btn" href="#programmi" data-track="home-link" data-label="Scopri i progetti">Scopri i progetti</a>
            <a class="btn secondary" href="#contatti" data-action="go-contacts" data-track="home-link" data-label="Contattami">${ICONS.mail} Contattami</a>
          </div>
        </div>
        <div class="hero-mark" aria-hidden="true"><span>${esc(initials)}</span></div>
      </section>

      <section class="home-section">
        <h2 class="section-title">Cosa faccio</h2>
        <div class="home-areas">${areas.map((a) => `
          <a class="area-card" href="${a.href}" ${a.action ? `data-action="${a.action}"` : ''} data-track="home-link" data-label="${esc(a.title)}">
            <span class="area-ico">${homeIcon(a.key)}</span>
            <h3>${esc(a.title)}</h3>
            ${a.text ? `<p>${esc(a.text)}</p>` : ''}
            ${a.names && a.names.length ? `<span class="area-tags">${a.names.map((n) => `<span class="badge">${esc(n)}</span>`).join('')}</span>` : ''}
            ${a.list ? `<ul class="features">${a.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            <span class="area-more">${a.more}</span>
          </a>`).join('')}
        </div>
      </section>

      <section class="home-section home-two">
        <div class="card">
          <h2>Chi sono</h2>
          ${s.about ? `<div class="text">${esc(s.about)}</div>` : '<p class="item-meta">Presentazione in arrivo.</p>'}
          ${skills.length ? `<div class="skill-tags">${skills.map((k) => `<span class="badge">${esc(k)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="card">
          <h2>Il sito</h2>
          ${s.siteAbout ? `<div class="text">${esc(s.siteAbout)}</div>` : ''}
          <div class="home-facts">
            <div><strong>${nPrograms}</strong><span>${nPrograms === 1 ? 'programma' : 'programmi'}</span></div>
            <div><strong>${nGames}</strong><span>${nGames === 1 ? 'gioco' : 'giochi'}</span></div>
            <div><strong>Web</strong><span>niente da installare</span></div>
          </div>
        </div>
      </section>

      ${renderContacts()}`;
  }

  function renderContacts() {
    const s = state.data.settings;
    const contacts = [];
    if (s.email) contacts.push({ ico: ICONS.mail, label: 'Email', text: s.email, href: `mailto:${s.email}` });
    if (s.phone) contacts.push({ ico: ICONS.phone, label: 'Telefono', text: s.phone, href: `tel:${String(s.phone).replace(/[^\d+]/g, '')}` });
    if (s.whatsapp) contacts.push({ ico: ICONS.chat, label: 'WhatsApp', text: s.whatsapp, href: `https://wa.me/${waNumber(s.whatsapp)}`, ext: true });
    if (s.city) contacts.push({ ico: ICONS.pin, label: 'Zona', text: s.city });
    [['website', 'Sito web', ICONS.globe], ['instagram', 'Instagram', ICONS.link], ['facebook', 'Facebook', ICONS.link], ['linkedin', 'LinkedIn', ICONS.link]].forEach(([k, label, ico]) => {
      const u = safeUrl(s[k]);
      if (u) contacts.push({ ico, label, text: u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), href: u, ext: true });
    });
    const list = `
      <div class="card">
        <h2>Recapiti</h2>
        ${contacts.length ? `<ul class="contact-list">${contacts.map((c) => `
          <li>
            <span class="ico">${c.ico}</span>
            <div><small>${esc(c.label)}</small>${c.href ? `<a href="${esc(c.href)}" ${c.ext ? 'target="_blank" rel="noopener"' : ''}>${esc(c.text)}</a>` : `<strong>${esc(c.text)}</strong>`}</div>
          </li>`).join('')}</ul>` : '<p class="item-meta">Contatti in arrivo.</p>'}
      </div>`;
    return `
      <section class="home-section" id="contatti">
        <h2 class="section-title">Contatti</h2>
        <p class="section-sub">Per domande, proposte o per un lavoro su misura scrivimi pure: rispondo il prima possibile.</p>
        <div class="${s.email ? 'info-grid' : ''}">
          ${s.email ? `
          <div class="card">
            <h2>Scrivimi un messaggio</h2>
            <form id="contactForm" class="stack" novalidate>
              <label class="field"><span>Il tuo nome</span><input name="name" autocomplete="name" required></label>
              <label class="field"><span>Messaggio</span><textarea name="message" rows="5" required placeholder="Di cosa vuoi parlarmi?"></textarea></label>
              <div class="row end"><button class="btn" type="submit">${ICONS.mail} Invia messaggio</button></div>
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
    if (state.editing) return renderProgramEditor(state.editing);
    const tabs = [
      ['programmi', 'Programmi', d.programs.length],
      ['insight', 'Insight'],
      ['dati', 'I miei dati'],
      ['pubblica', state.localServer ? 'Online' : (state.hasDraft ? 'Pubblica ●' : 'Pubblica')]
    ];
    const bodies = { programmi: adminPrograms, dati: adminSettings, pubblica: adminPublish, insight: adminInsight };
    return `
      <div class="admin-head">
        <h1>Area admin</h1>
        <div class="row">
          <a class="btn secondary small" href="#home">Vedi il sito</a>
          <button class="btn ghost small" data-action="logout">Esci</button>
        </div>
      </div>
      ${state.hasDraft && state.adminTab !== 'pubblica' ? `<div class="notice" style="margin-bottom:16px">Hai modifiche salvate in questo browser ma non ancora pubblicate. <a href="#admin" data-action="tab" data-tab="pubblica">Pubblica ora</a></div>` : ''}
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
    const form = document.getElementById('programForm');
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

        <div class="form-section">Pagina Home</div>
        ${field('homeTitle', 'Titolo principale', s.homeTitle, { placeholder: 'La frase grande in cima alla Home' })}
        ${field('homeIntro', 'Presentazione breve', s.homeIntro, { textarea: true, rows: 3, hint: 'Compare sotto il titolo, in cima alla Home.' })}
        ${field('about', 'Chi sono', s.about, { textarea: true, rows: 6, placeholder: 'Qualche riga su di te, cosa fai, di cosa ti occupi…' })}
        ${field('skills', 'Competenze', s.skills, { textarea: true, rows: 4, hint: 'Una per riga: compaiono come etichette sotto "Chi sono".' })}
        ${field('services', 'Servizi su misura', s.services, { textarea: true, rows: 3, hint: 'Uno per riga. Se lasci vuoto, il riquadro "Servizi su misura" non compare.' })}
        ${field('siteAbout', 'Il sito', s.siteAbout, { textarea: true, rows: 3, hint: 'Cosa si trova nel sito e come si usa.' })}

        <div class="form-section">Testi delle schede</div>
        ${field('programsIntro', 'Testo introduttivo della scheda Apprendimento', s.programsIntro, { textarea: true, rows: 2 })}
        ${field('tradingIntro', 'Testo introduttivo della scheda Trading e finanza', s.tradingIntro, { textarea: true, rows: 2 })}
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
  const SECTION_NAMES = { home: 'Home', programmi: 'Apprendimento', trading: 'Trading e finanza', giochi: 'Giochi', info: 'Info e contatti' };
  const CLICK_NAMES = {
    'open-program': 'Programmi aperti', 'download': 'Programmi scaricati', 'play-game': 'Giochi avviati',
    'zoom-image': 'Immagini dei programmi ingrandite', 'ask-info': 'Richieste di informazioni',
    'contact': 'Contatti cliccati', 'contact-form': 'Messaggi dal modulo', 'external-link': 'Link esterni aperti',
    'home-link': 'Clic sui riquadri della Home'
  };
  const LABEL_GROUPS = ['open-program', 'play-game', 'home-link', 'download', 'ask-info', 'contact', 'external-link', 'zoom-image'];
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
        <a href="https://coccolodaniele-art.github.io/Danishop/?noinsight" target="_blank" rel="noopener">questo indirizzo</a>.
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
      const p = state.data.programs.find((x) => x.id === el.dataset.id);
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

    'export': exportData,
    'publish-local': publishLocal,
    'sync-now': (el) => syncNow(el),
    'insight-days': (el) => { state.insight.days = Number(el.dataset.days); state.insight.data = null; state.insight.error = ''; render(); },
    'insight-reload': () => loadInsight(true),
    'go-contacts': (el, e) => { e.preventDefault(); if (state.route === 'home') scrollToContacts(); else location.hash = '#contatti'; },
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
    if (t.id === 'programImageInput' && t.files[0]) {
      syncEditorFromForm();
      try {
        state.editing.draft.image = await compressImage(t.files[0], 1400, 0.82);
        render();
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
        if (!v.message) { toast('Scrivi un messaggio', true); return; }
        const s = state.data.settings;
        location.href = `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent('Messaggio dal sito' + (v.name ? ' - ' + v.name : ''))}&body=${encodeURIComponent(v.message + (v.name ? '\n\n' + v.name : ''))}`;
        insight.click('contact-form', 'Modulo messaggi');
        toast('Si sta aprendo il tuo programma di posta');
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
      case 'settingsForm': await saveSettingsForm(form); break;
    }
  });

  function afterRender() {
    loadSyncStatus();
    watchInsight();
  }

  /* =========================================================
     Avvio
     ========================================================= */

  (async () => {
    app.innerHTML = '<div class="empty">Caricamento…</div>';
    await detectLocalServer();
    await loadData();
    render();
    if (wantsContacts()) setTimeout(scrollToContacts, 50);
  })();
})();

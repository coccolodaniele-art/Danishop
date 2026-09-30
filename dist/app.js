(() => {
  'use strict';

  /* =========================================================
     Dati
     ========================================================= */

  const DEFAULT_DATA = {
    version: 1,
    settings: {
      siteName: 'Il mio sito',
      tagline: 'Oggetti usati, programmi e contatti',
      shopIntro: 'Oggetti di seconda mano in buono stato, fotografati e descritti con cura. Clicca su un articolo per vederlo da vicino e acquistarlo.',
      programsIntro: 'I programmi che ho sviluppato: cosa fanno, come funzionano e come provarli.',
      tradingIntro: 'I miei programmi per chi investe e fa trading: dati ufficiali, analisi dei mercati e intelligenza artificiale.',
      ownerName: '',
      email: '',
      phone: '',
      whatsapp: '',
      city: '',
      website: '',
      instagram: '',
      facebook: '',
      linkedin: '',
      about: '',
      ibanHolder: '',
      iban: '',
      bank: '',
      bic: '',
      paymentNote: 'Dopo aver ricevuto il bonifico spedisco l\'oggetto entro 2 giorni lavorativi e ti invio il codice di tracciamento.',
      defaultShipping: 8
    },
    items: [],
    programs: []
  };

  const CONDITIONS = ['Nuovo', 'Come nuovo', 'Ottime condizioni', 'Buone condizioni', 'Usato con segni', 'Da riparare / per ricambi'];
  const STATUSES = [
    { value: 'disponibile', label: 'Disponibile' },
    { value: 'riservato', label: 'Riservato' },
    { value: 'venduto', label: 'Venduto' }
  ];
  const MAX_PHOTOS = 6;
  // Sezioni della pagina Programmi: ogni programma appartiene a una delle due schede.
  const PROGRAM_SECTIONS = [
    { value: 'apprendimento', route: 'programmi', nav: 'Apprendimento', title: "Programmi per l'apprendimento", introKey: 'programsIntro' },
    { value: 'finanza', route: 'trading', nav: 'Trading e finanza', title: 'Programmi per trading e finanza', introKey: 'tradingIntro' }
  ];
  const sectionByValue = (v) => PROGRAM_SECTIONS.find((s) => s.value === v) || PROGRAM_SECTIONS[0];
  // L'area admin esiste solo sulla copia del sito in questo PC, mai su quella online.
  const IS_LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  const state = {
    data: clone(DEFAULT_DATA),
    published: clone(DEFAULT_DATA),
    hasDraft: false,
    isAdmin: sessionGet('admin_ok') === '1' || isRemembered(),
    route: 'programmi',
    shop: { q: '', cat: 'Tutte', showSold: false },
    adminTab: 'articoli',
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
    d.items = Array.isArray(raw.items) ? raw.items.map((it) => Object.assign({
      id: uid(), title: '', price: 0, shipping: 0, condition: CONDITIONS[2], category: '',
      description: '', photos: [], status: 'disponibile', createdAt: Date.now()
    }, it)) : [];
    d.programs = Array.isArray(raw.programs) ? raw.programs.map((p) => Object.assign({
      id: uid(), name: '', tagline: '', image: '', platform: '', version: '', description: '',
      features: '', trialLabel: '', trialInfo: '', trialUrl: '', requirements: '', category: PROGRAM_SECTIONS[0].value
    }, p)).map((p) => Object.assign(p, { category: sectionByValue(p.category).value })) : [];
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

  function formatIban(iban) { return String(iban || '').replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim(); }
  function ibanValid(iban) {
    const s = String(iban || '').replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    if (s.startsWith('IT') && s.length !== 27) return false;
    const r = s.slice(4) + s.slice(0, 4);
    let mod = 0;
    for (const ch of r) {
      const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
      for (const d of v) mod = (mod * 10 + Number(d)) % 97;
    }
    return mod === 1;
  }
  function waNumber(n) {
    let d = String(n || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (/^3\d{8,9}$/.test(d)) d = '39' + d;
    return d;
  }
  function paragraphs(text) {
    return esc(text).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
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

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Copiato negli appunti');
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
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m0 0-4-4m4 4 4-4"/><path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5 9-10"/></svg>'
  };

  function noPhoto() { return `<div class="no-photo">${ICONS.photo}</div>`; }
  function statusLabel(s) { return (STATUSES.find((x) => x.value === s) || STATUSES[0]).label; }

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
    return ['shop', 'programmi', 'trading', 'info', 'admin'].includes(r) ? r : 'programmi';
  }

  function render() {
    state.route = currentRoute();
    updateChrome();
    const views = {
      shop: renderShop, info: renderInfo, admin: renderAdmin,
      programmi: () => renderPrograms(PROGRAM_SECTIONS[0]), trading: () => renderPrograms(PROGRAM_SECTIONS[1])
    };
    app.innerHTML = views[state.route]();
    afterRender();
  }

  function updateChrome() {
    const s = state.data.settings;
    document.getElementById('brandName').textContent = s.siteName || 'Il mio sito';
    document.getElementById('brandTagline').textContent = s.tagline || '';
    const titles = { shop: 'Shop usato', programmi: PROGRAM_SECTIONS[0].title, trading: PROGRAM_SECTIONS[1].title, info: 'Info e contatti', admin: 'Area admin' };
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
    if (prev !== state.route) window.scrollTo(0, 0);
  });

  /* =========================================================
     Shop usato (pubblico)
     ========================================================= */

  function visibleItems() {
    const { q, cat, showSold } = state.shop;
    const needle = q.trim().toLowerCase();
    const order = { disponibile: 0, riservato: 1, venduto: 2 };
    return state.data.items
      .filter((it) => showSold || it.status !== 'venduto')
      .filter((it) => cat === 'Tutte' || it.category === cat)
      .filter((it) => !needle || [it.title, it.description, it.category].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => (order[a.status] - order[b.status]) || (b.createdAt - a.createdAt));
  }

  function renderShop() {
    const s = state.data.settings;
    const cats = [...new Set(state.data.items.filter((i) => i.category).map((i) => i.category))].sort();
    const soldCount = state.data.items.filter((i) => i.status === 'venduto').length;
    return `
      <section class="page-head">
        <h1>Shop usato</h1>
        <p>${esc(s.shopIntro)}</p>
      </section>
      ${state.data.items.length ? `
        <div class="toolbar">
          <label class="search">
            ${ICONS.search}
            <input type="search" id="shopSearch" placeholder="Cerca un articolo…" value="${esc(state.shop.q)}" aria-label="Cerca">
          </label>
          ${cats.length ? `<div class="chips">
            ${['Tutte', ...cats].map((c) => `<button class="chip ${state.shop.cat === c ? 'active' : ''}" data-action="shop-cat" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
          </div>` : ''}
          ${soldCount ? `<button class="chip ${state.shop.showSold ? 'active' : ''}" data-action="toggle-sold">Mostra venduti (${soldCount})</button>` : ''}
        </div>` : ''}
      <div id="itemsGrid">${renderItemsGrid()}</div>`;
  }

  function renderItemsGrid() {
    const list = visibleItems();
    if (!state.data.items.length) {
      return `<div class="empty"><strong>Nessun articolo in vendita al momento</strong>Torna a trovarci presto!</div>`;
    }
    if (!list.length) return `<div class="empty"><strong>Nessun risultato</strong>Prova a cambiare ricerca o categoria.</div>`;
    return `<div class="items">${list.map((it) => {
      const cover = safeImg(it.photos[0]);
      return `
        <button class="item-card ${it.status === 'venduto' ? 'sold' : ''}" data-action="open-item" data-id="${esc(it.id)}">
          <div class="item-photo">
            ${cover ? `<img src="${cover}" alt="${esc(it.title)}" loading="lazy">` : noPhoto()}
            ${it.status !== 'disponibile' ? `<span class="badge status-${esc(it.status)}">${statusLabel(it.status)}</span>` : ''}
          </div>
          <div class="item-body">
            <h3>${esc(it.title)}</h3>
            <span class="item-meta">${esc(it.condition)}${it.category ? ' · ' + esc(it.category) : ''}</span>
            <span class="item-price">${money(it.price)}</span>
          </div>
        </button>`;
    }).join('')}</div>`;
  }

  function findItem(id) { return state.data.items.find((i) => i.id === id); }

  function openItem(id) {
    const it = findItem(id);
    if (!it) return;
    const photos = it.photos.map(safeImg).filter(Boolean);
    const shipping = Number(it.shipping) || 0;
    const canBuy = it.status === 'disponibile';
    openModal(`
      <div class="detail">
        <div>
          <div class="gallery-main" id="galleryMain">
            ${photos[0] ? `<img src="${photos[0]}" alt="${esc(it.title)}">` : noPhoto()}
          </div>
          ${photos.length > 1 ? `<div class="thumbs">${photos.map((p, i) => `
            <button class="${i === 0 ? 'active' : ''}" data-action="gallery" data-index="${i}" aria-label="Foto ${i + 1}"><img src="${p}" alt=""></button>`).join('')}</div>` : ''}
        </div>
        <div>
          <span class="badge status-${esc(it.status)}">${statusLabel(it.status)}</span>
          <h2 id="modalTitle">${esc(it.title)}</h2>
          <div class="spec">
            <span class="badge">${esc(it.condition)}</span>
            ${it.category ? `<span class="badge">${esc(it.category)}</span>` : ''}
          </div>
          <div class="price-big">${money(it.price)}</div>
          <div class="item-meta">${shipping > 0 ? `+ ${money(shipping)} di spedizione` : 'Spedizione inclusa'}</div>
          ${it.description ? `<div class="desc">${esc(it.description)}</div>` : '<div style="height:18px"></div>'}
          ${canBuy
            ? `<button class="btn block" data-action="buy" data-id="${esc(it.id)}">Acquista</button>`
            : `<div class="notice">${it.status === 'venduto' ? 'Questo articolo è già stato venduto.' : 'Questo articolo è riservato: un altro acquirente sta completando l\'acquisto.'}</div>`}
        </div>
      </div>`);
    modalBody._photos = photos;
    modalBody._title = it.title;
  }

  function orderCode() {
    const d = new Date();
    return `ORD-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function openCheckout(id) {
    const it = findItem(id);
    if (!it) return;
    const s = state.data.settings;
    const shipping = Number(it.shipping) || 0;
    const total = (Number(it.price) || 0) + shipping;
    const code = orderCode();
    const causale = `${code} ${it.title}`.slice(0, 120);
    const cover = safeImg(it.photos[0]);
    const hasIban = !!s.iban;
    const saved = (() => { try { return JSON.parse(localGet('buyer') || '{}'); } catch (_) { return {}; } })();
    const f = (name, label, opts = {}) => `
      <label class="field">
        <span>${label}${opts.req ? ' *' : ''}</span>
        <input name="${name}" type="${opts.type || 'text'}" autocomplete="${opts.ac || 'on'}" value="${esc(saved[name] || '')}" ${opts.req ? 'required' : ''} ${opts.extra || ''}>
      </label>`;

    openModal(`
      <div class="checkout-head">
        <div class="mini">${cover ? `<img src="${cover}" alt="">` : noPhoto()}</div>
        <div>
          <div class="item-meta">Stai acquistando</div>
          <h2 id="modalTitle">${esc(it.title)}</h2>
        </div>
      </div>

      <div class="totals">
        <div><span>Prezzo</span><span>${money(it.price)}</span></div>
        <div><span>Spedizione</span><span>${shipping > 0 ? money(shipping) : 'Inclusa'}</span></div>
        <div class="total"><span>Totale da pagare</span><span>${money(total)}</span></div>
      </div>

      <div class="iban-box">
        <h3>1 · Paga con bonifico bancario</h3>
        ${hasIban ? `
          ${copyLine('Intestatario', s.ibanHolder || s.ownerName || '—', s.ibanHolder || s.ownerName)}
          ${copyLine('IBAN', formatIban(s.iban), String(s.iban).replace(/\s+/g, ''))}
          ${s.bank ? copyLine('Banca', s.bank, s.bank) : ''}
          ${s.bic ? copyLine('BIC / SWIFT', s.bic, s.bic) : ''}
          ${copyLine('Importo', money(total), total.toFixed(2).replace('.', ','))}
          ${copyLine('Causale', causale, causale)}
          ${s.paymentNote ? `<p class="iban-note">${esc(s.paymentNote)}</p>` : ''}
        ` : `<p class="iban-note">I dati per il bonifico ti verranno comunicati dopo l'invio dell'ordine.</p>`}
      </div>

      <form id="checkoutForm" class="stack" novalidate data-item="${esc(it.id)}" data-code="${esc(code)}" data-causale="${esc(causale)}" data-total="${total}">
        <div class="section-label">2 · Dove devo spedirlo?</div>
        ${f('name', 'Nome e cognome', { req: true, ac: 'name' })}
        <div class="grid-2">
          ${f('email', 'Email', { type: 'email', ac: 'email', req: true })}
          ${f('phone', 'Telefono', { type: 'tel', ac: 'tel' })}
        </div>
        ${f('address', 'Indirizzo e numero civico', { req: true, ac: 'street-address' })}
        <div class="grid-3">
          ${f('city', 'Città', { req: true, ac: 'address-level2' })}
          ${f('zip', 'CAP', { req: true, ac: 'postal-code', extra: 'inputmode="numeric" maxlength="10"' })}
          ${f('province', 'Provincia', { ac: 'address-level1', extra: 'maxlength="30"' })}
        </div>
        <label class="field">
          <span>Note per il venditore</span>
          <textarea name="notes" rows="2" placeholder="Es. citofono, orari di consegna, domande…"></textarea>
        </label>

        <div class="section-label">3 · Invia l'ordine</div>
        <div class="row">
          ${s.email ? `<button class="btn" type="submit" data-via="email">${ICONS.mail} Invia ordine via email</button>` : ''}
          ${s.whatsapp ? `<button class="btn whatsapp" type="submit" data-via="whatsapp">${ICONS.chat} Invia su WhatsApp</button>` : ''}
          ${!s.email && !s.whatsapp ? '<div class="notice">Il venditore non ha ancora configurato un contatto per ricevere gli ordini.</div>' : ''}
        </div>
        <small class="item-meta">Riceverò i tuoi dati di spedizione e ti confermerò la disponibilità. Spedisco appena ricevo il bonifico.</small>
      </form>`);
  }

  function copyLine(label, display, value) {
    return `
      <div class="iban-line">
        <div><small>${esc(label)}</small><code>${esc(display)}</code></div>
        <button type="button" class="btn secondary small" data-action="copy" data-value="${esc(value || '')}" aria-label="Copia ${esc(label)}">${ICONS.copy} Copia</button>
      </div>`;
  }

  function submitCheckout(form, via) {
    const fd = new FormData(form);
    const v = Object.fromEntries([...fd.entries()].map(([k, val]) => [k, String(val).trim()]));
    form.querySelectorAll('.field').forEach((el) => { el.classList.remove('invalid'); el.querySelector('.err') && el.querySelector('.err').remove(); });
    const errors = {};
    if (!v.name) errors.name = 'Inserisci nome e cognome';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = 'Email non valida';
    if (!v.address) errors.address = 'Inserisci l\'indirizzo';
    if (!v.city) errors.city = 'Inserisci la città';
    if (!/^[\w\s-]{3,10}$/.test(v.zip)) errors.zip = 'CAP non valido';
    const keys = Object.keys(errors);
    if (keys.length) {
      keys.forEach((k) => {
        const input = form.querySelector(`[name="${k}"]`);
        const field = input.closest('.field');
        field.classList.add('invalid');
        field.insertAdjacentHTML('beforeend', `<span class="err">${errors[k]}</span>`);
      });
      form.querySelector(`[name="${keys[0]}"]`).focus();
      return;
    }
    localSet('buyer', JSON.stringify({ name: v.name, email: v.email, phone: v.phone, address: v.address, city: v.city, zip: v.zip, province: v.province }));

    const it = findItem(form.dataset.item);
    const s = state.data.settings;
    const total = Number(form.dataset.total);
    const lines = [
      `Ciao${s.ownerName ? ' ' + s.ownerName.split(' ')[0] : ''}, vorrei acquistare questo articolo dal tuo Shop usato:`,
      '',
      `ARTICOLO: ${it.title}`,
      `Prezzo: ${money(it.price)} · Spedizione: ${Number(it.shipping) > 0 ? money(it.shipping) : 'inclusa'}`,
      `TOTALE: ${money(total)}`,
      `Codice ordine: ${form.dataset.code}`,
      '',
      'DATI DI SPEDIZIONE',
      v.name,
      v.address,
      `${v.zip} ${v.city}${v.province ? ' (' + v.province + ')' : ''}`,
      `Email: ${v.email}`,
      v.phone ? `Telefono: ${v.phone}` : '',
      v.notes ? `\nNote: ${v.notes}` : '',
      '',
      `Effettuerò il bonifico con causale: "${form.dataset.causale}"`
    ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));
    const body = lines.join('\n');

    if (via === 'whatsapp') {
      window.open(`https://wa.me/${waNumber(s.whatsapp)}?text=${encodeURIComponent(body)}`, '_blank', 'noopener');
    } else {
      location.href = `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent('Ordine ' + form.dataset.code + ' - ' + it.title)}&body=${encodeURIComponent(body)}`;
    }
    showOrderSent(it, form.dataset, via);
  }

  function showOrderSent(it, ds, via) {
    const s = state.data.settings;
    const box = modalBody.querySelector('.iban-box');
    const ibanHtml = box ? box.outerHTML.replace('1 · Paga con bonifico bancario', 'Dati per il bonifico') : '';
    modalBody.innerHTML = `
      <div class="success">
        <div class="tick">${ICONS.check}</div>
        <h2 id="modalTitle" style="margin:0 0 6px">Ci siamo quasi!</h2>
        <p class="item-meta" style="margin:0 0 18px">
          Si è aperto ${via === 'whatsapp' ? 'WhatsApp' : 'il tuo programma di posta'} con l'ordine già compilato: <strong>premi Invia</strong> per mandarmelo.
          Poi effettua il bonifico di <strong>${money(ds.total)}</strong>.
        </p>
      </div>
      ${ibanHtml}
      <div class="row between">
        <span class="item-meta">Codice ordine: <strong>${esc(ds.code)}</strong></span>
        <div class="row">
          ${via === 'email' && s.email ? `<button class="btn secondary small" data-action="copy" data-value="${esc(s.email)}">${ICONS.copy} Copia la mia email</button>` : ''}
          <button class="btn small" data-close>Fatto</button>
        </div>
      </div>
      ${via === 'email' ? `<p class="item-meta" style="font-size:.84rem;margin-top:14px">Non si è aperto nulla? Scrivimi a <a href="mailto:${esc(s.email)}">${esc(s.email)}</a> indicando il codice ordine e il tuo indirizzo.</p>` : ''}`;
    modalCard.scrollTop = 0;
  }

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
      ${list.length ? `<div class="programs">${list.map(renderProgram).join('')}</div>`
        : '<div class="empty"><strong>Nessun programma pubblicato</strong>A breve troverai qui i miei programmi.</div>'}`;
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
                <a class="btn secondary small" href="#info">Contattami per informazioni</a>
              </div>
            </div>` : `<div><a class="btn secondary small" href="#info">Contattami per informazioni</a></div>`}
          ${p.requirements ? `<details><summary class="details-toggle">Requisiti di sistema</summary><div class="req" style="margin-top:6px">${linkify(p.requirements)}</div></details>` : ''}
        </div>
      </article>`;
  }

  /* =========================================================
     Info e contatti (pubblico)
     ========================================================= */

  function renderInfo() {
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

    return `
      <section class="page-head">
        <h1>Info e contatti</h1>
        <p>Per qualsiasi domanda, curiosità o proposta scrivimi pure: rispondo il prima possibile.</p>
      </section>
      <div class="info-grid">
        <div class="stack">
          <div class="card">
            <h2>${s.ownerName ? `Ciao, sono ${esc(s.ownerName)}` : 'Chi sono'}</h2>
            ${s.about ? `<div class="text">${esc(s.about)}</div>` : '<p class="item-meta">Presentazione in arrivo.</p>'}
          </div>
          ${s.email ? `
          <div class="card">
            <h2>Scrivimi un messaggio</h2>
            <form id="contactForm" class="stack" novalidate>
              <label class="field"><span>Il tuo nome</span><input name="name" autocomplete="name" required></label>
              <label class="field"><span>Messaggio</span><textarea name="message" rows="4" required placeholder="Di cosa vuoi parlarmi?"></textarea></label>
              <div class="row end"><button class="btn" type="submit">${ICONS.mail} Invia messaggio</button></div>
            </form>
          </div>` : ''}
        </div>
        <div class="card">
          <h2>Contatti</h2>
          ${contacts.length ? `<ul class="contact-list">${contacts.map((c) => `
            <li>
              <span class="ico">${c.ico}</span>
              <div><small>${esc(c.label)}</small>${c.href ? `<a href="${esc(c.href)}" ${c.ext ? 'target="_blank" rel="noopener"' : ''}>${esc(c.text)}</a>` : `<strong>${esc(c.text)}</strong>`}</div>
            </li>`).join('')}</ul>` : '<p class="item-meta">Contatti in arrivo.</p>'}
        </div>
      </div>`;
  }

  /* =========================================================
     Area admin
     ========================================================= */

  function renderAdmin() {
    if (!IS_LOCAL) {
      return `<div class="login card"><h2>Area riservata</h2><p class="item-meta" style="margin:0">Questa sezione non è disponibile online.</p><p><a class="btn secondary" href="#programmi">Torna al sito</a></p></div>`;
    }
    if (!state.isAdmin) return renderLogin();
    const d = state.data;
    if (state.editing) return renderEditor();
    const tabs = [
      ['articoli', 'Articoli', d.items.length],
      ['programmi', 'Programmi', d.programs.length],
      ['dati', 'I miei dati'],
      ['pubblica', state.localServer ? 'Online' : (state.hasDraft ? 'Pubblica ●' : 'Pubblica')]
    ];
    const bodies = { articoli: adminItems, programmi: adminPrograms, dati: adminSettings, pubblica: adminPublish };
    return `
      <div class="admin-head">
        <h1>Area admin</h1>
        <div class="row">
          <a class="btn secondary small" href="#programmi">Vedi il sito</a>
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
        <p class="item-meta" style="margin-top:0">${hasPass ? 'Inserisci la password per gestire articoli, programmi e dati.' : 'È il tuo primo accesso da questo computer: scegli una password (almeno 6 caratteri) per proteggere l\'area admin.'}</p>
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

  /* ---------- Articoli ---------- */

  function adminItems() {
    const items = [...state.data.items].sort((a, b) => b.createdAt - a.createdAt);
    return `
      <div class="row between" style="margin-bottom:14px">
        <p class="item-meta" style="margin:0">Aggiungi gli oggetti da vendere. Quando qualcuno paga, cambia lo stato in <strong>Venduto</strong>.</p>
        <button class="btn" data-action="new-item">+ Nuovo articolo</button>
      </div>
      ${items.length ? `<div class="admin-list">${items.map((it) => `
        <div class="admin-row">
          <div class="thumb">${safeImg(it.photos[0]) ? `<img src="${safeImg(it.photos[0])}" alt="">` : noPhoto()}</div>
          <div class="info"><strong>${esc(it.title) || '(senza titolo)'}</strong><span>${money(it.price)} · ${it.photos.length} foto</span></div>
          <select data-action="item-status" data-id="${esc(it.id)}" aria-label="Stato">
            ${STATUSES.map((st) => `<option value="${st.value}" ${it.status === st.value ? 'selected' : ''}>${st.label}</option>`).join('')}
          </select>
          <button class="btn secondary small" data-action="edit-item" data-id="${esc(it.id)}">Modifica</button>
          <button class="btn danger small" data-action="delete-item" data-id="${esc(it.id)}">Elimina</button>
        </div>`).join('')}</div>`
        : '<div class="empty"><strong>Nessun articolo</strong>Clicca su "Nuovo articolo" e carica la prima foto.</div>'}`;
  }

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

  /* ---------- Editor (articolo / programma) ---------- */

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

  function renderEditor() {
    const ed = state.editing;
    return ed.type === 'item' ? renderItemEditor(ed) : renderProgramEditor(ed);
  }

  function renderItemEditor(ed) {
    const it = ed.draft;
    const cats = [...new Set(state.data.items.map((i) => i.category).filter(Boolean))];
    return `
      <div class="admin-head">
        <h1>${ed.isNew ? 'Nuovo articolo' : 'Modifica articolo'}</h1>
        <button class="btn ghost small" data-action="cancel-edit">← Torna alla lista</button>
      </div>
      <form id="itemForm" class="form-card stack" novalidate>
        <div class="form-section" style="margin-top:0">Foto (fino a ${MAX_PHOTOS})</div>
        <div id="photoArea">${renderPhotoArea(it.photos)}</div>
        <input type="file" id="photoInput" accept="image/*" multiple hidden>

        <div class="form-section">Descrizione</div>
        ${field('title', 'Titolo', it.title, { req: true, placeholder: 'Es. Bicicletta da corsa Bianchi taglia 54' })}
        <div class="grid-2">
          ${field('price', 'Prezzo (€)', it.price || '', { req: true, type: 'text', extra: 'inputmode="decimal"', placeholder: '0,00' })}
          ${field('shipping', 'Spese di spedizione (€)', it.shipping, { type: 'text', extra: 'inputmode="decimal"', hint: '0 = spedizione inclusa' })}
        </div>
        <div class="grid-2">
          ${field('condition', 'Condizioni', it.condition, { options: CONDITIONS })}
          ${field('category', 'Categoria', it.category, { placeholder: 'Es. Elettronica, Libri, Casa…', extra: 'list="catList"' })}
        </div>
        <datalist id="catList">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        ${field('description', 'Descrizione', it.description, { textarea: true, rows: 5, placeholder: 'Stato, misure, difetti, cosa è incluso…' })}
        ${field('status', 'Stato', it.status, { options: STATUSES })}

        <div class="sticky-actions row end">
          <button type="button" class="btn secondary" data-action="cancel-edit">Annulla</button>
          <button type="submit" class="btn">Salva articolo</button>
        </div>
      </form>`;
  }

  function renderPhotoArea(photos) {
    return `
      ${photos.length < MAX_PHOTOS ? `
        <div class="dropzone" id="dropzone" data-action="pick-photos" role="button" tabindex="0">
          ${ICONS.upload}
          <div><strong>Clicca per caricare le foto</strong> oppure trascinale qui</div>
          <small>JPG, PNG o foto dal telefono. Vengono ridimensionate automaticamente.</small>
        </div>` : ''}
      ${photos.length ? `<div class="photo-grid">${photos.map((p, i) => `
        <div class="photo-tile ${i === 0 ? 'cover' : ''}">
          <img src="${safeImg(p)}" alt="Foto ${i + 1}">
          ${i === 0 ? '<span class="cover-label">Copertina</span>' : ''}
          <div class="tile-actions">
            ${i > 0 ? `<button type="button" data-action="photo-cover" data-index="${i}">★ Copertina</button>` : '<span></span>'}
            <button type="button" data-action="photo-remove" data-index="${i}" aria-label="Rimuovi foto">✕</button>
          </div>
        </div>`).join('')}</div>` : ''}`;
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
    const form = document.getElementById('itemForm') || document.getElementById('programForm');
    if (form && state.editing) Object.assign(state.editing.draft, readForm(form));
  }

  async function addPhotos(files) {
    const ed = state.editing;
    if (!ed || ed.type !== 'item') return;
    syncEditorFromForm();
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    const room = MAX_PHOTOS - ed.draft.photos.length;
    if (list.length > room) toast(`Puoi caricare al massimo ${MAX_PHOTOS} foto`, true);
    for (const f of list.slice(0, room)) {
      try { ed.draft.photos.push(await compressImage(f)); } catch (err) { toast(err.message, true); }
    }
    document.getElementById('photoArea').innerHTML = renderPhotoArea(ed.draft.photos);
    bindDropzone();
  }

  function bindDropzone() {
    const dz = document.getElementById('dropzone');
    if (!dz) return;
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); addPhotos(e.dataTransfer.files); });
    dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('photoInput').click(); } });
  }

  async function saveItemForm(form) {
    const v = readForm(form);
    const ed = state.editing;
    if (!v.title) { toast('Inserisci un titolo', true); form.elements['title'].focus(); return; }
    if (!num(v.price)) { toast('Inserisci un prezzo valido', true); form.elements['price'].focus(); return; }
    const item = Object.assign(ed.draft, {
      title: v.title,
      price: num(v.price),
      shipping: num(v.shipping),
      condition: v.condition,
      category: v.category,
      description: v.description,
      status: v.status
    });
    if (ed.isNew) state.data.items.push(item);
    else state.data.items = state.data.items.map((i) => (i.id === item.id ? item : i));
    if (await saveDraft()) {
      state.editing = null;
      toast('Articolo salvato');
      render();
    }
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
    const ibanOk = !s.iban || ibanValid(s.iban);
    return `
      <form id="settingsForm" class="form-card stack" novalidate>
        <div class="form-section" style="margin-top:0">Il sito</div>
        <div class="grid-2">
          ${field('siteName', 'Nome del sito', s.siteName, { req: true })}
          ${field('tagline', 'Sottotitolo', s.tagline)}
        </div>
        ${field('shopIntro', 'Testo introduttivo dello Shop usato', s.shopIntro, { textarea: true, rows: 2 })}
        ${field('programsIntro', 'Testo introduttivo della scheda Apprendimento', s.programsIntro, { textarea: true, rows: 2 })}
        ${field('tradingIntro', 'Testo introduttivo della scheda Trading e finanza', s.tradingIntro, { textarea: true, rows: 2 })}

        <div class="form-section">Pagamento con bonifico</div>
        <div class="notice ok">Questi dati compaiono nella finestra di acquisto, con i pulsanti per copiarli.</div>
        ${field('ibanHolder', 'Intestatario del conto', s.ibanHolder, { placeholder: 'Nome e cognome come in banca' })}
        <label class="field ${ibanOk ? '' : 'invalid'}">
          <span>IBAN</span>
          <input name="iban" value="${esc(formatIban(s.iban))}" placeholder="IT00 X000 0000 0000 0000 0000 000" autocomplete="off" spellcheck="false">
          <small id="ibanHint">${s.iban ? (ibanOk ? '✓ IBAN valido' : '⚠ Controlla l\'IBAN: il codice di controllo non torna') : ''}</small>
        </label>
        <div class="grid-2">
          ${field('bank', 'Banca', s.bank, { placeholder: 'Facoltativo' })}
          ${field('bic', 'BIC / SWIFT', s.bic, { placeholder: 'Facoltativo, per bonifici dall\'estero' })}
        </div>
        <div class="grid-2">
          ${field('defaultShipping', 'Spese di spedizione predefinite (€)', s.defaultShipping, { extra: 'inputmode="decimal"', hint: 'Proposte automaticamente per i nuovi articoli' })}
        </div>
        ${field('paymentNote', 'Messaggio sotto i dati di pagamento', s.paymentNote, { textarea: true, rows: 2 })}

        <div class="form-section">Contatti (pagina Info)</div>
        <div class="grid-2">
          ${field('ownerName', 'Il tuo nome', s.ownerName)}
          ${field('city', 'Città / zona', s.city)}
        </div>
        <div class="grid-2">
          ${field('email', 'Email', s.email, { type: 'email', hint: 'Qui ricevi gli ordini e i messaggi' })}
          ${field('phone', 'Telefono', s.phone, { type: 'tel' })}
        </div>
        <div class="grid-2">
          ${field('whatsapp', 'Numero WhatsApp', s.whatsapp, { type: 'tel', hint: 'Se lo inserisci, gli acquirenti potranno ordinare anche via WhatsApp' })}
          ${field('website', 'Sito web', s.website, { placeholder: 'Facoltativo' })}
        </div>
        <div class="grid-2">
          ${field('instagram', 'Instagram (link)', s.instagram, { placeholder: 'https://instagram.com/…' })}
          ${field('facebook', 'Facebook (link)', s.facebook, { placeholder: 'https://facebook.com/…' })}
        </div>
        ${field('linkedin', 'LinkedIn (link)', s.linkedin, { placeholder: 'https://linkedin.com/in/…' })}
        ${field('about', 'Chi sono', s.about, { textarea: true, rows: 5, placeholder: 'Qualche riga su di te, cosa fai, di cosa ti occupi…' })}

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
    v.iban = v.iban.replace(/\s+/g, '').toUpperCase();
    v.defaultShipping = num(v.defaultShipping);
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) { toast('Email non valida', true); form.elements['email'].focus(); return; }
    Object.assign(state.data.settings, v);
    if (await saveDraft()) {
      toast(v.iban && !ibanValid(v.iban) ? 'Salvato, ma controlla l\'IBAN' : 'Dati salvati', v.iban && !ibanValid(v.iban));
      render();
    }
  }

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
    'shop-cat': (el) => { state.shop.cat = el.dataset.cat; render(); },
    'toggle-sold': () => { state.shop.showSold = !state.shop.showSold; render(); },
    'open-item': (el) => openItem(el.dataset.id),
    'gallery': (el) => {
      const i = Number(el.dataset.index);
      const src = modalBody._photos[i];
      document.getElementById('galleryMain').innerHTML = `<img src="${src}" alt="${esc(modalBody._title)}">`;
      modalBody.querySelectorAll('.thumbs button').forEach((b, j) => b.classList.toggle('active', i === j));
    },
    'zoom-shot': (el) => {
      const p = state.data.programs.find((x) => x.id === el.dataset.id);
      const src = p && safeImg(p.image);
      if (!src) return;
      openModal(`
        <h2 id="modalTitle" class="shot-title">${esc(p.name)}</h2>
        <img class="shot-full" src="${src}" alt="${esc(p.name)}">`, { wide: true });
    },
    'buy': (el) => openCheckout(el.dataset.id),
    'copy': (el) => copy(el.dataset.value),

    'logout': () => { sessionSet('admin_ok', null); localSet('admin_remember', null); state.isAdmin = false; state.editing = null; location.hash = '#programmi'; },
    'tab': (el, e) => { e.preventDefault(); state.adminTab = el.dataset.tab; state.editing = null; render(); },

    'new-item': () => {
      state.editing = { type: 'item', isNew: true, draft: {
        id: uid(), title: '', price: 0, shipping: state.data.settings.defaultShipping || 0, condition: CONDITIONS[2],
        category: '', description: '', photos: [], status: 'disponibile', createdAt: Date.now()
      } };
      render();
      window.scrollTo(0, 0);
    },
    'edit-item': (el) => {
      const it = findItem(el.dataset.id);
      if (!it) return;
      state.editing = { type: 'item', isNew: false, draft: clone(it) };
      render();
      window.scrollTo(0, 0);
    },
    'delete-item': async (el) => {
      const it = findItem(el.dataset.id);
      if (!it || !confirm(`Eliminare "${it.title}"?`)) return;
      state.data.items = state.data.items.filter((i) => i.id !== it.id);
      await saveDraft();
      render();
    },
    'pick-photos': () => document.getElementById('photoInput').click(),
    'photo-remove': (el) => {
      syncEditorFromForm();
      state.editing.draft.photos.splice(Number(el.dataset.index), 1);
      document.getElementById('photoArea').innerHTML = renderPhotoArea(state.editing.draft.photos);
      bindDropzone();
    },
    'photo-cover': (el) => {
      const photos = state.editing.draft.photos;
      const [p] = photos.splice(Number(el.dataset.index), 1);
      photos.unshift(p);
      document.getElementById('photoArea').innerHTML = renderPhotoArea(photos);
      bindDropzone();
    },
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

  app.addEventListener('input', (e) => {
    if (e.target.id === 'shopSearch') {
      state.shop.q = e.target.value;
      document.getElementById('itemsGrid').innerHTML = renderItemsGrid();
    }
    if (e.target.name === 'iban' && e.target.form && e.target.form.id === 'settingsForm') {
      const val = e.target.value;
      const hint = document.getElementById('ibanHint');
      const ok = !val.trim() || ibanValid(val);
      e.target.closest('.field').classList.toggle('invalid', !ok);
      hint.textContent = !val.trim() ? '' : ok ? '✓ IBAN valido' : '⚠ IBAN non valido o incompleto';
    }
  });

  app.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.dataset.action === 'item-status') {
      const it = findItem(t.dataset.id);
      if (!it) return;
      it.status = t.value;
      await saveDraft();
      toast(`Stato: ${statusLabel(t.value)}`);
      render();
    } else if (t.id === 'photoInput') {
      await addPhotos(t.files);
      t.value = '';
    } else if (t.id === 'programImageInput' && t.files[0]) {
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
      case 'checkoutForm':
        submitCheckout(form, (e.submitter && e.submitter.dataset.via) || (state.data.settings.email ? 'email' : 'whatsapp'));
        break;
      case 'contactForm': {
        const v = readForm(form);
        if (!v.message) { toast('Scrivi un messaggio', true); return; }
        const s = state.data.settings;
        location.href = `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent('Messaggio dal sito' + (v.name ? ' - ' + v.name : ''))}&body=${encodeURIComponent(v.message + (v.name ? '\n\n' + v.name : ''))}`;
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
      case 'itemForm': await saveItemForm(form); break;
      case 'programForm': await saveProgramForm(form); break;
      case 'settingsForm': await saveSettingsForm(form); break;
    }
  });

  function afterRender() {
    bindDropzone();
    loadSyncStatus();
  }

  /* =========================================================
     Avvio
     ========================================================= */

  (async () => {
    app.innerHTML = '<div class="empty">Caricamento…</div>';
    await detectLocalServer();
    await loadData();
    render();
  })();
})();

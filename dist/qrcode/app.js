/* Generatore di codici QR: tutto avviene nel browser, i dati inseriti non vengono inviati a nessuno.
   - lib/qrcode.js (qrcode-generator di Kazuhiko Arase, licenza MIT): calcola la griglia del codice
   - il disegno (PNG e SVG) è fatto qui; il PDF usa pdf-lib, già presente nel Convertitore. */
(() => {
  'use strict';

  /* ================= lingua ================= */
  const LANGS = Object.keys(I18N);
  function pickLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
    try { const s = localStorage.getItem('lang'); if (LANGS.includes(s)) return s; } catch (_) {}
    for (const l of navigator.languages || [navigator.language || '']) {
      const c = String(l).slice(0, 2).toLowerCase();
      if (LANGS.includes(c)) return c;
    }
    return 'en';
  }
  let lang = pickLang();
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.it[k] || k;

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']; // lettere accentate e simboli

  /* ================= tipi di contenuto ================= */
  const ICONS = {
    url: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    wifi: '<path d="M2 9a15 15 0 0 1 20 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8"/>',
    vcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13.5h3"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    sms: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>',
    wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9.5 8.5c0 3 2.5 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>'
  };
  const F = (k, o = {}) => Object.assign({ k }, o);
  const TYPES = {
    url: [F('url', { full: true, ph: 'ph_url', inputmode: 'url' })],
    text: [F('text', { full: true, area: true, ph: 'ph_text' })],
    wifi: [F('ssid'), F('pass'), F('enc', { select: ['WPA', 'WEP', 'nopass'] }), F('hidden', { check: true })],
    vcard: [F('first'), F('last'), F('org'), F('title'), F('phone', { type: 'tel' }), F('email', { type: 'email' }), F('site', { inputmode: 'url' }), F('address', { full: true })],
    email: [F('to', { full: true, type: 'email' }), F('subject', { full: true }), F('body', { full: true, area: true })],
    tel: [F('number', { full: true, type: 'tel', ph: 'ph_number' })],
    sms: [F('number', { full: true, type: 'tel', ph: 'ph_number' }), F('msg', { full: true, area: true })],
    wa: [F('number', { full: true, type: 'tel', ph: 'ph_number' }), F('msg', { full: true, area: true })]
  };
  const HINTS = { wifi: 'hint_wifi', vcard: 'hint_vcard', tel: 'hint_number', sms: 'hint_number', wa: 'hint_number' };
  const ENC_LABEL = { WPA: 'enc_wpa', WEP: 'enc_wep', nopass: 'enc_none' };

  /* ================= stato ================= */
  const saved = (() => { try { return JSON.parse(localStorage.getItem('qr_style') || '{}'); } catch (_) { return {}; } })();
  const state = {
    type: 'url',
    values: { wifi: { enc: 'WPA' } },
    fg: /^#[0-9a-f]{6}$/i.test(saved.fg) ? saved.fg : '#0b2530',
    bg: /^#[0-9a-f]{6}$/i.test(saved.bg) ? saved.bg : '#ffffff',
    transparent: !!saved.transparent,
    shape: ['square', 'rounded', 'dots'].includes(saved.shape) ? saved.shape : 'square',
    logo: null, // { img, url }
    model: null,
    payload: ''
  };
  const saveStyle = () => { try { localStorage.setItem('qr_style', JSON.stringify({ fg: state.fg, bg: state.bg, transparent: state.transparent, shape: state.shape })); } catch (_) {} };

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svgIcon = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ================= contenuto del codice ================= */
  const v = (k) => String((state.values[state.type] || {})[k] || '').trim();
  const digits = (s) => { let d = s.replace(/[^\d+]/g, ''); if (d.startsWith('00')) d = '+' + d.slice(2); return d; };
  const vcardEsc = (s) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const wifiEsc = (s) => s.replace(/([\\;,:"])/g, '\\$1');

  function payload() {
    switch (state.type) {
      case 'url': { const u = v('url'); return !u ? '' : /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`; }
      case 'text': return String((state.values.text || {}).text || '');
      case 'wifi': {
        const ssid = v('ssid');
        if (!ssid) return '';
        const enc = (state.values.wifi || {}).enc || 'WPA';
        return `WIFI:T:${enc};S:${wifiEsc(ssid)};${enc !== 'nopass' ? `P:${wifiEsc(v('pass'))};` : ''}${(state.values.wifi || {}).hidden ? 'H:true;' : ''};`;
      }
      case 'vcard': {
        const first = v('first'), last = v('last');
        if (!first && !last && !v('org') && !v('phone') && !v('email')) return '';
        const site = v('site');
        const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vcardEsc(last)};${vcardEsc(first)};;;`, `FN:${vcardEsc([first, last].filter(Boolean).join(' ') || v('org'))}`];
        if (v('org')) lines.push(`ORG:${vcardEsc(v('org'))}`);
        if (v('title')) lines.push(`TITLE:${vcardEsc(v('title'))}`);
        if (v('phone')) lines.push(`TEL;TYPE=CELL:${digits(v('phone'))}`);
        if (v('email')) lines.push(`EMAIL:${v('email')}`);
        if (site) lines.push(`URL:${/^[a-z][a-z0-9+.-]*:/i.test(site) ? site : 'https://' + site}`);
        if (v('address')) lines.push(`ADR:;;${vcardEsc(v('address'))};;;;`);
        lines.push('END:VCARD');
        return lines.join('\r\n');
      }
      case 'email': {
        const to = v('to');
        if (!to) return '';
        const q = [['subject', v('subject')], ['body', String((state.values.email || {}).body || '')]].filter(([, x]) => x).map(([k, x]) => `${k}=${encodeURIComponent(x)}`).join('&');
        return `mailto:${to}${q ? '?' + q : ''}`;
      }
      case 'tel': { const n = digits(v('number')); return n ? `tel:${n}` : ''; }
      case 'sms': { const n = digits(v('number')); return n ? `SMSTO:${n}:${String((state.values.sms || {}).msg || '')}` : ''; }
      case 'wa': {
        const n = digits(v('number')).replace(/^\+/, '');
        const msg = String((state.values.wa || {}).msg || '').trim();
        return n ? `https://wa.me/${n}${msg ? '?text=' + encodeURIComponent(msg) : ''}` : '';
      }
    }
    return '';
  }

  // Griglia del codice. Con il logo si usa la correzione massima (H): il codice resta leggibile anche con il centro coperto.
  function buildModel(text) {
    const qr = qrcode(0, state.logo ? 'H' : 'M');
    qr.addData(text, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    const dark = [];
    for (let r = 0; r < n; r++) { dark.push([]); for (let c = 0; c < n; c++) dark[r].push(qr.isDark(r, c)); }
    return { n, dark };
  }

  /* ================= disegno ================= */
  const MARGIN = 4; // zona di rispetto attorno al codice, in moduli (come da norma)
  const FINDERS = (n) => [[0, 0], [0, n - 7], [n - 7, 0]];
  // Quadratini di allineamento (5×5) secondo la norma QR: nelle forme arrotondate e a punti si disegnano
  // pieni come i quadrati agli angoli, perché i lettori li usano come riferimento.
  const ALIGN_TABLE = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]];
  function aligns(n) {
    const pos = ALIGN_TABLE[(n - 17) / 4 - 1] || [];
    const out = [];
    for (const r of pos) for (const c of pos) if (!((r < 9 && c < 9) || (r < 9 && c > n - 10) || (r > n - 10 && c < 9))) out.push([r - 2, c - 2]);
    return out;
  }
  const inAlign = (al, r, c) => al.some(([r0, c0]) => r >= r0 && r < r0 + 5 && c >= c0 && c < c0 + 5);
  const isFinder = (n, r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  function logoBox(n) {
    if (!state.logo) return null;
    let s = Math.round(n * 0.22);
    if (s % 2 !== n % 2) s++;
    const o = (n - s) / 2;
    return { x: o, y: o, s };
  }
  const inBox = (b, r, c) => b && r >= b.y - 0.5 && r < b.y + b.s + 0.5 && c >= b.x - 0.5 && c < b.x + b.s + 0.5;
  const radius = () => ({ square: [0, 0, 0], rounded: [0.35, 1.8, 0.9], dots: [0.5, 2.4, 1.1] }[state.shape]);

  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCanvas(canvas, size) {
    const { n, dark } = state.model;
    const total = n + MARGIN * 2, u = size / total;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    if (!state.transparent) { ctx.fillStyle = state.bg; ctx.fillRect(0, 0, size, size); }
    const box = logoBox(n);
    const [rm, rf, ri] = radius();
    const px = (k) => Math.round((k + MARGIN) * u);
    const al = state.shape === 'square' ? [] : aligns(n);
    ctx.fillStyle = state.fg;
    ctx.beginPath();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!dark[r][c] || isFinder(n, r, c) || inBox(box, r, c) || inAlign(al, r, c)) continue;
      if (state.shape === 'square') { const x = px(c), y = px(r); ctx.rect(x, y, px(c + 1) - x, px(r + 1) - y); }
      else if (state.shape === 'dots') { ctx.moveTo((c + MARGIN + 0.96) * u, (r + MARGIN + 0.5) * u); ctx.arc((c + MARGIN + 0.5) * u, (r + MARGIN + 0.5) * u, u * 0.46, 0, Math.PI * 2); }
      else rrect(ctx, (c + MARGIN + 0.04) * u, (r + MARGIN + 0.04) * u, u * 0.92, u * 0.92, u * rm);
    }
    ctx.fill();
    // I tre quadrati agli angoli: anello esterno (7×7 con il buco 5×5) e centro 3×3.
    for (const [r0, c0] of FINDERS(n)) {
      const x = (c0 + MARGIN) * u, y = (r0 + MARGIN) * u;
      ctx.beginPath();
      rrect(ctx, x, y, 7 * u, 7 * u, rf * u);
      rrect(ctx, x + u, y + u, 5 * u, 5 * u, Math.max(0, rf - 1) * u);
      ctx.fill('evenodd');
      ctx.beginPath();
      rrect(ctx, x + 2 * u, y + 2 * u, 3 * u, 3 * u, ri * u);
      ctx.fill();
    }
    for (const [r0, c0] of al) {
      const x = (c0 + MARGIN) * u, y = (r0 + MARGIN) * u;
      ctx.beginPath();
      rrect(ctx, x, y, 5 * u, 5 * u, u * 1.2);
      rrect(ctx, x + u, y + u, 3 * u, 3 * u, u * 0.5);
      ctx.fill('evenodd');
      ctx.beginPath();
      rrect(ctx, x + 2 * u, y + 2 * u, u, u, u * 0.3);
      ctx.fill();
    }
    if (box) {
      const x = (box.x + MARGIN - 0.5) * u, s = (box.s + 1) * u;
      ctx.fillStyle = state.transparent ? '#ffffff' : state.bg;
      ctx.beginPath(); rrect(ctx, x, x, s, s, u * 1.2); ctx.fill();
      const img = state.logo.img, k = Math.min((s * 0.82) / img.width, (s * 0.82) / img.height);
      const w = img.width * k, h = img.height * k;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x + (s - w) / 2, x + (s - h) / 2, w, h);
    }
  }

  const f3 = (x) => Number(x.toFixed(3));
  function rrPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (!r) return `M${f3(x)} ${f3(y)}h${f3(w)}v${f3(h)}h${f3(-w)}z`;
    return `M${f3(x + r)} ${f3(y)}h${f3(w - 2 * r)}a${f3(r)} ${f3(r)} 0 0 1 ${f3(r)} ${f3(r)}v${f3(h - 2 * r)}a${f3(r)} ${f3(r)} 0 0 1 ${f3(-r)} ${f3(r)}h${f3(-(w - 2 * r))}a${f3(r)} ${f3(r)} 0 0 1 ${f3(-r)} ${f3(-r)}v${f3(-(h - 2 * r))}a${f3(r)} ${f3(r)} 0 0 1 ${f3(r)} ${f3(-r)}z`;
  }

  function buildSvg() {
    const { n, dark } = state.model;
    const total = n + MARGIN * 2, box = logoBox(n);
    const [rm, rf, ri] = radius();
    const al = state.shape === 'square' ? [] : aligns(n);
    let body = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!dark[r][c] || isFinder(n, r, c) || inBox(box, r, c) || inAlign(al, r, c)) continue;
      const x = c + MARGIN, y = r + MARGIN;
      if (state.shape === 'square') body += `M${x} ${y}h1v1h-1z`;
      else if (state.shape === 'dots') body += `M${f3(x + 0.04)} ${f3(y + 0.5)}a.46 .46 0 1 0 .92 0a.46 .46 0 1 0 -.92 0z`;
      else body += rrPath(x + 0.04, y + 0.04, 0.92, 0.92, rm);
    }
    let finders = '';
    for (const [r0, c0] of FINDERS(n)) {
      const x = c0 + MARGIN, y = r0 + MARGIN;
      finders += `<path fill-rule="evenodd" d="${rrPath(x, y, 7, 7, rf)}${rrPath(x + 1, y + 1, 5, 5, Math.max(0, rf - 1))}"/><path d="${rrPath(x + 2, y + 2, 3, 3, ri)}"/>`;
    }
    for (const [r0, c0] of al) {
      const x = c0 + MARGIN, y = r0 + MARGIN;
      finders += `<path fill-rule="evenodd" d="${rrPath(x, y, 5, 5, 1.2)}${rrPath(x + 1, y + 1, 3, 3, 0.5)}"/><path d="${rrPath(x + 2, y + 2, 1, 1, 0.3)}"/>`;
    }
    let logo = '';
    if (box) {
      const x = box.x + MARGIN - 0.5, s = box.s + 1;
      const img = state.logo.img, k = Math.min((s * 0.82) / img.width, (s * 0.82) / img.height);
      const w = img.width * k, h = img.height * k;
      logo = `<path fill="${state.transparent ? '#ffffff' : state.bg}" d="${rrPath(x, x, s, s, 1.2)}"/><image href="${state.logo.url}" x="${f3(x + (s - w) / 2)}" y="${f3(x + (s - h) / 2)}" width="${f3(w)}" height="${f3(h)}"/>`;
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="1024" height="1024"${state.shape === 'square' ? ' shape-rendering="crispEdges"' : ''}>\n${state.transparent ? '' : `<rect width="${total}" height="${total}" fill="${state.bg}"/>\n`}<g fill="${state.fg}"><path d="${body}"/>${finders}</g>${logo}\n</svg>\n`;
  }

  /* ================= leggibilità ================= */
  function lum(hex) {
    const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function readabilityWarning() {
    const bg = state.transparent ? '#ffffff' : state.bg;
    const lf = lum(state.fg), lb = lum(bg);
    if (lf > lb || (lb + 0.05) / (lf + 0.05) < 3.5) return t('warnContrast'); // i lettori vogliono codice scuro su fondo chiaro
    if (state.transparent) return t('warnTransparent');
    return '';
  }

  /* ================= pagina ================= */
  function renderStatic() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    $('lang').innerHTML = LANGS.map((c) => `<option value="${c}">${LANG_NAMES[c]}</option>`).join('');
    $('lang').value = lang;
    $('lang').setAttribute('aria-label', t('langLabel'));
    $('back').href = `../?lang=${lang}#strumenti`;
    $('home').href = `../?lang=${lang}`;
    $('types').innerHTML = Object.keys(TYPES).map((k) => `<button type="button" data-type="${k}" class="${state.type === k ? 'active' : ''}">${svgIcon(ICONS[k])}<span>${esc(t('type_' + k))}</span></button>`).join('');
    $('shapes').innerHTML = ['square', 'rounded', 'dots'].map((s) => `<button type="button" data-shape="${s}" class="${state.shape === s ? 'active' : ''}">${shapeIcon(s)}${esc(t('shape_' + s))}</button>`).join('');
    $('swFg').innerHTML = ['#0b2530', '#000000', '#0f766e', '#1d4ed8', '#7c2d12', '#6d28d9'].map((c) => `<button type="button" data-fg="${c}" style="background:${c}" title="${c}" aria-label="${c}"></button>`).join('');
    $('fg').value = state.fg;
    $('bg').value = state.bg;
    $('transparent').checked = state.transparent;
    renderFields();
  }

  function shapeIcon(s) {
    const cells = [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2], [2, 2]];
    const el = cells.map(([x, y]) => s === 'dots' ? `<circle cx="${x * 5 + 3}" cy="${y * 5 + 3}" r="2.1"/>` : `<rect x="${x * 5 + 1}" y="${y * 5 + 1}" width="4.2" height="4.2" rx="${s === 'rounded' ? 1.4 : 0}"/>`).join('');
    return `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${el}</svg>`;
  }

  function renderFields() {
    const vals = state.values[state.type] || (state.values[state.type] = {});
    $('fields').innerHTML = TYPES[state.type].map((f) => {
      const label = esc(t('f_' + f.k));
      const val = esc(vals[f.k] || '');
      if (f.check) return `<label class="check field full"><input type="checkbox" data-k="${f.k}" ${vals[f.k] ? 'checked' : ''}><span>${label}</span></label>`;
      let control;
      if (f.select) control = `<select data-k="${f.k}">${f.select.map((o) => `<option value="${o}" ${(vals[f.k] || f.select[0]) === o ? 'selected' : ''}>${esc(t(ENC_LABEL[o]))}</option>`).join('')}</select>`;
      else if (f.area) control = `<textarea data-k="${f.k}" rows="4" ${f.ph ? `placeholder="${esc(t(f.ph))}"` : ''}>${val}</textarea>`;
      else control = `<input data-k="${f.k}" type="${f.type || 'text'}" value="${val}" ${f.ph ? `placeholder="${esc(t(f.ph))}"` : ''} ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} autocomplete="off" spellcheck="false">`;
      return `<label class="field${f.full ? ' full' : ''}"><span>${label}</span>${control}</label>`;
    }).join('');
    const hint = HINTS[state.type];
    $('typeHint').hidden = !hint;
    $('typeHint').textContent = hint ? t(hint) : '';
    update();
  }

  let pending = false;
  function update() {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; refresh(); }, 0); // raggruppa i tasti premuti di fila (requestAnimationFrame si ferma a finestra nascosta)
  }

  function refresh() {
    const text = payload();
    state.payload = text;
    state.model = null;
    let error = '';
    if (text) {
      try { state.model = buildModel(text); } catch (_) { error = t('errTooLong'); }
    }
    const ok = !!state.model;
    $('qr').hidden = !ok;
    $('emptyQr').hidden = ok || !!error;
    $('err').hidden = !error;
    $('err').textContent = error;
    ['dlPng', 'dlSvg', 'dlPdf'].forEach((id) => { $(id).disabled = !ok; });
    $('contains').hidden = !ok;
    $('contains').textContent = ok ? `${t('contains')}: ${text.length > 160 ? text.slice(0, 160) + '…' : text}` : '';
    const warn = ok ? readabilityWarning() : '';
    $('warn').hidden = !warn;
    $('warn').textContent = warn;
    if (ok) drawCanvas($('qr'), 640);
  }

  /* ================= download ================= */
  function save(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    toast(t('downloaded'));
  }
  const fileBase = () => `qr-${state.type}`;
  const pngBlob = (size) => new Promise((resolve) => { const c = document.createElement('canvas'); drawCanvas(c, size); c.toBlob(resolve, 'image/png'); });

  let pdfLib = null;
  function libPdfLib() {
    return pdfLib || (pdfLib = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '../convertitore/lib/pdf-lib.min.js';
      s.onload = () => resolve(window.PDFLib);
      s.onerror = () => { pdfLib = null; reject(new Error('pdf-lib')); };
      document.head.appendChild(s);
    }));
  }
  // PDF A4 con il codice largo 8 cm, centrato nella parte alta del foglio.
  async function pdfBlob() {
    const { PDFDocument } = await libPdfLib();
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const img = await doc.embedPng(new Uint8Array(await (await pngBlob(2048)).arrayBuffer()));
    const s = (80 / 25.4) * 72;
    page.drawImage(img, { x: (595.28 - s) / 2, y: 841.89 - 120 - s, width: s, height: s });
    return new Blob([await doc.save()], { type: 'application/pdf' });
  }

  /* ================= eventi ================= */
  $('types').addEventListener('click', (e) => {
    const b = e.target.closest('[data-type]');
    if (!b) return;
    state.type = b.dataset.type;
    document.querySelectorAll('#types button').forEach((x) => x.classList.toggle('active', x === b));
    renderFields();
  });
  $('fields').addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    if (!k) return;
    state.values[state.type][k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    update();
  });
  $('fields').addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') { state.values[state.type][e.target.dataset.k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; update(); } });
  $('fg').addEventListener('input', (e) => { state.fg = e.target.value; saveStyle(); update(); });
  $('bg').addEventListener('input', (e) => { state.bg = e.target.value; saveStyle(); update(); });
  $('transparent').addEventListener('change', (e) => { state.transparent = e.target.checked; saveStyle(); update(); });
  $('swFg').addEventListener('click', (e) => { const b = e.target.closest('[data-fg]'); if (!b) return; state.fg = b.dataset.fg; $('fg').value = state.fg; saveStyle(); update(); });
  $('shapes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-shape]');
    if (!b) return;
    state.shape = b.dataset.shape;
    document.querySelectorAll('#shapes button').forEach((x) => x.classList.toggle('active', x === b));
    saveStyle();
    update();
  });
  $('logoPick').addEventListener('click', () => $('logoFile').click());
  $('logoFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      // Il logo si riduce a 512 pixel al massimo: basta per la stampa e l'SVG resta leggero.
      const k = Math.min(1, 512 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const data = c.toDataURL('image/png');
      const small = new Image();
      small.onload = () => {
        state.logo = { img: small, url: data };
        $('logoThumb').src = data;
        $('logoThumb').hidden = false;
        $('logoRemove').hidden = false;
        update();
      };
      small.src = data;
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast(t('errLogo')); };
    img.src = url;
  });
  $('logoRemove').addEventListener('click', () => {
    state.logo = null;
    $('logoThumb').hidden = true;
    $('logoRemove').hidden = true;
    update();
  });
  $('dlPng').addEventListener('click', async () => { if (state.model) save(await pngBlob(Number($('size').value)), `${fileBase()}.png`); });
  $('dlSvg').addEventListener('click', () => { if (state.model) save(new Blob([buildSvg()], { type: 'image/svg+xml' }), `${fileBase()}.svg`); });
  $('dlPdf').addEventListener('click', async () => {
    if (!state.model) return;
    const b = $('dlPdf');
    b.disabled = true;
    try { save(await pdfBlob(), `${fileBase()}.pdf`); } finally { b.disabled = !state.model; }
  });
  $('lang').addEventListener('change', (e) => {
    lang = e.target.value;
    try { localStorage.setItem('lang', lang); } catch (_) {}
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
    renderStatic();
  });

  renderStatic();
})();

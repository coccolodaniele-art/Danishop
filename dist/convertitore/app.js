/* Convertitore di file: si carica un file, il programma riconosce di che tipo è e propone tutti
   i formati compatibili; un clic e il file convertito è pronto da scaricare.
   Tutto avviene nel browser: i file non vengono mai inviati da nessuna parte.

   Librerie (in lib/, caricate solo quando servono):
   - pdf.js (Apache 2.0): leggere i PDF        - pdf-lib (MIT): creare PDF
   - SheetJS (Apache 2.0): fogli di calcolo     - lamejs (LGPL): MP3, in mp3-worker.js
   - heic2any (MIT/LGPL): foto HEIC dell'iPhone - UTIF.js (MIT): immagini TIFF
   - mammoth (BSD): documenti Word (DOCX)
   GIF, BMP, ICO, TIFF, DOCX, ODT, RTF, AIFF e i file ZIP sono scritti direttamente da questo codice. */
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
  const t = (k, vars) => {
    let s = (I18N[lang] && I18N[lang][k]) || I18N.it[k] || k;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, v) => (vars[v] != null ? vars[v] : m));
    return s;
  };
  const tn = (k, n) => t(`${k}_${new Intl.PluralRules(LANG_LOCALES[lang]).select(n) === 'one' ? 'one' : 'other'}`, { n });
  const fmtSize = (n) => {
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${n.toLocaleString(LANG_LOCALES[lang], { maximumFractionDigits: i ? 1 : 0 })} ${u[i]}`;
  };

  /* ================= tipi di file e formati di arrivo ================= */
  const KINDS = {
    image: { inp: ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico', 'avif', 'tif', 'tiff', 'heic', 'heif'],
      out: [['image', ['jpg', 'png', 'webp', 'gif', 'bmp', 'ico', 'tiff', 'svg']], ['doc', ['pdf']]] },
    pdf: { inp: ['pdf'], out: [['image', ['jpg', 'png', 'webp', 'tiff']], ['doc', ['docx', 'odt', 'rtf']], ['web', ['txt', 'html', 'md']]] },
    doc: { inp: ['docx', 'odt', 'rtf', 'txt', 'md', 'markdown', 'html', 'htm'], out: [['doc', ['docx', 'odt', 'rtf', 'pdf']], ['web', ['html', 'md', 'txt']]] },
    sheet: { inp: ['xlsx', 'xlsm', 'xlsb', 'xls', 'ods', 'fods', 'numbers', 'csv', 'tsv', 'json', 'xml', 'dbf', 'slk', 'dif'],
      out: [['sheet', ['xlsx', 'xls', 'xlsb', 'ods']], ['data', ['csv', 'tsv', 'json', 'xml', 'html', 'sql', 'md']]] },
    audio: { inp: ['mp3', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba'], out: [['audio', ['mp3', 'wav', 'aiff']]] },
    video: { inp: ['mp4', 'm4v', 'mov', 'webm', 'mkv'], out: [['audio', ['mp3', 'wav', 'aiff']]] }
  };
  const ALIAS = { jpeg: 'jpg', jfif: 'jpg', tif: 'tiff', htm: 'html', markdown: 'md', heif: 'heic', aif: 'aiff', oga: 'ogg' };
  const extOf = (name) => (String(name).match(/\.([^.]+)$/) || ['', ''])[1].toLowerCase();
  const baseOf = (name) => String(name).replace(/\.[^.]+$/, '') || 'file';
  function kindOf(file) {
    const e = extOf(file.name);
    for (const [k, v] of Object.entries(KINDS)) if (v.inp.includes(e)) return k;
    if (/^image\//.test(file.type)) return 'image';
    if (/^audio\//.test(file.type)) return 'audio';
    if (/^video\//.test(file.type)) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    if (/^text\/plain/.test(file.type)) return 'doc';
    return null;
  }
  // Formati proposti per un file: tutti quelli della sua categoria tranne il suo.
  function targetsOf(it) {
    return KINDS[it.kind].out.map(([g, list]) => [g, list.filter((f) => f !== it.ext)]).filter(([, l]) => l.length);
  }
  const flatTargets = (it) => targetsOf(it).flatMap(([, l]) => l);

  // AVIF si aggiunge solo se il browser lo sa scrivere.
  (function detectAvif() {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 2;
      c.toBlob((b) => {
        if (b && b.type === 'image/avif') { KINDS.image.out[0][1].splice(3, 0, 'avif'); renderFormats(); render(); }
      }, 'image/avif');
    } catch (_) {}
  })();

  const MIME = {
    jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', bmp: 'image/bmp', ico: 'image/x-icon', tiff: 'image/tiff', svg: 'image/svg+xml',
    pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', odt: 'application/vnd.oasis.opendocument.text', rtf: 'application/rtf',
    txt: 'text/plain;charset=utf-8', html: 'text/html;charset=utf-8', md: 'text/markdown;charset=utf-8',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel', xlsb: 'application/vnd.ms-excel.sheet.binary.macroEnabled.12', ods: 'application/vnd.oasis.opendocument.spreadsheet',
    csv: 'text/csv;charset=utf-8', tsv: 'text/tab-separated-values;charset=utf-8', json: 'application/json', xml: 'application/xml', sql: 'application/sql',
    mp3: 'audio/mpeg', wav: 'audio/wav', aiff: 'audio/aiff', zip: 'application/zip'
  };

  /* ================= stato e utilità ================= */
  const state = { items: [] };
  let nextId = 1;
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
  const ICON_DL = svg('<path d="M12 4v12m0 0-4-4m4 4 4-4"/><path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1"/>');
  const ICON_OK = svg('<path d="M20 6 9 17l-5-5"/>');
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const enc = new TextEncoder();
  const pad = (i, n) => String(i).padStart(Math.max(2, String(n).length), '0');
  class UserError extends Error {}
  const fail = (key) => { throw new UserError(t(key)); };

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
  }

  const scripts = {};
  function loadScript(src, globalName) {
    if (!scripts[src]) {
      scripts[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve(window[globalName]);
        s.onerror = () => { delete scripts[src]; reject(new Error('Impossibile caricare ' + src)); };
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }
  const libPdfLib = () => loadScript('lib/pdf-lib.min.js', 'PDFLib');
  const libXlsx = () => loadScript('lib/xlsx.full.min.js', 'XLSX');
  let pdfjsPromise = null;
  const libPdfjs = () => pdfjsPromise || (pdfjsPromise = import('./lib/pdf.min.mjs').then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL('lib/pdf.worker.min.mjs', location.href).href;
    return m;
  }));

  /* ================= disegno della pagina ================= */
  function renderStatic() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    $('lang').innerHTML = LANGS.map((c) => `<option value="${c}">${LANG_NAMES[c]}</option>`).join('');
    $('lang').value = lang;
    $('lang').setAttribute('aria-label', t('langLabel'));
    $('back').href = `../?lang=${lang}#strumenti`;
    $('home').href = `../?lang=${lang}`;
    renderFormats();
  }

  function renderFormats() {
    $('formats').innerHTML = Object.entries(KINDS).map(([k, v]) => {
      const inp = [...new Set(v.inp.map((e) => ALIAS[e] || e))].map((e) => e.toUpperCase()).join(', ');
      const out = v.out.flatMap(([, l]) => l).map((e) => e.toUpperCase()).join(', ');
      return `<div><b>${esc(t('kind_' + k))}</b><code>${esc(inp)}</code> → <code>${esc(out)}</code></div>`;
    }).join('');
  }

  function render() {
    const items = state.items;
    $('list').hidden = !items.length;
    $('drop').classList.toggle('compact', items.length > 0);
    $('drop').querySelector('strong').textContent = t(items.length ? 'dropMore' : 'dropTitle');
    $('count').textContent = tn('files', items.length);
    const done = items.filter((x) => x.status === 'done');
    $('zip').hidden = done.length < 2;
    $('zip').innerHTML = `${ICON_DL}${esc(t('downloadAll'))}`;
    // "Converti tutti in": i formati che vanno bene per tutti i file caricati.
    let common = items.length > 1 ? flatTargets(items[0]) : [];
    items.slice(1).forEach((it) => { const f = flatTargets(it); common = common.filter((x) => f.includes(x)); });
    $('all').hidden = !common.length;
    $('all').innerHTML = `<span>${esc(t('allTo'))}</span>${common.map((f) => `<button class="fmt" data-all="${f}">${f.toUpperCase()}</button>`).join('')}`;
    $('files').innerHTML = items.map(itemHtml).join('');
  }

  function renderItem(it) {
    const li = document.querySelector(`.file[data-id="${it.id}"]`);
    if (li) li.outerHTML = itemHtml(it);
    const done = state.items.filter((x) => x.status === 'done').length;
    $('zip').hidden = done < 2;
  }

  function itemHtml(it) {
    const groups = targetsOf(it);
    const labels = groups.length > 1;
    const hint = { image: 'hint_image', pdf: 'hint_pdf', doc: 'hint_doc', sheet: 'hint_sheet', video: 'hint_video' }[it.kind];
    let out = '';
    if (it.status === 'work') {
      const p = it.progress;
      out = `<div class="out work"><span class="label">${esc(t('working', { fmt: it.target.toUpperCase() }))}</span><div class="bar${p == null ? ' indef' : ''}"><i style="width:${p == null ? 35 : Math.round(p * 100)}%"></i></div></div>`;
    } else if (it.status === 'done') {
      const r = it.result;
      out = `<div class="out done"><span class="ok-ico">${ICON_OK}</span><span class="meta"><b title="${esc(r.name)}">${esc(r.name)}</b><span>${fmtSize(r.blob.size)}${it.note ? ' · ' + esc(it.note) : ''}</span></span><a class="btn" href="${r.url}" download="${esc(r.name)}">${ICON_DL}${esc(t('download'))}</a></div>`;
    } else if (it.status === 'error') {
      out = `<div class="out error">⚠ ${esc(it.error)}</div>`;
    }
    return `
      <li class="file" data-id="${it.id}">
        <div class="file-head">
          <span class="thumb">${esc(it.ext || '?')}${it.thumb ? `<img src="${it.thumb}" alt="" onerror="this.remove()">` : ''}</span>
          <span class="meta"><b title="${esc(it.file.name)}">${esc(it.file.name)}</b><span><span class="kind">${esc(t('kind_' + it.kind))}</span>${esc((it.ext || '').toUpperCase())} · ${fmtSize(it.file.size)}</span></span>
          <button class="x" data-remove="${it.id}" title="${esc(t('remove'))}" aria-label="${esc(t('remove'))}">×</button>
        </div>
        <div class="targets">
          <span>${esc(t('convertTo'))}</span>
          ${groups.map(([g, list]) => `<div class="group">${labels ? `<i>${esc(t('grp_' + g))}</i>` : ''}${list.map((f) => `<button class="fmt${it.target === f ? ' active' : ''}" data-fmt="${f}">${f.toUpperCase()}</button>`).join('')}</div>`).join('')}
          ${hint ? `<p class="hint">${esc(t(hint))}</p>` : ''}
        </div>
        ${out}
      </li>`;
  }

  /* ================= aggiunta dei file e coda di conversione ================= */
  function addFiles(list) {
    const files = Array.from(list || []);
    if (!files.length) return;
    const rejected = [];
    let added = 0;
    for (const f of files) {
      const kind = kindOf(f);
      if (!kind) { rejected.push(f.name); continue; }
      const e = extOf(f.name);
      const it = { id: nextId++, file: f, kind, ext: ALIAS[e] || e || '', thumb: '', target: null, status: '', progress: null, result: null, error: '', note: '', token: 0 };
      if (kind === 'image') try { it.thumb = URL.createObjectURL(f); } catch (_) {}
      state.items.push(it);
      added++;
    }
    if (rejected.length) toast(`${rejected.join(', ')}: ${t('err_unknown')}`);
    else if (added > 1) toast(t('added', { n: added }));
    render();
  }

  function dropResult(it) {
    if (it.result) URL.revokeObjectURL(it.result.url);
    it.result = null;
  }

  let queue = Promise.resolve();
  function convert(it, fmt) {
    if (it.target === fmt && (it.status === 'work' || it.status === 'done')) return;
    dropResult(it);
    Object.assign(it, { target: fmt, status: 'work', progress: null, error: '', note: '' });
    const token = ++it.token;
    renderItem(it);
    queue = queue.then(async () => {
      if (token !== it.token || !state.items.includes(it)) return;
      try {
        const out = await CONVERT[it.kind](it, fmt, (p) => { if (token === it.token) { it.progress = p; renderItem(it); } });
        if (token !== it.token) return;
        it.result = { name: out.name, blob: out.blob, url: URL.createObjectURL(out.blob) };
        it.status = 'done';
      } catch (e) {
        if (token !== it.token) return;
        console.error(e);
        it.status = 'error';
        it.error = e instanceof UserError ? e.message : t('err_read');
      }
      renderItem(it);
      await tick();
    });
  }

  const blobOf = (data, fmt) => (data instanceof Blob ? data : new Blob([data], { type: MIME[fmt] || 'application/octet-stream' }));

  /* ================= ZIP (senza compressione) ================= */
  const CRC = (() => { const tb = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; } return tb; })();
  function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  // entries: [{ name, data: Uint8Array | Blob | string }]
  async function makeZip(entries, type = MIME.zip) {
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [], central = [], used = new Set();
    let offset = 0;
    for (const e of entries) {
      let name = e.name, i = 2;
      while (used.has(name.toLowerCase())) name = e.name.replace(/(\.[^.]+)?$/, `-${i++}$1`);
      used.add(name.toLowerCase());
      const data = typeof e.data === 'string' ? enc.encode(e.data) : e.data instanceof Blob ? new Uint8Array(await e.data.arrayBuffer()) : e.data;
      const nb = enc.encode(name), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
      parts.push(h.buffer, nb, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true);
      c.setUint32(42, offset, true);
      central.push(c.buffer, nb);
      offset += 30 + nb.length + data.length;
    }
    const size = central.reduce((a, b) => a + b.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type });
  }

  /* ================= IMMAGINI ================= */
  async function loadImage(it) {
    const f = it.file;
    if (it.ext === 'heic') {
      const heic2any = await loadScript('lib/heic2any.min.js', 'heic2any');
      let png;
      try { png = await heic2any({ blob: f, toType: 'image/png' }); } catch (_) { fail('err_unsupported'); }
      const b = await createImageBitmap(Array.isArray(png) ? png[0] : png);
      return { src: b, w: b.width, h: b.height, done: () => b.close() };
    }
    if (it.ext === 'tiff') {
      const UTIF = await loadScript('lib/UTIF.js', 'UTIF');
      try {
        const buf = await f.arrayBuffer();
        const ifds = UTIF.decode(buf);
        const page = ifds.find((x) => x.t256) || ifds[0];
        UTIF.decodeImage(buf, page, ifds);
        const rgba = UTIF.toRGBA8(page);
        const c = document.createElement('canvas');
        c.width = page.width; c.height = page.height;
        c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.length), page.width, page.height), 0, 0);
        return { src: c, w: c.width, h: c.height, done: () => {} };
      } catch (_) { fail('err_unsupported'); }
    }
    const isSvg = it.ext === 'svg' || f.type === 'image/svg+xml';
    if (!isSvg && window.createImageBitmap) {
      try { const b = await createImageBitmap(f); return { src: b, w: b.width, h: b.height, done: () => b.close() }; } catch (_) { /* si prova con <img> */ }
    }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch (_) { URL.revokeObjectURL(url); fail('err_unsupported'); }
    let w = img.naturalWidth || 1024, h = img.naturalHeight || 1024;
    if (isSvg && w < 1024) { h = Math.round(h * 1024 / w); w = 1024; } // i disegni SVG si ingrandiscono senza perdere qualità
    return { src: img, w, h, done: () => URL.revokeObjectURL(url) };
  }

  function drawCanvas(img, w, h, bg) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img.src, 0, 0, w, h);
    return c;
  }
  const canvasBlob = (c, mime, q) => new Promise((resolve, reject) => c.toBlob((b) => (b && b.type === mime ? resolve(b) : reject(new UserError(t('err_unsupported')))), mime, q));
  const pixels = (c) => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
  const hasAlpha = (d) => { for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true; return false; };
  const blobToDataUrl = (b) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });

  // BMP a 24 bit (le parti trasparenti diventano bianche).
  function encodeBmp({ width: w, height: h, data }) {
    const row = (w * 3 + 3) & ~3, size = 54 + row * h;
    const b = new Uint8Array(size), v = new DataView(b.buffer);
    b[0] = 66; b[1] = 77; v.setUint32(2, size, true); v.setUint32(10, 54, true); v.setUint32(14, 40, true);
    v.setInt32(18, w, true); v.setInt32(22, h, true); v.setUint16(26, 1, true); v.setUint16(28, 24, true);
    v.setUint32(34, row * h, true); v.setInt32(38, 2835, true); v.setInt32(42, 2835, true);
    for (let y = 0; y < h; y++) {
      const o = 54 + (h - 1 - y) * row;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, a = data[i + 3] / 255, k = 255 * (1 - a);
        b[o + x * 3] = data[i + 2] * a + k; b[o + x * 3 + 1] = data[i + 1] * a + k; b[o + x * 3 + 2] = data[i] * a + k;
      }
    }
    return b;
  }

  // TIFF non compresso, anche di più pagine. pages: [{ width, height, data (RGBA) }]
  function encodeTiff(pages) {
    const metas = pages.map((p) => ({ p, spp: hasAlpha(p.data) ? 4 : 3 }));
    let size = 8;
    metas.forEach((m) => { m.px = m.p.width * m.p.height * m.spp; size += m.px + 1 + m.spp * 2 + 2 + 12 * 12 + 4; });
    const b = new Uint8Array(size), v = new DataView(b.buffer);
    b[0] = 73; b[1] = 73; v.setUint16(2, 42, true);
    let o = 8, prevNext = 4;
    for (const m of metas) {
      const { width: w, height: h, data } = m.p;
      const pixOff = o;
      for (let i = 0, j = o; i < w * h; i++) {
        b[j++] = data[i * 4]; b[j++] = data[i * 4 + 1]; b[j++] = data[i * 4 + 2];
        if (m.spp === 4) b[j++] = data[i * 4 + 3];
      }
      o += m.px;
      if (o % 2) o++;
      const bpsOff = o;
      for (let s = 0; s < m.spp; s++) v.setUint16(o + s * 2, 8, true);
      o += m.spp * 2;
      const tags = [[256, 4, 1, w], [257, 4, 1, h], [258, 3, m.spp, bpsOff], [259, 3, 1, 1], [262, 3, 1, 2], [273, 4, 1, pixOff],
        [277, 3, 1, m.spp], [278, 4, 1, h], [279, 4, 1, m.px], [284, 3, 1, 1], [296, 3, 1, 1]];
      if (m.spp === 4) tags.push([338, 3, 1, 2]);
      v.setUint32(prevNext, o, true);
      v.setUint16(o, tags.length, true);
      tags.forEach(([tag, type, count, val], k) => {
        const e = o + 2 + k * 12;
        v.setUint16(e, tag, true); v.setUint16(e + 2, type, true); v.setUint32(e + 4, count, true);
        if (type === 3 && count === 1) v.setUint16(e + 8, val, true); else v.setUint32(e + 8, val, true);
      });
      prevNext = o + 2 + tags.length * 12;
      v.setUint32(prevNext, 0, true);
      o = prevNext + 4;
    }
    return b.subarray(0, o);
  }

  // ICO con più dimensioni (da 16 a 256 pixel), ognuna salvata in PNG.
  async function encodeIco(img) {
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngs = [];
    for (const s of sizes) {
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const k = Math.min(s / img.w, s / img.h), w = Math.max(1, Math.round(img.w * k)), h = Math.max(1, Math.round(img.h * k));
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img.src, (s - w) / 2, (s - h) / 2, w, h);
      pngs.push(new Uint8Array(await (await canvasBlob(c, 'image/png')).arrayBuffer()));
    }
    const head = 6 + 16 * sizes.length;
    const total = head + pngs.reduce((a, p) => a + p.length, 0);
    const b = new Uint8Array(total), v = new DataView(b.buffer);
    v.setUint16(2, 1, true); v.setUint16(4, sizes.length, true);
    let off = head;
    sizes.forEach((s, i) => {
      const e = 6 + i * 16;
      b[e] = s >= 256 ? 0 : s; b[e + 1] = s >= 256 ? 0 : s;
      v.setUint16(e + 4, 1, true); v.setUint16(e + 6, 32, true);
      v.setUint32(e + 8, pngs[i].length, true); v.setUint32(e + 12, off, true);
      b.set(pngs[i], off);
      off += pngs[i].length;
    });
    return b;
  }

  // GIF: tavolozza di 256 colori scelta con il "median cut", trasparenza conservata, compressione LZW.
  function encodeGif({ width: w, height: h, data }) {
    const transparent = hasAlpha(data);
    const max = transparent ? 255 : 256;
    const hist = new Uint32Array(32768);
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] >= 128) hist[((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3)]++;
    const keys = [];
    for (let k = 0; k < 32768; k++) if (hist[k]) keys.push(k);
    const ch = (k, c) => (c === 0 ? k >> 10 : c === 1 ? (k >> 5) & 31 : k & 31);
    let boxes = [keys];
    while (boxes.length < max) {
      let best = -1, bestRange = 0, bestCh = 0;
      boxes.forEach((bx, i) => {
        if (bx.length < 2) return;
        for (let c = 0; c < 3; c++) {
          let lo = 31, hi = 0;
          for (const k of bx) { const x = ch(k, c); if (x < lo) lo = x; if (x > hi) hi = x; }
          if (hi - lo > bestRange) { bestRange = hi - lo; best = i; bestCh = c; }
        }
      });
      if (best < 0) break;
      const bx = boxes[best].sort((a, b) => ch(a, bestCh) - ch(b, bestCh));
      const total = bx.reduce((a, k) => a + hist[k], 0);
      let acc = 0, cut = 1;
      for (let i = 0; i < bx.length - 1; i++) { acc += hist[bx[i]]; if (acc >= total / 2) { cut = i + 1; break; } cut = i + 1; }
      boxes.splice(best, 1, bx.slice(0, cut), bx.slice(cut));
    }
    const palette = boxes.filter((bx) => bx.length).map((bx) => {
      let r = 0, g = 0, b = 0, n = 0;
      for (const k of bx) { const c = hist[k]; r += ch(k, 0) * c; g += ch(k, 1) * c; b += ch(k, 2) * c; n += c; }
      const e = (x) => { const v = Math.round(x / n); return (v << 3) | (v >> 2); };
      return [e(r), e(g), e(b)];
    });
    if (!palette.length) palette.push([0, 0, 0]);
    const tIndex = palette.length;
    let bits = 1;
    while ((1 << bits) < palette.length + (transparent ? 1 : 0)) bits++;
    const cache = new Int16Array(32768).fill(-1);
    const idx = new Uint8Array(w * h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      if (transparent && data[i + 3] < 128) { idx[p] = tIndex; continue; }
      const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
      let c = cache[k];
      if (c < 0) {
        let bd = Infinity;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        palette.forEach((q, j) => { const d = (q[0] - r) ** 2 * 2 + (q[1] - g) ** 2 * 4 + (q[2] - b) ** 2 * 3; if (d < bd) { bd = d; c = j; } });
        cache[k] = c;
      }
      idx[p] = c;
    }
    const out = [];
    const u16 = (x) => out.push(x & 255, x >> 8);
    'GIF89a'.split('').forEach((s) => out.push(s.charCodeAt(0)));
    u16(w); u16(h); out.push(0x80 | 0x70 | (bits - 1), 0, 0);
    for (let i = 0; i < (1 << bits); i++) out.push(...(palette[i] || [0, 0, 0]));
    if (transparent) out.push(0x21, 0xf9, 4, 1, 0, 0, tIndex, 0);
    out.push(0x2c); u16(0); u16(0); u16(w); u16(h); out.push(0);
    const minCode = Math.max(2, bits);
    out.push(minCode);
    const lz = lzw(idx, minCode);
    for (let i = 0; i < lz.length; i += 255) { const part = lz.subarray(i, i + 255); out.push(part.length); for (const x of part) out.push(x); }
    out.push(0, 0x3b);
    return new Uint8Array(out);
  }
  function lzw(indices, minCode) {
    const clear = 1 << minCode, eoi = clear + 1;
    let size = minCode + 1, next = eoi + 1, cur = 0, nbits = 0, len = 0;
    let out = new Uint8Array(Math.max(1024, indices.length));
    const put = (byte) => { if (len >= out.length) { const o = new Uint8Array(out.length * 2); o.set(out); out = o; } out[len++] = byte; };
    const emit = (code) => { cur |= code << nbits; nbits += size; while (nbits >= 8) { put(cur & 255); cur >>>= 8; nbits -= 8; } };
    const dict = new Map();
    emit(clear);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i], key = (prefix << 8) | k, found = dict.get(key);
      if (found !== undefined) { prefix = found; continue; }
      emit(prefix);
      if (next === 4096) { emit(clear); dict.clear(); size = minCode + 1; next = eoi + 1; }
      else { if (next >= (1 << size)) size++; dict.set(key, next++); }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (nbits > 0) put(cur & 255);
    return out.subarray(0, len);
  }

  async function convertImage(it, fmt) {
    const img = await loadImage(it);
    const base = baseOf(it.file.name);
    try {
      const { w, h } = img;
      it.note = `${w}×${h}`;
      const name = `${base}.${fmt}`;
      if (fmt === 'jpg') return { name, blob: await canvasBlob(drawCanvas(img, w, h, '#ffffff'), 'image/jpeg', 0.92) };
      if (fmt === 'png' || fmt === 'webp' || fmt === 'avif') return { name, blob: await canvasBlob(drawCanvas(img, w, h), MIME[fmt], 0.9) };
      if (fmt === 'ico') return { name, blob: blobOf(await encodeIco(img), fmt) };
      const c = drawCanvas(img, w, h);
      if (fmt === 'gif') return { name, blob: blobOf(encodeGif(pixels(c)), fmt) };
      if (fmt === 'bmp') return { name, blob: blobOf(encodeBmp(pixels(c)), fmt) };
      if (fmt === 'tiff') return { name, blob: blobOf(encodeTiff([pixels(c)]), fmt) };
      if (fmt === 'svg') {
        const url = await blobToDataUrl(await canvasBlob(c, 'image/png'));
        return { name, blob: blobOf(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="${url}"/></svg>\n`, fmt) };
      }
      if (fmt === 'pdf') {
        const { PDFDocument } = await libPdfLib();
        const doc = await PDFDocument.create();
        const alpha = hasAlpha(pixels(c).data);
        const bytes = new Uint8Array(await (await canvasBlob(alpha ? c : drawCanvas(img, w, h, '#ffffff'), alpha ? 'image/png' : 'image/jpeg', 0.92)).arrayBuffer());
        const emb = alpha ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const pw = w * 0.75, ph = h * 0.75; // pixel a 96 DPI → punti tipografici
        doc.addPage([pw, ph]).drawImage(emb, { x: 0, y: 0, width: pw, height: ph });
        return { name, blob: blobOf(await doc.save(), fmt) };
      }
    } finally { img.done(); }
    fail('err_unsupported');
  }

  /* ================= PDF ================= */
  async function openPdf(file) {
    const pdfjs = await libPdfjs();
    try {
      return await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    } catch (e) {
      if (e && e.name === 'PasswordException') fail('err_password');
      fail('err_read');
    }
  }

  async function renderPage(pdf, i, dpi) {
    const page = await pdf.getPage(i);
    const vp1 = page.getViewport({ scale: 1 });
    const scale = Math.min(dpi / 72, 10000 / Math.max(vp1.width, vp1.height));
    const vp = page.getViewport({ scale });
    const c = document.createElement('canvas');
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    // intent "print": disegna anche se la scheda del browser è in secondo piano (con "display" si fermerebbe).
    await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
    return c;
  }

  // Testo del PDF diviso in titoli e paragrafi, in base alla grandezza delle scritte e agli spazi tra le righe.
  async function pdfBlocks(pdf, progress) {
    const lines = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const tc = await (await pdf.getPage(i)).getTextContent();
      let text = '', y = null, h = 0;
      const push = () => { if (text.trim()) lines.push({ text: text.replace(/\s+/g, ' ').trim(), y, h, page: i }); text = ''; };
      for (const item of tc.items) {
        if (!('str' in item)) continue;
        const iy = item.transform[5], ih = Math.abs(item.transform[3]) || item.height || 10;
        if (y !== null && Math.abs(iy - y) > Math.max(h, ih) * 0.6) push();
        if (!text) { y = iy; h = ih; }
        text += item.str;
        h = Math.max(h, ih);
        if (item.hasEOL) push();
      }
      push();
      progress(i / pdf.numPages);
    }
    if (!lines.length) return [];
    const sizes = lines.map((l) => l.h).sort((a, b) => a - b);
    const body = sizes[Math.floor(sizes.length / 2)];
    const blocks = [];
    let para = null;
    lines.forEach((l, k) => {
      const prev = lines[k - 1];
      const heading = l.h > body * 1.25 && l.text.length < 140;
      const gap = prev && prev.page === l.page ? Math.abs(prev.y - l.y) : Infinity;
      if (heading) { para = null; blocks.push({ t: 'h', level: l.h > body * 1.7 ? 1 : 2, text: l.text }); return; }
      if (para && gap < body * 1.9 && !/^[•▪◦‣\-–]\s/.test(l.text)) {
        para.text = /-$/.test(para.text) ? para.text.slice(0, -1) + l.text : `${para.text} ${l.text}`;
      } else {
        const li = /^[•▪◦‣\-–]\s+(.*)/.exec(l.text);
        para = li ? { t: 'li', text: li[1] } : { t: 'p', text: l.text };
        blocks.push(para);
      }
    });
    return blocks;
  }

  async function convertPdf(it, fmt, progress) {
    const pdf = await openPdf(it.file);
    const n = pdf.numPages;
    const base = baseOf(it.file.name);
    it.note = t('pagesNote', { n });
    try {
      if (['jpg', 'png', 'webp'].includes(fmt)) {
        const files = [];
        for (let i = 1; i <= n; i++) {
          const c = await renderPage(pdf, i, 150);
          files.push({ name: `${base}-p${pad(i, n)}.${fmt}`, data: await canvasBlob(c, MIME[fmt], 0.9) });
          c.width = c.height = 0;
          progress(i / n);
        }
        return n === 1 ? { name: `${base}.${fmt}`, blob: files[0].data } : { name: `${base}-${fmt}.zip`, blob: await makeZip(files) };
      }
      if (fmt === 'tiff') {
        const pages = [];
        for (let i = 1; i <= n; i++) {
          const c = await renderPage(pdf, i, 100);
          pages.push(pixels(c));
          c.width = c.height = 0;
          progress(i / n);
        }
        return { name: `${base}.tiff`, blob: blobOf(encodeTiff(pages), fmt) };
      }
      const blocks = tidy(await pdfBlocks(pdf, progress));
      if (!blocks.length) fail('err_notext');
      return { name: `${base}.${fmt}`, blob: await writeDoc(blocks, fmt, base) };
    } finally { pdf.destroy(); }
  }

  /* ================= DOCUMENTI ================= */
  // Formato interno comune: un elenco di blocchi { t: 'h' | 'p' | 'li', level, num, text }.
  function parseText(text) {
    return text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.replace(/\s+$/, '')).filter((p) => p.trim()).map((p) => {
      const li = /^\s*[•\-*]\s+([\s\S]*)/.exec(p);
      return li && !p.includes('\n') ? { t: 'li', text: li[1] } : { t: 'p', text: p };
    });
  }

  function parseMarkdown(md) {
    const blocks = [];
    let para = [], code = null;
    const flush = () => { if (para.length) { blocks.push({ t: 'p', text: para.join('\n') }); para = []; } };
    const inline = (s) => s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2').replace(/(\*|_)(.+?)\1/g, '$2').replace(/`([^`]+)`/g, '$1').replace(/~~(.+?)~~/g, '$1');
    for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
      if (/^\s*```/.test(raw)) {
        if (code) { blocks.push({ t: 'p', text: code.join('\n') }); code = null; } else { flush(); code = []; }
        continue;
      }
      if (code) { code.push(raw); continue; }
      const line = raw.replace(/\s+$/, '');
      let m;
      if (!line.trim()) { flush(); continue; }
      if ((m = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line))) { flush(); blocks.push({ t: 'h', level: m[1].length, text: inline(m[2]) }); continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); continue; }
      if ((m = /^\s*[-*+]\s+(?:\[[ xX]\]\s+)?(.*)/.exec(line))) { flush(); blocks.push({ t: 'li', text: inline(m[1]) }); continue; }
      if ((m = /^\s*(\d+)[.)]\s+(.*)/.exec(line))) { flush(); blocks.push({ t: 'li', num: m[1], text: inline(m[2]) }); continue; }
      if (/^\s*\|.*\|\s*$/.test(line)) {
        if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-')) continue;
        flush();
        blocks.push({ t: 'p', text: line.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim())).join('\t') });
        continue;
      }
      if ((m = /^\s*>\s?(.*)/.exec(line))) { para.push(inline(m[1])); continue; }
      para.push(inline(line.trim()));
    }
    flush();
    if (code && code.length) blocks.push({ t: 'p', text: code.join('\n') });
    return blocks;
  }

  function parseHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript, template, svg, head').forEach((e) => e.remove());
    const blocks = [];
    const BLOCK = /^(P|DIV|H[1-6]|LI|UL|OL|TABLE|THEAD|TBODY|TFOOT|TR|BLOCKQUOTE|PRE|SECTION|ARTICLE|HEADER|FOOTER|MAIN|ASIDE|NAV|FIGURE|FIGCAPTION|DL|DT|DD|HR|FORM|ADDRESS|CENTER)$/;
    const text = (el) => {
      let s = '';
      el.childNodes.forEach((n) => {
        if (n.nodeType === 3) s += n.nodeValue.replace(/\s+/g, ' ');
        else if (n.nodeName === 'BR') s += '\n';
        else if (n.nodeType === 1) s += text(n);
      });
      return s;
    };
    const clean = (s) => s.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/ {2,}/g, ' ').trim();
    function walk(el) {
      let inline = '';
      const flush = () => { const s = clean(inline); if (s) blocks.push({ t: 'p', text: s }); inline = ''; };
      el.childNodes.forEach((n) => {
        if (n.nodeType === 3) { inline += n.nodeValue.replace(/\s+/g, ' '); return; }
        if (n.nodeType !== 1) return;
        const tag = n.nodeName;
        if (tag === 'BR') { inline += '\n'; return; }
        if (!BLOCK.test(tag)) { inline += text(n); return; }
        flush();
        if (/^H[1-6]$/.test(tag)) { const s = clean(text(n)); if (s) blocks.push({ t: 'h', level: +tag[1], text: s }); }
        else if (tag === 'LI') {
          const own = n.cloneNode(true);
          own.querySelectorAll('ul, ol').forEach((x) => x.remove());
          const s = clean(text(own));
          const ordered = n.parentNode && n.parentNode.nodeName === 'OL';
          if (s) blocks.push({ t: 'li', text: s, num: ordered ? String([...n.parentNode.children].filter((c) => c.nodeName === 'LI').indexOf(n) + 1) : undefined });
          n.querySelectorAll(':scope > ul, :scope > ol').forEach(walk);
        } else if (tag === 'PRE') { const s = n.textContent.replace(/\s+$/, ''); if (s.trim()) blocks.push({ t: 'p', text: s }); }
        else if (tag === 'TR') { const s = [...n.children].map((c) => clean(text(c))).join('\t'); if (s.trim()) blocks.push({ t: 'p', text: s }); }
        else if (tag !== 'HR') walk(n);
      });
      flush();
    }
    if (doc.body) walk(doc.body);
    return blocks;
  }

  function parseOdt(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const blocks = [];
    const text = (el) => {
      let s = '';
      el.childNodes.forEach((n) => {
        if (n.nodeType === 3) s += n.nodeValue;
        else if (n.nodeType === 1) {
          const ln = n.localName;
          if (ln === 's') s += ' '.repeat(+(n.getAttribute('text:c') || 1));
          else if (ln === 'tab') s += '\t';
          else if (ln === 'line-break') s += '\n';
          else if (ln !== 'note' && ln !== 'annotation') s += text(n);
        }
      });
      return s;
    };
    function walk(el, inList) {
      el.childNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        const ln = n.localName;
        if (ln === 'h') { const s = text(n).trim(); if (s) blocks.push({ t: 'h', level: +(n.getAttribute('text:outline-level') || 1), text: s }); }
        else if (ln === 'p') { const s = text(n).trim(); if (s) blocks.push({ t: inList ? 'li' : 'p', text: s }); }
        else if (ln === 'list-item') walk(n, true);
        else if (ln === 'table-row') { const s = [...n.children].map((c) => text(c).trim()).join('\t'); if (s.trim()) blocks.push({ t: 'p', text: s }); }
        else walk(n, inList);
      });
    }
    const body = doc.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:office:1.0', 'text')[0];
    if (body) walk(body, false);
    return blocks;
  }

  // RTF → testo semplice: si saltano tabelle dei caratteri, colori, immagini e simili.
  function rtfToText(rtf) {
    const dec = new TextDecoder('windows-1252');
    const SKIP = /^(fonttbl|colortbl|stylesheet|info|pict|object|header|footer|headerl|headerr|headerf|footerl|footerr|footerf|listtable|listoverridetable|rsidtbl|themedata|colorschememapping|datastore|latentstyles|generator|xmlnstbl|mmathPr|fldinst|filetbl|revtbl)$/;
    const stack = [];
    let out = '', skip = false, i = 0;
    while (i < rtf.length) {
      const c = rtf[i];
      if (c === '{') { stack.push(skip); i++; continue; }
      if (c === '}') { skip = stack.pop() || false; i++; continue; }
      if (c === '\\') {
        const n = rtf[i + 1];
        if (n === '\\' || n === '{' || n === '}') { if (!skip) out += n; i += 2; continue; }
        if (n === '*') { skip = true; i += 2; continue; }
        if (n === "'") { if (!skip) out += dec.decode(new Uint8Array([parseInt(rtf.substr(i + 2, 2), 16) || 32])); i += 4; continue; }
        if (n === '~') { if (!skip) out += ' '; i += 2; continue; }
        if (n === '\n' || n === '\r') { if (!skip) out += '\n'; i += 2; continue; }
        const m = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i + 1, i + 48));
        if (!m) { i += 2; continue; }
        i += 1 + m[0].length;
        const word = m[1];
        if (SKIP.test(word)) { skip = true; continue; }
        if (skip) continue;
        if (word === 'par' || word === 'sect' || word === 'page') out += '\n\n';
        else if (word === 'line') out += '\n';
        else if (word === 'tab' || word === 'cell') out += '\t';
        else if (word === 'row') out += '\n\n';
        else if (word === 'u') {
          let code = parseInt(m[2], 10);
          if (code < 0) code += 65536;
          out += String.fromCharCode(code);
          if (rtf[i] === '\\' && rtf[i + 1] === "'") i += 4; else if (rtf[i] && !'\\{}'.includes(rtf[i])) i++;
        } else out += { emdash: '—', endash: '–', bullet: '•', lquote: '‘', rquote: '’', ldblquote: '“', rdblquote: '”' }[word] || '';
        continue;
      }
      if (c !== '\r' && c !== '\n' && !skip) out += c;
      i++;
    }
    return out;
  }

  // Paragrafi che iniziano con "•", "-" o "1." diventano voci di elenco (succede leggendo DOCX, ODT e RTF).
  function tidy(blocks) {
    return blocks.map((b) => {
      if (b.t !== 'p' || b.text.includes('\n')) return b;
      let m = /^[•▪◦‣\-–]\s+([\s\S]+)/.exec(b.text);
      if (m) return { t: 'li', text: m[1] };
      m = /^(\d{1,3})[.)]\s+([\s\S]+)/.exec(b.text);
      return m ? { t: 'li', num: m[1], text: m[2] } : b;
    });
  }

  async function readDoc(it) {
    return tidy(await readDocRaw(it));
  }

  async function readDocRaw(it) {
    const f = it.file;
    if (it.ext === 'docx') {
      const mammoth = await loadScript('lib/mammoth.browser.min.js', 'mammoth');
      try { return parseHtml((await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() })).value); } catch (_) { fail('err_read'); }
    }
    if (it.ext === 'odt') {
      const XLSX = await libXlsx();
      try {
        const zip = XLSX.CFB.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' });
        const entry = XLSX.CFB.find(zip, 'content.xml');
        return parseOdt(new TextDecoder().decode(entry.content));
      } catch (_) { fail('err_read'); }
    }
    const text = (await f.text()).replace(/^﻿/, '');
    if (it.ext === 'rtf') return parseText(rtfToText(text));
    if (it.ext === 'md') return parseMarkdown(text);
    if (it.ext === 'html') return parseHtml(text);
    return parseText(text);
  }

  async function convertDoc(it, fmt) {
    const blocks = await readDoc(it);
    if (!blocks.length) fail('err_notext');
    const base = baseOf(it.file.name);
    return { name: `${base}.${fmt}`, blob: await writeDoc(blocks, fmt, base) };
  }

  /* ----- scrittura dei documenti ----- */
  const xml = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bullet = (b) => (b.num ? `${b.num}.` : '•');

  async function writeDoc(blocks, fmt, title) {
    if (fmt === 'txt') {
      const lines = blocks.map((b, i) => {
        const next = blocks[i + 1];
        const s = b.t === 'li' ? `${bullet(b)} ${b.text}` : b.text;
        return s + (b.t === 'li' && next && next.t === 'li' ? '\n' : '\n\n');
      });
      return blobOf('﻿' + lines.join('').trim().replace(/\n/g, '\r\n') + '\r\n', 'txt');
    }
    if (fmt === 'md') {
      const lines = blocks.map((b, i) => {
        const next = blocks[i + 1];
        if (b.t === 'h') return `${'#'.repeat(Math.min(6, b.level || 1))} ${b.text}\n\n`;
        if (b.t === 'li') return `${b.num ? b.num + '.' : '-'} ${b.text.replace(/\n/g, ' ')}\n${next && next.t === 'li' && !next.num === !b.num ? '' : '\n'}`;
        return b.text.replace(/\n/g, '  \n') + '\n\n';
      });
      return blobOf(lines.join('').trim() + '\n', 'md');
    }
    if (fmt === 'html') return blobOf(docHtml(blocks, title), 'html');
    if (fmt === 'docx') return docDocx(blocks);
    if (fmt === 'odt') return docOdt(blocks);
    if (fmt === 'rtf') return blobOf(docRtf(blocks), 'rtf');
    if (fmt === 'pdf') return docPdf(blocks, title);
    fail('err_unsupported');
  }

  function docHtml(blocks, title) {
    let body = '', list = null;
    const close = () => { if (list) { body += `</${list}>\n`; list = null; } };
    const br = (s) => xml(s).replace(/\n/g, '<br>');
    for (const b of blocks) {
      if (b.t === 'li') {
        const want = b.num ? 'ol' : 'ul';
        if (list !== want) { close(); body += `<${want}>\n`; list = want; }
        body += `  <li>${br(b.text)}</li>\n`;
        continue;
      }
      close();
      if (b.t === 'h') { const l = Math.min(6, Math.max(1, b.level || 1)); body += `<h${l}>${br(b.text)}</h${l}>\n`; }
      else body += `<p>${br(b.text)}</p>\n`;
    }
    close();
    return `<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${xml(title)}</title>\n<style>body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.6;max-width:780px;margin:40px auto;padding:0 20px;color:#1f2937}h1,h2,h3{line-height:1.25}</style>\n</head>\n<body>\n${body}</body>\n</html>\n`;
  }

  async function docDocx(blocks) {
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const runs = (s) => s.split('\n').map((part, i) => `${i ? '<w:r><w:br/></w:r>' : ''}${part.split('\t').map((p, j) => `${j ? '<w:r><w:tab/></w:r>' : ''}<w:r><w:t xml:space="preserve">${xml(p)}</w:t></w:r>`).join('')}`).join('');
    const paras = blocks.map((b) => {
      if (b.t === 'h') return `<w:p><w:pPr><w:pStyle w:val="Heading${Math.min(3, Math.max(1, b.level || 1))}"/></w:pPr>${runs(b.text)}</w:p>`;
      if (b.t === 'li') return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr><w:r><w:t>${xml(bullet(b))}</w:t></w:r><w:r><w:tab/></w:r>${runs(b.text)}</w:p>`;
      return `<w:p>${runs(b.text)}</w:p>`;
    }).join('');
    const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    const heading = (n, sz, before) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="0B2530"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:style>`;
    return makeZip([
      { name: '[Content_Types].xml', data: `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
      { name: '_rels/.rels', data: `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
      { name: 'word/_rels/document.xml.rels', data: `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'word/styles.xml', data: `${head}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${heading(1, 32, 360)}${heading(2, 28, 280)}${heading(3, 24, 240)}<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="720" w:hanging="360"/></w:pPr></w:style></w:styles>` },
      { name: 'word/document.xml', data: `${head}<w:document xmlns:w="${W}"><w:body>${paras}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>` }
    ], MIME.docx);
  }

  async function docOdt(blocks) {
    const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"';
    const inner = (s) => s.split('\n').map((part) => part.split('\t').map(xml).join('<text:tab/>')).join('<text:line-break/>');
    const body = blocks.map((b) => {
      if (b.t === 'h') { const l = Math.min(3, Math.max(1, b.level || 1)); return `<text:h text:style-name="Heading_20_${l}" text:outline-level="${l}">${inner(b.text)}</text:h>`; }
      if (b.t === 'li') return `<text:p text:style-name="LI">${xml(bullet(b))}<text:tab/>${inner(b.text)}</text:p>`;
      return `<text:p text:style-name="P">${inner(b.text)}</text:p>`;
    }).join('');
    // Titoli con gli stili standard "Heading 1-3": Word e LibreOffice li riconoscono come titoli veri.
    const h = (n, size) => `<style:style style:name="Heading_20_${n}" style:display-name="Heading ${n}" style:family="paragraph" style:default-outline-level="${n}" style:next-style-name="Standard"><style:paragraph-properties fo:margin-top="0.4cm" fo:margin-bottom="0.2cm" fo:keep-with-next="always"/><style:text-properties fo:font-size="${size}pt" fo:font-weight="bold" fo:color="#0b2530"/></style:style>`;
    const head = '<?xml version="1.0" encoding="UTF-8"?>\n';
    return makeZip([
      { name: 'mimetype', data: 'application/vnd.oasis.opendocument.text' },
      { name: 'META-INF/manifest.xml', data: `${head}<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/></manifest:manifest>` },
      { name: 'styles.xml', data: `${head}<office:document-styles ${NS} office:version="1.2"><office:styles><style:default-style style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.28cm" fo:line-height="115%"/><style:text-properties fo:font-family="Calibri, Carlito, Arial, sans-serif" fo:font-size="11pt"/></style:default-style><style:style style:name="Standard" style:family="paragraph" style:class="text"/>${h(1, 16)}${h(2, 14)}${h(3, 12)}</office:styles></office:document-styles>` },
      { name: 'content.xml', data: `${head}<office:document-content ${NS} office:version="1.2"><office:automatic-styles><style:style style:name="P" style:family="paragraph"/><style:style style:name="LI" style:family="paragraph"><style:paragraph-properties fo:margin-left="1.27cm" fo:text-indent="-0.63cm" fo:margin-bottom="0.1cm"><style:tab-stops><style:tab-stop style:position="0cm"/></style:tab-stops></style:paragraph-properties></style:style></office:automatic-styles><office:body><office:text>${body}</office:text></office:body></office:document-content>` }
    ], MIME.odt);
  }

  function docRtf(blocks) {
    const r = (s) => s.replace(/[\\{}]/g, (m) => '\\' + m).replace(/\t/g, '\\tab ').replace(/\n/g, '\\line ')
      .replace(/[\u0080-￿]/g, (ch) => { const c = ch.charCodeAt(0); return `\\u${c > 32767 ? c - 65536 : c}?`; });
    const body = blocks.map((b) => {
      if (b.t === 'h') { const l = Math.min(3, Math.max(1, b.level || 1)); return `{\\pard\\s${l}\\outlinelevel${l - 1}\\keepn\\sb240\\sa120\\b\\fs${[0, 32, 28, 24][l]} ${r(b.text)}\\par}\n`; }
      if (b.t === 'li') return `{\\pard\\li720\\fi-360\\tx720\\sa60 ${r(bullet(b))}\\tab ${r(b.text)}\\par}\n`;
      return `{\\pard\\sa160 ${r(b.text)}\\par}\n`;
    }).join('');
    // Foglio di stile con "heading 1-3", così Word riconosce i titoli.
    const styles = '{\\stylesheet{\\s0\\fs22 Normal;}' + [1, 2, 3].map((l) => `{\\s${l}\\outlinelevel${l - 1}\\keepn\\sb240\\sa120\\b\\fs${[0, 32, 28, 24][l]}\\sbasedon0\\snext0 heading ${l};}`).join('') + '}';
    return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}}${styles}\\viewkind4\\uc1\\f0\\fs22\\sl276\\slmult1\n${body}}`;
  }

  async function docPdf(blocks, title) {
    const { PDFDocument, StandardFonts, rgb } = await libPdfLib();
    const doc = await PDFDocument.create();
    doc.setTitle(title);
    const regular = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const W = 595.28, H = 841.89, M = 56, maxW = W - 2 * M, ink = rgb(0.07, 0.12, 0.15);
    let page = doc.addPage([W, H]), y = H - M;
    // I caratteri standard dei PDF coprono le lingue dell'Europa occidentale; il resto diventa "?".
    const okChar = new Map();
    const safe = (font, s) => [...s].map((ch) => {
      if (ch === '\t') return '    ';
      if (!okChar.has(ch)) { let ok = true; try { font.encodeText(ch); } catch (_) { ok = false; } okChar.set(ch, ok); }
      return okChar.get(ch) ? ch : '?';
    }).join('');
    function wrap(text, font, size, width) {
      const out = [];
      for (const para of text.split('\n')) {
        let line = '';
        for (const word of safe(font, para).split(/(\s+)/)) {
          if (!word) continue;
          const test = line + word;
          if (font.widthOfTextAtSize(test, size) <= width || !line.trim()) {
            if (font.widthOfTextAtSize(test, size) > width) {
              for (const ch of word) { if (font.widthOfTextAtSize(line + ch, size) > width) { out.push(line); line = ''; } line += ch; }
            } else line = test;
          } else { out.push(line.trimEnd()); line = word.trimStart(); }
        }
        out.push(line.trimEnd());
      }
      return out;
    }
    const space = (lh) => { if (y - lh < M) { page = doc.addPage([W, H]); y = H - M; } };
    blocks.forEach((b, bi) => {
      const isH = b.t === 'h';
      const size = isH ? [0, 20, 16, 13.5][Math.min(3, Math.max(1, b.level || 1))] : 11;
      const font = isH ? bold : regular, lh = size * 1.38, indent = b.t === 'li' ? 22 : 0;
      if (isH) y -= 8;
      const lines = wrap(b.text, font, size, maxW - indent);
      lines.forEach((l, i) => {
        space(lh);
        if (i === 0 && b.t === 'li') page.drawText(safe(regular, bullet(b)), { x: M + 6, y: y - size, size, font: regular, color: ink });
        if (l) page.drawText(l, { x: M + indent, y: y - size, size, font, color: ink });
        y -= lh;
      });
      const next = blocks[bi + 1];
      y -= b.t === 'li' ? (next && next.t === 'li' ? 3 : 10) : isH ? 4 : 8;
    });
    return blobOf(await doc.save(), 'pdf');
  }

  /* ================= FOGLI DI CALCOLO ================= */
  function guessSep(text) {
    const first = text.split(/\r?\n/).find((l) => l.trim()) || '';
    const counts = [';', ',', '\t', '|'].map((s) => [s, first.split(s).length - 1]).sort((a, b) => b[1] - a[1]);
    return counts[0][1] ? counts[0][0] : ',';
  }
  // CSV letto a mano: SheetJS prende la virgola decimale europea ("1234,5") per un separatore delle migliaia.
  function parseCsv(text, sep) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
        else cell += ch;
      } else if (ch === '"' && cell === '') quoted = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c !== ''));
  }
  // Numeri riconosciuti secondo il separatore: con ";" la virgola è decimale (stile europeo), con "," il punto.
  // Codici con zeri iniziali (CAP, codici articolo) restano testo.
  function csvValue(v, sep) {
    const s = v.trim();
    if (!s || /^[-+]?0\d/.test(s)) return v;
    if (sep === ',' || sep === '\t' ? /^[-+]?\d+(\.\d+)?$/.test(s) : /^[-+]?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(s)) {
      const n = Number(sep === ',' || sep === '\t' ? s : s.replace(/\./g, '').replace(',', '.'));
      if (isFinite(n)) return n;
    }
    return v;
  }
  // Oggetti annidati in colonne "a.b.c", così stanno in una tabella.
  function flatten(obj, prefix = '', out = {}) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) flatten(v, key, out);
      else out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
    }
    return out;
  }

  async function readWorkbook(it) {
    const XLSX = await libXlsx();
    const f = it.file;
    if (it.ext === 'json') {
      let data;
      try { data = JSON.parse((await f.text()).replace(/^﻿/, '')); } catch (_) { fail('err_read'); }
      const wb = XLSX.utils.book_new();
      const add = (rows, name) => {
        if (!Array.isArray(rows)) rows = [rows];
        const ws = rows.length && Array.isArray(rows[0]) ? XLSX.utils.aoa_to_sheet(rows) : XLSX.utils.json_to_sheet(rows.map((r) => (r && typeof r === 'object' ? flatten(r) : { value: r })));
        XLSX.utils.book_append_sheet(wb, ws, String(name).replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || 'Sheet1');
      };
      if (Array.isArray(data)) add(data, 'Sheet1');
      else if (data && typeof data === 'object' && Object.values(data).length && Object.values(data).every(Array.isArray)) Object.entries(data).forEach(([k, v]) => add(v, k));
      else add([data], 'Sheet1');
      return wb;
    }
    if (it.ext === 'csv' || it.ext === 'tsv') {
      const text = (await f.text()).replace(/^﻿/, '');
      const sep = it.ext === 'tsv' ? '\t' : guessSep(text);
      const wb = XLSX.utils.book_new();
      // Il foglio prende il nome del file (Excel accetta al massimo 31 caratteri, senza \ / ? * [ ] :).
      const sheet = baseOf(f.name).replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || 'Sheet1';
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(parseCsv(text, sep).map((r) => r.map((v) => csvValue(v, sep)))), sheet);
      return wb;
    }
    try { return XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array', cellDates: true }); } catch (_) { fail('err_read'); }
  }

  const rowsOf = (XLSX, ws, raw) => XLSX.utils.sheet_to_json(ws, { header: 1, raw, defval: raw ? null : '', blankrows: false });
  // Con ";" i decimali escono con la virgola, come li vuole Excel in italiano e nel resto d'Europa.
  function toCsv(XLSX, ws, sep) {
    const raw = rowsOf(XLSX, ws, true), text = rowsOf(XLSX, ws, false);
    const quote = (v) => (/[\r\n"]/.test(v) || v.includes(sep) ? `"${v.replace(/"/g, '""')}"` : v);
    return raw.map((r, i) => r.map((v, j) => {
      if (typeof v === 'number') return quote(sep === ';' ? String(v).replace('.', ',') : String(v));
      return quote(String(text[i] && text[i][j] != null ? text[i][j] : v == null ? '' : v));
    }).join(sep)).join('\r\n');
  }
  const safeName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'sheet';

  function sheetsToSql(XLSX, wb) {
    const id = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const pad2 = (n) => String(n).padStart(2, '0');
    const val = (v) => {
      if (v == null || v === '') return 'NULL';
      if (typeof v === 'number') return isFinite(v) ? String(v) : 'NULL';
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      if (v instanceof Date) return `'${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())} ${pad2(v.getHours())}:${pad2(v.getMinutes())}:${pad2(v.getSeconds())}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    };
    let out = '';
    for (const name of wb.SheetNames) {
      const rows = rowsOf(XLSX, wb.Sheets[name], true);
      if (!rows.length) continue;
      const width = Math.max(...rows.map((r) => r.length));
      const seen = {};
      const cols = Array.from({ length: width }, (_, i) => {
        let c = String(rows[0][i] == null ? '' : rows[0][i]).trim() || `col${i + 1}`;
        if (seen[c]) c = `${c}_${++seen[c]}`; else seen[c] = 1;
        return c;
      });
      const data = rows.slice(1);
      const types = cols.map((_, i) => {
        const vals = data.map((r) => r[i]).filter((v) => v != null && v !== '');
        if (!vals.length) return 'TEXT';
        if (vals.every((v) => typeof v === 'number')) return 'NUMERIC';
        if (vals.every((v) => v instanceof Date)) return 'TIMESTAMP';
        return 'TEXT';
      });
      out += `CREATE TABLE ${id(name)} (\n  ${cols.map((c, i) => `${id(c)} ${types[i]}`).join(',\n  ')}\n);\n\n`;
      for (let i = 0; i < data.length; i += 100) {
        out += `INSERT INTO ${id(name)} (${cols.map(id).join(', ')}) VALUES\n`;
        // Nelle colonne di testo anche i valori che sembrano numeri vanno tra virgolette (es. CAP, codici).
        out += data.slice(i, i + 100).map((r) => `  (${cols.map((_, j) => val(types[j] === 'TEXT' && typeof r[j] === 'number' ? String(r[j]) : r[j])).join(', ')})`).join(',\n') + ';\n\n';
      }
    }
    return out;
  }

  function sheetsToMd(XLSX, wb) {
    const cell = (v) => String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
    return wb.SheetNames.map((name) => {
      const rows = rowsOf(XLSX, wb.Sheets[name], false);
      if (!rows.length) return '';
      const width = Math.max(...rows.map((r) => r.length));
      const line = (r) => `| ${Array.from({ length: width }, (_, i) => cell(r[i] == null ? '' : r[i])).join(' | ')} |`;
      return `${wb.SheetNames.length > 1 ? `## ${name}\n\n` : ''}${line(rows[0])}\n|${' --- |'.repeat(width)}\n${rows.slice(1).map(line).join('\n')}\n`;
    }).filter(Boolean).join('\n');
  }

  async function convertSheet(it, fmt) {
    const XLSX = await libXlsx();
    const wb = await readWorkbook(it);
    const base = baseOf(it.file.name);
    const names = wb.SheetNames;
    const name = `${base}.${fmt}`;
    const BOOK = { xlsx: 'xlsx', xls: 'biff8', xlsb: 'xlsb', ods: 'ods', xml: 'xlml' };
    if (BOOK[fmt]) return { name, blob: blobOf(XLSX.write(wb, { bookType: BOOK[fmt], type: 'array', compression: true }), fmt) };
    if (fmt === 'csv' || fmt === 'tsv') {
      // Separatore del CSV: ";" per Excel in italiano ed europeo, "," per Excel in inglese.
      const sep = fmt === 'tsv' ? '\t' : lang === 'en' ? ',' : ';';
      const files = names.map((n) => ({ name: names.length === 1 ? name : `${base}-${safeName(n)}.${fmt}`, data: '﻿' + toCsv(XLSX, wb.Sheets[n], sep) }));
      return files.length === 1 ? { name, blob: blobOf(files[0].data, fmt) } : { name: `${base}-${fmt}.zip`, blob: await makeZip(files) };
    }
    if (fmt === 'json') {
      const rows = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' });
      const data = names.length === 1 ? rows(names[0]) : Object.fromEntries(names.map((n) => [n, rows(n)]));
      return { name, blob: blobOf(JSON.stringify(data, null, 2), fmt) };
    }
    if (fmt === 'html') {
      const tables = names.map((n) => `${names.length > 1 ? `<h2>${xml(n)}</h2>\n` : ''}${XLSX.utils.sheet_to_html(wb.Sheets[n], { header: '', footer: '' })}`).join('\n');
      return { name, blob: blobOf(`<!doctype html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<title>${xml(base)}</title>\n<style>body{font-family:system-ui,"Segoe UI",sans-serif;margin:32px;color:#1f2937}table{border-collapse:collapse;margin-bottom:28px}td,th{border:1px solid #cbd5e1;padding:6px 10px;text-align:left}tr:first-child td{background:#f1f5f9;font-weight:600}</style>\n</head>\n<body>\n${tables}\n</body>\n</html>\n`, fmt) };
    }
    if (fmt === 'sql') return { name, blob: blobOf(sheetsToSql(XLSX, wb), fmt) };
    if (fmt === 'md') return { name, blob: blobOf(sheetsToMd(XLSX, wb), fmt) };
    fail('err_unsupported');
  }

  /* ================= AUDIO E VIDEO ================= */
  async function decodeAudio(file) {
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Ctx) fail('err_unsupported');
    const ctx = new Ctx(2, 1, 44100); // decodifica già ricampionata a 44,1 kHz
    const data = await file.arrayBuffer();
    try {
      return await new Promise((resolve, reject) => {
        const p = ctx.decodeAudioData(data, resolve, reject);
        if (p && p.then) p.then(resolve, reject);
      });
    } catch (_) { fail('err_unsupported'); }
  }
  const channelsOf = (buf) => Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, i) => buf.getChannelData(i));
  const s16 = (x) => { const s = Math.max(-1, Math.min(1, x)); return s < 0 ? s * 0x8000 : s * 0x7fff; };

  function encodeWav(ch, rate) {
    const n = ch[0].length, k = ch.length, buf = new ArrayBuffer(44 + n * k * 2), v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * k * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, k, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * k * 2, true); v.setUint16(32, k * 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * k * 2, true);
    for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < k; c++, o += 2) v.setInt16(o, s16(ch[c][i]), true);
    return buf;
  }

  function encodeAiff(ch, rate) {
    const n = ch[0].length, k = ch.length, len = n * k * 2, buf = new ArrayBuffer(54 + len), v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'FORM'); v.setUint32(4, 46 + len); str(8, 'AIFF'); str(12, 'COMM'); v.setUint32(16, 18);
    v.setUint16(20, k); v.setUint32(22, n); v.setUint16(26, 16);
    // frequenza di campionamento in virgola mobile a 80 bit, come vuole il formato AIFF
    const e = Math.floor(Math.log2(rate)), m = rate / 2 ** e;
    v.setUint16(28, 16383 + e); const hi = Math.floor(m * 2 ** 31); v.setUint32(30, hi); v.setUint32(34, Math.round((m * 2 ** 31 - hi) * 2 ** 32) >>> 0);
    str(38, 'SSND'); v.setUint32(42, 8 + len); v.setUint32(46, 0); v.setUint32(50, 0);
    for (let i = 0, o = 54; i < n; i++) for (let c = 0; c < k; c++, o += 2) v.setInt16(o, s16(ch[c][i]));
    return buf;
  }

  function encodeMp3(ch, rate, kbps, onProgress) {
    return new Promise((resolve, reject) => {
      const w = new Worker('mp3-worker.js');
      w.onmessage = (e) => {
        if (e.data.progress != null) onProgress(e.data.progress);
        if (e.data.done) { w.terminate(); resolve(e.data.blob); }
      };
      w.onerror = (e) => { w.terminate(); reject(e); };
      const copies = ch.map((c) => c.slice());
      w.postMessage({ channels: copies, sampleRate: rate, kbps }, copies.map((c) => c.buffer));
    });
  }

  async function convertAudio(it, fmt, progress) {
    const buf = await decodeAudio(it.file);
    const ch = channelsOf(buf);
    const secs = Math.round(buf.duration);
    it.note = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const name = `${baseOf(it.file.name)}.${fmt}`;
    if (fmt === 'wav') return { name, blob: blobOf(encodeWav(ch, buf.sampleRate), fmt) };
    if (fmt === 'aiff') return { name, blob: blobOf(encodeAiff(ch, buf.sampleRate), fmt) };
    return { name, blob: await encodeMp3(ch, buf.sampleRate, 192, progress) };
  }

  const CONVERT = { image: convertImage, pdf: convertPdf, doc: convertDoc, sheet: convertSheet, audio: convertAudio, video: convertAudio };

  /* ================= eventi ================= */
  function save(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  }
  const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  $('picker').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  const drop = $('drop');
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { if (hasFiles(e)) { e.preventDefault(); drop.classList.add('over'); } }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
  // File trascinati in qualunque punto della pagina, o incollati con Ctrl+V.
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); } });
  window.addEventListener('paste', (e) => { if (e.clipboardData && e.clipboardData.files.length) addFiles(e.clipboardData.files); });

  $('files').addEventListener('click', (e) => {
    const li = e.target.closest('.file');
    if (!li) return;
    const it = state.items.find((x) => x.id === Number(li.dataset.id));
    if (!it) return;
    const fmtBtn = e.target.closest('[data-fmt]');
    if (fmtBtn) { convert(it, fmtBtn.dataset.fmt); return; }
    if (e.target.closest('[data-remove]')) {
      it.token++;
      dropResult(it);
      if (it.thumb) URL.revokeObjectURL(it.thumb);
      state.items = state.items.filter((x) => x !== it);
      render();
    }
  });
  $('all').addEventListener('click', (e) => {
    const b = e.target.closest('[data-all]');
    if (!b) return;
    state.items.forEach((it) => convert(it, b.dataset.all));
    render();
  });
  $('clear').addEventListener('click', () => {
    state.items.forEach((it) => { it.token++; dropResult(it); if (it.thumb) URL.revokeObjectURL(it.thumb); });
    state.items = [];
    render();
  });
  $('zip').addEventListener('click', async () => {
    const b = $('zip');
    b.disabled = true;
    try { save(await makeZip(state.items.filter((x) => x.status === 'done').map((x) => ({ name: x.result.name, data: x.result.blob }))), `${t('appName').toLowerCase()}-${localDate()}.zip`); }
    finally { b.disabled = false; }
  });
  $('lang').addEventListener('change', (e) => {
    lang = e.target.value;
    try { localStorage.setItem('lang', lang); } catch (_) {}
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
    renderStatic();
    render();
  });
  window.addEventListener('beforeunload', (e) => { if (state.items.some((x) => x.status === 'work')) { e.preventDefault(); e.returnValue = ''; } });

  renderStatic();
  render();
})();

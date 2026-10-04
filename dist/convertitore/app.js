/* Convertitore di file: tutto avviene nel browser, i file non vengono mai inviati da nessuna parte.
   Librerie (in lib/, caricate solo quando servono):
   - pdf.js (Apache 2.0): leggere i PDF, trasformarli in immagini o testo
   - pdf-lib (MIT): creare, unire e dividere i PDF
   - SheetJS (Apache 2.0): leggere e scrivere Excel, ODS, CSV
   - lamejs (LGPL): codificare gli MP3 (in mp3-worker.js, per non bloccare la pagina) */
(() => {
  'use strict';

  /* ---------------- lingua ---------------- */
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
  const fmtSize = (n) => {
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${n.toLocaleString(LANG_LOCALES[lang], { maximumFractionDigits: i ? 1 : 0 })} ${u[i]}`;
  };

  /* ---------------- categorie ---------------- */
  const ICONS = {
    images: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    pdf: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 14h2.5a1.5 1.5 0 0 0 0-3H8v6"/>',
    data: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>',
    audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'
  };
  const CATS = {
    images: { exts: ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico', 'avif'] },
    pdf: { exts: ['pdf'] },
    data: { exts: ['xlsx', 'xlsm', 'xlsb', 'xls', 'ods', 'csv', 'tsv', 'txt', 'json'] },
    audio: { exts: ['mp3', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba', 'mp4', 'm4v', 'mov', 'webm', 'mkv'] }
  };
  const extOf = (name) => (String(name).match(/\.([^.]+)$/) || ['', ''])[1].toLowerCase();
  const baseOf = (name) => String(name).replace(/\.[^.]+$/, '') || 'file';
  function catOf(file) {
    const e = extOf(file.name);
    for (const [k, c] of Object.entries(CATS)) if (c.exts.includes(e)) return k;
    if (/^image\//.test(file.type)) return 'images';
    if (/^(audio|video)\//.test(file.type)) return 'audio';
    if (file.type === 'application/pdf') return 'pdf';
    return null;
  }

  const europeanSep = lang !== 'en';
  const state = {
    cat: 'images',
    lists: { images: [], pdf: [], data: [], audio: [] },
    opts: {
      images: { fmt: 'jpg', quality: 90, size: 'original', width: 1920, percent: 50, bg: '#ffffff', page: 'fit' },
      pdf: { op: 'jpg', dpi: 150, quality: 90 },
      data: { fmt: 'xlsx', sep: europeanSep ? ';' : ',' },
      audio: { fmt: 'mp3', kbps: 192, channels: 'stereo' }
    },
    results: [],
    busy: false
  };
  let nextId = 1;

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
  const DOWNLOAD_ICON = svg('<path d="M12 4v12m0 0-4-4m4 4 4-4"/><path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1"/>');
  const tick = () => new Promise((r) => setTimeout(r, 0));

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ---------------- disegno della pagina ---------------- */
  function renderStatic() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    $('lang').innerHTML = LANGS.map((c) => `<option value="${c}">${LANG_NAMES[c]}</option>`).join('');
    $('lang').value = lang;
    $('lang').setAttribute('aria-label', t('langLabel'));
    $('back').href = `../?lang=${lang}#strumenti`;
    $('home').href = `../?lang=${lang}`;
    $('tabs').innerHTML = Object.keys(CATS).map((k) => `
      <button role="tab" data-cat="${k}" class="${state.cat === k ? 'active' : ''}" aria-selected="${state.cat === k}">${svg(ICONS[k])}<span>${esc(t('tab_' + k))}</span></button>`).join('');
  }

  function render() {
    const cat = state.cat;
    document.querySelectorAll('#tabs button').forEach((b) => { const on = b.dataset.cat === cat; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    $('hint').textContent = t('hint_' + cat);
    $('picker').accept = CATS[cat].exts.map((e) => '.' + e).join(',') + (cat === 'images' ? ',image/*' : cat === 'audio' ? ',audio/*,video/*' : '');
    renderFiles();
    renderOptions();
    renderResults();
  }

  function renderFiles() {
    const list = state.lists[state.cat];
    $('count').textContent = list.length;
    $('clear').hidden = !list.length || state.busy;
    const ordered = isOrdered();
    $('files').innerHTML = list.length ? list.map((it) => `
      <li class="file" data-id="${it.id}" ${ordered && !state.busy ? 'draggable="true"' : ''}>
        ${ordered ? `<span class="grip" title="${esc(t('dragHandle'))}">${svg('<circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>')}</span>` : ''}
        <span class="thumb">${it.thumb ? `<img src="${it.thumb}" alt="">` : esc(extOf(it.file.name) || '?')}</span>
        <span class="meta"><b title="${esc(it.file.name)}">${esc(it.file.name)}</b><span class="${it.status ? 'st-' + it.status : ''}">${esc(statusText(it))}</span></span>
        ${state.busy ? '' : `<button class="x" data-remove="${it.id}" title="${esc(t('remove'))}" aria-label="${esc(t('remove'))}">×</button>`}
      </li>`).join('') : `<p class="empty">${esc(t('empty'))}</p>`;
    const hint = state.cat === 'pdf' && state.opts.pdf.op === 'merge' ? t('mergeHint') : ordered ? t('orderHint') : '';
    $('orderHint').hidden = !hint || list.length < 2;
    $('orderHint').textContent = hint;
  }

  function statusText(it) {
    const size = fmtSize(it.file.size);
    if (!it.status) return size;
    if (it.status === 'work') return `${size} · ${t('st_work')}${it.progress != null ? ' ' + Math.round(it.progress * 100) + '%' : ''}`;
    if (it.status === 'done') return `${size} · ${t('st_done')}${it.note ? ' · ' + it.note : ''}`;
    if (it.status === 'error') return `${t('st_error')}: ${it.error}`;
    return `${size} · ${t('st_wait')}`;
  }

  // Le righe si possono riordinare quando l'ordine conta: immagini in un unico PDF e unione di PDF.
  function isOrdered() {
    return (state.cat === 'images' && state.opts.images.fmt === 'pdf') || (state.cat === 'pdf' && state.opts.pdf.op === 'merge');
  }

  const chips = (key, values, labels, wide) => `<div class="chips${wide ? ' wide' : ''}" data-key="${key}">${values.map((v, i) =>
    `<button type="button" data-value="${esc(v)}" class="${String(state.opts[state.cat][key]) === String(v) ? 'active' : ''}">${esc(labels ? labels[i] : String(v).toUpperCase())}</button>`).join('')}</div>`;
  const field = (label, html) => `<div class="field"><span>${esc(label)}</span>${html}</div>`;
  const select = (key, values, labels) => `<select data-key="${key}">${values.map((v, i) => `<option value="${esc(v)}" ${String(state.opts[state.cat][key]) === String(v) ? 'selected' : ''}>${esc(labels[i])}</option>`).join('')}</select>`;
  const range = (key, min, max, step) => `<div class="range"><input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${state.opts[state.cat][key]}"><output>${state.opts[state.cat][key]}</output></div>`;

  function renderOptions() {
    const o = state.opts[state.cat];
    let html = '';
    if (state.cat === 'images') {
      html += field(t('outFormat'), chips('fmt', ['jpg', 'png', 'webp', 'pdf']));
      if (o.fmt === 'pdf') html += `<p class="hint" style="margin:-8px 0 14px">${esc(t('fmt_pdfAll'))}</p>`;
      if (o.fmt === 'jpg' || o.fmt === 'webp' || o.fmt === 'pdf') html += field(t('quality'), range('quality', 10, 100, 5));
      html += field(t('size'), select('size', ['original', 'width', 'percent'], [t('sizeOriginal'), t('sizeWidth'), t('sizePercent')]));
      if (o.size === 'width') html += field(t('sizeWidth'), `<input type="number" data-key="width" min="16" max="20000" value="${o.width}">`);
      if (o.size === 'percent') html += field(t('sizePercent'), range('percent', 10, 100, 5));
      if (o.fmt === 'jpg' || o.fmt === 'pdf') html += field(t('background'), `<div class="color"><input type="color" data-key="bg" value="${o.bg}"></div>`);
      if (o.fmt === 'pdf') html += field(t('pageSize'), chips('page', ['fit', 'a4'], [t('pageFit'), t('pageA4')], true));
    } else if (state.cat === 'pdf') {
      html += field(t('operation'), select('op', ['jpg', 'png', 'txt', 'merge', 'split'], [t('op_jpg'), t('op_png'), t('op_txt'), t('op_merge'), t('op_split')]));
      if (o.op === 'jpg' || o.op === 'png') html += field(t('resolution'), select('dpi', [72, 150, 300], [t('res_72'), t('res_150'), t('res_300')]));
      if (o.op === 'jpg') html += field(t('quality'), range('quality', 10, 100, 5));
    } else if (state.cat === 'data') {
      html += field(t('outFormat'), chips('fmt', ['xlsx', 'csv', 'json', 'ods']));
      if (o.fmt === 'csv') html += field(t('csvSep'), select('sep', [';', ',', '\t'], [t('sep_semi'), t('sep_comma'), t('sep_tab')]));
      html += `<p class="hint" style="margin:-4px 0 16px">${esc(t('dataHint'))}</p>`;
    } else {
      html += field(t('outFormat'), chips('fmt', ['mp3', 'wav']));
      if (o.fmt === 'mp3') html += field(t('bitrate'), chips('kbps', [128, 192, 256, 320], ['128 kbps', '192 kbps', '256 kbps', '320 kbps']));
      html += field(t('channels'), chips('channels', ['stereo', 'mono'], [t('stereo'), t('mono')], true));
      html += `<p class="hint" style="margin:-4px 0 16px">${esc(t('audioHint'))}</p>`;
    }
    $('options').innerHTML = html;
    const go = $('go');
    go.disabled = state.busy || !state.lists[state.cat].length;
    go.innerHTML = state.busy ? `<span class="spin"></span>${esc(t('converting'))}` : `${svg('<path d="M5 9h13l-4-4"/><path d="M19 15H6l4 4"/>')}${esc(t('convert'))}`;
  }

  function renderResults() {
    const r = state.results;
    $('resultsCard').hidden = !r.length;
    $('rcount').textContent = r.length;
    $('results').innerHTML = r.map((x) => `
      <li class="result">
        <span class="meta"><b title="${esc(x.name)}">${esc(x.name)}</b><span>${fmtSize(x.blob.size)}</span></span>
        <a href="${x.url}" download="${esc(x.name)}">${DOWNLOAD_ICON}${esc(t('download'))}</a>
      </li>`).join('');
    $('zip').hidden = r.length < 2;
    $('zip').innerHTML = `${DOWNLOAD_ICON}${esc(t('downloadAll'))}`;
  }

  /* ---------------- aggiunta dei file ---------------- */
  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length || state.busy) return;
    const byCat = {};
    const rejected = [];
    for (const f of files) {
      const c = catOf(f);
      if (!c) { rejected.push(f.name); continue; }
      const it = { id: nextId++, file: f, status: '', thumb: '' };
      if (c === 'images') try { it.thumb = URL.createObjectURL(f); } catch (_) {}
      state.lists[c].push(it);
      byCat[c] = (byCat[c] || 0) + 1;
    }
    const cats = Object.keys(byCat);
    // Se i file appartengono tutti a un'altra sezione, ci si sposta lì da soli.
    if (cats.length === 1 && cats[0] !== state.cat) state.cat = cats[0];
    if (rejected.length) toast(`${rejected.join(', ')}: ${t('err_unknown')}`);
    else if (cats.length) toast(t('added', { n: files.length }));
    clearResults();
    render();
  }

  function clearResults() {
    state.results.forEach((x) => URL.revokeObjectURL(x.url));
    state.results = [];
  }
  function addResult(name, blob) {
    state.results.push({ name, blob, url: URL.createObjectURL(blob) });
    renderResults();
  }

  /* ---------------- conversione ---------------- */
  class UserError extends Error {}
  const fail = (key) => { throw new UserError(t(key)); };

  async function run() {
    const list = state.lists[state.cat];
    if (!list.length || state.busy) return;
    state.busy = true;
    clearResults();
    list.forEach((it) => { it.status = 'wait'; it.progress = null; it.note = ''; it.error = ''; });
    render();
    try {
      const cat = state.cat;
      const o = state.opts[cat];
      if (cat === 'images' && o.fmt === 'pdf') await together(list, imagesToPdf);
      else if (cat === 'pdf' && o.op === 'merge') {
        if (list.length < 2) { list[0].status = 'error'; list[0].error = t('err_mergeOne'); }
        else await together(list, mergePdfs);
      } else {
        const fn = { images: convertImage, pdf: convertPdf, data: convertData, audio: convertAudio }[cat];
        for (const it of list) await one(it, fn);
      }
    } finally {
      state.busy = false;
      render();
    }
  }

  async function one(it, fn) {
    it.status = 'work';
    renderFiles();
    try {
      const outs = await fn(it);
      outs.forEach((x) => addResult(x.name, x.blob));
      it.status = 'done';
    } catch (e) {
      console.error(e);
      it.status = 'error';
      it.error = e instanceof UserError ? e.message : t('err_read');
    }
    renderFiles();
  }

  // Più file in un solo risultato (immagini in un PDF, unione di PDF).
  async function together(list, fn) {
    list.forEach((it) => { it.status = 'work'; });
    renderFiles();
    try {
      const out = await fn(list);
      addResult(out.name, out.blob);
      list.forEach((it) => { if (it.status !== 'error') it.status = 'done'; });
    } catch (e) {
      console.error(e);
      list.forEach((it) => { if (it.status === 'work') { it.status = 'error'; it.error = e instanceof UserError ? e.message : t('err_read'); } });
    }
    renderFiles();
  }
  const progress = (it, p) => { it.progress = p; renderFiles(); };

  /* ----- immagini ----- */
  async function decodeImage(file) {
    const isSvg = extOf(file.name) === 'svg' || file.type === 'image/svg+xml';
    if (!isSvg && window.createImageBitmap) {
      try { const b = await createImageBitmap(file); return { src: b, w: b.width, h: b.height, done: () => b.close && b.close() }; } catch (_) { /* si prova con <img> */ }
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch (_) { URL.revokeObjectURL(url); fail('err_unsupported'); }
    let w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) { w = 1024; h = 1024; }
    if (isSvg && w < 1024) { h = Math.round(h * 1024 / w); w = 1024; } // i disegni SVG si possono ingrandire senza perdere qualità
    return { src: img, w, h, done: () => URL.revokeObjectURL(url) };
  }

  function targetSize(w, h) {
    const o = state.opts.images;
    let s = 1;
    if (o.size === 'width') s = Math.min(1, Math.max(16, Number(o.width) || w) / w);
    if (o.size === 'percent') s = Math.max(1, Number(o.percent) || 100) / 100;
    return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
  }

  function toCanvas(img, w, h, bg) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img.src, 0, 0, w, h);
    return c;
  }

  function canvasBlob(c, mime, quality) {
    return new Promise((resolve, reject) => c.toBlob((b) => (b && b.type === mime ? resolve(b) : reject(new UserError(t('err_unsupported')))), mime, quality));
  }

  async function convertImage(it) {
    const o = state.opts.images;
    const img = await decodeImage(it.file);
    try {
      const { w, h } = targetSize(img.w, img.h);
      const mime = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[o.fmt];
      const c = toCanvas(img, w, h, o.fmt === 'jpg' ? o.bg : null);
      const blob = await canvasBlob(c, mime, o.quality / 100);
      it.note = `${w}×${h}`;
      return [{ name: `${baseOf(it.file.name)}.${o.fmt}`, blob }];
    } finally { img.done(); }
  }

  async function imagesToPdf(list) {
    const o = state.opts.images;
    const { PDFDocument } = await libPdfLib();
    const doc = await PDFDocument.create();
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      try {
        const img = await decodeImage(it.file);
        const { w, h } = targetSize(img.w, img.h);
        const jpg = await canvasBlob(toCanvas(img, w, h, o.bg), 'image/jpeg', o.quality / 100);
        img.done();
        const emb = await doc.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        if (o.page === 'a4') {
          const land = w > h;
          const pw = land ? 841.89 : 595.28, ph = land ? 595.28 : 841.89, m = 28;
          const s = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h);
          const page = doc.addPage([pw, ph]);
          page.drawImage(emb, { x: (pw - w * s) / 2, y: (ph - h * s) / 2, width: w * s, height: h * s });
        } else {
          const pw = w * 0.75, ph = h * 0.75; // pixel a 96 DPI → punti tipografici
          doc.addPage([pw, ph]).drawImage(emb, { x: 0, y: 0, width: pw, height: ph });
        }
        it.status = 'done';
      } catch (e) {
        it.status = 'error';
        it.error = e instanceof UserError ? e.message : t('err_read');
      }
      renderFiles();
      await tick();
    }
    if (!doc.getPageCount()) fail('err_read');
    const bytes = await doc.save();
    return { name: `${baseOf(list[0].file.name)}${list.length > 1 ? '-' + list.length : ''}.pdf`, blob: new Blob([bytes], { type: 'application/pdf' }) };
  }

  /* ----- PDF ----- */
  let pdfjsPromise = null;
  function libPdfjs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import('./lib/pdf.min.mjs').then((m) => {
        m.GlobalWorkerOptions.workerSrc = new URL('lib/pdf.worker.min.mjs', location.href).href;
        return m;
      });
    }
    return pdfjsPromise;
  }
  const scripts = {};
  function loadScript(src, globalName) {
    if (!scripts[src]) {
      scripts[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve(window[globalName]);
        s.onerror = () => reject(new Error('Impossibile caricare ' + src));
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }
  const libPdfLib = () => loadScript('lib/pdf-lib.min.js', 'PDFLib');
  const libXlsx = () => loadScript('lib/xlsx.full.min.js', 'XLSX');

  async function openPdfjs(file) {
    const pdfjs = await libPdfjs();
    try {
      return await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    } catch (e) {
      if (e && e.name === 'PasswordException') fail('err_password');
      fail('err_read');
    }
  }
  async function openPdfLib(file) {
    const { PDFDocument } = await libPdfLib();
    try {
      return await PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      if (/encrypt/i.test(String(e && (e.name + e.message)))) fail('err_password');
      fail('err_read');
    }
  }
  const pad = (i, n) => String(i).padStart(Math.max(2, String(n).length), '0');

  async function convertPdf(it) {
    const o = state.opts.pdf;
    const base = baseOf(it.file.name);
    if (o.op === 'split') {
      const { PDFDocument } = await libPdfLib();
      const src = await openPdfLib(it.file);
      const n = src.getPageCount();
      const outs = [];
      for (let i = 0; i < n; i++) {
        const doc = await PDFDocument.create();
        const [p] = await doc.copyPages(src, [i]);
        doc.addPage(p);
        outs.push({ name: `${base}-p${pad(i + 1, n)}.pdf`, blob: new Blob([await doc.save()], { type: 'application/pdf' }) });
        progress(it, (i + 1) / n);
      }
      it.note = t('pagesOut', { n });
      return outs;
    }
    const pdf = await openPdfjs(it.file);
    const n = pdf.numPages;
    if (o.op === 'txt') {
      const pages = [];
      for (let i = 1; i <= n; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        pages.push(content.items.map((x) => (x.str || '') + (x.hasEOL ? '\n' : '')).join('').replace(/[ \t]+\n/g, '\n').trim());
        progress(it, i / n);
      }
      const text = pages.join('\n\n');
      if (!text.trim()) fail('err_notext');
      it.note = t('pagesOut', { n });
      return [{ name: `${base}.txt`, blob: new Blob(['﻿' + text.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' }) }];
    }
    const outs = [];
    const mime = o.op === 'png' ? 'image/png' : 'image/jpeg';
    for (let i = 1; i <= n; i++) {
      const page = await pdf.getPage(i);
      let scale = Number(o.dpi) / 72;
      const vp1 = page.getViewport({ scale: 1 });
      const maxSide = 10000; // limite delle immagini dei browser
      scale = Math.min(scale, maxSide / Math.max(vp1.width, vp1.height));
      const vp = page.getViewport({ scale });
      const c = document.createElement('canvas');
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      // intent "print": disegna anche se la scheda del browser è in secondo piano (con "display" si fermerebbe).
      await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
      const blob = await canvasBlob(c, mime, o.quality / 100);
      c.width = c.height = 0;
      outs.push({ name: `${base}-p${pad(i, n)}.${o.op}`, blob });
      progress(it, i / n);
    }
    pdf.destroy();
    it.note = t('pagesOut', { n });
    return outs;
  }

  async function mergePdfs(list) {
    const { PDFDocument } = await libPdfLib();
    const out = await PDFDocument.create();
    for (const it of list) {
      try {
        const src = await openPdfLib(it.file);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        it.status = 'done';
        it.note = t('pagesOut', { n: pages.length });
      } catch (e) {
        it.status = 'error';
        it.error = e instanceof UserError ? e.message : t('err_read');
      }
      renderFiles();
      await tick();
    }
    if (!out.getPageCount()) fail('err_read');
    return { name: `${baseOf(list[0].file.name)}-merged.pdf`, blob: new Blob([await out.save()], { type: 'application/pdf' }) };
  }

  /* ----- Excel e dati ----- */
  function guessSep(text) {
    const first = text.split(/\r?\n/).find((l) => l.trim()) || '';
    const counts = [';', ',', '\t', '|'].map((s) => [s, first.split(s).length - 1]);
    counts.sort((a, b) => b[1] - a[1]);
    return counts[0][1] ? counts[0][0] : ',';
  }

  async function readWorkbook(file) {
    const XLSX = await libXlsx();
    const e = extOf(file.name);
    if (e === 'json') {
      let data;
      try { data = JSON.parse((await file.text()).replace(/^﻿/, '')); } catch (_) { fail('err_read'); }
      const wb = XLSX.utils.book_new();
      const addSheet = (rows, name) => {
        if (!Array.isArray(rows)) rows = [rows];
        const ws = rows.length && Array.isArray(rows[0]) ? XLSX.utils.aoa_to_sheet(rows) : XLSX.utils.json_to_sheet(rows.map((r) => (r && typeof r === 'object' ? flatten(r) : { value: r })));
        XLSX.utils.book_append_sheet(wb, ws, String(name).slice(0, 31) || 'Sheet1');
      };
      if (Array.isArray(data)) addSheet(data, 'Sheet1');
      else if (data && typeof data === 'object' && Object.values(data).length && Object.values(data).every(Array.isArray)) Object.entries(data).forEach(([k, v]) => addSheet(v, k));
      else addSheet([data], 'Sheet1');
      return wb;
    }
    if (e === 'csv' || e === 'tsv' || e === 'txt') {
      const text = (await file.text()).replace(/^﻿/, '');
      const sep = e === 'tsv' ? '\t' : guessSep(text);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(parseCsv(text, sep).map((r) => r.map((v) => csvValue(v, sep)))), 'Sheet1');
      return wb;
    }
    try { return XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true }); } catch (_) { fail('err_read'); }
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
    if (sep === ',' ? /^[-+]?\d+(\.\d+)?$/.test(s) : /^[-+]?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(s)) {
      const n = Number(sep === ',' ? s : s.replace(/\./g, '').replace(',', '.'));
      if (isFinite(n)) return n;
    }
    return v;
  }
  // Scrittura del CSV: con ";" i decimali escono con la virgola, come li vuole Excel in italiano.
  function toCsv(XLSX, ws, sep) {
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
    const text = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: false });
    const quote = (v) => (/[\r\n"]/.test(v) || v.includes(sep) ? `"${v.replace(/"/g, '""')}"` : v);
    return raw.map((r, i) => r.map((v, j) => {
      if (typeof v === 'number') return quote(sep === ',' ? String(v) : String(v).replace('.', ','));
      return quote(String(text[i] && text[i][j] != null ? text[i][j] : v));
    }).join(sep)).join('\r\n');
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
  const safeName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'sheet';

  async function convertData(it) {
    const o = state.opts.data;
    const XLSX = await libXlsx();
    const wb = await readWorkbook(it.file);
    const base = baseOf(it.file.name);
    const names = wb.SheetNames;
    it.note = names.length > 1 ? t('sheetsOut', { n: names.length }) : '';
    if (o.fmt === 'xlsx' || o.fmt === 'ods') {
      const bytes = XLSX.write(wb, { bookType: o.fmt, type: 'array', compression: true });
      const mime = o.fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/vnd.oasis.opendocument.spreadsheet';
      return [{ name: `${base}.${o.fmt}`, blob: new Blob([bytes], { type: mime }) }];
    }
    if (o.fmt === 'json') {
      const rows = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' });
      const data = names.length === 1 ? rows(names[0]) : Object.fromEntries(names.map((n) => [n, rows(n)]));
      return [{ name: `${base}.json`, blob: new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }) }];
    }
    return names.map((n) => ({
      name: names.length === 1 ? `${base}.csv` : `${base}-${safeName(n)}.csv`,
      // Il BOM iniziale fa leggere bene a Excel le lettere accentate.
      blob: new Blob(['﻿' + toCsv(XLSX, wb.Sheets[n], o.sep)], { type: 'text/csv;charset=utf-8' })
    }));
  }

  /* ----- audio ----- */
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

  function audioChannels(buf) {
    const ch = [];
    for (let i = 0; i < buf.numberOfChannels; i++) ch.push(buf.getChannelData(i));
    if (state.opts.audio.channels === 'mono' && ch.length > 1) {
      const m = new Float32Array(ch[0].length);
      for (const c of ch) for (let i = 0; i < m.length; i++) m[i] += c[i] / ch.length;
      return [m];
    }
    return ch.slice(0, 2);
  }

  function encodeWav(ch, rate) {
    const n = ch[0].length, k = ch.length;
    const buf = new ArrayBuffer(44 + n * k * 2);
    const v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * k * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, k, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * k * 2, true); v.setUint16(32, k * 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * k * 2, true);
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < k; c++) {
      const s = Math.max(-1, Math.min(1, ch[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
    return new Blob([buf], { type: 'audio/wav' });
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

  async function convertAudio(it) {
    const o = state.opts.audio;
    const buf = await decodeAudio(it.file);
    const ch = audioChannels(buf);
    const secs = Math.round(buf.duration);
    it.note = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const base = baseOf(it.file.name);
    if (o.fmt === 'wav') return [{ name: `${base}.wav`, blob: encodeWav(ch, buf.sampleRate) }];
    const blob = await encodeMp3(ch, buf.sampleRate, Number(o.kbps), (p) => progress(it, p));
    return [{ name: `${base}.mp3`, blob }];
  }

  /* ---------------- ZIP (senza compressione: i file convertiti sono già compressi) ---------------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

  async function makeZip(items) {
    const enc = new TextEncoder();
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [], central = [], used = new Set();
    let offset = 0;
    for (const it of items) {
      let name = it.name, i = 2;
      while (used.has(name.toLowerCase())) name = it.name.replace(/(\.[^.]+)?$/, `-${i++}$1`);
      used.add(name.toLowerCase());
      const data = new Uint8Array(await it.blob.arrayBuffer());
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
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, items.length, true); end.setUint16(10, items.length, true);
    end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
  }

  const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  function save(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  }

  /* ---------------- eventi ---------------- */
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b || state.busy) return;
    state.cat = b.dataset.cat;
    clearResults();
    render();
  });
  $('picker').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); drop.classList.add('over'); } }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });
  // File trascinati in qualunque punto della pagina, o incollati con Ctrl+V.
  window.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
  window.addEventListener('paste', (e) => { if (e.clipboardData && e.clipboardData.files.length) addFiles(e.clipboardData.files); });

  $('files').addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove]');
    if (!b) return;
    const list = state.lists[state.cat];
    const i = list.findIndex((x) => x.id === Number(b.dataset.remove));
    if (i >= 0) { if (list[i].thumb) URL.revokeObjectURL(list[i].thumb); list.splice(i, 1); }
    clearResults();
    render();
  });
  $('clear').addEventListener('click', () => {
    state.lists[state.cat].forEach((x) => x.thumb && URL.revokeObjectURL(x.thumb));
    state.lists[state.cat] = [];
    clearResults();
    render();
  });

  // Riordino delle righe trascinandole.
  let dragId = null;
  $('files').addEventListener('dragstart', (e) => {
    const li = e.target.closest('.file');
    if (!li) return;
    dragId = Number(li.dataset.id);
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragId));
  });
  $('files').addEventListener('dragover', (e) => {
    if (dragId == null) return;
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.file.drop-before').forEach((x) => x.classList.remove('drop-before'));
    const li = e.target.closest('.file');
    if (li && Number(li.dataset.id) !== dragId) li.classList.add('drop-before');
  });
  $('files').addEventListener('drop', (e) => {
    if (dragId == null) return;
    e.preventDefault();
    e.stopPropagation();
    const li = e.target.closest('.file');
    const list = state.lists[state.cat];
    const from = list.findIndex((x) => x.id === dragId);
    if (li && from >= 0) {
      const [moved] = list.splice(from, 1);
      const to = list.findIndex((x) => x.id === Number(li.dataset.id));
      list.splice(to < 0 ? list.length : to, 0, moved);
    }
    dragId = null;
    clearResults();
    render();
  });
  $('files').addEventListener('dragend', () => { dragId = null; renderFiles(); });

  $('options').addEventListener('click', (e) => {
    const b = e.target.closest('.chips button');
    if (!b) return;
    const key = b.parentElement.dataset.key;
    const cur = state.opts[state.cat][key];
    state.opts[state.cat][key] = typeof cur === 'number' ? Number(b.dataset.value) : b.dataset.value;
    renderFiles();
    renderOptions();
  });
  $('options').addEventListener('input', (e) => {
    const el = e.target;
    const key = el.dataset.key;
    if (!key) return;
    const cur = state.opts[state.cat][key];
    state.opts[state.cat][key] = typeof cur === 'number' ? Number(el.value) : el.value;
    if (el.type === 'range') el.nextElementSibling.textContent = el.value;
    if (el.tagName === 'SELECT') { renderFiles(); renderOptions(); }
  });
  $('go').addEventListener('click', run);
  $('zip').addEventListener('click', async () => {
    const b = $('zip');
    b.disabled = true;
    try { save(await makeZip(state.results), `${t('appName').toLowerCase()}-${localDate()}.zip`); }
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
  window.addEventListener('beforeunload', (e) => { if (state.busy) { e.preventDefault(); e.returnValue = ''; } });

  renderStatic();
  render();
})();

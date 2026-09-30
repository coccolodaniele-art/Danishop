/* Logica di SP500 Vertical Thermometers: traduzione per il browser, riga per riga,
   di sp500_vertical_thermometer.py (programma desktop). Costanti, elenchi e testi dei
   prompt NON sono riscritti qui: arrivano da dati_programma.json, esportato dal file
   Python con esporta_dati.py. Questo file non tocca la pagina (niente DOM): viene
   incluso nella pagina da crea_pagina.py e usato anche dai test (test_logica.js).

   Differenze obbligate dal browser (la logica non cambia):
   - le fonti (Yahoo Finance, SEC EDGAR, Nasdaq.com) si leggono tramite l'intermediario
     PROXY_URL, perche' i browser non permettono di scaricarle direttamente;
   - l'elenco S&P 500 si legge da Wikipedia tramite la sua API pubblica (stessa tabella
     "constituents" della pagina), la cache di 30 giorni sta nel browser;
   - se www.sec.gov rifiuta l'intermediario, gli elenchi ufficiali dei ticker SEC si
     leggono dalla copia pubblicata insieme alla pagina (sec_tickers.json);
   - la chiave Gemini resta nel browser del visitatore. */
'use strict';

const T = {};  // spazio dei nomi esportato (anche per i test in Node)

(function (T) {
  let D = null;           // dati_programma.json
  let PROXY_URL = '';
  let SEC_SNAPSHOT_URL = 'sec_tickers.json';
  let storage = null;     // localStorage (o finto nei test)
  let fetchImpl = (...a) => fetch(...a);

  T.init = function (data, opts = {}) {
    D = data;
    PROXY_URL = (opts.proxy || '').replace(/\/+$/, '');
    if (opts.secSnapshotUrl) SEC_SNAPSHOT_URL = opts.secSnapshotUrl;
    storage = opts.storage || null;
    if (opts.fetch) fetchImpl = opts.fetch;
    T.D = D;
  };

  /* ---------- numeri e testi (come Python) ---------- */

  // Arrotondamento come round() di Python (metà al pari).
  function pyRound(x) {
    const r = Math.round(x);
    return (Math.abs(x % 1) === 0.5) ? 2 * Math.round(x / 2) : r;
  }
  // Come f"{x:.{d}f}" di Python: arrotonda il valore binario esatto, metà al pari.
  function pyFixed(x, d) {
    let s = x.toFixed(d);
    const exact = Math.abs(x).toFixed(Math.min(100, d + 60));
    const tail = exact.slice(exact.indexOf('.') + 1 + d);
    if (/^50*$/.test(tail)) {                      // pareggio esatto
      const kept = Math.trunc(Math.abs(x) * Math.pow(10, d) + 1e-9);
      if (kept % 2 === 0) {                          // Python tiene la cifra pari
        const down = (Math.sign(x) < 0 ? '-' : '') + (kept / Math.pow(10, d)).toFixed(d);
        s = down;
      }
    }
    return s;
  }
  function groupThousands(fixed) {
    const neg = fixed.startsWith('-');
    const body = neg ? fixed.slice(1) : fixed;
    const [i, f] = body.split('.');
    const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + g + (f !== undefined ? '.' + f : '');
  }
  function swapSeparators(s) { return s.replace(/,/g, '_').replace(/\./g, ',').replace(/_/g, '.'); }
  function isFiniteNum(v) { return v !== null && v !== undefined && Number.isFinite(v); }

  function fmtNumber(value) {
    if (!isFiniteNum(value)) return 'N/D';
    return swapSeparators(groupThousands(pyFixed(value, 2)));
  }
  function fmtPct(value) {
    if (!isFiniteNum(value)) return 'N/D';
    const sign = value >= 0 ? '+' : '';
    return (sign + pyFixed(value * 100, 1) + '%').replace(/\./g, ',');
  }
  function fmtBillions(value) { return swapSeparators(groupThousands(pyFixed(value / 1e9, 2))) + ' Mld USD'; }
  function nowStamp() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  Object.assign(T, { pyRound, pyFixed, fmtNumber, fmtPct, fmtBillions, nowStamp });

  /* ---------- rete ---------- */
  const HTTP_REASONS = {
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 413: 'Payload Too Large',
    429: 'Too Many Requests', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  class HTTPError extends Error {
    constructor(code) { super(`HTTP Error ${code}: ${HTTP_REASONS[code] || ''}`.trim()); this.code = code; }
  }
  async function timedFetch(url, options, timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      return await fetchImpl(url, { ...options, signal: ctrl.signal });
    } catch (err) {
      if (err && err.name === 'AbortError') throw new Error('timed out');
      throw new Error('Connessione non riuscita (' + (err && err.message || err) + ')');
    } finally {
      clearTimeout(timer);
    }
  }
  // Come http_get_json del desktop, ma passando dall'intermediario.
  async function httpGetText(url, timeout = 25000) {
    if (!PROXY_URL) throw new Error('Il servizio per leggere le fonti non e\' configurato.');
    const res = await timedFetch(PROXY_URL + '/?url=' + encodeURIComponent(url), {}, timeout);
    if (!res.ok) throw new HTTPError(res.status);
    return await res.text();
  }
  async function httpGetJson(url, timeout = 25000) { return JSON.parse(await httpGetText(url, timeout)); }

  // Elenchi ufficiali dei ticker SEC: prima dal vivo, poi dalla copia pubblicata con la pagina.
  let secSnapshot = null;
  async function secFileJson(url) {
    try {
      return await httpGetJson(url, 40000);
    } catch (liveError) {
      try {
        if (!secSnapshot) {
          const res = await timedFetch(SEC_SNAPSHOT_URL, {}, 40000);
          if (!res.ok) throw new HTTPError(res.status);
          secSnapshot = await res.json();
        }
        const name = url.slice(url.lastIndexOf('/') + 1);
        if (secSnapshot.files && secSnapshot.files[name]) return secSnapshot.files[name];
      } catch (_) { /* nessuna copia disponibile: vale l'errore originale */ }
      throw liveError;
    }
  }
  Object.assign(T, { HTTPError, httpGetText, httpGetJson, secFileJson });

  // Esegue fn su tutti gli elementi con al massimo `limit` in parallelo (ThreadPoolExecutor);
  // onDone(risultato, elemento) viene chiamato man mano che finiscono (as_completed).
  async function poolMap(items, limit, fn, onDone, shouldStop) {
    const results = new Array(items.length);
    let next = 0;
    async function worker() {
      while (next < items.length) {
        if (shouldStop && shouldStop()) return;
        const i = next++;
        let r, err = null;
        try { r = await fn(items[i]); } catch (e) { err = e; }
        results[i] = err ? { error: err } : { value: r };
        if (onDone) onDone(err ? null : r, items[i], err);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
  }
  T.poolMap = poolMap;

  /* ---------- asset e settori ---------- */
  const asSpec = (a) => ({ symbol: a[0], label: a[1], edgar_symbol: a[2] || '', kind: a[3] || 'equity' });
  function spec(symbol, label, edgar_symbol = '', kind = 'equity') { return { symbol, label, edgar_symbol, kind }; }
  function commoditySector() { return [D.COMMODITY_SECTOR[0], D.COMMODITY_SECTOR[1].map(asSpec)]; }
  function dedupSectors(sectors) {
    const seen = new Set(), result = [];
    for (const [name, specs] of sectors) {
      const kept = [];
      for (const s of specs) if (!seen.has(s.symbol)) { seen.add(s.symbol); kept.push(s); }
      if (kept.length) result.push([name, kept]);
    }
    return result;
  }
  function flattenSectors(sectors) { return sectors.flatMap(([, specs]) => specs); }
  function fallbackSectors() { return dedupSectors(D.FALLBACK_SECTORS.map(([n, items]) => [n, items.map(asSpec)])); }
  function mainAsset() { return asSpec(D.MAIN_ASSET); }
  Object.assign(T, { spec, dedupSectors, flattenSectors, fallbackSectors, commoditySector, mainAsset });

  // Righe (ticker, nome, settore GICS) della tabella "constituents" (vedi _WikiTableParser).
  function parseConstituentsHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.getElementById('constituents');
    const rows = [];
    if (table && table.tagName === 'TABLE') {
      for (const tr of table.querySelectorAll('tr')) {
        const cells = [...tr.querySelectorAll('td, th')].map((c) => c.textContent.trim());
        if (cells.length) rows.push(cells);
      }
    }
    if (rows.length < 2) throw new Error('Tabella dei componenti S&P 500 non trovata sulla pagina Wikipedia');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const colIndex = (...names) => {
      for (const n of names) if (header.includes(n)) return header.indexOf(n);
      throw new Error(`Colonna non trovata tra ${JSON.stringify(names)} (intestazioni: ${JSON.stringify(header)})`);
    };
    const iSymbol = colIndex('symbol'), iName = colIndex('security'), iSector = colIndex('gics sector');
    const result = [];
    for (const row of rows.slice(1)) {
      if (row.length <= Math.max(iSymbol, iName, iSector)) continue;
      const ticker = row[iSymbol].trim().toUpperCase().replace(/\./g, '-');
      const name = row[iName].trim(), sector = row[iSector].trim();
      if (ticker && name && sector) result.push([ticker, name, sector]);
    }
    return result;
  }
  async function fetchSp500ConstituentsTable() {
    // Stessa pagina del desktop (SP500_WIKI_URL), letta tramite l'API di Wikipedia che
    // consente l'accesso dai browser.
    const page = decodeURIComponent(D.SP500_WIKI_URL.split('/wiki/')[1]);
    const api = 'https://en.wikipedia.org/w/api.php?action=parse&prop=text&format=json&formatversion=2&origin=*&page='
      + encodeURIComponent(page);
    const res = await timedFetch(api, {}, 25000);
    if (!res.ok) throw new HTTPError(res.status);
    const data = await res.json();
    if (!data.parse || !data.parse.text) throw new Error('Pagina Wikipedia non disponibile');
    return parseConstituentsHtml(data.parse.text);
  }
  function buildSp500Sectors(rows) {
    const gics = new Map(D.GICS_TO_ITALIAN);
    const bySector = new Map();
    for (const [ticker, name, g] of rows) {
      const label = gics.get(g) || g;
      if (!bySector.has(label)) bySector.set(label, []);
      bySector.get(label).push(spec(ticker, name));
    }
    const orderedNames = D.GICS_TO_ITALIAN.map(([, it]) => it);
    const ordered = orderedNames.filter((n) => bySector.get(n) && bySector.get(n).length).map((n) => [n, bySector.get(n)]);
    for (const [n, specs] of bySector) if (!orderedNames.includes(n)) ordered.push([n, specs]);
    ordered.push(commoditySector());
    return dedupSectors(ordered);
  }
  const CACHE_KEY = 'termometri_sp500_constituents_cache';
  const sectorsToCache = (sectors) => sectors.map(([n, specs]) => [n, specs.map((s) => [s.symbol, s.label, s.edgar_symbol, s.kind])]);
  const sectorsFromCache = (data) => data.map(([n, items]) => [n, items.map(asSpec)]);
  function readCache() {
    try { const raw = storage && storage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }
  async function loadSp500Sectors() {
    const cache = readCache();
    if (cache) {
      const ageDays = (Date.now() - cache.mtime) / 86400000;
      if (ageDays < D.CONSTITUENTS_CACHE_MAX_AGE_DAYS) {
        try { return sectorsFromCache(cache.data); } catch (_) { /* cache corrotta */ }
      }
    }
    try {
      const sectors = buildSp500Sectors(await fetchSp500ConstituentsTable());
      try { storage && storage.setItem(CACHE_KEY, JSON.stringify({ mtime: Date.now(), data: sectorsToCache(sectors) })); } catch (_) { }
      return sectors;
    } catch (exc) {
      console.warn(`[constituents] scaricamento lista S&P 500 da Wikipedia fallito (${exc.message})`);
      if (cache) {
        try { console.warn('[constituents] uso la cache locale (anche se scaduta)'); return sectorsFromCache(cache.data); } catch (_) { }
      }
      console.warn("[constituents] uso l'elenco ridotto integrato nel programma come fallback");
      return fallbackSectors();
    }
  }
  Object.assign(T, { parseConstituentsHtml, buildSp500Sectors, loadSp500Sectors });

  /* ---------- calcoli sui prezzi ---------- */
  function financeUrl(symbol) {
    return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  }
  function computePoc(highs, lows, volumes, nBuckets = 100) {
    const valid = [];
    const n = Math.min(highs.length, lows.length, volumes.length);
    for (let i = 0; i < n; i++) {
      const h = highs[i], l = lows[i], v = volumes[i];
      if (v && v > 0 && h > l) valid.push([h, l, v]);
    }
    if (!valid.length) return null;
    let priceMin = Infinity, priceMax = -Infinity;
    for (const [h, l] of valid) { if (l < priceMin) priceMin = l; if (h > priceMax) priceMax = h; }
    if (priceMax <= priceMin) return null;
    const bucketSize = (priceMax - priceMin) / nBuckets;
    const bucketVolume = new Array(nBuckets).fill(0.0);
    for (const [h, l, v] of valid) {
      const loIdx = Math.min(Math.max(Math.trunc((l - priceMin) / bucketSize), 0), nBuckets - 1);
      let hiIdx = Math.min(Math.max(Math.trunc((h - priceMin) / bucketSize), 0), nBuckets - 1);
      if (hiIdx < loIdx) hiIdx = loIdx;
      const share = v / (hiIdx - loIdx + 1);
      for (let i = loIdx; i <= hiIdx; i++) bucketVolume[i] += share;
    }
    let pocIdx = 0;
    for (let i = 1; i < nBuckets; i++) if (bucketVolume[i] > bucketVolume[pocIdx]) pocIdx = i;
    return priceMin + (pocIdx + 0.5) * bucketSize;
  }
  function newMetrics(fields = {}) {
    return Object.assign({
      symbol: '', label: '', price: null, sma200: null, low200: null, high200: null, poc200: null,
      finance_points: 0, edgar_name: '', edgar_ticker: '', cik: '', source_note: '', updated_at: '', error: '',
      rating: null, rating_source: '',
    }, fields);
  }
  function hasCoreValues(m) { return [m.price, m.sma200, m.low200, m.high200].every(isFiniteNum); }
  function distanceFromSma(m) {
    if (m.price === null || m.sma200 === null || m.sma200 === 0) return null;
    return m.price / m.sma200 - 1.0;
  }
  function distanceFromHigh200(m) {
    if (m.price === null || m.high200 === null || m.high200 === 0) return null;
    return m.price / m.high200 - 1.0;
  }
  function isBelowSmaAndPoc(m, threshold = D.SMA_DISTANCE_THRESHOLD) {
    if (!hasCoreValues(m) || m.poc200 === null) return false;
    const distance = distanceFromSma(m);
    if (distance === null || distance > -threshold + 1e-9) return false;
    return m.price < m.poc200;
  }
  async function computeMetrics(sp, edgarMap, chartData = null) {
    try {
      const data = chartData !== null ? chartData : await httpGetJson(financeUrl(sp.symbol));
      const result = data.chart.result[0];
      const quote = result.indicators.quote[0];
      const close = quote.close;
      const high = ('high' in quote) ? quote.high : close;
      const low = ('low' in quote) ? quote.low : close;
      const volume = (quote.volume && quote.volume.length) ? quote.volume : new Array(close.length).fill(null);
      const rows = [];
      const n = Math.min(close.length, high.length, low.length, volume.length);
      for (let i = 0; i < n; i++) {
        const c = close[i], h = high[i], l = low[i], v = volume[i];
        if (c === null || c === undefined) continue;
        rows.push([h !== null && h !== undefined ? Number(h) : Number(c), l !== null && l !== undefined ? Number(l) : Number(c),
          v !== null && v !== undefined ? Number(v) : 0.0, Number(c)]);
      }
      if (rows.length < 200) throw new Error(`Finance ha restituito solo ${rows.length} chiusure valide.`);
      const last = rows.slice(-200);
      const closes = last.map((r) => r[3]), highs = last.map((r) => r[0]), lows = last.map((r) => r[1]), volumes = last.map((r) => r[2]);
      const price = Number(result.meta.regularMarketPrice || closes[closes.length - 1]);
      let sum = 0; for (const c of closes) sum += c;
      const sma200 = sum / closes.length;
      const low200 = Math.min(...closes), high200 = Math.max(...closes);
      const poc200 = computePoc(highs, lows, volumes);
      const edgarKey = (sp.edgar_symbol || sp.symbol).toUpperCase();
      const [edgarName, cik] = edgarMap.get(edgarKey) || ['', ''];
      let sourceNote;
      if (sp.kind === 'commodity') sourceNote = `Finance: ${sp.symbol} | EDGAR: non applicabile (materia prima/cripto)`;
      else if (sp.kind === 'index') sourceNote = `Finance: ^GSPC | EDGAR proxy: SPY CIK ${cik}`;
      else sourceNote = cik ? `Finance: ${sp.symbol} | EDGAR: ${edgarKey} CIK ${cik}` : `Finance: ${sp.symbol} | EDGAR: non trovato`;
      return newMetrics({
        symbol: sp.symbol, label: sp.label, price, sma200, low200, high200, poc200, finance_points: closes.length,
        edgar_name: edgarName, edgar_ticker: sp.kind !== 'commodity' ? edgarKey : '',
        cik: sp.kind !== 'commodity' ? cik : '', source_note: sourceNote, updated_at: nowStamp(),
      });
    } catch (exc) {
      return newMetrics({ symbol: sp.symbol, label: sp.label, error: String(exc && exc.message || exc), updated_at: nowStamp() });
    }
  }
  async function loadEdgarTickerMap() {
    const data = await secFileJson(D.EDGAR_TICKERS_URL);
    const result = new Map();
    for (const item of Object.values(data)) {
      const ticker = String(item.ticker ?? '').toUpperCase();
      const title = String(item.title ?? '');
      const cik = String(item.cik_str ?? '').padStart(10, '0');
      if (ticker) result.set(ticker, [title, cik]);
    }
    const spy = await httpGetJson(D.EDGAR_SPY_URL);
    result.set('SPY', [spy.name || 'SPDR S&P 500 ETF TRUST', '0000884394']);
    result.set('^GSPC', [spy.name || 'SPDR S&P 500 ETF TRUST', '0000884394']);
    return result;
  }
  async function loadDashboard(assets, onProgress) {
    const edgarMap = await loadEdgarTickerMap();
    const main = await computeMetrics(mainAsset(), edgarMap);
    const bySymbol = new Map();
    let done = 0;
    await poolMap(assets, 24, (sp) => computeMetrics(sp, edgarMap), (metric) => {
      if (metric) bySymbol.set(metric.symbol, metric);
      done += 1;
      if (onProgress) onProgress(done, assets.length);
    });
    for (const sp of assets) if (!bySymbol.has(sp.symbol)) bySymbol.set(sp.symbol, newMetrics({ symbol: sp.symbol, label: sp.label, error: 'Non caricato' }));
    return [main, bySymbol];
  }
  Object.assign(T, {
    financeUrl, computePoc, newMetrics, hasCoreValues, distanceFromSma, distanceFromHigh200, isBelowSmaAndPoc,
    computeMetrics, loadEdgarTickerMap, loadDashboard,
  });

  /* ---------- fondamentali SEC EDGAR ---------- */
  const edgarFactsCache = new Map();
  function parseIsoDate(s) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(t);
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return t;
  }
  function periodSeries(facts, tags, limit = 4, instant = false, minDays = 80, maxDays = 100,
    forms = ['10-Q', '10-Q/A', '10-K', '10-K/A']) {
    const byEnd = new Map();
    for (const tag of tags) {
      let units;
      try { units = facts.facts['us-gaap'][tag].units.USD; } catch (_) { continue; }
      if (!Array.isArray(units)) continue;
      for (const item of units) {
        if (!forms.includes(item.form)) continue;
        const end = item.end, val = item.val;
        if (end === null || end === undefined || val === null || val === undefined) continue;
        if (!instant) {
          const start = item.start;
          if (!start) continue;
          const d0 = parseIsoDate(start), d1 = parseIsoDate(end);
          if (d0 === null || d1 === null) continue;
          const days = Math.round((d1 - d0) / 86400000);
          if (!(minDays <= days && days <= maxDays)) continue;
        }
        byEnd.set(end, Number(val));
      }
    }
    if (!byEnd.size) return [];
    return [...byEnd.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(-limit);
  }
  async function edgarFacts(cik) {
    const cik10 = cik.padStart(10, '0');
    let facts = edgarFactsCache.get(cik10);
    if (facts === undefined || facts === null) {
      try { facts = await httpGetJson(D.EDGAR_COMPANYFACTS_URL.replace('{cik10}', cik10), 60000); } catch (_) { return null; }
      edgarFactsCache.set(cik10, facts);
    }
    return facts;
  }
  const TAGS = () => D.EDGAR_FUNDAMENTAL_TAGS;
  const lookup = (series, key) => { for (const [k, v] of series) if (k === key) return v; return undefined; };
  async function fetchEdgarFundamentalsSummary(cik) {
    if (!cik) return null;
    const facts = await edgarFacts(cik);
    if (!facts) return null;
    const t = TAGS();
    const revenue = periodSeries(facts, t.revenue, 4);
    const netIncome = periodSeries(facts, t.net_income, 4);
    const equity = periodSeries(facts, t.equity, 1, true);
    const liabilities = periodSeries(facts, t.liabilities, 1, true);
    const ocf = periodSeries(facts, t.operating_cash_flow, 4);
    const capex = periodSeries(facts, t.capex, 4);
    const lines = [];
    const trims = (s) => s.map(([end, val]) => `trim. chiuso ${end}: ${fmtBillions(val)}`).join(', ');
    if (revenue.length) lines.push("Ricavi trimestrali piu' recenti (10-Q/10-K): " + trims(revenue));
    if (netIncome.length) lines.push("Utile netto trimestrale piu' recente (10-Q/10-K): " + trims(netIncome));
    if (equity.length) { const [end, val] = equity[equity.length - 1]; lines.push(`Patrimonio netto (ultimo trimestre disponibile, chiuso ${end}): ${fmtBillions(val)}`); }
    if (liabilities.length) { const [end, val] = liabilities[liabilities.length - 1]; lines.push(`Passivita' totali - debito incluso (ultimo trimestre disponibile, chiuso ${end}): ${fmtBillions(val)}`); }
    if (ocf.length) lines.push("Flusso di cassa operativo trimestrale piu' recente (10-Q/10-K): " + trims(ocf));
    if (capex.length) {
      lines.push("Spese in conto capitale - CapEx - trimestrali piu' recenti (10-Q/10-K): " + trims(capex));
      if (ocf.length) {
        const [lastEnd, lastOcf] = ocf[ocf.length - 1];
        const lastCapex = lookup(capex, lastEnd);
        if (lastCapex !== undefined) lines.push(`Flusso di cassa libero stimato (operativo - CapEx) nel trimestre chiuso ${lastEnd}: ${fmtBillions(lastOcf - lastCapex)}`);
      }
    }
    return lines.length ? lines.join('\n') : null;
  }
  async function fetchEdgarFundamentalsData(cik) {
    if (!cik) return null;
    const facts = await edgarFacts(cik);
    if (!facts) return null;
    const t = TAGS();
    const revenue = periodSeries(facts, t.revenue, 4);
    const netIncome = periodSeries(facts, t.net_income, 4);
    const equity = periodSeries(facts, t.equity, 1, true);
    const liabilities = periodSeries(facts, t.liabilities, 1, true);
    const ocf = periodSeries(facts, t.operating_cash_flow, 4);
    const capex = periodSeries(facts, t.capex, 4);
    if (!revenue.length && !netIncome.length && !equity.length) return null;
    return {
      revenue, net_income: netIncome,
      equity: equity.length ? equity[equity.length - 1][1] : null,
      liabilities: liabilities.length ? liabilities[liabilities.length - 1][1] : null,
      operating_cash_flow: ocf, capex,
    };
  }
  function normalize(value, bad, good) {
    if (good === bad) return 0.5;
    const t = (value - bad) / (good - bad);
    return Math.max(0.0, Math.min(1.0, t));
  }
  function computeLocalRating(data, sector) {
    if (data === null || (!data.revenue.length && !data.net_income.length && data.equity === null)) {
      return [null, 'Dati fondamentali SEC EDGAR non disponibili per questo asset.'];
    }
    const profile = D.SECTOR_PROFILES[sector] || D.DEFAULT_SECTOR_PROFILE;
    const dims = [], facts = [];
    let growth = null;
    if (data.revenue.length >= 2) {
      const firstVal = data.revenue[0][1], lastVal = data.revenue[data.revenue.length - 1][1];
      if (firstVal) growth = (lastVal - firstVal) / Math.abs(firstVal);
    }
    if (growth !== null) {
      dims.push(normalize(growth, profile.growth_bad, profile.growth_good));
      const n = data.revenue.length;
      if (growth >= profile.growth_good) facts.push(`ricavi in crescita (${fmtPct(growth)} su ${n} trimestri)`);
      else if (growth <= profile.growth_bad) facts.push(`ricavi in calo (${fmtPct(growth)} su ${n} trimestri)`);
      else facts.push(`ricavi stabili (${fmtPct(growth)} su ${n} trimestri)`);
    }
    let margin = null;
    if (data.net_income.length && data.revenue.length) {
      const [lastNiEnd, lastNi] = data.net_income[data.net_income.length - 1];
      const lastRev = lookup(data.revenue, lastNiEnd);
      if (lastRev) margin = lastNi / lastRev;
    }
    if (margin !== null) {
      dims.push(normalize(margin, profile.margin_bad, profile.margin_good));
      if (margin >= profile.margin_good) facts.push(`margine netto solido (${fmtPct(margin)})`);
      else if (margin <= profile.margin_bad) facts.push(`margine netto debole o in perdita (${fmtPct(margin)})`);
      else facts.push(`margine netto nella media (${fmtPct(margin)})`);
    }
    if (profile.leverage_good !== null && data.liabilities !== null && data.equity !== null) {
      if (data.equity <= 0) {
        dims.push(0.0);
        facts.push('patrimonio netto negativo o nullo');
      } else {
        const leverage = data.liabilities / data.equity;
        dims.push(normalize(leverage, profile.leverage_bad, profile.leverage_good));
        const lv = pyFixed(leverage, 1);
        if (leverage <= profile.leverage_good) facts.push(`indebitamento contenuto (${lv}x il patrimonio netto)`);
        else if (leverage >= profile.leverage_bad) facts.push(`indebitamento elevato (${lv}x il patrimonio netto)`);
        else facts.push(`indebitamento nella media (${lv}x il patrimonio netto)`);
      }
    }
    if (data.net_income.length >= 2) {
      const n = data.net_income.length;
      const positive = data.net_income.filter(([, v]) => v > 0).length;
      dims.push(positive / n);
      if (positive === n) facts.push(`utile positivo in tutti gli ultimi ${n} trimestri disponibili`);
      else if (positive <= Math.floor(n / 2)) facts.push(`utile in perdita in ${n - positive} degli ultimi ${n} trimestri`);
    }
    if (profile.fcf_margin_good !== null && data.operating_cash_flow.length && data.capex.length && data.revenue.length) {
      const [lastOcfEnd, lastOcf] = data.operating_cash_flow[data.operating_cash_flow.length - 1];
      const lastCapex = lookup(data.capex, lastOcfEnd);
      const lastRev = lookup(data.revenue, lastOcfEnd);
      if (lastCapex !== undefined && lastRev) {
        const fcfMargin = (lastOcf - lastCapex) / lastRev;
        dims.push(normalize(fcfMargin, profile.fcf_margin_bad, profile.fcf_margin_good));
        if (fcfMargin >= profile.fcf_margin_good) facts.push(`flusso di cassa libero solido (${fmtPct(fcfMargin)} sui ricavi)`);
        else if (fcfMargin <= profile.fcf_margin_bad) facts.push(`flusso di cassa libero negativo o debole (${fmtPct(fcfMargin)} sui ricavi)`);
        else facts.push(`flusso di cassa libero nella media (${fmtPct(fcfMargin)} sui ricavi)`);
      }
    }
    if (!dims.length) return [null, 'Dati fondamentali SEC EDGAR insufficienti per calcolare un punteggio.'];
    let sum = 0; for (const d of dims) sum += d;
    const avg = sum / dims.length;
    const rating = Math.max(1, Math.min(10, pyRound(1 + avg * 9)));
    let verdict;
    if (rating >= 7) verdict = "fondamentali solidi: il ribasso attuale sembra piu' un'opportunita' che un campanello d'allarme";
    else if (rating <= 3) verdict = 'fondamentali deboli: il ribasso attuale sembra giustificato, prudenza';
    else verdict = 'segnali fondamentali misti: serve valutare caso per caso';
    const sectorTxt = sector ? ` (settore: ${sector})` : '';
    return [rating, `Valutazione rapida locale${sectorTxt}, senza IA - voto ${rating}/10: ` + facts.join('; ') + `. ${verdict}.`];
  }
  Object.assign(T, { periodSeries, edgarFactsCache, fetchEdgarFundamentalsSummary, fetchEdgarFundamentalsData, computeLocalRating });

  /* ---------- Gemini ---------- */
  class GeminiAuthError extends Error { }
  class GeminiQuotaError extends Error { }
  class GeminiUnavailableError extends Error { }
  function fillTemplate(template, values) {
    return template.replace(/@@([A-Z]+)@@/g, (all, key) => (key in values ? values[key] : all));
  }
  function buildExplanationPrompt(metric, edgarSummary = null) {
    const values = {
      LABEL: metric.label, SYMBOL: metric.symbol, PRICE: fmtNumber(metric.price), SMA: fmtNumber(metric.sma200),
      LOW: fmtNumber(metric.low200), HIGH: fmtNumber(metric.high200),
      POC: metric.poc200 !== null ? fmtNumber(metric.poc200) : 'non disponibile', EDGAR: edgarSummary || '',
    };
    return fillTemplate(edgarSummary ? D.PROMPT_EXPLANATION_EDGAR : D.PROMPT_EXPLANATION, values);
  }
  async function geminiGenerate(prompt, apiKey, generationConfig = null, model = D.GEMINI_MODEL) {
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    if (generationConfig) payload.generationConfig = generationConfig;
    const apiUrl = model === D.GEMINI_MODEL ? D.GEMINI_API_URL : D.GEMINI_API_URL.replace(D.GEMINI_MODEL, model);
    const res = await timedFetch(`${apiUrl}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }, 30000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const serverMessage = (data && data.error && data.error.message) || '';
      if (res.status === 429) throw new GeminiQuotaError('Quota/limite di richieste Gemini esaurito per ora.' + (serverMessage ? ` (${serverMessage})` : ''));
      if ([400, 401, 403].includes(res.status)) throw new GeminiAuthError('API key di Gemini non valida o mancante');
      const Cls = res.status >= 500 ? GeminiUnavailableError : Error;
      throw new Cls(`Gemini ha risposto con errore HTTP ${res.status}` + (serverMessage ? `: ${serverMessage}` : ''));
    }
    const candidates = data.candidates || [];
    if (!candidates.length) throw new Error('Gemini non ha restituito alcuna spiegazione');
    const parts = (candidates[0].content || {}).parts || [];
    if (!parts.length || !parts[0].text) throw new Error('Risposta di Gemini vuota');
    return parts[0].text.trim();
  }
  async function askGemini(metric, apiKey, edgarSummary = null) {
    return geminiGenerate(buildExplanationPrompt(metric, edgarSummary), apiKey);
  }
  Object.assign(T, { GeminiAuthError, GeminiQuotaError, GeminiUnavailableError, buildExplanationPrompt, geminiGenerate, askGemini });

  /* ---------- motore di ricerca (SEC EDGAR + Yahoo Finance + Gemini) ---------- */
  let edgarIndexCache = null;
  let edgarIndexPromise = null;
  async function loadEdgarCompanyIndex() {
    if (edgarIndexCache) return edgarIndexCache;
    if (!edgarIndexPromise) {
      edgarIndexPromise = (async () => {
        let companies = [];
        try {
          const data = await secFileJson(D.EDGAR_TICKERS_EXCHANGE_URL);
          const fields = (data.fields || []).map((f) => String(f).toLowerCase());
          const iCik = fields.indexOf('cik'), iName = fields.indexOf('name'), iTicker = fields.indexOf('ticker');
          if (iCik < 0 || iName < 0 || iTicker < 0) throw new Error('campi mancanti');
          const iEx = fields.indexOf('exchange');
          for (const row of data.data || []) {
            const ticker = String(row[iTicker] || '').toUpperCase();
            if (ticker) companies.push({ ticker, name: String(row[iName] || ''), cik: String(row[iCik] || '').padStart(10, '0'), exchange: iEx >= 0 ? String(row[iEx] || '') : '' });
          }
        } catch (_) { companies = []; }
        if (!companies.length) {
          const data = await secFileJson(D.EDGAR_TICKERS_URL);
          for (const item of Object.values(data)) {
            const ticker = String(item.ticker ?? '').toUpperCase();
            if (ticker) companies.push({ ticker, name: String(item.title ?? ''), cik: String(item.cik_str ?? '').padStart(10, '0'), exchange: '' });
          }
        }
        edgarIndexCache = companies;
        return companies;
      })();
      edgarIndexPromise.catch(() => { edgarIndexPromise = null; });
    }
    return edgarIndexPromise;
  }
  function normText(text) {
    let out = '';
    for (const ch of String(text)) out += /[\p{L}\p{N}]/u.test(ch) ? ch.toLowerCase() : ' ';
    return out.split(/\s+/).filter(Boolean).join(' ');
  }
  const stripTicker = (s) => s.replaceAll('-', '').replaceAll('.', '');
  function nameMatchScore(queryNorm, words, ticker, name) {
    const qTicker = queryNorm.replaceAll(' ', '').toUpperCase();
    if (stripTicker(ticker) === stripTicker(qTicker)) return 100;
    const nameNorm = normText(name);
    if (nameNorm === queryNorm) return 95;
    if (nameNorm.startsWith(queryNorm + ' ') || nameNorm.startsWith(queryNorm)) return 80 - Math.min(Math.floor(nameNorm.length / 8), 10);
    const nameWords = nameNorm.split(' ').filter(Boolean);
    if (words.length && words.every((w) => nameWords.some((nw) => nw.startsWith(w)))) return 60 - Math.min(Math.floor(nameNorm.length / 8), 10);
    if (qTicker.length >= 2 && ticker.startsWith(qTicker)) return 40;
    return 0;
  }
  function searchEdgar(query, index, limit = D.SEARCH_MAX_RESULTS) {
    const queryNorm = normText(query);
    if (!queryNorm) return [];
    const words = queryNorm.split(' ');
    const scored = [];
    index.forEach((c, pos) => { const s = nameMatchScore(queryNorm, words, c.ticker, c.name); if (s) scored.push([s, pos, c]); });
    scored.sort((a, b) => (b[0] - a[0]) || (a[1] - b[1]));
    const result = [], seenCik = new Set();
    for (const [, , c] of scored) {
      if (seenCik.has(c.cik)) continue;
      seenCik.add(c.cik);
      result.push(c);
      if (result.length >= limit) break;
    }
    return result;
  }
  function buildSearchPrompt(query, yahooContext = null) {
    if (yahooContext && yahooContext.length) {
      return fillTemplate(D.PROMPT_SEARCH_CTX, { QUERY: query }).replace('- @@CTX@@', yahooContext.map((l) => `- ${l}`).join('\n'));
    }
    return fillTemplate(D.PROMPT_SEARCH, { QUERY: query });
  }
  function parseJsonArray(text) {
    text = text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^`+|`+$/g, '');
      if (text.toLowerCase().startsWith('json')) text = text.slice(4);
    }
    const start = text.indexOf('['), end = text.lastIndexOf(']');
    if (start < 0 || end < start) return [];
    try { const data = JSON.parse(text.slice(start, end + 1)); return Array.isArray(data) ? data : []; } catch (_) { return []; }
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function geminiFindInstruments(query, apiKey, yahooContext = null) {
    let raw = '';
    const models = D.GEMINI_SEARCH_MODELS;
    const cfg = { temperature: 0.1, responseMimeType: 'application/json' };
    for (let attempt = 0; attempt < models.length; attempt++) {
      const model = models[attempt];
      try {
        raw = await geminiGenerate(buildSearchPrompt(query, yahooContext), apiKey, cfg, model);
        break;
      } catch (exc) {
        if (exc instanceof GeminiUnavailableError) {
          if (attempt === models.length - 1) throw exc;
          await sleep(1500 * (attempt + 1));
        } else if (exc instanceof GeminiQuotaError) {
          if (model === models[models.length - 1]) throw exc;
          try {
            raw = await geminiGenerate(buildSearchPrompt(query, yahooContext), apiKey, cfg, models[models.length - 1]);
          } catch (e2) {
            if (e2 instanceof GeminiUnavailableError) throw new GeminiQuotaError(e2.message);
            throw e2;
          }
          break;
        } else {
          throw exc;
        }
      }
    }
    const items = [], seen = new Set();
    for (const item of parseJsonArray(raw)) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const symbol = String(item.symbol ?? '').trim().toUpperCase();
      if (!symbol || seen.has(symbol) || symbol.length > 24 || symbol.includes(' ')) continue;
      seen.add(symbol);
      items.push({
        symbol, nome: String(item.nome || symbol).trim(),
        sec_ticker: String(item.sec_ticker || '').trim().toUpperCase().replaceAll('.', '-'),
      });
      if (items.length >= D.GEMINI_SEARCH_MAX) break;
    }
    return items;
  }
  async function yahooResolveSymbol(sp) {
    let data;
    try { data = await httpGetJson(D.YAHOO_SEARCH_URL.replace('{q}', encodeURIComponent(sp.label))); } catch (_) { return null; }
    let symbols = (data.quotes || []).filter((q) => q.symbol).map((q) => String(q.symbol).toUpperCase());
    symbols = symbols.filter((s) => s !== sp.symbol);
    if (!symbols.length) return null;
    const suffix = sp.symbol.includes('.') ? sp.symbol.slice(sp.symbol.lastIndexOf('.')) : '';
    if (suffix) {
      const same = symbols.filter((s) => s.endsWith(suffix));
      if (same.length) return same[0];
    }
    return symbols[0];
  }
  // Nasdaq.com: fonte di riserva dei prezzi, solo per il motore di ricerca.
  function nasdaqNumber(text) {
    const cleaned = String(text ?? '').replaceAll('$', '').replaceAll(',', '').trim();
    if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(cleaned)) return null;
    return parseFloat(cleaned);
  }
  async function nasdaqChartData(symbol) {
    let candidates;
    if (symbol in D.NASDAQ_INDEX_SYMBOLS) candidates = [[D.NASDAQ_INDEX_SYMBOLS[symbol], 'index']];
    else if (symbol && [...symbol].every((ch) => /\p{L}/u.test(ch) || ch === '-')) {
      const ns = symbol.replaceAll('-', '.');
      candidates = [[ns, 'stocks'], [ns, 'etf']];
    } else return null;
    const startDate = new Date(Date.now() - 420 * 86400000);
    const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    for (const [ns, asset] of candidates) {
      let data;
      try {
        data = await httpGetJson(D.NASDAQ_HISTORY_URL.replace('{symbol}', encodeURIComponent(ns)).replace('{asset}', asset).replace('{start}', start));
      } catch (_) { continue; }
      const rows = (((data || {}).data || {}).tradesTable || {}).rows || [];
      const closes = [], highs = [], lows = [], volumes = [];
      for (const row of [...rows].reverse()) {
        const close = nasdaqNumber(row.close);
        if (close === null) continue;
        closes.push(close); highs.push(nasdaqNumber(row.high)); lows.push(nasdaqNumber(row.low)); volumes.push(nasdaqNumber(row.volume));
      }
      if (closes.length) {
        return { chart: { result: [{ meta: { regularMarketPrice: closes[closes.length - 1] }, indicators: { quote: [{ close: closes, high: highs, low: lows, volume: volumes }] } }] } };
      }
    }
    return null;
  }
  async function computeMetricsNasdaq(sp, edgarMap) {
    const data = await nasdaqChartData(sp.symbol);
    if (data === null) return null;
    const metric = await computeMetrics(sp, edgarMap, data);
    metric.source_note = metric.source_note.replace('Finance:', 'Nasdaq.com (riserva):');
    return metric;
  }
  const stopwords = () => new Set(D.QUERY_STOPWORDS);
  function yahooQueryVariants(query) {
    const words = normText(query).split(' ').filter(Boolean);
    const sw = stopwords();
    let core = words.filter((w) => !sw.has(w));
    if (!core.length) core = words;
    const merged = [];
    for (const w of core) {
      if ([...w].length === 1 && merged.length) merged[merged.length - 1] += w;
      else merged.push(w);
    }
    const variants = [query.trim(), core.join(' '), merged.join(' '), core.slice(0, 2).join(''), merged.length ? merged[0] : ''];
    const result = [];
    for (const v of variants) if (v && !result.some((r) => r.toLowerCase() === v.toLowerCase())) result.push(v);
    return result;
  }
  async function searchYahooSingle(query, limit = D.YAHOO_SEARCH_MAX) {
    const data = await httpGetJson(D.YAHOO_SEARCH_URL.replace('{q}', encodeURIComponent(query)));
    const result = [], seen = new Set();
    for (const quote of data.quotes || []) {
      const symbol = String(quote.symbol || '').toUpperCase();
      const quoteType = String(quote.quoteType || '').toUpperCase();
      if (!symbol || seen.has(symbol) || !(quoteType in D.YAHOO_QUOTE_TYPES)) continue;
      seen.add(symbol);
      const [typeLabel, kind] = D.YAHOO_QUOTE_TYPES[quoteType];
      const name = String(quote.longname || quote.shortname || symbol).trim();
      const sector = D.YAHOO_SECTOR_TO_ITALIAN[String(quote.sector || '')] || '';
      const exchange = String(quote.exchDisp || quote.exchange || '').trim();
      const note = [typeLabel, exchange].filter(Boolean).join(' · ');
      result.push([spec(symbol, name, '', kind), sector, note]);
      if (result.length >= limit) break;
    }
    return result;
  }
  async function searchYahoo(query, limit = D.YAHOO_SEARCH_MAX) {
    for (const variant of yahooQueryVariants(query)) {
      const found = await searchYahooSingle(variant, limit);
      if (found.length) return found;
    }
    return [];
  }
  function namesMatch(nameA, nameB) {
    const generic = new Set(D.NAME_GENERIC_WORDS);
    const wa = new Set(normText(nameA).split(' ').filter((w) => w && !generic.has(w) && [...w].length >= 3));
    const wb = new Set(normText(nameB).split(' ').filter((w) => w && !generic.has(w) && [...w].length >= 3));
    if (!wa.size || !wb.size) return true;
    for (const a of wa) if (wb.has(a)) return true;
    for (const a of wa) for (const b of wb) if ([...a].length >= 4 && [...b].length >= 4 && (b.includes(a) || a.includes(b))) return true;
    return false;
  }
  async function yahooOfficialInfo(symbol) {
    try {
      for (const [sp, sector, note] of await searchYahooSingle(symbol, 8)) if (sp.symbol === symbol) return [sp, sector, note];
    } catch (_) { }
    return null;
  }
  const knownSource = (sector) => (sector === D.COMMODITY_SECTOR[0] ? 'Dashboard' : 'S&P 500');
  const hit = (sp, source, sector = '', note = '') => ({ spec: sp, source, sector, note });
  async function searchThermometers(query, apiKey, known) {
    const notes = [];
    const queryNorm = normText(query);
    const words = queryNorm.split(' ').filter(Boolean);

    const localScored = [];
    for (const [symbol, [sp, sector]] of known) {
      const score = nameMatchScore(queryNorm, words, symbol, sp.label);
      if (score) localScored.push([score, hit(sp, knownSource(sector), sector)]);
    }
    localScored.sort((a, b) => b[0] - a[0]);

    const edgarHits = [];
    let edgarByTicker = new Map();
    try {
      const index = await loadEdgarCompanyIndex();
      edgarByTicker = new Map(index.map((c) => [c.ticker, c]));
      for (const c of searchEdgar(query, index)) {
        const score = nameMatchScore(queryNorm, words, c.ticker, c.name);
        const note = `SEC CIK ${c.cik.replace(/^0+/, '')}` + (c.exchange ? ` · ${c.exchange}` : '');
        edgarHits.push([score, hit(spec(c.ticker, c.name), 'SEC EDGAR', '', note)]);
      }
    } catch (exc) {
      notes.push(`SEC EDGAR non raggiungibile (${exc.message}).`);
    }

    const yahooHits = [], yahooContext = [], yahooInfo = new Map();
    try {
      for (const [sp, sector, note] of await searchYahoo(query)) {
        yahooInfo.set(sp.symbol, [sp, sector, note]);
        let h;
        if (known.has(sp.symbol)) {
          const [ks, ksec] = known.get(sp.symbol);
          h = hit(ks, knownSource(ksec), ksec);
        } else h = hit(sp, 'Yahoo Finance', sector, note);
        let score = Math.min(nameMatchScore(queryNorm, words, sp.symbol, sp.label), 94) || 1;
        if (stripTicker(sp.symbol) === queryNorm.replaceAll(' ', '').toUpperCase()) score = 100;
        yahooHits.push([score, h]);
        yahooContext.push(`${sp.symbol} | ${sp.label} | ${note}`);
      }
      yahooHits.sort((a, b) => b[0] - a[0]);
    } catch (exc) {
      notes.push(`Ricerca Yahoo Finance non raggiungibile (${exc.message}).`);
    }

    const geminiHits = [];
    if (!apiKey) {
      notes.push('Gemini non configurato: risultati solo da SEC EDGAR, Yahoo Finance e S&P 500.');
    } else {
      try {
        for (const item of await geminiFindInstruments(query, apiKey, yahooContext)) {
          const symbol = item.symbol;
          if (known.has(symbol)) {
            const [sp, sector] = known.get(symbol);
            geminiHits.push(hit(sp, knownSource(sector), sector));
            continue;
          }
          let secTicker = edgarByTicker.has(item.sec_ticker) ? item.sec_ticker : '';
          if (!secTicker && edgarByTicker.has(symbol)) secTicker = symbol;
          const edgarSymbol = secTicker !== symbol ? secTicker : '';
          if (yahooInfo.has(symbol)) {
            const [ys, ysec, ynote] = yahooInfo.get(symbol);
            geminiHits.push(hit(spec(symbol, ys.label, edgarSymbol, ys.kind), 'Gemini', ysec, ynote));
          } else {
            geminiHits.push(hit(spec(symbol, item.nome, edgarSymbol), 'Gemini'));
          }
        }
      } catch (exc) {
        if (exc instanceof GeminiAuthError) notes.push('API key di Gemini non valida: risultati solo da SEC EDGAR, Yahoo Finance e S&P 500.');
        else if (exc instanceof GeminiQuotaError) notes.push('Quota Gemini esaurita per ora: risultati solo da SEC EDGAR, Yahoo Finance e S&P 500.');
        else notes.push(`Gemini non disponibile (${exc.message}).`);
      }
    }

    const exact = [...localScored.filter(([s]) => s >= 95), ...edgarHits.filter(([s]) => s >= 95), ...yahooHits.filter(([s]) => s >= 95)].map(([, h]) => h);
    const rest = [...localScored.filter(([s]) => s < 95), ...edgarHits.filter(([s]) => s < 95)].map(([, h]) => h);
    const ordered = [...exact, ...geminiHits, ...yahooHits.filter(([s]) => s < 95).map(([, h]) => h), ...rest];
    const result = [], seen = new Set();
    for (const h of ordered) {
      if (seen.has(h.spec.symbol)) continue;
      seen.add(h.spec.symbol);
      result.push(h);
      if (result.length >= D.SEARCH_MAX_RESULTS) break;
    }
    return [result, notes];
  }
  // Risoluzione di un risultato di ricerca in termometro (resolve() del desktop).
  async function resolveSearchHit(h, existing, edgarMap) {
    const reused = existing.get(h.spec.symbol);
    if ((h.source === 'S&P 500' || h.source === 'Dashboard') && reused && hasCoreValues(reused)) return reused;
    if (h.source === 'Gemini' && !h.note) {
      let official = await yahooOfficialInfo(h.spec.symbol);
      const wrongTicker = official !== null && !namesMatch(h.spec.label, official[0].label);
      if (official === null || wrongTicker) {
        const alt = await yahooResolveSymbol(h.spec);
        official = alt ? await yahooOfficialInfo(alt) : null;
        if (official !== null && !namesMatch(h.spec.label, official[0].label)) official = null;
        if (official === null) {
          if (wrongTicker) return null;
          if (alt) h.spec = spec(alt, h.spec.label, h.spec.edgar_symbol);
        }
      }
      if (official !== null) {
        const [os, osec, onote] = official;
        h.sector = osec; h.note = onote;
        h.spec = spec(os.symbol, os.label, h.spec.edgar_symbol, os.kind);
      }
    }
    let metric = await computeMetrics(h.spec, edgarMap);
    if (!hasCoreValues(metric)) {
      const backup = await computeMetricsNasdaq(h.spec, edgarMap);
      if (backup !== null && (hasCoreValues(backup) || metric.error.includes('404'))) metric = backup;
    }
    if (h.source === 'Gemini' && metric.error.includes('404')) return null;
    if (metric.cik && hasCoreValues(metric)) {
      const [rating] = computeLocalRating(await fetchEdgarFundamentalsData(metric.cik), h.sector);
      if (rating !== null) { metric.rating = rating; metric.rating_source = 'locale'; }
    }
    return metric;
  }
  function friendlyError(error) {
    const found = error.split(/\s+/).filter((t) => /^\d+$/.test(t)).map(Number);
    if (error.includes('chiusure valide') && found.length) {
      const sessions = found[0] === 1 ? `${found[0]} seduta` : `${found[0]} sedute`;
      return `Quotato da ${sessions}:\nne servono 200 per SMA200,\nminimo e massimo a 200`;
    }
    if (error.includes('404')) return 'Simbolo non trovato\nnelle fonti di prezzo';
    return error.length <= 80 ? error : error.slice(0, 79) + '…';
  }
  Object.assign(T, {
    loadEdgarCompanyIndex, normText, nameMatchScore, searchEdgar, buildSearchPrompt, parseJsonArray,
    geminiFindInstruments, yahooResolveSymbol, nasdaqChartData, computeMetricsNasdaq, yahooQueryVariants,
    searchYahooSingle, searchYahoo, namesMatch, yahooOfficialInfo, searchThermometers, resolveSearchHit, friendlyError,
  });
})(T);

if (typeof module !== 'undefined') module.exports = T;

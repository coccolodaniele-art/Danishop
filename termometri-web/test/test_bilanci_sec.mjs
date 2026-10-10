// Verifica che i bilanci SEC ridotti diano risultati identici ai bilanci interi.
//
//   node termometri-web/test/test_bilanci_sec.mjs [numero di societa'] [versione di riferimento]
//
// Riferimento: logica.js com'era prima della riduzione (git, commit indicato o HEAD), che
// scarica il bilancio intero. Nuova versione: logica.js attuale che passa dal vero codice
// dell'intermediario (cloudflare/sintesi-proxy-deno.ts, eseguito qui con un finto Deno.serve),
// con gzip e &tags=. Confronta riepilogo, dati e voto locale per ogni societa', poi controlla
// la versione nuova con un intermediario vecchio (bilancio intero) e la copia salvata nel browser.
// I bilanci scaricati dalla SEC restano in una cartella temporanea per le esecuzioni successive.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const REPO = path.resolve(WEB, '..');
const N = Number(process.argv[2] || 60);
const REF = process.argv[3] || 'HEAD';
const UA = 'Danishop coccolo.daniele@yahoo.it';
const CACHE = path.join(os.tmpdir(), 'termometri-sec-cache');
fs.mkdirSync(CACHE, { recursive: true });

// fetch verso la SEC con copia su disco (la SEC chiede al massimo 10 richieste al secondo)
const realFetch = globalThis.fetch;
let lastSec = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const file = path.join(CACHE, u.replace(/[^\w.-]+/g, '_'));
  if (fs.existsSync(file)) return new Response(fs.readFileSync(file), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const wait = lastSec + 150 - Date.now();
  lastSec = Date.now() + Math.max(0, wait);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const res = await realFetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const buf = Buffer.from(await res.arrayBuffer());
  if (res.ok) fs.writeFileSync(file, buf);
  return new Response(buf, { status: res.status, headers: { 'Content-Type': res.headers.get('Content-Type') || '' } });
};

// intermediario vero, con un finto Deno.serve
let handler = null;
globalThis.Deno = { serve: (h) => { handler = h; } };
await import(pathToFileURL(path.join(REPO, 'cloudflare', 'sintesi-proxy-deno.ts')).href);

function loadLogic(source) {
  const file = path.join(os.tmpdir(), `logica-${Math.random().toString(36).slice(2)}.cjs`);
  fs.writeFileSync(file, source);
  const T = require(file);
  fs.unlinkSync(file);
  return T;
}
const D = JSON.parse(fs.readFileSync(path.join(WEB, 'dati_programma.json'), 'utf8'));
const target = (address) => new URL(address).searchParams.get('url');
const stats = { full: 0, sent: 0, calls: 0 };
const asked = [];

const oldSource = execFileSync('git', ['show', `${REF}:termometri-web/logica.js`], { cwd: REPO, encoding: 'utf8' });
const Told = loadLogic(oldSource);
Told.init(D, { proxy: 'https://vecchio', fetch: async (address) => {
  const res = await fetch(target(address));
  const buf = Buffer.from(await res.arrayBuffer());
  stats.full += buf.length;
  return new Response(buf, { status: res.status });
} });

const viaProxy = async (address) => {
  stats.calls += 1;
  asked.push(target(address));
  const res = await handler(new Request(address.replace(/^https:\/\/nuovo/, 'https://proxy.test'), {
    headers: { Origin: 'https://coccolodigital.com', 'Accept-Encoding': 'gzip, deflate, br' },
  }));
  const buf = Buffer.from(await res.arrayBuffer());
  stats.sent += buf.length;
  let body = buf;
  if (res.headers.get('Content-Encoding') === 'gzip') {
    body = Buffer.from(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  return new Response(body, { status: res.status });
};
const memoryStore = () => { const m = new Map(); return { m, get: async (k) => m.get(k), set: async (k, v) => { m.set(k, structuredClone(v)); } }; };
const store = memoryStore();
const newSource = fs.readFileSync(path.join(WEB, 'logica.js'), 'utf8');
const Tnew = loadLogic(newSource);
Tnew.init(D, { proxy: 'https://nuovo', fetch: viaProxy, factsStore: store });

// nuova pagina con l'intermediario ancora vecchio (risponde col bilancio intero)
const Tmix = loadLogic(newSource);
Tmix.init(D, { proxy: 'https://vecchio', fetch: async (address) => fetch(target(address)) });

// societa' da provare: elenco di riserva del programma, poi il resto di company_tickers
const tickers = await (await fetch(D.EDGAR_TICKERS_URL)).json();
const cikOf = new Map(Object.values(tickers).map((x) => [String(x.ticker).toUpperCase(), String(x.cik_str)]));
const sectorOf = new Map();
const wanted = [];
for (const [sector, specs] of D.FALLBACK_SECTORS) for (const [symbol, , edgar] of specs) {
  const cik = cikOf.get((edgar || symbol).toUpperCase().replace('.', '-')) || cikOf.get((edgar || symbol).toUpperCase());
  if (cik && !wanted.includes(cik)) { wanted.push(cik); sectorOf.set(cik, sector); }
}
for (const x of Object.values(tickers)) { const cik = String(x.cik_str); if (!wanted.includes(cik)) wanted.push(cik); }
const ciks = wanted.slice(0, N);
console.log(`Societa' da confrontare: ${ciks.length} (riferimento ${REF})`);

const results = async (T, cik) => {
  const summary = await T.fetchEdgarFundamentalsSummary(cik);
  const data = await T.fetchEdgarFundamentalsData(cik);
  const rating = data ? T.computeLocalRating(data, sectorOf.get(cik) || '') : null;
  return JSON.stringify({ summary, data, rating });
};

let same = 0, withData = 0;
const differences = [];
for (const cik of ciks) {
  const ref = await results(Told, cik);
  const now = await results(Tnew, cik);
  const mix = await results(Tmix, cik);
  if (JSON.parse(ref).data) withData += 1;
  if (ref === now && ref === mix) same += 1;
  else differences.push(cik);
  Told.edgarFactsCache.clear();  // il bilancio intero in memoria pesa decine di MB
}

const sentMain = stats.sent;

// copia salvata nel browser: una pagina nuova non scarica piu' niente e da' gli stessi risultati
const callsBefore = stats.calls;
const askedBefore = asked.length;
const Tagain = loadLogic(newSource);
Tagain.init(D, { proxy: 'https://nuovo', fetch: viaProxy, factsStore: store });
let sameFromStore = 0;
for (const cik of ciks) if (await results(Tagain, cik) === await results(Tnew, cik)) sameFromStore += 1;
const storeCalls = stats.calls - callsBefore;
// si richiedono solo i bilanci che non c'erano (la SEC non li ha: come prima, si riprova)
const storedCiks = new Set([...store.m.keys()].map((k) => k.split('|')[0]));
const wrongCalls = asked.slice(askedBefore).filter((u) => storedCiks.has(/CIK(\d{10})/.exec(u)[1])).length;
// copia scaduta: si riscarica
for (const v of store.m.values()) v.t -= Tnew.FACTS_MAX_AGE;
const Texpired = loadLogic(newSource);
Texpired.init(D, { proxy: 'https://nuovo', fetch: viaProxy, factsStore: store });
await Texpired.fetchEdgarFundamentalsData(ciks[0]);
const expiredCalls = stats.calls - callsBefore - storeCalls;
const storedBytes = [...store.m.values()].reduce((s, v) => s + JSON.stringify(v).length, 0);

const mb = (b) => (b / 1048576).toFixed(1) + ' MB';
console.log(`Risultati identici: ${same}/${ciks.length} (con dati SEC: ${withData})`);
if (differences.length) console.log('DIVERSI:', differences.join(', '));
console.log(`Dalla copia nel browser: ${sameFromStore}/${ciks.length} identici, ${storeCalls} richieste, tutte per i ${ciks.length - store.m.size} bilanci che la SEC non ha (salvate per errore: ${wrongCalls})`);
console.log(`Copia scaduta: ${expiredCalls} richiesta (attesa 1)`);
console.log(`Scaricato prima: ${mb(stats.full)}  ora: ${mb(sentMain)} (con gzip)  = ${(stats.full / sentMain).toFixed(0)} volte meno`);
console.log(`Spazio nel browser per ${store.m.size} societa': ${mb(storedBytes)}`);
const ok = same === ciks.length && sameFromStore === ciks.length && wrongCalls === 0 && expiredCalls === 1;
console.log(ok ? 'OK' : 'ERRORE');
process.exit(ok ? 0 : 1);

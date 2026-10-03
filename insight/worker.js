// Statistiche del sito (Cloudflare Worker + database D1).
//
// Il sito online manda qui, in forma anonima, le pagine viste, il tempo passato
// in ogni scheda e i click importanti (articoli aperti, programmi, giochi, ordini...).
// Il Gestore sul PC legge i riepiloghi con una chiave segreta (ADMIN_KEY).
//
// Privacy: niente cookie e niente indirizzi IP salvati. Ogni visitatore diventa un
// codice anonimo calcolato con un "sale" casuale che cambia ogni giorno e viene
// cancellato dopo due giorni: lo stesso visitatore non è riconoscibile da un giorno all'altro.
//
// Indirizzi:
//   POST /e                 riceve gli eventi dal sito (pubblico)
//   GET  /stats?days=30     riepilogo per l'area Insight (serve la chiave)
//   GET  /export?days=30    tutti gli eventi in CSV (serve la chiave)

const ALLOWED_ORIGINS = ["https://coccolodaniele-art.github.io"];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const SECTIONS = ["home", "programmi", "trading", "giochi", "info"];
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|java\/|monitor|uptime/i;
const KEEP_DAYS = 400;
const TZ = "Europe/Rome";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin);
    const cors = allowed ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {};

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } });
    }
    try {
      if (url.pathname === "/e" && request.method === "POST") {
        if (allowed) await collect(request, env);
        return new Response(null, { status: 204, headers: cors });
      }
      if (url.pathname === "/stats" || url.pathname === "/export") {
        if (!authorized(request, env)) return json({ ok: false, error: "Chiave non valida" }, 401);
        const days = Math.min(Math.max(parseInt(url.searchParams.get("days"), 10) || 30, 1), 366);
        return url.pathname === "/stats" ? json(await stats(env, days)) : exportCsv(env, days);
      }
      return new Response("Statistiche del sito: niente da vedere qui.", { status: 404 });
    } catch (err) {
      return json({ ok: false, error: String(err && err.message || err) }, 500, cors);
    }
  },
};

/* ---------------- Raccolta ---------------- */

async function collect(request, env) {
  const ua = request.headers.get("User-Agent") || "";
  if (!ua || BOTS.test(ua)) return;
  const text = await request.text();
  if (text.length > 20000) return;
  let body;
  try { body = JSON.parse(text); } catch (_) { return; }
  if (!body || !Array.isArray(body.events) || !body.events.length) return;

  const now = Date.now();
  const { day, hour } = romeTime(now);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const vid = (await sha256((await dailySalt(env, day)) + ip + ua)).slice(0, 16);
  const sid = str(body.sid, 24);
  if (!sid) return;
  const ctx = {
    ref: refHost(body.ref, request), utm: str(body.utm, 60).toLowerCase(),
    country: (request.cf && request.cf.country) || "", ...parseUa(ua),
    lang: str(body.lang, 10).toLowerCase().split("-")[0], screen: Math.round(Number(body.screen) || 0) || null,
  };

  const insert = env.DB.prepare(
    `INSERT INTO events (ts, day, hour, type, section, name, label, value, scroll, sid, vid, entry, ref, utm, country, device, browser, os, lang, screen)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)`);
  const rows = [];
  for (const e of body.events.slice(0, 25)) {
    const type = e && e.t;
    if (!["view", "time", "click"].includes(type)) continue;
    const section = SECTIONS.includes(e.s) ? e.s : "";
    if (type !== "click" && !section) continue;
    const name = type === "click" && /^[a-z][a-z-]{0,29}$/.test(e.n) ? e.n : "";
    if (type === "click" && !name) continue;
    let value = Number(e.v);
    value = isFinite(value) ? (type === "time" ? Math.min(Math.max(value, 0), 1800) : value) : null;
    if (type === "time" && !value) continue;
    const scroll = type === "time" && isFinite(Number(e.sc)) ? Math.min(Math.max(Math.round(e.sc), 0), 100) : null;
    const entry = type === "view" && e.e ? 1 : 0;
    rows.push(insert.bind(now, day, hour, type, section, name, str(e.l, 120), value, scroll, sid, vid, entry,
      entry ? ctx.ref : "", entry ? ctx.utm : "", ctx.country, ctx.device, ctx.browser, ctx.os, ctx.lang, ctx.screen));
  }
  if (rows.length) await env.DB.batch(rows);
}

async function dailySalt(env, day) {
  const found = await env.DB.prepare("SELECT salt FROM salts WHERE day = ?1").bind(day).first("salt");
  if (found) return found;
  const fresh = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO salts (day, salt) VALUES (?1, ?2)").bind(day, fresh),
    env.DB.prepare("DELETE FROM salts WHERE day < ?1").bind(addDays(day, -1)),
  ]);
  return env.DB.prepare("SELECT salt FROM salts WHERE day = ?1").bind(day).first("salt");
}

function refHost(ref, request) {
  try {
    const host = new URL(String(ref || "")).hostname.replace(/^www\./, "");
    const self = new URL(request.headers.get("Origin") || "http://x").hostname;
    return host && host !== self ? host.slice(0, 80) : "";
  } catch (_) {
    return "";
  }
}

function parseUa(ua) {
  const device = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? "Tablet"
    : /Mobi|iPhone|iPod|Android/i.test(ua) ? "Cellulare" : "Computer";
  const browser = /Edg(e|A|iOS)?\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera"
    : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox|FxiOS/.test(ua) ? "Firefox"
      : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Altro";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "Altro";
  return { device, browser, os };
}

/* ---------------- Riepiloghi ---------------- */

async function stats(env, days) {
  const now = Date.now();
  const today = romeTime(now).day;
  const from = addDays(today, -(days - 1));
  const prevFrom = addDays(from, -days);
  const prevTo = addDays(from, -1);
  await env.DB.prepare("DELETE FROM events WHERE ts < ?1").bind(now - KEEP_DAYS * 86400000).run();

  const R = "day BETWEEN ?1 AND ?2";
  const all = (sql, ...args) => env.DB.prepare(sql).bind(from, today, ...args).all().then((r) => r.results);
  const dims = (col, limit = 12) => all(
    `SELECT COALESCE(NULLIF(${col}, ''), '?') AS k, COUNT(DISTINCT sid) AS n FROM events
     WHERE ${R} AND type = 'view' AND entry = 1 GROUP BY k ORDER BY n DESC LIMIT ${limit}`);

  const [cur, prev, series, sections, clicks, labels, refs, utm, countries, devices, browsers, oses, langs,
    screens, hours, weekdays, live, recent, total] = await Promise.all([
    totals(env, from, today),
    totals(env, prevFrom, prevTo),
    days === 1
      ? all(`SELECT hour AS k, SUM(type = 'view') AS views, COUNT(DISTINCT CASE WHEN type = 'view' THEN vid END) AS visitors,
               COUNT(DISTINCT CASE WHEN type = 'view' THEN sid END) AS sessions FROM events WHERE ${R} GROUP BY hour`)
      : all(`SELECT day AS k, SUM(type = 'view') AS views, COUNT(DISTINCT CASE WHEN type = 'view' THEN vid END) AS visitors,
               COUNT(DISTINCT CASE WHEN type = 'view' THEN sid END) AS sessions FROM events WHERE ${R} GROUP BY day`),
    all(`SELECT section AS k, SUM(type = 'view') AS views, COUNT(DISTINCT CASE WHEN type = 'view' THEN sid END) AS sessions,
           SUM(type = 'view' AND entry = 1) AS entries, COALESCE(SUM(CASE WHEN type = 'time' THEN value END), 0) AS seconds,
           ROUND(AVG(CASE WHEN type = 'time' THEN scroll END)) AS scroll
         FROM events WHERE ${R} AND section != '' GROUP BY section ORDER BY views DESC`),
    all(`SELECT name AS k, COUNT(*) AS n, COUNT(DISTINCT sid) AS sessions, COALESCE(SUM(value), 0) AS value
         FROM events WHERE ${R} AND type = 'click' GROUP BY name ORDER BY n DESC`),
    all(`SELECT name, label AS k, COUNT(*) AS n, COUNT(DISTINCT sid) AS sessions FROM events
         WHERE ${R} AND type = 'click' AND label != '' GROUP BY name, label ORDER BY n DESC LIMIT 400`),
    dims("ref", 15), dims("utm", 10), dims("country"), dims("device"), dims("browser"), dims("os"), dims("lang"),
    all(`SELECT CASE WHEN screen IS NULL THEN '?' WHEN screen < 600 THEN 'Piccolo (< 600 px)'
           WHEN screen < 1024 THEN 'Medio (600-1023 px)' WHEN screen < 1600 THEN 'Grande (1024-1599 px)'
           ELSE 'Molto grande (≥ 1600 px)' END AS k, COUNT(DISTINCT sid) AS n
         FROM events WHERE ${R} AND type = 'view' AND entry = 1 GROUP BY k ORDER BY n DESC`),
    all(`SELECT hour AS k, SUM(type = 'view') AS n FROM events WHERE ${R} GROUP BY hour`),
    all(`SELECT CAST(strftime('%w', day) AS INTEGER) AS k, SUM(type = 'view') AS n FROM events WHERE ${R} GROUP BY k`),
    env.DB.prepare(`SELECT section, MAX(ts) AS ts FROM events WHERE ts > ?1 AND type = 'view' GROUP BY sid`)
      .bind(now - 5 * 60000).all().then((r) => r.results),
    env.DB.prepare(`SELECT ts, type, section, name, label, value, country, device, browser FROM events
                    WHERE type != 'time' ORDER BY ts DESC LIMIT 40`).all().then((r) => r.results),
    env.DB.prepare("SELECT COUNT(*) AS n, MIN(day) AS first FROM events").first(),
  ]);

  const liveSections = {};
  live.forEach((r) => { liveSections[r.section || "?"] = (liveSections[r.section || "?"] || 0) + 1; });
  const seriesMap = Object.fromEntries(series.map((r) => [r.k, r]));
  const keys = days === 1 ? [...Array(24).keys()] : [...Array(days).keys()].map((i) => addDays(from, i));

  return {
    ok: true,
    generated: now,
    range: { days, from, to: today, prevFrom, prevTo },
    totals: cur,
    previous: prev,
    series: keys.map((k) => ({ k, views: 0, visitors: 0, sessions: 0, ...seriesMap[k] })),
    sections, clicks, labels,
    sources: { referrers: refs, campaigns: utm },
    audience: { countries, devices, browsers, os: oses, languages: langs, screens },
    hours: fill(hours, 24), weekdays: fill(weekdays, 7),
    live: { visitors: live.length, sections: liveSections },
    recent,
    database: { events: total.n, since: total.first },
  };
}

async function totals(env, from, to) {
  const r = await env.DB.prepare(
    `SELECT SUM(type = 'view') AS views,
            (SELECT COUNT(*) FROM (SELECT DISTINCT day, vid FROM events WHERE day BETWEEN ?1 AND ?2 AND type = 'view')) AS visitors,
            COUNT(DISTINCT CASE WHEN type = 'view' THEN sid END) AS sessions,
            COALESCE(SUM(CASE WHEN type = 'time' THEN value END), 0) AS seconds,
            SUM(type = 'click') AS clicks,
            SUM(type = 'click' AND name IN ('open-program', 'play-game', 'download')) AS launches
     FROM events WHERE day BETWEEN ?1 AND ?2`).bind(from, to).first();
  const b = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM (SELECT sid FROM events WHERE day BETWEEN ?1 AND ?2 GROUP BY sid
       HAVING SUM(type = 'view') = 1 AND SUM(type = 'click') = 0)`).bind(from, to).first("n");
  const t = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v) || 0]));
  return { ...t, bounces: Number(b) || 0 };
}

function fill(rows, n) {
  const out = Array(n).fill(0);
  rows.forEach((r) => { if (r.k >= 0 && r.k < n) out[r.k] = Number(r.n) || 0; });
  return out;
}

async function exportCsv(env, days) {
  const today = romeTime(Date.now()).day;
  const cols = ["ts", "day", "hour", "type", "section", "name", "label", "value", "scroll", "sid", "vid", "entry",
    "ref", "utm", "country", "device", "browser", "os", "lang", "screen"];
  const { results } = await env.DB.prepare(
    `SELECT ${cols.join(", ")} FROM events WHERE day BETWEEN ?1 AND ?2 ORDER BY ts LIMIT 200000`)
    .bind(addDays(today, -(days - 1)), today).all();
  const cell = (v) => (v == null ? "" : /[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = [["data_ora", ...cols.slice(1)].join(";")];
  for (const r of results) {
    const when = new Date(r.ts).toLocaleString("sv-SE", { timeZone: TZ });
    lines.push([when, ...cols.slice(1).map((c) => r[c])].map(cell).join(";"));
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="statistiche_${today}.csv"` },
  });
}

/* ---------------- Utilità ---------------- */

function authorized(request, env) {
  const given = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const key = env.ADMIN_KEY || "";
  if (!key || given.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

function romeTime(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}

function addDays(day, n) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function str(v, max) {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "";
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });
}

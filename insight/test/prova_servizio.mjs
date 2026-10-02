// Prova il servizio statistiche avviato in locale (npx wrangler dev --port 8788).
// Uso: node test/prova_servizio.mjs [indirizzo] [chiave]
const BASE = process.argv[2] || "http://127.0.0.1:8788";
const KEY = process.argv[3] || "chiave-di-prova-locale";
const ORIGIN = "http://localhost:5501";
let failed = 0;
const check = (cond, msg) => { console.log((cond ? "OK   " : "ERRORE ") + msg); if (!cond) failed++; };

async function send(body, ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1", origin = ORIGIN) {
  return fetch(BASE + "/e", { method: "POST", headers: { "Content-Type": "text/plain", Origin: origin, "User-Agent": ua }, body: JSON.stringify(body) });
}
const stats = async (key = KEY, days = 7) => fetch(`${BASE}/stats?days=${days}`, { headers: { Authorization: "Bearer " + key } });

const before = await (await stats()).json();
const sid = "t" + Math.random().toString(36).slice(2, 10);
let r = await send({ sid, ref: "https://www.google.com/search?q=x", utm: "", lang: "it-IT", screen: 390, events: [
  { t: "view", s: "shop", e: 1 },
  { t: "click", s: "shop", n: "open-item", l: "Bicicletta" },
  { t: "click", s: "shop", n: "buy", l: "Bicicletta" },
  { t: "click", s: "shop", n: "order", l: "Bicicletta", v: 58 },
  { t: "time", s: "shop", v: 42, sc: 80 },
  { t: "view", s: "giochi" },
  { t: "click", s: "giochi", n: "play-game", l: "Scacchi" },
  { t: "click", s: "giochi", n: "BAD NAME", l: "x" },
  { t: "view", s: "admin" },
] });
check(r.status === 204, "eventi accettati (204)");
check(r.headers.get("access-control-allow-origin") === ORIGIN, "intestazione CORS per l'origine consentita");
await send({ sid: "bot1", events: [{ t: "view", s: "shop", e: 1 }] }, "Googlebot/2.1");
await send({ sid: "evil1", events: [{ t: "view", s: "shop", e: 1 }] }, undefined, "https://sito-estraneo.example");
await send({ sid: sid + "b", lang: "en", screen: 1920, events: [{ t: "view", s: "info", e: 1 }] }, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36");

check((await stats("chiave-sbagliata")).status === 401, "chiave sbagliata rifiutata");
const res = await stats();
check(res.status === 200, "riepilogo letto");
const s = await res.json();
const d = (k) => s.totals[k] - before.totals[k];
check(d("views") === 3, `visualizzazioni +3 (bot, origine estranea e sezione admin ignorati): ${d("views")}`);
check(d("sessions") === 2, `visite +2: ${d("sessions")}`);
check(d("orders") === 1, `ordini +1: ${d("orders")}`);
check(d("clicks") === 4, `click +4 (nome non valido scartato): ${d("clicks")}`);
check(s.series.length === 7 && s.series.at(-1).k === s.range.to, "serie di 7 giorni fino a oggi");
check(s.sections.some((x) => x.k === "shop" && x.seconds >= 42), "tempo nella sezione shop");
check(s.labels.some((x) => x.name === "play-game" && x.k === "Scacchi"), "gioco avviato registrato");
check(s.sources.referrers.some((x) => x.k === "google.com"), "provenienza google.com");
check(s.audience.devices.some((x) => x.k === "Cellulare") && s.audience.devices.some((x) => x.k === "Computer"), "dispositivi riconosciuti");
check(s.funnel.ordered >= 1 && s.funnel.checkout >= 1, "percorso di acquisto");
check(s.live.visitors >= 2, "visitatori in questo momento");
const one = await (await stats(KEY, 1)).json();
check(one.series.length === 24, "vista di oggi divisa per ore");
const csv = await (await fetch(`${BASE}/export?days=7`, { headers: { Authorization: "Bearer " + KEY } })).text();
check(csv.includes("Bicicletta") && csv.split("\n")[0].includes("data_ora"), "esportazione CSV");
console.log(failed ? `\n${failed} prove fallite` : "\nTutte le prove superate");
process.exit(failed ? 1 : 0);

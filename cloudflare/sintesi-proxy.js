// Intermediario per la versione web di Sintesi Mercati AI (Cloudflare Worker).
//
// I browser non permettono a una pagina web di scaricare direttamente feed e articoli
// dei siti di notizie. Questo piccolo servizio li scarica al posto della pagina e li
// restituisce così come sono, senza modificarli.
//
// È limitato apposta:
//  - scarica solo dalle fonti autorevoli usate dal programma (ALLOWED_HOSTS);
//  - risponde solo alle pagine del tuo sito (ALLOWED_ORIGINS);
//  - solo richieste di lettura (GET), solo https.

const ALLOWED_HOSTS = [
  "reuters.com",
  "apnews.com",
  "cnbc.com",
  "marketwatch.com",
  "dowjones.io",
  "finance.yahoo.com",
  "investing.com",
  "coindesk.com",
  "kitco.com",
  "eia.gov",
  "federalreserve.gov",
  "sec.gov",
  "news.google.com",
];

const ALLOWED_ORIGINS = [
  "https://coccolodigital.com",
  "https://www.coccolodigital.com",
  "https://coccolodaniele-art.github.io",
  "http://localhost:5501",
  "http://localhost:5500",
  "http://localhost:5502",
];

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SintesiFontiAI/1.0 contact: local-user";
const MAX_BYTES = 5 * 1024 * 1024;

function hostAllowed(hostname) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith("." + allowed));
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Expose-Headers": "X-Final-Url",
    "Vary": "Origin",
  };
}

function reply(text, status, origin) {
  return new Response(text, { status, headers: { ...corsHeaders(origin), "Content-Type": "text/plain; charset=utf-8" } });
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { ...corsHeaders(origin), "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" } });
    }
    if (request.method !== "GET") return reply("Metodo non consentito", 405, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return reply("Origine non consentita", 403, origin);

    let target;
    try {
      target = new URL(new URL(request.url).searchParams.get("url") || "");
    } catch (_) {
      return reply("Indirizzo non valido", 400, origin);
    }
    if (target.protocol !== "https:" || !hostAllowed(target.hostname)) {
      return reply("Fonte non consentita", 403, origin);
    }

    let upstream;
    try {
      upstream = await fetch(target.toString(), {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
        cf: { cacheTtl: 600, cacheEverything: true },
      });
    } catch (err) {
      return reply("Fonte non raggiungibile", 502, origin);
    }

    // Anche dopo eventuali reindirizzamenti si deve restare sulle fonti consentite.
    const finalUrl = upstream.url || target.toString();
    if (!hostAllowed(new URL(finalUrl).hostname)) return reply("Fonte non consentita", 403, origin);

    const body = await upstream.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return reply("Pagina troppo grande", 413, origin);

    return new Response(body, {
      status: upstream.status,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": upstream.headers.get("Content-Type") || "text/plain; charset=utf-8",
        "X-Final-Url": finalUrl,
        "Cache-Control": "public, max-age=300",
      },
    });
  },
};

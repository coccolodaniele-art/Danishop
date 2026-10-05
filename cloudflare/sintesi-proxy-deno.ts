// Intermediario per le versioni web di Sintesi Mercati AI e SP500 Vertical Thermometers (Deno Deploy).
// Stesse regole della versione Cloudflare (sintesi-proxy.js).
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
  // SP500 Vertical Thermometers: fonte di riserva dei prezzi del motore di ricerca
  "nasdaq.com",
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
// I bilanci SEC (company facts) delle societa' piu' grandi superano i 5 MB.
const MAX_BYTES = 25 * 1024 * 1024;

// Dati JSON della SEC usati da SP500 Vertical Thermometers (data.sec.gov e i file
// www.sec.gov/files/...): la SEC chiede un identificativo dichiarato "nome email",
// altrimenti risponde 403. Il feed sec.gov usato da Sintesi Mercati AI e tutte le altre
// fonti restano con le intestazioni di sempre. Nasdaq.com risponde solo a richieste JSON.
const SEC_USER_AGENT = "Danishop coccolo.daniele@yahoo.it";

function upstreamHeaders(target: URL): Record<string, string> {
  const host = target.hostname.toLowerCase();
  if (host === "data.sec.gov" || (host === "www.sec.gov" && target.pathname.startsWith("/files/"))) {
    return { "User-Agent": SEC_USER_AGENT, "Accept": "application/json" };
  }
  if (host === "nasdaq.com" || host.endsWith(".nasdaq.com")) {
    return { "User-Agent": USER_AGENT, "Accept": "application/json, text/plain, */*" };
  }
  return { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" };
}

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith("." + allowed));
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Expose-Headers": "X-Final-Url",
    "Vary": "Origin",
  };
}

function reply(text: string, status: number, origin: string): Response {
  return new Response(text, { status, headers: { ...corsHeaders(origin), "Content-Type": "text/plain; charset=utf-8" } });
}

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: { ...corsHeaders(origin), "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" } });
  }
  if (request.method !== "GET") return reply("Metodo non consentito", 405, origin);
  if (!ALLOWED_ORIGINS.includes(origin)) return reply("Origine non consentita", 403, origin);

  let target: URL;
  try {
    target = new URL(new URL(request.url).searchParams.get("url") || "");
  } catch (_) {
    return reply("Indirizzo non valido", 400, origin);
  }
  if (target.protocol !== "https:" || !hostAllowed(target.hostname)) {
    return reply("Fonte non consentita", 403, origin);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: upstreamHeaders(target),
      redirect: "follow",
    });
  } catch (_) {
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
});

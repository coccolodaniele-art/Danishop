# Insight: statistiche del sito

Il sito online (`dist/app.js`, sezione "Statistiche") manda in forma anonima a un piccolo
servizio Cloudflare (`worker.js` + database D1) le schede viste, il tempo passato in ognuna,
quanto si scorre la pagina e i click importanti (programmi aperti, giochi avviati, contatti, link).
Il Gestore (`admin/gestione_sito.pyw`) legge i riepiloghi con una chiave segreta e li mostra
nella scheda **Insight** dell'area admin, con la possibilità di scaricare tutti gli eventi in CSV.

- Niente cookie e niente indirizzi IP salvati: il visitatore è un codice che cambia ogni giorno.
- Le visite dal PC (localhost) non vengono contate. Per escludere anche i propri telefoni/PC
  online: aprire una volta `https://coccolodigital.com/?noinsight`
  (per riattivare: `?insight=on`).
- I dati si conservano circa 13 mesi.

## File

| File | A cosa serve |
|---|---|
| `worker.js` | il servizio: `POST /e` riceve gli eventi, `GET /stats` e `GET /export` (con chiave) |
| `schema.sql` | le tabelle del database |
| `wrangler.toml` | configurazione per la pubblicazione su Cloudflare |
| `test/prova_servizio.mjs` | prove automatiche del servizio |
| `test/gestore_prova.py` | Gestore di prova sulla porta 5502 (config `gestore-prova` in `.claude/launch.json`) |
| `../admin/.insight.json` | indirizzo e chiave del servizio, **solo su questo PC** (non va online) |

## Prove in locale

```
cd insight
npm install
npx wrangler d1 execute danishop-insight --local --file schema.sql
npx wrangler dev --port 8788          (chiave di prova in .dev.vars)
node test/prova_servizio.mjs
python test/gestore_prova.py          poi http://localhost:5502/?insight=http://127.0.0.1:8788
```

## Pubblicazione / aggiornamento su Cloudflare

```
cd insight
npx wrangler login                                   (una volta sola, si apre il browser)
npx wrangler d1 create danishop-insight              (una volta sola: copia database_id in wrangler.toml)
npx wrangler d1 execute danishop-insight --remote --file schema.sql
npx wrangler secret put ADMIN_KEY                    (una volta sola: la stessa chiave di admin/.insight.json)
npx wrangler deploy                                  (ogni volta che cambia worker.js)
```

`admin/.insight.json` contiene: `{"url": "https://danishop-insight.<account>.workers.dev", "key": "<chiave>"}`.
L'indirizzo deve coincidere con `INSIGHT_URL` in `dist/app.js`.

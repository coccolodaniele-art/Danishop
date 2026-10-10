// Intermediario in locale per le prove: esegue cloudflare/sintesi-proxy-deno.ts con Node
// (finto Deno.serve) su http://localhost:8788. Accetta le pagine di http://localhost:5501.
//
//   node termometri-web/test/proxy-locale.mjs
//
// Per provare la pagina: copia dist/sp500-thermometers/index.html in prova.html nella stessa
// cartella, sostituendo l'indirizzo dell'intermediario con http://localhost:8788 (poi cancellala).
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PORT = 8788;
const HERE = path.dirname(fileURLToPath(import.meta.url));

globalThis.Deno = {
  serve(handler) {
    http.createServer(async (req, res) => {
      try {
        const request = new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers: req.headers });
        const response = await handler(request);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    }).listen(PORT, () => console.log(`Intermediario locale su http://localhost:${PORT}`));
  },
};
await import(pathToFileURL(path.resolve(HERE, '..', '..', 'cloudflare', 'sintesi-proxy-deno.ts')).href);

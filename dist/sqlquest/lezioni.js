/* SQLQuest - percorso di apprendimento: moduli ed esercizi, dalle basi al livello avanzato.
   Ogni esercizio: teoria (HTML), esempio da provare, compito, suggerimento e soluzione.
   tipo 'risultato' (default): si confronta il risultato della query con quello della soluzione;
   tipo 'modifica': si eseguono i comandi e poi la query "verifica" su entrambi i database.
   ordinato: conta anche l'ordine delle righe; colonne: contano anche i nomi delle colonne. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SQLQ_LEZIONI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const moduli = [
    { id: 'base', titolo: 'Primi passi', icona: '🌱', descrizione: 'Leggere i dati con SELECT' },
    { id: 'filtri', titolo: 'Filtrare con WHERE', icona: '🔎', descrizione: 'Scegliere solo le righe che servono' },
    { id: 'ordine', titolo: 'Ordinare e limitare', icona: '↕️', descrizione: 'ORDER BY, LIMIT e OFFSET' },
    { id: 'funzioni', titolo: 'Funzioni e calcoli', icona: '🧮', descrizione: 'Testi, numeri, date e CASE' },
    { id: 'aggrega', titolo: 'Raggruppare', icona: '📊', descrizione: 'COUNT, SUM, AVG, GROUP BY, HAVING' },
    { id: 'join', titolo: 'Unire le tabelle', icona: '🔗', descrizione: 'INNER JOIN, LEFT JOIN, self join' },
    { id: 'sub', titolo: 'Subquery', icona: '🪆', descrizione: 'Query dentro altre query' },
    { id: 'avanzato', titolo: 'SQL avanzato', icona: '🚀', descrizione: 'WITH, UNION e funzioni finestra' },
    { id: 'modifica', titolo: 'Modificare i dati', icona: '✏️', descrizione: 'INSERT, UPDATE, DELETE, CREATE' }
  ];

  const lezioni = [
    /* ===================== PRIMI PASSI ===================== */
    {
      id: 'base-1', modulo: 'base', livello: 1, titolo: 'Il tuo primo SELECT',
      teoria: `
        <p>Un database è un insieme di <b>tabelle</b>: ognuna ha delle <b>colonne</b> (i campi, ad esempio nome e prezzo) e delle <b>righe</b> (i singoli elementi, ad esempio ogni prodotto).</p>
        <p>Per leggere i dati si usa <code>SELECT</code>: dopo SELECT scrivi <i>cosa</i> vuoi vedere, dopo <code>FROM</code> <i>da quale tabella</i>. L'asterisco <code>*</code> significa "tutte le colonne".</p>
        <pre>SELECT * FROM clienti;</pre>
        <p>Il punto e virgola finale chiude il comando. Maiuscole e minuscole per le parole chiave non contano: <code>select</code> va bene lo stesso, ma scriverle in maiuscolo rende la query più leggibile.</p>
        <p class="tip">Le tabelle di questo simulatore sono quelle di un piccolo negozio online: <b>clienti</b>, <b>prodotti</b>, <b>categorie</b>, <b>ordini</b>, <b>dettagli_ordine</b> e <b>dipendenti</b>. Le trovi tutte nella scheda <b>Tabelle</b>.</p>`,
      esempio: 'SELECT * FROM clienti;',
      compito: 'Mostra <b>tutte le colonne</b> di tutti i <b>prodotti</b>.',
      suggerimento: 'Ti serve SELECT, l\'asterisco e FROM seguito dal nome della tabella.',
      soluzione: 'SELECT * FROM prodotti;'
    },
    {
      id: 'base-2', modulo: 'base', livello: 1, titolo: 'Scegliere le colonne',
      teoria: `
        <p>Di solito non servono tutte le colonne: al posto di <code>*</code> scrivi i nomi delle colonne che ti interessano, separati da virgole. Appariranno nell'ordine in cui le scrivi.</p>
        <pre>SELECT nome, cognome, citta
FROM clienti;</pre>
        <p class="tip">Puoi andare a capo dove vuoi: SQL ignora spazi e righe vuote. Mettere ogni clausola su una riga rende le query lunghe più facili da leggere.</p>`,
      esempio: 'SELECT nome, cognome, citta\nFROM clienti;',
      compito: 'Mostra soltanto il <b>nome</b> e il <b>prezzo</b> di tutti i prodotti.',
      suggerimento: 'Scrivi le due colonne dopo SELECT, separate da una virgola.',
      soluzione: 'SELECT nome, prezzo\nFROM prodotti;'
    },
    {
      id: 'base-3', modulo: 'base', livello: 1, titolo: 'Rinominare con AS', colonne: true,
      teoria: `
        <p>Con <code>AS</code> dai un nome diverso (un <b>alias</b>) a una colonna del risultato. Non cambia la tabella: cambia solo l'intestazione di ciò che vedi.</p>
        <pre>SELECT nome AS cliente, citta AS residenza
FROM clienti;</pre>
        <p class="tip">Se l'alias contiene spazi va tra virgolette: <code>nome AS "nome del cliente"</code>. Meglio però usare nomi semplici con il trattino basso.</p>`,
      esempio: 'SELECT nome AS cliente, citta AS residenza\nFROM clienti;',
      compito: 'Mostra nome e prezzo dei prodotti, ma con le colonne intitolate <code>prodotto</code> e <code>prezzo_euro</code>.',
      suggerimento: 'Dopo ogni colonna scrivi AS e il nuovo nome: nome AS prodotto, …',
      soluzione: 'SELECT nome AS prodotto, prezzo AS prezzo_euro\nFROM prodotti;'
    },
    {
      id: 'base-4', modulo: 'base', livello: 1, titolo: 'Calcoli nelle colonne', colonne: true,
      teoria: `
        <p>Nel SELECT puoi fare calcoli con <code>+ - * /</code> direttamente sulle colonne: il calcolo viene fatto riga per riga.</p>
        <pre>SELECT nome, disponibili, disponibili * 2 AS doppio
FROM prodotti;</pre>
        <p class="tip">Attenzione alla divisione tra numeri interi: <code>7 / 2</code> dà <code>3</code>. Per avere i decimali scrivi <code>7 / 2.0</code>.</p>`,
      esempio: 'SELECT nome, disponibili, disponibili * 2 AS doppio\nFROM prodotti;',
      compito: 'Per ogni prodotto mostra il <b>nome</b> e il prezzo con l\'IVA al 22% (cioè il prezzo moltiplicato per 1.22) in una colonna chiamata <code>prezzo_ivato</code>.',
      suggerimento: 'prezzo * 1.22 AS prezzo_ivato. Ricorda che nei numeri si usa il punto, non la virgola.',
      soluzione: 'SELECT nome, prezzo * 1.22 AS prezzo_ivato\nFROM prodotti;'
    },
    {
      id: 'base-5', modulo: 'base', livello: 1, titolo: 'Valori unici con DISTINCT',
      teoria: `
        <p><code>DISTINCT</code> toglie le righe ripetute dal risultato. Si scrive subito dopo SELECT.</p>
        <pre>SELECT DISTINCT stato
FROM ordini;</pre>
        <p>Questa query mostra ogni stato degli ordini una sola volta, anche se molti ordini hanno lo stesso stato.</p>`,
      esempio: 'SELECT DISTINCT stato\nFROM ordini;',
      compito: 'Mostra l\'elenco delle <b>città</b> dei clienti, <b>senza ripetizioni</b>.',
      suggerimento: 'SELECT DISTINCT seguito dalla colonna citta, dalla tabella clienti.',
      soluzione: 'SELECT DISTINCT citta\nFROM clienti;'
    },
    {
      id: 'base-6', modulo: 'base', livello: 1, titolo: 'Le prime righe con LIMIT',
      teoria: `
        <p><code>LIMIT n</code> mostra al massimo <i>n</i> righe. È utile per dare un'occhiata a una tabella grande senza caricarla tutta.</p>
        <pre>SELECT *
FROM ordini
LIMIT 3;</pre>
        <p class="tip">LIMIT va sempre <b>alla fine</b> della query.</p>`,
      esempio: 'SELECT *\nFROM ordini\nLIMIT 3;',
      compito: 'Mostra tutte le colonne dei <b>primi 5 clienti</b> della tabella.',
      suggerimento: 'SELECT * FROM clienti e, in fondo, LIMIT 5.',
      soluzione: 'SELECT *\nFROM clienti\nLIMIT 5;'
    },

    /* ===================== FILTRARE ===================== */
    {
      id: 'filtri-1', modulo: 'filtri', livello: 1, titolo: 'WHERE: scegliere le righe',
      teoria: `
        <p><code>WHERE</code> tiene solo le righe che soddisfano una condizione. Si scrive dopo FROM.</p>
        <pre>SELECT nome, cognome
FROM clienti
WHERE citta = 'Roma';</pre>
        <p>I <b>testi</b> vanno tra apici singoli (<code>'Roma'</code>), i <b>numeri</b> no (<code>WHERE id = 3</code>). Il confronto tra testi distingue le maiuscole: <code>'roma'</code> non trova <code>'Roma'</code>.</p>`,
      esempio: "SELECT nome, cognome\nFROM clienti\nWHERE citta = 'Roma';",
      compito: 'Mostra tutte le colonne dei clienti che abitano a <b>Milano</b>.',
      suggerimento: "WHERE citta = 'Milano' (con gli apici e la M maiuscola).",
      soluzione: "SELECT *\nFROM clienti\nWHERE citta = 'Milano';"
    },
    {
      id: 'filtri-2', modulo: 'filtri', livello: 1, titolo: 'Confronti numerici',
      teoria: `
        <p>Per i numeri (e anche per date e testi) puoi usare gli operatori di confronto:</p>
        <table class="mini"><tr><td><code>=</code> uguale</td><td><code>&lt;&gt;</code> o <code>!=</code> diverso</td></tr>
        <tr><td><code>&gt;</code> maggiore</td><td><code>&lt;</code> minore</td></tr>
        <tr><td><code>&gt;=</code> maggiore o uguale</td><td><code>&lt;=</code> minore o uguale</td></tr></table>
        <pre>SELECT nome, disponibili
FROM prodotti
WHERE disponibili &lt; 10;</pre>`,
      esempio: 'SELECT nome, disponibili\nFROM prodotti\nWHERE disponibili < 10;',
      compito: 'Mostra <b>nome</b> e <b>prezzo</b> dei prodotti che costano <b>più di 100</b> euro.',
      suggerimento: 'WHERE prezzo > 100',
      soluzione: 'SELECT nome, prezzo\nFROM prodotti\nWHERE prezzo > 100;'
    },
    {
      id: 'filtri-3', modulo: 'filtri', livello: 2, titolo: 'Più condizioni: AND e OR',
      teoria: `
        <p>Con <code>AND</code> devono essere vere <b>tutte</b> le condizioni; con <code>OR</code> basta che ne sia vera <b>una</b>.</p>
        <pre>SELECT nome, prezzo, disponibili
FROM prodotti
WHERE prezzo &lt; 50 AND disponibili &gt; 50;</pre>
        <p class="tip">Quando mescoli AND e OR usa le parentesi: <code>WHERE (citta = 'Roma' OR citta = 'Milano') AND email IS NOT NULL</code>. Senza parentesi AND viene valutato prima di OR.</p>`,
      esempio: 'SELECT nome, prezzo, disponibili\nFROM prodotti\nWHERE prezzo < 50 AND disponibili > 50;',
      compito: 'Mostra <b>nome</b> e <b>prezzo</b> dei prodotti della categoria <b>1</b> (Elettronica) che costano <b>meno di 200</b> euro.',
      suggerimento: 'Due condizioni unite da AND: categoria_id = 1 e prezzo < 200.',
      soluzione: 'SELECT nome, prezzo\nFROM prodotti\nWHERE categoria_id = 1 AND prezzo < 200;'
    },
    {
      id: 'filtri-4', modulo: 'filtri', livello: 2, titolo: 'Elenchi di valori con IN',
      teoria: `
        <p><code>IN (…)</code> controlla se un valore è in un elenco. È più comodo di tanti OR.</p>
        <pre>SELECT id, stato
FROM ordini
WHERE stato IN ('spedito', 'in lavorazione');</pre>
        <p>È equivalente a <code>WHERE stato = 'spedito' OR stato = 'in lavorazione'</code>. Esiste anche <code>NOT IN (…)</code>.</p>`,
      esempio: "SELECT id, stato\nFROM ordini\nWHERE stato IN ('spedito', 'in lavorazione');",
      compito: 'Mostra <b>nome</b>, <b>cognome</b> e <b>città</b> dei clienti che abitano a <b>Roma</b>, <b>Napoli</b> o <b>Palermo</b>.',
      suggerimento: "WHERE citta IN ('Roma', 'Napoli', 'Palermo')",
      soluzione: "SELECT nome, cognome, citta\nFROM clienti\nWHERE citta IN ('Roma', 'Napoli', 'Palermo');"
    },
    {
      id: 'filtri-5', modulo: 'filtri', livello: 2, titolo: 'Intervalli con BETWEEN',
      teoria: `
        <p><code>BETWEEN a AND b</code> tiene i valori compresi tra <i>a</i> e <i>b</i>, <b>estremi inclusi</b>. Funziona con numeri e con le date.</p>
        <p>In questo database le date sono testi nel formato <code>'AAAA-MM-GG'</code> (anno-mese-giorno): in questo formato l'ordine alfabetico coincide con l'ordine cronologico, quindi i confronti funzionano.</p>
        <pre>SELECT nome, prezzo
FROM prodotti
WHERE prezzo BETWEEN 20 AND 40;</pre>`,
      esempio: 'SELECT nome, prezzo\nFROM prodotti\nWHERE prezzo BETWEEN 20 AND 40;',
      compito: 'Mostra tutte le colonne degli ordini fatti tra il <b>1° marzo 2024</b> e il <b>30 giugno 2024</b> compresi.',
      suggerimento: "WHERE data_ordine BETWEEN '2024-03-01' AND '2024-06-30'",
      soluzione: "SELECT *\nFROM ordini\nWHERE data_ordine BETWEEN '2024-03-01' AND '2024-06-30';"
    },
    {
      id: 'filtri-6', modulo: 'filtri', livello: 2, titolo: 'Cercare nel testo con LIKE',
      teoria: `
        <p><code>LIKE</code> cerca un modello di testo. Il simbolo <code>%</code> vale "qualsiasi sequenza di caratteri" (anche nessuno), <code>_</code> vale "un solo carattere qualsiasi".</p>
        <pre>SELECT nome FROM prodotti WHERE nome LIKE '%Pro%';   -- contiene "Pro"
SELECT nome FROM clienti  WHERE nome LIKE 'M%';      -- inizia con M
SELECT nome FROM clienti  WHERE nome LIKE '%a';      -- finisce con a</pre>
        <p class="tip">In SQLite LIKE non distingue maiuscole e minuscole per le lettere senza accento.</p>`,
      esempio: "SELECT nome\nFROM prodotti\nWHERE nome LIKE '%Pro%';",
      compito: 'Mostra il <b>nome</b> dei prodotti il cui nome <b>inizia con la lettera S</b>.',
      suggerimento: "WHERE nome LIKE 'S%'",
      soluzione: "SELECT nome\nFROM prodotti\nWHERE nome LIKE 'S%';"
    },
    {
      id: 'filtri-7', modulo: 'filtri', livello: 2, titolo: 'Valori mancanti: IS NULL',
      teoria: `
        <p><code>NULL</code> significa "valore mancante o sconosciuto". Non è zero e non è un testo vuoto.</p>
        <p>Per trovarlo <b>non</b> si usa <code>= NULL</code> (non funziona mai!), ma <code>IS NULL</code>. Il contrario è <code>IS NOT NULL</code>.</p>
        <pre>SELECT nome
FROM prodotti
WHERE categoria_id IS NULL;</pre>`,
      esempio: 'SELECT nome\nFROM prodotti\nWHERE categoria_id IS NULL;',
      compito: 'Mostra <b>nome</b> e <b>cognome</b> dei clienti che <b>non hanno un indirizzo email</b>.',
      suggerimento: 'WHERE email IS NULL',
      soluzione: 'SELECT nome, cognome\nFROM clienti\nWHERE email IS NULL;'
    },
    {
      id: 'filtri-8', modulo: 'filtri', livello: 2, titolo: 'Escludere con NOT e <>',
      teoria: `
        <p>Per escludere usa <code>&lt;&gt;</code> (diverso) oppure <code>NOT</code> davanti a una condizione: <code>NOT IN</code>, <code>NOT LIKE</code>, <code>NOT BETWEEN</code>.</p>
        <pre>SELECT nome, citta
FROM clienti
WHERE citta NOT IN ('Milano', 'Roma');</pre>`,
      esempio: "SELECT nome, citta\nFROM clienti\nWHERE citta NOT IN ('Milano', 'Roma');",
      compito: 'Mostra <b>id</b>, <b>data_ordine</b> e <b>stato</b> degli ordini il cui stato <b>non è</b> \'consegnato\'.',
      suggerimento: "WHERE stato <> 'consegnato'",
      soluzione: "SELECT id, data_ordine, stato\nFROM ordini\nWHERE stato <> 'consegnato';"
    },

    /* ===================== ORDINARE ===================== */
    {
      id: 'ordine-1', modulo: 'ordine', livello: 1, titolo: 'Ordinare con ORDER BY', ordinato: true,
      teoria: `
        <p>Senza indicazioni, le righe arrivano in un ordine qualsiasi. <code>ORDER BY</code> le ordina in base a una o più colonne: <code>ASC</code> crescente (è il predefinito), <code>DESC</code> decrescente.</p>
        <pre>SELECT nome, cognome
FROM clienti
ORDER BY cognome;</pre>
        <p class="tip">ORDER BY si scrive dopo WHERE (se c'è) e prima di LIMIT.</p>`,
      esempio: 'SELECT nome, cognome\nFROM clienti\nORDER BY cognome;',
      compito: 'Mostra <b>nome</b> e <b>prezzo</b> dei prodotti, <b>dal più economico al più caro</b>.',
      suggerimento: 'ORDER BY prezzo (crescente è il predefinito).',
      soluzione: 'SELECT nome, prezzo\nFROM prodotti\nORDER BY prezzo;'
    },
    {
      id: 'ordine-2', modulo: 'ordine', livello: 2, titolo: 'Più criteri e DESC', ordinato: true,
      teoria: `
        <p>Puoi ordinare per più colonne: si ordina per la prima e, a parità, per la seconda. Ogni colonna ha il suo ASC o DESC.</p>
        <pre>SELECT reparto, nome, stipendio
FROM dipendenti
ORDER BY reparto ASC, stipendio DESC;</pre>`,
      esempio: 'SELECT reparto, nome, stipendio\nFROM dipendenti\nORDER BY reparto ASC, stipendio DESC;',
      compito: 'Mostra <b>nome</b>, <b>cognome</b> e <b>città</b> dei clienti ordinati per <b>città dalla A alla Z</b> e, nella stessa città, per <b>cognome dalla Z alla A</b>.',
      suggerimento: 'ORDER BY citta, cognome DESC',
      soluzione: 'SELECT nome, cognome, citta\nFROM clienti\nORDER BY citta, cognome DESC;'
    },
    {
      id: 'ordine-3', modulo: 'ordine', livello: 2, titolo: 'Classifiche: i primi N', ordinato: true,
      teoria: `
        <p>Unendo <code>ORDER BY</code> e <code>LIMIT</code> ottieni una classifica: prima ordini, poi tieni solo le prime righe.</p>
        <pre>SELECT nome, disponibili
FROM prodotti
ORDER BY disponibili DESC
LIMIT 3;</pre>`,
      esempio: 'SELECT nome, disponibili\nFROM prodotti\nORDER BY disponibili DESC\nLIMIT 3;',
      compito: 'Mostra <b>nome</b> e <b>prezzo</b> dei <b>3 prodotti più cari</b>, dal più caro.',
      suggerimento: 'ORDER BY prezzo DESC e poi LIMIT 3.',
      soluzione: 'SELECT nome, prezzo\nFROM prodotti\nORDER BY prezzo DESC\nLIMIT 3;'
    },
    {
      id: 'ordine-4', modulo: 'ordine', livello: 3, titolo: 'Saltare righe con OFFSET', ordinato: true,
      teoria: `
        <p><code>OFFSET n</code> salta le prime <i>n</i> righe. Con LIMIT si usa per "sfogliare" i risultati a pagine:</p>
        <pre>-- seconda pagina da 5 clienti
SELECT nome, cognome
FROM clienti
ORDER BY id
LIMIT 5 OFFSET 5;</pre>`,
      esempio: 'SELECT nome, cognome\nFROM clienti\nORDER BY id\nLIMIT 5 OFFSET 5;',
      compito: 'Nella classifica dei prodotti dal più caro, mostra <b>nome</b> e <b>prezzo</b> dalla <b>4ª alla 6ª posizione</b>.',
      suggerimento: 'Ordina per prezzo decrescente, poi LIMIT 3 OFFSET 3 (salta i primi 3 e ne prendi 3).',
      soluzione: 'SELECT nome, prezzo\nFROM prodotti\nORDER BY prezzo DESC\nLIMIT 3 OFFSET 3;'
    },

    /* ===================== FUNZIONI ===================== */
    {
      id: 'funzioni-1', modulo: 'funzioni', livello: 2, titolo: 'Unire testi con ||', colonne: true,
      teoria: `
        <p>In SQLite l'operatore <code>||</code> unisce (concatena) testi. Puoi mescolare colonne e testi fissi:</p>
        <pre>SELECT nome || ' (' || citta || ')' AS etichetta
FROM clienti;</pre>`,
      esempio: "SELECT nome || ' (' || citta || ')' AS etichetta\nFROM clienti;",
      compito: 'Mostra il nome completo dei clienti (nome, uno spazio, cognome) in un\'unica colonna chiamata <code>nome_completo</code>.',
      suggerimento: "nome || ' ' || cognome AS nome_completo",
      soluzione: "SELECT nome || ' ' || cognome AS nome_completo\nFROM clienti;"
    },
    {
      id: 'funzioni-2', modulo: 'funzioni', livello: 2, titolo: 'Funzioni sui testi',
      teoria: `
        <p>Alcune funzioni utili sui testi:</p>
        <table class="mini">
          <tr><td><code>UPPER(t)</code> / <code>LOWER(t)</code></td><td>tutto maiuscolo / minuscolo</td></tr>
          <tr><td><code>LENGTH(t)</code></td><td>numero di caratteri</td></tr>
          <tr><td><code>SUBSTR(t, inizio, n)</code></td><td>pezzo di testo (si conta da 1)</td></tr>
          <tr><td><code>REPLACE(t, a, b)</code></td><td>sostituisce a con b</td></tr>
          <tr><td><code>TRIM(t)</code></td><td>toglie gli spazi all'inizio e alla fine</td></tr>
        </table>
        <pre>SELECT nome, UPPER(SUBSTR(cognome, 1, 3)) AS sigla
FROM clienti;</pre>`,
      esempio: 'SELECT nome, UPPER(SUBSTR(cognome, 1, 3)) AS sigla\nFROM clienti;',
      compito: 'Per ogni <b>città</b> dei clienti (senza ripetizioni) mostra il nome della città <b>in maiuscolo</b> e il suo <b>numero di lettere</b>.',
      suggerimento: 'SELECT DISTINCT UPPER(citta), LENGTH(citta) FROM clienti',
      soluzione: 'SELECT DISTINCT UPPER(citta) AS citta, LENGTH(citta) AS lettere\nFROM clienti;'
    },
    {
      id: 'funzioni-3', modulo: 'funzioni', livello: 2, titolo: 'Arrotondare con ROUND', colonne: true,
      teoria: `
        <p><code>ROUND(numero, cifre)</code> arrotonda al numero di decimali indicato. Altre funzioni numeriche: <code>ABS</code> (valore assoluto), <code>MIN</code>/<code>MAX</code> tra più valori, e l'operatore <code>%</code> (resto della divisione).</p>
        <pre>SELECT nome, ROUND(prezzo * 0.9, 2) AS prezzo_scontato
FROM prodotti;</pre>`,
      esempio: 'SELECT nome, ROUND(prezzo * 0.9, 2) AS prezzo_scontato\nFROM prodotti;',
      compito: 'Mostra il <b>nome</b> dei prodotti e il prezzo con l\'IVA al 22% <b>arrotondato a 2 decimali</b>, in una colonna chiamata <code>prezzo_ivato</code>.',
      suggerimento: 'ROUND(prezzo * 1.22, 2) AS prezzo_ivato',
      soluzione: 'SELECT nome, ROUND(prezzo * 1.22, 2) AS prezzo_ivato\nFROM prodotti;'
    },
    {
      id: 'funzioni-4', modulo: 'funzioni', livello: 3, titolo: 'Lavorare con le date',
      teoria: `
        <p>SQLite salva le date come testo <code>'AAAA-MM-GG'</code> e offre funzioni per gestirle:</p>
        <table class="mini">
          <tr><td><code>strftime('%Y', data)</code></td><td>anno (anche <code>%m</code> mese, <code>%d</code> giorno)</td></tr>
          <tr><td><code>date('now')</code></td><td>la data di oggi</td></tr>
          <tr><td><code>date(data, '+30 days')</code></td><td>sposta una data in avanti o indietro</td></tr>
          <tr><td><code>julianday(a) - julianday(b)</code></td><td>giorni tra due date</td></tr>
        </table>
        <pre>SELECT id, data_ordine, strftime('%m', data_ordine) AS mese
FROM ordini;</pre>`,
      esempio: "SELECT id, data_ordine, strftime('%m', data_ordine) AS mese\nFROM ordini;",
      compito: 'Mostra <b>nome</b>, <b>cognome</b> e l\'<b>anno di iscrizione</b> (colonna <code>anno</code>) dei clienti iscritti nel <b>2024</b>.',
      suggerimento: "Usa strftime('%Y', data_iscrizione) sia nel SELECT sia nel WHERE (confrontandolo con '2024').",
      soluzione: "SELECT nome, cognome, strftime('%Y', data_iscrizione) AS anno\nFROM clienti\nWHERE strftime('%Y', data_iscrizione) = '2024';"
    },
    {
      id: 'funzioni-5', modulo: 'funzioni', livello: 3, titolo: 'Decidere con CASE',
      teoria: `
        <p><code>CASE</code> è il "se… allora…" di SQL: controlla le condizioni in ordine e restituisce il valore della prima vera; <code>ELSE</code> vale per tutti gli altri casi.</p>
        <pre>SELECT nome, disponibili,
       CASE
         WHEN disponibili = 0 THEN 'esaurito'
         WHEN disponibili &lt; 10 THEN 'ultimi pezzi'
         ELSE 'disponibile'
       END AS magazzino
FROM prodotti;</pre>`,
      esempio: "SELECT nome, disponibili,\n       CASE\n         WHEN disponibili = 0 THEN 'esaurito'\n         WHEN disponibili < 10 THEN 'ultimi pezzi'\n         ELSE 'disponibile'\n       END AS magazzino\nFROM prodotti;",
      compito: 'Mostra il <b>nome</b> di ogni prodotto e la sua <b>fascia di prezzo</b>: \'economico\' sotto i 50 euro, \'medio\' da 50 a 200 euro compresi, \'premium\' oltre i 200.',
      suggerimento: "CASE WHEN prezzo < 50 THEN 'economico' WHEN prezzo <= 200 THEN 'medio' ELSE 'premium' END",
      soluzione: "SELECT nome,\n       CASE\n         WHEN prezzo < 50 THEN 'economico'\n         WHEN prezzo <= 200 THEN 'medio'\n         ELSE 'premium'\n       END AS fascia\nFROM prodotti;"
    },
    {
      id: 'funzioni-6', modulo: 'funzioni', livello: 3, titolo: 'Sostituire i NULL: COALESCE',
      teoria: `
        <p><code>COALESCE(a, b, …)</code> restituisce il primo valore che non è NULL. Serve per mostrare un valore di riserva quando un dato manca.</p>
        <pre>SELECT nome, COALESCE(categoria_id, 0) AS categoria
FROM prodotti;</pre>
        <p class="tip">In SQLite esiste anche <code>IFNULL(a, b)</code>, che fa lo stesso con due valori.</p>`,
      esempio: 'SELECT nome, COALESCE(categoria_id, 0) AS categoria\nFROM prodotti;',
      compito: 'Mostra <b>nome</b>, <b>cognome</b> ed <b>email</b> di tutti i clienti; dove l\'email manca scrivi <b>\'non disponibile\'</b>.',
      suggerimento: "COALESCE(email, 'non disponibile')",
      soluzione: "SELECT nome, cognome, COALESCE(email, 'non disponibile') AS email\nFROM clienti;"
    },

    /* ===================== RAGGRUPPARE ===================== */
    {
      id: 'aggrega-1', modulo: 'aggrega', livello: 2, titolo: 'Contare con COUNT',
      teoria: `
        <p>Le <b>funzioni di aggregazione</b> riassumono molte righe in un solo valore. <code>COUNT(*)</code> conta le righe.</p>
        <pre>SELECT COUNT(*) AS ordini_consegnati
FROM ordini
WHERE stato = 'consegnato';</pre>
        <p class="tip"><code>COUNT(colonna)</code> conta solo le righe in cui quella colonna non è NULL: <code>COUNT(email)</code> conta i clienti che hanno l'email.</p>`,
      esempio: "SELECT COUNT(*) AS ordini_consegnati\nFROM ordini\nWHERE stato = 'consegnato';",
      compito: 'Quanti <b>clienti</b> ci sono in tutto?',
      suggerimento: 'SELECT COUNT(*) FROM clienti',
      soluzione: 'SELECT COUNT(*) AS numero_clienti\nFROM clienti;'
    },
    {
      id: 'aggrega-2', modulo: 'aggrega', livello: 2, titolo: 'SUM, AVG, MIN, MAX',
      teoria: `
        <p>Le altre funzioni di aggregazione principali:</p>
        <table class="mini">
          <tr><td><code>SUM(x)</code></td><td>somma</td><td><code>AVG(x)</code></td><td>media</td></tr>
          <tr><td><code>MIN(x)</code></td><td>minimo</td><td><code>MAX(x)</code></td><td>massimo</td></tr>
        </table>
        <pre>SELECT SUM(disponibili) AS pezzi_in_magazzino,
       MAX(disponibili)  AS massimo
FROM prodotti;</pre>`,
      esempio: 'SELECT SUM(disponibili) AS pezzi_in_magazzino,\n       MAX(disponibili) AS massimo\nFROM prodotti;',
      compito: 'Mostra per tutti i prodotti il <b>prezzo minimo</b>, il <b>prezzo massimo</b> e il <b>prezzo medio</b> arrotondato a 2 decimali (in quest\'ordine).',
      suggerimento: 'MIN(prezzo), MAX(prezzo), ROUND(AVG(prezzo), 2)',
      soluzione: 'SELECT MIN(prezzo) AS minimo, MAX(prezzo) AS massimo, ROUND(AVG(prezzo), 2) AS media\nFROM prodotti;'
    },
    {
      id: 'aggrega-3', modulo: 'aggrega', livello: 3, titolo: 'Gruppi con GROUP BY',
      teoria: `
        <p><code>GROUP BY</code> divide le righe in gruppi (uno per ogni valore diverso della colonna) e calcola le aggregazioni <b>per ogni gruppo</b>.</p>
        <pre>SELECT stato, COUNT(*) AS quanti
FROM ordini
GROUP BY stato;</pre>
        <p class="tip">Regola d'oro: nel SELECT metti solo le colonne del GROUP BY e funzioni di aggregazione.</p>`,
      esempio: 'SELECT stato, COUNT(*) AS quanti\nFROM ordini\nGROUP BY stato;',
      compito: 'Mostra <b>quanti clienti</b> ci sono in ogni <b>città</b> (colonne: città e numero).',
      suggerimento: 'SELECT citta, COUNT(*) … GROUP BY citta',
      soluzione: 'SELECT citta, COUNT(*) AS numero\nFROM clienti\nGROUP BY citta;'
    },
    {
      id: 'aggrega-4', modulo: 'aggrega', livello: 3, titolo: 'Somme per gruppo',
      teoria: `
        <p>Dentro le funzioni di aggregazione puoi mettere un calcolo: viene fatto riga per riga e poi sommato (o mediato…) nel gruppo.</p>
        <pre>SELECT prodotto_id, SUM(quantita) AS pezzi_venduti
FROM dettagli_ordine
GROUP BY prodotto_id;</pre>`,
      esempio: 'SELECT prodotto_id, SUM(quantita) AS pezzi_venduti\nFROM dettagli_ordine\nGROUP BY prodotto_id;',
      compito: 'Calcola il <b>totale di ogni ordine</b> dalla tabella dettagli_ordine (somma di quantita × prezzo_unitario). Colonne: <code>ordine_id</code> e <code>totale</code>.',
      suggerimento: 'SUM(quantita * prezzo_unitario) … GROUP BY ordine_id',
      soluzione: 'SELECT ordine_id, SUM(quantita * prezzo_unitario) AS totale\nFROM dettagli_ordine\nGROUP BY ordine_id;'
    },
    {
      id: 'aggrega-5', modulo: 'aggrega', livello: 3, titolo: 'Filtrare i gruppi: HAVING',
      teoria: `
        <p><code>WHERE</code> filtra le righe <i>prima</i> di raggruppare; <code>HAVING</code> filtra i <b>gruppi</b> <i>dopo</i>, e può usare le funzioni di aggregazione.</p>
        <pre>SELECT reparto, COUNT(*) AS persone
FROM dipendenti
GROUP BY reparto
HAVING COUNT(*) &gt;= 3;</pre>
        <p class="tip">L'ordine delle clausole è sempre: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.</p>`,
      esempio: 'SELECT reparto, COUNT(*) AS persone\nFROM dipendenti\nGROUP BY reparto\nHAVING COUNT(*) >= 3;',
      compito: 'Mostra le <b>città</b> con <b>almeno 2 clienti</b>, con il numero di clienti di ciascuna.',
      suggerimento: 'GROUP BY citta HAVING COUNT(*) >= 2',
      soluzione: 'SELECT citta, COUNT(*) AS numero\nFROM clienti\nGROUP BY citta\nHAVING COUNT(*) >= 2;'
    },
    {
      id: 'aggrega-6', modulo: 'aggrega', livello: 3, titolo: 'Contare valori diversi',
      teoria: `
        <p><code>COUNT(DISTINCT colonna)</code> conta quanti valori <b>diversi</b> ci sono, ignorando le ripetizioni e i NULL.</p>
        <pre>SELECT COUNT(DISTINCT citta) AS citta_diverse
FROM clienti;</pre>`,
      esempio: 'SELECT COUNT(DISTINCT citta) AS citta_diverse\nFROM clienti;',
      compito: 'Quanti <b>clienti diversi</b> hanno fatto <b>almeno un ordine</b>? (usa solo la tabella ordini)',
      suggerimento: 'COUNT(DISTINCT cliente_id) dalla tabella ordini.',
      soluzione: 'SELECT COUNT(DISTINCT cliente_id) AS clienti_con_ordini\nFROM ordini;'
    },

    /* ===================== JOIN ===================== */
    {
      id: 'join-1', modulo: 'join', livello: 3, titolo: 'INNER JOIN',
      teoria: `
        <p>I dati sono divisi in più tabelle collegate da <b>chiavi</b>: ad esempio <code>prodotti.categoria_id</code> contiene l'<code>id</code> di una riga di <code>categorie</code>.</p>
        <p><code>JOIN … ON</code> unisce le righe delle due tabelle quando la condizione è vera. Gli <b>alias</b> brevi (p, c) rendono la query più leggibile.</p>
        <pre>SELECT o.id, o.data_ordine, c.cognome
FROM ordini o
JOIN clienti c ON o.cliente_id = c.id;</pre>
        <p class="tip"><code>JOIN</code> e <code>INNER JOIN</code> sono la stessa cosa: tengono solo le righe che trovano una corrispondenza in entrambe le tabelle.</p>`,
      esempio: 'SELECT o.id, o.data_ordine, c.cognome\nFROM ordini o\nJOIN clienti c ON o.cliente_id = c.id;',
      compito: 'Per ogni prodotto mostra il <b>nome del prodotto</b> e il <b>nome della sua categoria</b>.',
      suggerimento: 'FROM prodotti p JOIN categorie c ON p.categoria_id = c.id, poi SELECT p.nome, c.nome',
      soluzione: 'SELECT p.nome AS prodotto, c.nome AS categoria\nFROM prodotti p\nJOIN categorie c ON p.categoria_id = c.id;'
    },
    {
      id: 'join-2', modulo: 'join', livello: 3, titolo: 'JOIN con filtri',
      teoria: `
        <p>Dopo il JOIN puoi usare WHERE, ORDER BY e tutto il resto come al solito, su colonne di entrambe le tabelle.</p>
        <pre>SELECT o.id, o.data_ordine
FROM ordini o
JOIN clienti c ON o.cliente_id = c.id
WHERE c.citta = 'Roma';</pre>`,
      esempio: "SELECT o.id, o.data_ordine\nFROM ordini o\nJOIN clienti c ON o.cliente_id = c.id\nWHERE c.citta = 'Roma';",
      compito: 'Mostra <b>id</b>, <b>data</b> e <b>stato</b> degli ordini dei clienti che abitano a <b>Milano</b>, insieme al <b>cognome</b> del cliente.',
      suggerimento: "JOIN tra ordini e clienti, poi WHERE c.citta = 'Milano'.",
      soluzione: "SELECT o.id, o.data_ordine, o.stato, c.cognome\nFROM ordini o\nJOIN clienti c ON o.cliente_id = c.id\nWHERE c.citta = 'Milano';"
    },
    {
      id: 'join-3', modulo: 'join', livello: 3, titolo: 'Unire tre tabelle',
      teoria: `
        <p>Puoi concatenare più JOIN: ogni JOIN aggiunge una tabella con la sua condizione.</p>
        <pre>SELECT c.cognome, p.nome, d.quantita
FROM dettagli_ordine d
JOIN ordini o   ON d.ordine_id = o.id
JOIN clienti c  ON o.cliente_id = c.id
JOIN prodotti p ON d.prodotto_id = p.id;</pre>`,
      esempio: 'SELECT c.cognome, p.nome, d.quantita\nFROM dettagli_ordine d\nJOIN ordini o ON d.ordine_id = o.id\nJOIN clienti c ON o.cliente_id = c.id\nJOIN prodotti p ON d.prodotto_id = p.id;',
      compito: 'Per l\'<b>ordine numero 8</b> mostra il <b>nome</b> di ogni prodotto acquistato, la <b>quantità</b> e il <b>prezzo unitario</b>.',
      suggerimento: 'JOIN tra dettagli_ordine e prodotti, con WHERE d.ordine_id = 8.',
      soluzione: 'SELECT p.nome, d.quantita, d.prezzo_unitario\nFROM dettagli_ordine d\nJOIN prodotti p ON d.prodotto_id = p.id\nWHERE d.ordine_id = 8;'
    },
    {
      id: 'join-4', modulo: 'join', livello: 4, titolo: 'LEFT JOIN: tenere tutto',
      teoria: `
        <p><code>LEFT JOIN</code> tiene <b>tutte</b> le righe della tabella di sinistra, anche quelle senza corrispondenza: in quel caso le colonne della tabella di destra valgono NULL.</p>
        <pre>SELECT p.nome, c.nome AS categoria
FROM prodotti p
LEFT JOIN categorie c ON p.categoria_id = c.id;</pre>
        <p>Con un INNER JOIN il "Drone Mini Sky" (che non ha categoria) sparirebbe; con il LEFT JOIN resta, con categoria NULL.</p>
        <p class="tip">Unito a GROUP BY: <code>COUNT(colonna_di_destra)</code> dà 0 per chi non ha corrispondenze, perché non conta i NULL.</p>`,
      esempio: 'SELECT p.nome, c.nome AS categoria\nFROM prodotti p\nLEFT JOIN categorie c ON p.categoria_id = c.id;',
      compito: 'Mostra <b>nome</b>, <b>cognome</b> e <b>numero di ordini</b> di <b>tutti</b> i clienti, compresi quelli che non hanno mai ordinato (con 0).',
      suggerimento: 'clienti c LEFT JOIN ordini o ON o.cliente_id = c.id, poi COUNT(o.id) e GROUP BY c.id',
      soluzione: 'SELECT c.nome, c.cognome, COUNT(o.id) AS numero_ordini\nFROM clienti c\nLEFT JOIN ordini o ON o.cliente_id = c.id\nGROUP BY c.id;'
    },
    {
      id: 'join-5', modulo: 'join', livello: 4, titolo: 'Trovare ciò che manca',
      teoria: `
        <p>Un LEFT JOIN seguito da <code>WHERE destra.colonna IS NULL</code> trova le righe di sinistra <b>senza</b> corrispondenza: clienti senza ordini, prodotti mai venduti…</p>
        <pre>SELECT c.nome, c.cognome
FROM clienti c
LEFT JOIN ordini o ON o.cliente_id = c.id
WHERE o.id IS NULL;</pre>`,
      esempio: 'SELECT c.nome, c.cognome\nFROM clienti c\nLEFT JOIN ordini o ON o.cliente_id = c.id\nWHERE o.id IS NULL;',
      compito: 'Mostra il <b>nome</b> dei prodotti che <b>non sono mai stati ordinati</b>.',
      suggerimento: 'prodotti p LEFT JOIN dettagli_ordine d ON d.prodotto_id = p.id WHERE d.ordine_id IS NULL',
      soluzione: 'SELECT p.nome\nFROM prodotti p\nLEFT JOIN dettagli_ordine d ON d.prodotto_id = p.id\nWHERE d.ordine_id IS NULL;'
    },
    {
      id: 'join-6', modulo: 'join', livello: 4, titolo: 'Self join',
      teoria: `
        <p>Una tabella può essere unita <b>a se stessa</b>: in dipendenti, <code>responsabile_id</code> è l'id di un altro dipendente. Si usa la stessa tabella due volte con due alias diversi.</p>
        <pre>SELECT d.nome, d.ruolo, r.nome AS capo
FROM dipendenti d
JOIN dipendenti r ON d.responsabile_id = r.id;</pre>`,
      esempio: 'SELECT d.nome, d.ruolo, r.nome AS capo\nFROM dipendenti d\nJOIN dipendenti r ON d.responsabile_id = r.id;',
      compito: 'Per ogni dipendente che ha un responsabile mostra <b>nome</b> e <b>cognome</b> del dipendente e il <b>cognome del suo responsabile</b>.',
      suggerimento: 'dipendenti d JOIN dipendenti r ON d.responsabile_id = r.id; SELECT d.nome, d.cognome, r.cognome',
      soluzione: 'SELECT d.nome, d.cognome, r.cognome AS responsabile\nFROM dipendenti d\nJOIN dipendenti r ON d.responsabile_id = r.id;'
    },
    {
      id: 'join-7', modulo: 'join', livello: 4, titolo: 'JOIN e GROUP BY insieme', ordinato: true,
      teoria: `
        <p>Il caso più frequente nei report: unisci le tabelle, filtri, raggruppi e ordini.</p>
        <pre>SELECT c.cognome, COUNT(*) AS ordini
FROM ordini o
JOIN clienti c ON o.cliente_id = c.id
GROUP BY c.id
ORDER BY ordini DESC;</pre>`,
      esempio: 'SELECT c.cognome, COUNT(*) AS ordini\nFROM ordini o\nJOIN clienti c ON o.cliente_id = c.id\nGROUP BY c.id\nORDER BY ordini DESC;',
      compito: 'Calcola il <b>fatturato per categoria</b>: nome della categoria e totale venduto (quantita × prezzo_unitario), <b>escludendo gli ordini annullati</b>, dalla categoria che ha venduto di più.',
      suggerimento: 'Servono dettagli_ordine, ordini (per lo stato), prodotti e categorie. WHERE o.stato <> \'annullato\', GROUP BY la categoria, ORDER BY il totale DESC.',
      soluzione: "SELECT c.nome AS categoria, SUM(d.quantita * d.prezzo_unitario) AS fatturato\nFROM dettagli_ordine d\nJOIN ordini o ON d.ordine_id = o.id\nJOIN prodotti p ON d.prodotto_id = p.id\nJOIN categorie c ON p.categoria_id = c.id\nWHERE o.stato <> 'annullato'\nGROUP BY c.id\nORDER BY fatturato DESC;"
    },

    /* ===================== SUBQUERY ===================== */
    {
      id: 'sub-1', modulo: 'sub', livello: 4, titolo: 'Subquery con un valore',
      teoria: `
        <p>Una <b>subquery</b> è una query tra parentesi dentro un'altra. Se restituisce un solo valore puoi usarla come un numero qualsiasi:</p>
        <pre>SELECT nome, stipendio
FROM dipendenti
WHERE stipendio &gt; (SELECT AVG(stipendio) FROM dipendenti);</pre>`,
      esempio: 'SELECT nome, stipendio\nFROM dipendenti\nWHERE stipendio > (SELECT AVG(stipendio) FROM dipendenti);',
      compito: 'Mostra <b>nome</b> e <b>prezzo</b> dei prodotti che costano <b>più della media</b> dei prezzi.',
      suggerimento: 'WHERE prezzo > (SELECT AVG(prezzo) FROM prodotti)',
      soluzione: 'SELECT nome, prezzo\nFROM prodotti\nWHERE prezzo > (SELECT AVG(prezzo) FROM prodotti);'
    },
    {
      id: 'sub-2', modulo: 'sub', livello: 4, titolo: 'Subquery con IN',
      teoria: `
        <p>Se la subquery restituisce una colonna con più valori, usala con <code>IN</code> (o <code>NOT IN</code>).</p>
        <pre>SELECT nome
FROM prodotti
WHERE id IN (SELECT prodotto_id FROM dettagli_ordine WHERE quantita &gt;= 2);</pre>`,
      esempio: 'SELECT nome\nFROM prodotti\nWHERE id IN (SELECT prodotto_id FROM dettagli_ordine WHERE quantita >= 2);',
      compito: 'Mostra <b>nome</b> e <b>cognome</b> dei clienti che hanno almeno un ordine <b>\'in lavorazione\'</b>.',
      suggerimento: "WHERE id IN (SELECT cliente_id FROM ordini WHERE stato = 'in lavorazione')",
      soluzione: "SELECT nome, cognome\nFROM clienti\nWHERE id IN (SELECT cliente_id FROM ordini WHERE stato = 'in lavorazione');"
    },
    {
      id: 'sub-3', modulo: 'sub', livello: 4, titolo: 'EXISTS e NOT EXISTS',
      teoria: `
        <p><code>EXISTS (subquery)</code> è vero se la subquery trova almeno una riga. La subquery può riferirsi alla riga esterna (si dice <b>correlata</b>).</p>
        <pre>SELECT p.nome
FROM prodotti p
WHERE EXISTS (SELECT 1 FROM dettagli_ordine d WHERE d.prodotto_id = p.id);</pre>
        <p class="tip">Per i "mai" (mai ordinato, mai venduto) usa <code>NOT EXISTS</code>: è più sicuro di NOT IN quando ci possono essere NULL.</p>`,
      esempio: 'SELECT p.nome\nFROM prodotti p\nWHERE EXISTS (SELECT 1 FROM dettagli_ordine d WHERE d.prodotto_id = p.id);',
      compito: 'Mostra <b>nome</b> e <b>cognome</b> dei clienti che <b>non hanno mai fatto un ordine</b>, usando NOT EXISTS.',
      suggerimento: 'WHERE NOT EXISTS (SELECT 1 FROM ordini o WHERE o.cliente_id = c.id)',
      soluzione: 'SELECT c.nome, c.cognome\nFROM clienti c\nWHERE NOT EXISTS (SELECT 1 FROM ordini o WHERE o.cliente_id = c.id);'
    },
    {
      id: 'sub-4', modulo: 'sub', livello: 4, titolo: 'Subquery nel FROM',
      teoria: `
        <p>Una subquery può stare anche nel <code>FROM</code>: il suo risultato diventa una tabella temporanea su cui fare altri calcoli. Dalle un alias.</p>
        <pre>SELECT MAX(pezzi) AS record
FROM (SELECT ordine_id, SUM(quantita) AS pezzi
      FROM dettagli_ordine
      GROUP BY ordine_id) AS t;</pre>`,
      esempio: 'SELECT MAX(pezzi) AS record\nFROM (SELECT ordine_id, SUM(quantita) AS pezzi\n      FROM dettagli_ordine\n      GROUP BY ordine_id) AS t;',
      compito: 'Calcola la <b>spesa media per ordine</b>: prima il totale di ogni ordine (quantita × prezzo_unitario), poi la <b>media dei totali</b>, arrotondata a 2 decimali.',
      suggerimento: 'SELECT ROUND(AVG(totale), 2) FROM (SELECT ordine_id, SUM(quantita * prezzo_unitario) AS totale FROM dettagli_ordine GROUP BY ordine_id)',
      soluzione: 'SELECT ROUND(AVG(totale), 2) AS spesa_media\nFROM (SELECT ordine_id, SUM(quantita * prezzo_unitario) AS totale\n      FROM dettagli_ordine\n      GROUP BY ordine_id) AS t;'
    },
    {
      id: 'sub-5', modulo: 'sub', livello: 5, titolo: 'Subquery correlata',
      teoria: `
        <p>Una subquery <b>correlata</b> viene ricalcolata per ogni riga della query esterna, usando i suoi valori. Ad esempio, i dipendenti che guadagnano più della media <i>del proprio</i> reparto:</p>
        <pre>SELECT d.nome, d.reparto, d.stipendio
FROM dipendenti d
WHERE d.stipendio &gt; (SELECT AVG(x.stipendio)
                     FROM dipendenti x
                     WHERE x.reparto = d.reparto);</pre>`,
      esempio: 'SELECT d.nome, d.reparto, d.stipendio\nFROM dipendenti d\nWHERE d.stipendio > (SELECT AVG(x.stipendio)\n                     FROM dipendenti x\n                     WHERE x.reparto = d.reparto);',
      compito: 'Per ogni categoria trova il <b>prodotto più caro</b>: mostra <b>nome</b> del prodotto, <b>categoria_id</b> e <b>prezzo</b>.',
      suggerimento: 'WHERE p.prezzo = (SELECT MAX(x.prezzo) FROM prodotti x WHERE x.categoria_id = p.categoria_id)',
      soluzione: 'SELECT p.nome, p.categoria_id, p.prezzo\nFROM prodotti p\nWHERE p.prezzo = (SELECT MAX(x.prezzo)\n                  FROM prodotti x\n                  WHERE x.categoria_id = p.categoria_id);'
    },

    /* ===================== AVANZATO ===================== */
    {
      id: 'avanzato-1', modulo: 'avanzato', livello: 4, titolo: 'Query in chiaro con WITH',
      teoria: `
        <p>Con <code>WITH</code> (una <b>CTE</b>, Common Table Expression) dai un nome a una subquery e la usi dopo come se fosse una tabella. Le query complesse diventano molto più leggibili.</p>
        <pre>WITH pezzi_per_ordine AS (
  SELECT ordine_id, SUM(quantita) AS pezzi
  FROM dettagli_ordine
  GROUP BY ordine_id
)
SELECT ordine_id, pezzi
FROM pezzi_per_ordine
WHERE pezzi &gt;= 3;</pre>`,
      esempio: 'WITH pezzi_per_ordine AS (\n  SELECT ordine_id, SUM(quantita) AS pezzi\n  FROM dettagli_ordine\n  GROUP BY ordine_id\n)\nSELECT ordine_id, pezzi\nFROM pezzi_per_ordine\nWHERE pezzi >= 3;',
      compito: 'Usando WITH, calcola il <b>totale speso</b> da ogni cliente (ordini non annullati) e mostra <b>nome</b>, <b>cognome</b> e <b>totale</b> solo per chi ha speso <b>più di 500 euro</b>.',
      suggerimento: "Nella CTE: cliente_id e SUM(quantita * prezzo_unitario) da dettagli_ordine JOIN ordini, con WHERE stato <> 'annullato' e GROUP BY cliente_id. Poi JOIN con clienti e WHERE totale > 500.",
      soluzione: "WITH spesa AS (\n  SELECT o.cliente_id, SUM(d.quantita * d.prezzo_unitario) AS totale\n  FROM dettagli_ordine d\n  JOIN ordini o ON d.ordine_id = o.id\n  WHERE o.stato <> 'annullato'\n  GROUP BY o.cliente_id\n)\nSELECT c.nome, c.cognome, s.totale\nFROM spesa s\nJOIN clienti c ON c.id = s.cliente_id\nWHERE s.totale > 500;"
    },
    {
      id: 'avanzato-2', modulo: 'avanzato', livello: 4, titolo: 'Unire risultati: UNION',
      teoria: `
        <p><code>UNION</code> mette uno sotto l'altro i risultati di due SELECT con lo stesso numero di colonne, <b>togliendo i doppioni</b>. <code>UNION ALL</code> li tiene tutti (ed è più veloce).</p>
        <pre>SELECT citta FROM clienti
UNION
SELECT 'Udine';</pre>
        <p class="tip">Esistono anche <code>INTERSECT</code> (solo le righe comuni) ed <code>EXCEPT</code> (le righe della prima che non sono nella seconda).</p>`,
      esempio: "SELECT citta FROM clienti\nUNION\nSELECT 'Udine';",
      compito: 'Crea un\'unica lista dei <b>nomi di battesimo</b> di clienti e dipendenti, <b>senza doppioni</b>.',
      suggerimento: 'SELECT nome FROM clienti UNION SELECT nome FROM dipendenti',
      soluzione: 'SELECT nome FROM clienti\nUNION\nSELECT nome FROM dipendenti;'
    },
    {
      id: 'avanzato-3', modulo: 'avanzato', livello: 5, titolo: 'Numerare con ROW_NUMBER',
      teoria: `
        <p>Le <b>funzioni finestra</b> (<code>OVER</code>) calcolano un valore per ogni riga guardando anche le altre, <b>senza raggrupparle</b>. <code>ROW_NUMBER()</code> numera le righe nell'ordine indicato:</p>
        <pre>SELECT nome, prezzo,
       ROW_NUMBER() OVER (ORDER BY prezzo DESC) AS posizione
FROM prodotti;</pre>`,
      esempio: 'SELECT nome, prezzo,\n       ROW_NUMBER() OVER (ORDER BY prezzo DESC) AS posizione\nFROM prodotti;',
      compito: 'Numera i dipendenti dallo <b>stipendio più alto</b> (a parità di stipendio in ordine di <b>cognome</b>): mostra <b>nome</b>, <b>stipendio</b> e <b>posizione</b>.',
      suggerimento: 'ROW_NUMBER() OVER (ORDER BY stipendio DESC, cognome)',
      soluzione: 'SELECT nome, stipendio,\n       ROW_NUMBER() OVER (ORDER BY stipendio DESC, cognome) AS posizione\nFROM dipendenti;'
    },
    {
      id: 'avanzato-4', modulo: 'avanzato', livello: 5, titolo: 'Classifiche per gruppo: RANK',
      teoria: `
        <p><code>PARTITION BY</code> fa ripartire il calcolo per ogni gruppo. <code>RANK()</code> è come ROW_NUMBER ma, a parità di valore, assegna la <b>stessa posizione</b> (e poi salta: 1, 1, 3…). <code>DENSE_RANK()</code> non salta (1, 1, 2…).</p>
        <pre>SELECT categoria_id, nome, prezzo,
       RANK() OVER (PARTITION BY categoria_id ORDER BY prezzo DESC) AS pos
FROM prodotti;</pre>`,
      esempio: 'SELECT categoria_id, nome, prezzo,\n       RANK() OVER (PARTITION BY categoria_id ORDER BY prezzo DESC) AS pos\nFROM prodotti;',
      compito: 'Fai la <b>classifica degli stipendi dentro ogni reparto</b> con RANK (dal più alto): <b>reparto</b>, <b>nome</b>, <b>stipendio</b> e <b>posizione</b>.',
      suggerimento: 'RANK() OVER (PARTITION BY reparto ORDER BY stipendio DESC)',
      soluzione: 'SELECT reparto, nome, stipendio,\n       RANK() OVER (PARTITION BY reparto ORDER BY stipendio DESC) AS posizione\nFROM dipendenti;'
    },
    {
      id: 'avanzato-5', modulo: 'avanzato', livello: 5, titolo: 'Totali progressivi',
      teoria: `
        <p>Le funzioni di aggregazione possono diventare funzioni finestra: <code>SUM(x) OVER (ORDER BY …)</code> calcola una <b>somma progressiva</b>, riga dopo riga.</p>
        <pre>SELECT id, data_ordine,
       COUNT(*) OVER (ORDER BY data_ordine) AS ordini_finora
FROM ordini;</pre>`,
      esempio: 'SELECT id, data_ordine,\n       COUNT(*) OVER (ORDER BY data_ordine) AS ordini_finora\nFROM ordini;',
      compito: 'Mostra la crescita dei clienti nel tempo: <b>cognome</b>, <b>data_iscrizione</b> e il <b>numero di iscritti fino a quella data</b> (compresa).',
      suggerimento: 'COUNT(*) OVER (ORDER BY data_iscrizione)',
      soluzione: 'SELECT cognome, data_iscrizione,\n       COUNT(*) OVER (ORDER BY data_iscrizione) AS iscritti_totali\nFROM clienti;'
    },
    {
      id: 'avanzato-6', modulo: 'avanzato', livello: 5, titolo: 'Confronti con la media del gruppo',
      teoria: `
        <p>Con <code>AVG(x) OVER (PARTITION BY …)</code> ogni riga "vede" la media del suo gruppo, e puoi fare calcoli tra il valore della riga e quella media.</p>
        <pre>SELECT nome, categoria_id, prezzo,
       ROUND(AVG(prezzo) OVER (PARTITION BY categoria_id), 2) AS media_categoria
FROM prodotti;</pre>`,
      esempio: 'SELECT nome, categoria_id, prezzo,\n       ROUND(AVG(prezzo) OVER (PARTITION BY categoria_id), 2) AS media_categoria\nFROM prodotti;',
      compito: 'Per ogni dipendente mostra <b>nome</b>, <b>reparto</b>, <b>stipendio</b> e la <b>differenza</b> tra il suo stipendio e la media del suo reparto, arrotondata a 2 decimali.',
      suggerimento: 'ROUND(stipendio - AVG(stipendio) OVER (PARTITION BY reparto), 2)',
      soluzione: 'SELECT nome, reparto, stipendio,\n       ROUND(stipendio - AVG(stipendio) OVER (PARTITION BY reparto), 2) AS differenza\nFROM dipendenti;'
    },

    /* ===================== MODIFICARE I DATI ===================== */
    {
      id: 'modifica-1', modulo: 'modifica', livello: 3, titolo: 'Aggiungere righe: INSERT', tipo: 'modifica',
      verifica: 'SELECT * FROM clienti ORDER BY id;',
      teoria: `
        <p><code>INSERT INTO</code> aggiunge una riga: indichi le colonne e poi, nello stesso ordine, i valori.</p>
        <pre>INSERT INTO categorie (id, nome)
VALUES (6, 'Musica');</pre>
        <p class="tip">Se ometti una colonna <code>INTEGER PRIMARY KEY</code> (come id), SQLite le assegna da solo il numero successivo. Qui ogni esercizio parte da una copia nuova del database: puoi sbagliare senza paura.</p>`,
      esempio: "INSERT INTO categorie (id, nome)\nVALUES (6, 'Musica');\n\nSELECT * FROM categorie;",
      compito: 'Aggiungi il cliente <b>Giovanni Verdi</b>, di <b>Trieste</b>, email <b>giovanni.verdi@email.it</b>, iscritto il <b>2025-03-01</b> (avrà id 13).',
      suggerimento: "INSERT INTO clienti (nome, cognome, citta, email, data_iscrizione) VALUES ('Giovanni', 'Verdi', …)",
      soluzione: "INSERT INTO clienti (id, nome, cognome, citta, email, data_iscrizione)\nVALUES (13, 'Giovanni', 'Verdi', 'Trieste', 'giovanni.verdi@email.it', '2025-03-01');"
    },
    {
      id: 'modifica-2', modulo: 'modifica', livello: 3, titolo: 'Cambiare valori: UPDATE', tipo: 'modifica',
      verifica: 'SELECT id, ROUND(prezzo, 2) AS prezzo FROM prodotti ORDER BY id;',
      teoria: `
        <p><code>UPDATE</code> cambia i valori delle righe che rispettano il WHERE.</p>
        <pre>UPDATE prodotti
SET disponibili = disponibili + 10
WHERE id = 4;</pre>
        <p class="tip">⚠ Senza WHERE l'UPDATE cambia <b>tutte</b> le righe della tabella! Prima di eseguirlo, prova la stessa condizione con un SELECT.</p>`,
      esempio: 'UPDATE prodotti\nSET disponibili = disponibili + 10\nWHERE id = 4;\n\nSELECT id, nome, disponibili FROM prodotti WHERE id = 4;',
      compito: 'Aumenta del <b>10%</b> il prezzo di tutti i prodotti della categoria <b>Libri</b> (categoria_id = 2).',
      suggerimento: 'UPDATE prodotti SET prezzo = prezzo * 1.10 WHERE categoria_id = 2',
      soluzione: 'UPDATE prodotti\nSET prezzo = prezzo * 1.10\nWHERE categoria_id = 2;'
    },
    {
      id: 'modifica-3', modulo: 'modifica', livello: 3, titolo: 'Cancellare righe: DELETE', tipo: 'modifica',
      verifica: 'SELECT * FROM ordini ORDER BY id;',
      teoria: `
        <p><code>DELETE FROM</code> elimina le righe che rispettano il WHERE.</p>
        <pre>DELETE FROM dettagli_ordine
WHERE quantita = 0;</pre>
        <p class="tip">⚠ Come per UPDATE: senza WHERE cancella <b>tutto</b>. Nei database veri si lavora spesso dentro una transazione (<code>BEGIN</code> … <code>COMMIT</code> o <code>ROLLBACK</code>) per poter tornare indietro.</p>`,
      esempio: "DELETE FROM ordini\nWHERE id = 18;\n\nSELECT COUNT(*) AS ordini_rimasti FROM ordini;",
      compito: 'Elimina tutti gli ordini con stato <b>\'annullato\'</b>.',
      suggerimento: "DELETE FROM ordini WHERE stato = 'annullato'",
      soluzione: "DELETE FROM ordini\nWHERE stato = 'annullato';"
    },
    {
      id: 'modifica-4', modulo: 'modifica', livello: 4, titolo: 'UPDATE con subquery', tipo: 'modifica',
      verifica: 'SELECT id, disponibili FROM prodotti ORDER BY id;',
      teoria: `
        <p>Il WHERE di un UPDATE o di un DELETE può contenere una subquery, per scegliere le righe in base ad altre tabelle.</p>
        <pre>UPDATE clienti
SET email = NULL
WHERE id IN (SELECT cliente_id FROM ordini WHERE stato = 'annullato');</pre>`,
      esempio: "UPDATE clienti\nSET email = NULL\nWHERE id IN (SELECT cliente_id FROM ordini WHERE stato = 'annullato');\n\nSELECT nome, email FROM clienti;",
      compito: 'Metti a <b>0</b> le quantità <b>disponibili</b> dei prodotti che <b>non sono mai stati ordinati</b>.',
      suggerimento: 'UPDATE prodotti SET disponibili = 0 WHERE id NOT IN (SELECT prodotto_id FROM dettagli_ordine)',
      soluzione: 'UPDATE prodotti\nSET disponibili = 0\nWHERE id NOT IN (SELECT prodotto_id FROM dettagli_ordine);'
    },
    {
      id: 'modifica-5', modulo: 'modifica', livello: 4, titolo: 'Creare tabelle: CREATE TABLE', tipo: 'modifica',
      verifica: "SELECT name, UPPER(type) AS tipo, \"notnull\", pk FROM pragma_table_info('fornitori');",
      teoria: `
        <p><code>CREATE TABLE</code> crea una nuova tabella: per ogni colonna indichi nome, tipo ed eventuali <b>vincoli</b>.</p>
        <table class="mini">
          <tr><td><code>INTEGER</code>, <code>REAL</code>, <code>TEXT</code></td><td>tipi principali (numero intero, decimale, testo)</td></tr>
          <tr><td><code>PRIMARY KEY</code></td><td>identifica in modo unico ogni riga</td></tr>
          <tr><td><code>NOT NULL</code></td><td>il valore è obbligatorio</td></tr>
          <tr><td><code>UNIQUE</code>, <code>DEFAULT</code>, <code>CHECK</code></td><td>niente doppioni, valore predefinito, controllo</td></tr>
        </table>
        <pre>CREATE TABLE recensioni (
  id          INTEGER PRIMARY KEY,
  prodotto_id INTEGER NOT NULL,
  voto        INTEGER CHECK (voto BETWEEN 1 AND 5),
  testo       TEXT
);</pre>`,
      esempio: "CREATE TABLE recensioni (\n  id          INTEGER PRIMARY KEY,\n  prodotto_id INTEGER NOT NULL,\n  voto        INTEGER CHECK (voto BETWEEN 1 AND 5),\n  testo       TEXT\n);\n\nINSERT INTO recensioni (prodotto_id, voto, testo) VALUES (2, 5, 'Ottime!');\nSELECT * FROM recensioni;",
      compito: 'Crea la tabella <b>fornitori</b> con tre colonne, in quest\'ordine: <b>id</b> (INTEGER, chiave primaria), <b>nome</b> (TEXT, obbligatorio) e <b>citta</b> (TEXT).',
      suggerimento: 'CREATE TABLE fornitori (id INTEGER PRIMARY KEY, nome TEXT NOT NULL, citta TEXT);',
      soluzione: 'CREATE TABLE fornitori (\n  id    INTEGER PRIMARY KEY,\n  nome  TEXT NOT NULL,\n  citta TEXT\n);'
    },
    {
      id: 'modifica-6', modulo: 'modifica', livello: 5, titolo: 'Viste: CREATE VIEW', tipo: 'modifica',
      verifica: 'SELECT cliente_id, ROUND(totale, 2) FROM vendite_per_cliente ORDER BY cliente_id;',
      teoria: `
        <p>Una <b>vista</b> è una query salvata con un nome: la usi come una tabella, ma i dati vengono ricalcolati ogni volta. Comodo per i report che servono spesso.</p>
        <pre>CREATE VIEW prodotti_esauriti AS
SELECT id, nome
FROM prodotti
WHERE disponibili = 0;

SELECT * FROM prodotti_esauriti;</pre>`,
      esempio: 'CREATE VIEW prodotti_esauriti AS\nSELECT id, nome\nFROM prodotti\nWHERE disponibili = 0;\n\nSELECT * FROM prodotti_esauriti;',
      compito: 'Crea la vista <b>vendite_per_cliente</b> con le colonne <b>cliente_id</b> e <b>totale</b> (somma di quantita × prezzo_unitario di tutti i suoi ordini).',
      suggerimento: 'CREATE VIEW vendite_per_cliente AS SELECT o.cliente_id, SUM(d.quantita * d.prezzo_unitario) AS totale FROM ordini o JOIN dettagli_ordine d ON d.ordine_id = o.id GROUP BY o.cliente_id;',
      soluzione: 'CREATE VIEW vendite_per_cliente AS\nSELECT o.cliente_id, SUM(d.quantita * d.prezzo_unitario) AS totale\nFROM ordini o\nJOIN dettagli_ordine d ON d.ordine_id = o.id\nGROUP BY o.cliente_id;'
    },
    {
      id: 'modifica-7', modulo: 'modifica', livello: 5, titolo: 'Indici per la velocità', tipo: 'modifica',
      verifica: "SELECT m.name, m.tbl_name, i.name AS colonna FROM sqlite_master m, pragma_index_info(m.name) i WHERE m.type = 'index' AND m.name = 'idx_ordini_cliente';",
      teoria: `
        <p>Un <b>indice</b> è come l'indice di un libro: permette al database di trovare subito le righe con un certo valore senza leggere tutta la tabella. Conviene sulle colonne usate spesso in WHERE e JOIN.</p>
        <pre>CREATE INDEX idx_prodotti_categoria
ON prodotti (categoria_id);</pre>
        <p class="tip">Gli indici velocizzano le letture ma rallentano un po' INSERT e UPDATE: si creano solo dove servono. Con <code>EXPLAIN QUERY PLAN</code> davanti a una SELECT vedi se un indice viene usato.</p>`,
      esempio: "CREATE INDEX idx_prodotti_categoria\nON prodotti (categoria_id);\n\nEXPLAIN QUERY PLAN\nSELECT * FROM prodotti WHERE categoria_id = 2;",
      compito: 'Crea un indice chiamato <b>idx_ordini_cliente</b> sulla colonna <b>cliente_id</b> della tabella <b>ordini</b>.',
      suggerimento: 'CREATE INDEX idx_ordini_cliente ON ordini (cliente_id);',
      soluzione: 'CREATE INDEX idx_ordini_cliente\nON ordini (cliente_id);'
    }
  ];

  const XP_LIVELLO = { 1: 10, 2: 15, 3: 20, 4: 30, 5: 40 };
  lezioni.forEach((l) => { l.tipo = l.tipo || 'risultato'; l.xp = XP_LIVELLO[l.livello]; });
  return { moduli, lezioni };
});

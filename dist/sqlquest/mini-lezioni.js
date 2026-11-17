/* SQLQuest — Mini-lezioni: spiegazione veloce di ogni esercizio (bottone «🎓 Mini-lezione» / «🎓 Spiega»).
   Per ogni id di esercizio (lezioni.js):
     goal    cosa chiede l'esercizio
     idea    il concetto chiave, con un paragone
     example un esempio simile (NON la soluzione): code (SQL, righe <= 38 caratteri), note.
             Il risultato non è scritto qui: il programma esegue la query sul database e mostra la tabella.
     steps   3-5 passi per risolvere
     traps   1-3 errori da evitare
   Nei testi è ammesso solo <code>, <b>, <i>; i caratteri < > vanno scritti &lt; &gt; (non in example.code).
   Scritte da Claude (base, filtri, ordine, funzioni, aggrega) e Codex (join, sub, avanzato, modifica).
   Controllo: node sqlquest-test/verifica_mini_sql.js dist/sqlquest/mini-lezioni.js SQL_MINI_LESSONS */
window.SQL_MINI_LESSONS = {
  'base-1': {
    goal: `Leggere <b>tutta</b> la tabella dei prodotti: tutte le colonne e tutte le righe, senza filtri.`,
    idea: `Una tabella è come un foglio di calcolo: le <b>colonne</b> sono le intestazioni, le <b>righe</b> sono i singoli elementi. <code>SELECT</code> dice <i>cosa</i> vuoi vedere, <code>FROM</code> dice <i>da quale tabella</i>. L'asterisco <code>*</code> vuol dire «tutte le colonne».`,
    example: {
      code: `SELECT *
FROM categorie;`,
      note: `Qui leggiamo la piccola tabella <code>categorie</code>: escono tutte le sue colonne (id e nome) e tutte le sue righe.`
    },
    steps: [
      `Scrivi <code>SELECT</code> seguito dall'asterisco <code>*</code>.`,
      `Aggiungi <code>FROM</code> e il nome della tabella che ti serve (la trovi nella scheda 🗂 Tabelle).`,
      `Chiudi con il punto e virgola e premi ▶ Esegui per vedere il risultato.`
    ],
    traps: [
      `Il nome della tabella va scritto esattamente come nel database: <code>prodotti</code>, non <code>prodotto</code>.`,
      `Non aggiungere <code>WHERE</code> o <code>LIMIT</code>: l'esercizio vuole tutte le righe.`
    ]
  },
  'base-2': {
    goal: `Mostrare solo <b>due colonne</b> dei prodotti: il nome e il prezzo.`,
    idea: `Invece dell'asterisco puoi elencare le colonne che ti interessano, separate da virgole. È come fotocopiare solo due colonne di un registro: le righe restano tutte, ma vedi solo ciò che serve.`,
    example: {
      code: `SELECT nome, ruolo
FROM dipendenti;`,
      note: `Dalla tabella <code>dipendenti</code> prendiamo solo nome e ruolo, nell'ordine in cui li scriviamo.`
    },
    steps: [
      `Dopo <code>SELECT</code> scrivi la prima colonna.`,
      `Metti una virgola e scrivi la seconda colonna.`,
      `Completa con <code>FROM</code> e la tabella giusta.`
    ],
    traps: [
      `Niente virgola dopo l'ultima colonna, prima di <code>FROM</code>: dà errore di sintassi.`,
      `Controlla i nomi delle colonne nella scheda 🗂 Tabelle: un errore di battitura dà «la colonna non esiste».`
    ]
  },
  'base-3': {
    goal: `Mostrare nome e prezzo dei prodotti, ma con le <b>intestazioni</b> delle colonne cambiate.`,
    idea: `<code>AS</code> dà un <b>soprannome</b> (alias) a una colonna del risultato. La tabella non cambia: cambia solo il titolo che vedi in cima alla colonna, come un'etichetta incollata sopra.`,
    example: {
      code: `SELECT nome AS dipendente,
  reparto AS ufficio
FROM dipendenti;`,
      note: `I valori sono quelli di sempre: cambiano solo i titoli delle colonne, <code>dipendente</code> e <code>ufficio</code>.`
    },
    steps: [
      `Elenca le colonne che servono dopo <code>SELECT</code>.`,
      `Dopo ogni colonna scrivi <code>AS</code> e il nuovo titolo richiesto.`,
      `Controlla che i titoli siano scritti esattamente come chiede l'esercizio.`
    ],
    traps: [
      `Qui la verifica controlla anche i <b>nomi</b> delle colonne: senza <code>AS</code> il risultato non è accettato.`,
      `Un alias con spazi andrebbe tra virgolette: usa nomi con il trattino basso, come chiede l'esercizio.`
    ]
  },
  'base-4': {
    goal: `Aggiungere una colonna <b>calcolata</b>: il prezzo con l'IVA, con un titolo preciso.`,
    idea: `Nel <code>SELECT</code> puoi fare calcoli come con una calcolatrice: <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>. Il calcolo viene ripetuto per ogni riga, come una formula trascinata in un foglio di calcolo.`,
    example: {
      code: `SELECT nome,
  stipendio * 12 AS annuale
FROM dipendenti;`,
      note: `Per ogni dipendente moltiplichiamo lo stipendio mensile per 12. Con <code>AS</code> la nuova colonna ha un nome chiaro.`
    },
    steps: [
      `Scrivi la colonna del nome dopo <code>SELECT</code>.`,
      `Aggiungi il calcolo sulla colonna del prezzo, con l'operatore giusto.`,
      `Dai alla colonna calcolata il nome richiesto con <code>AS</code>.`
    ],
    traps: [
      `Nei numeri decimali si usa il <b>punto</b>: <code>1.22</code>, non <code>1,22</code> (la virgola separa le colonne!).`,
      `Senza <code>AS</code> la colonna si chiama come il calcolo e la verifica la rifiuta.`
    ]
  },
  'base-5': {
    goal: `Ottenere l'elenco delle città dei clienti, ognuna <b>una volta sola</b>.`,
    idea: `<code>DISTINCT</code> toglie le righe ripetute dal risultato. È come fare l'appello delle città: se tanti clienti sono di Roma, Roma la scrivi una volta.`,
    example: {
      code: `SELECT DISTINCT reparto
FROM dipendenti;`,
      note: `Ogni reparto compare una volta, anche se ci lavorano più persone.`
    },
    steps: [
      `Scrivi <code>SELECT DISTINCT</code>.`,
      `Aggiungi solo la colonna di cui vuoi i valori unici.`,
      `Completa con <code>FROM</code> e la tabella dei clienti.`
    ],
    traps: [
      `Se aggiungi altre colonne, <code>DISTINCT</code> guarda la riga intera e le ripetizioni tornano.`,
      `<code>DISTINCT</code> va subito dopo <code>SELECT</code>, non in fondo alla query.`
    ]
  },
  'base-6': {
    goal: `Mostrare solo le <b>prime 5 righe</b> della tabella clienti, con tutte le colonne.`,
    idea: `<code>LIMIT</code> dice quante righe al massimo vuoi vedere. È come chiedere «fammi vedere solo le prime pagine»: utile per dare un'occhiata a una tabella grande.`,
    example: {
      code: `SELECT nome, stipendio
FROM dipendenti
LIMIT 2;`,
      note: `Di tutte le righe dei dipendenti ne teniamo solo 2, le prime della tabella.`
    },
    steps: [
      `Parti da <code>SELECT *</code> con <code>FROM</code> e la tabella giusta.`,
      `In fondo alla query aggiungi <code>LIMIT</code>.`,
      `Dopo <code>LIMIT</code> scrivi quante righe vuoi.`
    ],
    traps: [
      `<code>LIMIT</code> va sempre <b>alla fine</b> della query.`,
      `Il numero va scritto senza apici: <code>LIMIT 5</code>, non <code>LIMIT '5'</code>.`
    ]
  },
  'filtri-1': {
    goal: `Tenere solo i clienti di <b>una città</b> precisa, con tutte le colonne.`,
    idea: `<code>WHERE</code> è un setaccio: passa solo le righe per cui la condizione è vera. I testi si scrivono tra apici singoli, <code>'così'</code>; i numeri senza.`,
    example: {
      code: `SELECT nome, ruolo
FROM dipendenti
WHERE reparto = 'Vendite';`,
      note: `Restano solo i dipendenti del reparto Vendite.`
    },
    steps: [
      `Scrivi <code>SELECT *</code> e <code>FROM</code> con la tabella dei clienti.`,
      `Aggiungi <code>WHERE</code> seguito dalla colonna della città.`,
      `Confrontala con <code>=</code> e il nome della città tra apici singoli.`
    ],
    traps: [
      `Il testo deve essere scritto come nel database: <code>'Milano'</code> con la M maiuscola.`,
      `Senza apici SQL pensa che <code>Milano</code> sia il nome di una colonna e dà errore.`
    ]
  },
  'filtri-2': {
    goal: `Trovare i prodotti che costano <b>più di</b> 100 euro, mostrando nome e prezzo.`,
    idea: `Con i numeri puoi confrontare: <code>&gt;</code> maggiore, <code>&lt;</code> minore, <code>&gt;=</code> maggiore o uguale, <code>&lt;=</code> minore o uguale. Come un buttafuori che lascia entrare solo chi supera una soglia.`,
    example: {
      code: `SELECT nome, stipendio
FROM dipendenti
WHERE stipendio >= 3000;`,
      note: `Restano i dipendenti con stipendio di almeno 3000 euro. I numeri si scrivono senza apici.`
    },
    steps: [
      `Scegli le colonne nome e prezzo dalla tabella dei prodotti.`,
      `Aggiungi <code>WHERE</code> con la colonna del prezzo.`,
      `Usa il segno di confronto giusto per «più di» e il numero, senza apici.`
    ],
    traps: [
      `«Più di 100» vuol dire <code>&gt;</code>, non <code>&gt;=</code>: un prodotto da 100 euro esatti non deve uscire.`,
      `Niente simbolo dell'euro né punto delle migliaia nel numero.`
    ]
  },
  'filtri-3': {
    goal: `Trovare i prodotti che rispettano <b>due condizioni insieme</b>: categoria Elettronica e prezzo sotto i 200 euro.`,
    idea: `<code>AND</code> vuole che <b>tutte</b> le condizioni siano vere; <code>OR</code> si accontenta che <b>almeno una</b> lo sia. Come al ristorante: «primo E dolce» è più esigente di «primo O dolce».`,
    example: {
      code: `SELECT nome, stipendio
FROM dipendenti
WHERE reparto = 'Vendite'
  AND stipendio > 2200;`,
      note: `Escono solo i dipendenti che sono in Vendite <i>e</i> guadagnano più di 2200 euro.`
    },
    steps: [
      `Scegli nome e prezzo dalla tabella dei prodotti.`,
      `Scrivi la prima condizione sulla categoria (Elettronica ha id 1).`,
      `Unisci la seconda condizione, sul prezzo, con <code>AND</code>.`
    ],
    traps: [
      `Con <code>OR</code> usciresti anche prodotti di altre categorie: qui servono entrambe le condizioni.`,
      `La categoria è un numero nella colonna <code>categoria_id</code>, non il testo 'Elettronica'.`
    ]
  },
  'filtri-4': {
    goal: `Trovare i clienti che abitano in <b>una di tre città</b>, mostrando nome, cognome e città.`,
    idea: `<code>IN (...)</code> controlla se un valore è dentro una lista. È come la lista degli invitati a una festa: entri se il tuo nome c'è. Sostituisce tanti <code>OR</code> di fila.`,
    example: {
      code: `SELECT nome, reparto
FROM dipendenti
WHERE reparto IN
  ('Vendite', 'Magazzino');`,
      note: `Escono i dipendenti che lavorano in Vendite oppure in Magazzino.`
    },
    steps: [
      `Scegli nome, cognome e città dalla tabella dei clienti.`,
      `Scrivi <code>WHERE</code> con la colonna della città e <code>IN</code>.`,
      `Tra parentesi elenca le tre città, ognuna tra apici, separate da virgole.`
    ],
    traps: [
      `Ogni città va tra apici: <code>('Roma', 'Napoli', ...)</code>.`,
      `Le parentesi intorno alla lista sono obbligatorie.`
    ]
  },
  'filtri-5': {
    goal: `Trovare gli ordini fatti in un <b>intervallo di date</b>, estremi compresi.`,
    idea: `<code>BETWEEN a AND b</code> tiene i valori da <i>a</i> a <i>b</i>, <b>compresi</b> gli estremi. Le date qui sono testi nel formato <code>'AAAA-MM-GG'</code>, che si ordinano bene come le date vere.`,
    example: {
      code: `SELECT nome, data_assunzione
FROM dipendenti
WHERE data_assunzione
  BETWEEN '2019-01-01'
  AND '2020-12-31';`,
      note: `Escono i dipendenti assunti tra l'inizio del 2019 e la fine del 2020.`
    },
    steps: [
      `Prendi tutte le colonne della tabella degli ordini.`,
      `Scrivi <code>WHERE</code> con la colonna della data dell'ordine e <code>BETWEEN</code>.`,
      `Metti la data di inizio, <code>AND</code>, la data di fine: entrambe tra apici e nel formato anno-mese-giorno.`
    ],
    traps: [
      `Scrivi le date come <code>'2024-03-01'</code>, non <code>'01/03/2024'</code>.`,
      `Prima la data più piccola, poi la più grande: al contrario non esce nulla.`
    ]
  },
  'filtri-6': {
    goal: `Trovare i prodotti il cui nome <b>inizia</b> con una certa lettera.`,
    idea: `<code>LIKE</code> confronta il testo con uno <b>schema</b>: <code>%</code> vale «qualunque testo, anche nessuno», <code>_</code> vale «un carattere qualsiasi». Come cercare in rubrica «tutti quelli che iniziano per B».`,
    example: {
      code: `SELECT nome, cognome
FROM clienti
WHERE cognome LIKE 'B%';`,
      note: `<code>'B%'</code> vuol dire: una B all'inizio e poi qualsiasi cosa.`
    },
    steps: [
      `Scegli la colonna del nome dalla tabella dei prodotti.`,
      `Scrivi <code>WHERE</code> con la colonna del nome e <code>LIKE</code>.`,
      `Scrivi lo schema tra apici: la lettera iniziale seguita da <code>%</code>.`
    ],
    traps: [
      `Con <code>'%S'</code> trovi i nomi che <i>finiscono</i> per S, con <code>'%S%'</code> quelli che la <i>contengono</i>.`,
      `Con <code>=</code> al posto di <code>LIKE</code> il simbolo <code>%</code> non funziona da jolly.`
    ]
  },
  'filtri-7': {
    goal: `Trovare i clienti a cui <b>manca</b> l'indirizzo email.`,
    idea: `<code>NULL</code> vuol dire «valore mancante, sconosciuto»: non è zero e non è un testo vuoto. Siccome è sconosciuto, non si confronta con <code>=</code>: si chiede <code>IS NULL</code> (o <code>IS NOT NULL</code>).`,
    example: {
      code: `SELECT nome, ruolo
FROM dipendenti
WHERE responsabile_id
  IS NULL;`,
      note: `Escono i dipendenti senza responsabile: in quella colonna il valore manca.`
    },
    steps: [
      `Scegli nome e cognome dalla tabella dei clienti.`,
      `Scrivi <code>WHERE</code> con la colonna dell'email.`,
      `Completa con <code>IS NULL</code>.`
    ],
    traps: [
      `<code>email = NULL</code> non trova mai niente: con NULL serve <code>IS NULL</code>.`,
      `Non scrivere <code>'NULL'</code> tra apici: sarebbe la parola NULL, un testo.`
    ]
  },
  'filtri-8': {
    goal: `Mostrare gli ordini il cui stato <b>non è</b> «consegnato».`,
    idea: `Per escludere si usa <code>&lt;&gt;</code> (diverso da, si può scrivere anche <code>!=</code>) oppure <code>NOT</code> davanti a una condizione. È il contrario di <code>=</code>: passa tutto tranne quel valore.`,
    example: {
      code: `SELECT nome, reparto
FROM dipendenti
WHERE reparto <> 'Vendite';`,
      note: `Escono tutti i dipendenti tranne quelli del reparto Vendite.`
    },
    steps: [
      `Scegli id, data dell'ordine e stato dalla tabella degli ordini.`,
      `Scrivi <code>WHERE</code> con la colonna dello stato.`,
      `Usa l'operatore «diverso da» e il valore tra apici.`
    ],
    traps: [
      `Il valore va scritto come nel database: <code>'consegnato'</code>, tutto minuscolo.`,
      `Attenzione alle colonne richieste: id, data_ordine e stato, in quest'ordine.`
    ]
  },
  'ordine-1': {
    goal: `Elencare i prodotti con il prezzo, <b>dal più economico</b> al più caro.`,
    idea: `<code>ORDER BY</code> mette in fila le righe in base a una colonna. Senza altre indicazioni l'ordine è <b>crescente</b> (<code>ASC</code>): dal più piccolo al più grande, dalla A alla Z.`,
    example: {
      code: `SELECT nome, stipendio
FROM dipendenti
ORDER BY stipendio;`,
      note: `I dipendenti escono in fila dallo stipendio più basso a quello più alto.`
    },
    steps: [
      `Scegli nome e prezzo dalla tabella dei prodotti.`,
      `In fondo aggiungi <code>ORDER BY</code>.`,
      `Indica la colonna del prezzo: crescente è il verso predefinito.`
    ],
    traps: [
      `Qui la verifica controlla anche l'<b>ordine</b> delle righe: senza <code>ORDER BY</code> non basta.`,
      `<code>DESC</code> darebbe il verso opposto, dal più caro al più economico.`
    ]
  },
  'ordine-2': {
    goal: `Ordinare i clienti per <b>due criteri</b>: prima la città (A→Z), poi, nella stessa città, il cognome (Z→A).`,
    idea: `Dopo <code>ORDER BY</code> puoi mettere più colonne separate da virgole: la seconda decide solo quando la prima è uguale. Ogni colonna ha il suo verso, <code>ASC</code> o <code>DESC</code>. Come un elenco telefonico diviso per città.`,
    example: {
      code: `SELECT categoria_id, nome
FROM prodotti
ORDER BY categoria_id,
  nome DESC;`,
      note: `Prima per categoria crescente; dentro la stessa categoria, nomi dalla Z alla A.`
    },
    steps: [
      `Scegli nome, cognome e città dalla tabella dei clienti.`,
      `Scrivi <code>ORDER BY</code> con la città come primo criterio.`,
      `Dopo una virgola aggiungi il cognome con <code>DESC</code>.`
    ],
    traps: [
      `<code>DESC</code> vale solo per la colonna subito prima: la città resta crescente.`,
      `L'ordine dei criteri conta: prima la città, poi il cognome.`
    ]
  },
  'ordine-3': {
    goal: `Fare una <b>classifica</b>: i 3 prodotti più cari, partendo dal più caro.`,
    idea: `Per una «top N» si combinano due cose: <code>ORDER BY ... DESC</code> mette in cima i valori più grandi, <code>LIMIT</code> taglia la lista. Come il podio: prima ordini i concorrenti, poi prendi i primi tre.`,
    example: {
      code: `SELECT nome, stipendio
FROM dipendenti
ORDER BY stipendio DESC
LIMIT 2;`,
      note: `I 2 dipendenti con lo stipendio più alto, dal più alto.`
    },
    steps: [
      `Scegli nome e prezzo dalla tabella dei prodotti.`,
      `Ordina per prezzo in verso decrescente.`,
      `In fondo aggiungi <code>LIMIT</code> con quanti prodotti vuoi.`
    ],
    traps: [
      `Senza <code>DESC</code> otterresti i 3 prodotti <i>più economici</i>.`,
      `<code>LIMIT</code> va dopo <code>ORDER BY</code>, non prima.`
    ]
  },
  'ordine-4': {
    goal: `Nella classifica dei prodotti dal più caro, prendere le posizioni <b>dalla 4ª alla 6ª</b>.`,
    idea: `<code>OFFSET</code> salta un certo numero di righe prima di cominciare a prenderle. <code>LIMIT 3 OFFSET 3</code> = «salta le prime 3, poi prendine 3». È come sfogliare i risultati di una ricerca pagina per pagina.`,
    example: {
      code: `SELECT nome, stipendio
FROM dipendenti
ORDER BY stipendio DESC
LIMIT 2 OFFSET 2;`,
      note: `Salta i 2 dipendenti più pagati e mostra il 3° e il 4°.`
    },
    steps: [
      `Scegli nome e prezzo e ordina per prezzo decrescente.`,
      `Aggiungi <code>LIMIT</code> con quante righe vuoi vedere (dalla 4ª alla 6ª sono 3).`,
      `Aggiungi <code>OFFSET</code> con quante righe saltare.`
    ],
    traps: [
      `<code>OFFSET 4</code> partirebbe dalla 5ª posizione: per iniziare dalla 4ª ne salti 3.`,
      `Senza <code>ORDER BY</code> le «posizioni» non hanno senso: la classifica va ordinata.`
    ]
  },
  'funzioni-1': {
    goal: `Unire nome e cognome dei clienti in <b>un'unica colonna</b> chiamata <code>nome_completo</code>.`,
    idea: `L'operatore <code>||</code> incolla i testi uno dopo l'altro, come mettere vicini due pezzi di nastro. Lo spazio tra le parole va aggiunto tu, come testo: <code>' '</code>.`,
    example: {
      code: `SELECT cognome || ', ' || nome
  AS firma
FROM dipendenti;`,
      note: `Per ogni dipendente esce un testo come «Cognome, Nome» nella colonna <code>firma</code>.`
    },
    steps: [
      `Parti dalla colonna del nome.`,
      `Incolla uno spazio scritto tra apici, usando <code>||</code> prima e dopo.`,
      `Incolla il cognome e chiama la colonna con <code>AS nome_completo</code>.`
    ],
    traps: [
      `Senza <code>' '</code> in mezzo nome e cognome restano attaccati.`,
      `Il <code>+</code> non unisce i testi in SQLite: serve <code>||</code>.`,
      `La verifica controlla il nome della colonna: ricorda <code>AS</code>.`
    ]
  },
  'funzioni-2': {
    goal: `Per ogni città (senza ripetizioni) mostrare il nome <b>in maiuscolo</b> e <b>quante lettere</b> ha.`,
    idea: `Le funzioni sui testi trasformano un valore: <code>UPPER()</code> lo mette in maiuscolo, <code>LOWER()</code> in minuscolo, <code>LENGTH()</code> conta i caratteri. Come i pulsanti «Aa» di un programma di scrittura.`,
    example: {
      code: `SELECT DISTINCT
  LOWER(reparto) AS rep,
  LENGTH(reparto) AS n
FROM dipendenti;`,
      note: `Ogni reparto una volta sola, in minuscolo, con il numero dei suoi caratteri.`
    },
    steps: [
      `Scrivi <code>SELECT DISTINCT</code>.`,
      `Prima colonna: la città passata a <code>UPPER()</code>.`,
      `Seconda colonna: la città passata a <code>LENGTH()</code>, poi <code>FROM</code> la tabella dei clienti.`
    ],
    traps: [
      `Le colonne devono essere due e in quest'ordine: prima il maiuscolo, poi il numero di lettere.`,
      `Senza <code>DISTINCT</code> le città si ripetono una volta per ogni cliente.`
    ]
  },
  'funzioni-3': {
    goal: `Mostrare il prezzo con l'IVA <b>arrotondato a 2 decimali</b>, in una colonna chiamata <code>prezzo_ivato</code>.`,
    idea: `<code>ROUND(valore, decimali)</code> arrotonda un numero come si fa a scuola: <code>ROUND(2.346, 2)</code> dà <code>2.35</code>. Si può arrotondare direttamente il risultato di un calcolo.`,
    example: {
      code: `SELECT nome,
  ROUND(stipendio * 1.035, 2)
    AS con_aumento
FROM dipendenti;`,
      note: `Lo stipendio con un aumento del 3,5%, arrotondato al centesimo.`
    },
    steps: [
      `Scrivi la colonna del nome.`,
      `Calcola il prezzo moltiplicato per l'IVA e mettilo dentro <code>ROUND( , 2)</code>.`,
      `Chiama la colonna con <code>AS prezzo_ivato</code>.`
    ],
    traps: [
      `Il calcolo va <b>dentro</b> le parentesi di ROUND, seguito da una virgola e dal 2.`,
      `La verifica controlla il nome della colonna: senza <code>AS</code> non passa.`
    ]
  },
  'funzioni-4': {
    goal: `Mostrare i clienti iscritti nel <b>2024</b>, con una colonna <code>anno</code> che contiene l'anno di iscrizione.`,
    idea: `<code>strftime(formato, data)</code> estrae un pezzo da una data: <code>'%Y'</code> l'anno, <code>'%m'</code> il mese, <code>'%d'</code> il giorno. Il risultato è un <b>testo</b>, quindi si confronta con <code>'2024'</code> tra apici.`,
    example: {
      code: `SELECT nome,
  strftime('%Y',
    data_assunzione) AS anno
FROM dipendenti
WHERE strftime('%Y',
  data_assunzione) < '2020';`,
      note: `Mostra l'anno di assunzione dei dipendenti assunti prima del 2020.`
    },
    steps: [
      `Scegli nome e cognome dalla tabella dei clienti.`,
      `Aggiungi la colonna con l'anno estratto dalla data di iscrizione, chiamata <code>anno</code>.`,
      `Nel <code>WHERE</code> confronta lo stesso anno estratto con <code>'2024'</code>.`
    ],
    traps: [
      `<code>strftime</code> restituisce un testo: confrontalo con <code>'2024'</code>, con gli apici.`,
      `Il formato dell'anno è <code>'%Y'</code> con la Y maiuscola (<code>'%y'</code> dà solo due cifre).`
    ]
  },
  'funzioni-5': {
    goal: `Dare a ogni prodotto una <b>fascia di prezzo</b> (economico, medio, premium) in base a soglie precise.`,
    idea: `<code>CASE</code> è un «se... allora...» dentro la query. Le condizioni <code>WHEN</code> si leggono dall'alto in basso e vince la <b>prima vera</b>; <code>ELSE</code> vale per tutto il resto; <code>END</code> chiude.`,
    example: {
      code: `SELECT nome,
  CASE
    WHEN stipendio < 3000
      THEN 'base'
    ELSE 'alto'
  END AS livello
FROM dipendenti;`,
      note: `Sotto i 3000 euro il livello è «base», altrimenti «alto».`
    },
    steps: [
      `Scrivi la colonna del nome e poi <code>CASE</code>.`,
      `Prima condizione: sotto i 50 euro è 'economico'.`,
      `Seconda condizione: fino a 200 euro compresi è 'medio'; poi <code>ELSE 'premium'</code>.`,
      `Chiudi con <code>END</code> e dai un nome alla colonna con <code>AS</code>.`
    ],
    traps: [
      `«Da 50 a 200 compresi» vuol dire <code>&lt;= 200</code>, non <code>&lt; 200</code>.`,
      `Non dimenticare <code>END</code>: senza, la query è incompleta.`
    ]
  },
  'funzioni-6': {
    goal: `Mostrare l'email di tutti i clienti, scrivendo <b>'non disponibile'</b> dove manca.`,
    idea: `<code>COALESCE(a, b)</code> restituisce il primo valore che non è NULL: se <i>a</i> c'è usa quello, altrimenti <i>b</i>. È una ruota di scorta per i valori mancanti.`,
    example: {
      code: `SELECT nome,
  COALESCE(responsabile_id, 0)
    AS capo
FROM dipendenti;`,
      note: `Chi non ha un responsabile mostra 0 invece di NULL.`
    },
    steps: [
      `Scegli nome e cognome dalla tabella dei clienti.`,
      `Aggiungi <code>COALESCE(</code> con la colonna dell'email e, dopo la virgola, il testo da usare al suo posto.`,
      `Chiudi la parentesi e dai un nome alla colonna con <code>AS</code>.`
    ],
    traps: [
      `Il testo sostitutivo va tra apici: <code>'non disponibile'</code>.`,
      `Con <code>WHERE email IS NOT NULL</code> perderesti i clienti senza email: qui vanno mostrati tutti.`
    ]
  },
  'aggrega-1': {
    goal: `Sapere <b>quanti clienti</b> ci sono in tutto: una sola riga con un numero.`,
    idea: `<code>COUNT(*)</code> conta le righe. Le funzioni di aggregazione «riassumono» molte righe in un solo valore, come contare le persone in una stanza invece di elencarle.`,
    example: {
      code: `SELECT COUNT(*) AS persone
FROM dipendenti
WHERE reparto = 'Vendite';`,
      note: `Una sola riga: quanti dipendenti lavorano in Vendite.`
    },
    steps: [
      `Scrivi <code>SELECT COUNT(*)</code>.`,
      `Se vuoi, dai un nome alla colonna con <code>AS</code>.`,
      `Completa con <code>FROM</code> e la tabella dei clienti, senza filtri.`
    ],
    traps: [
      `Il risultato deve essere <b>una riga</b> con un numero, non l'elenco dei clienti.`,
      `Non aggiungere <code>WHERE</code>: servono tutti i clienti.`
    ]
  },
  'aggrega-2': {
    goal: `Calcolare su tutti i prodotti il prezzo <b>minimo</b>, <b>massimo</b> e <b>medio</b> (arrotondato a 2 decimali), in quest'ordine.`,
    idea: `<code>MIN()</code> e <code>MAX()</code> trovano il valore più piccolo e più grande, <code>AVG()</code> fa la media, <code>SUM()</code> la somma. Riassumono una colonna intera in un numero.`,
    example: {
      code: `SELECT MIN(stipendio) AS min,
  SUM(stipendio) AS totale
FROM dipendenti;`,
      note: `Una riga con lo stipendio più basso e la somma di tutti gli stipendi.`
    },
    steps: [
      `Prima colonna: il minimo del prezzo.`,
      `Seconda colonna: il massimo del prezzo.`,
      `Terza colonna: la media del prezzo dentro <code>ROUND( , 2)</code>; poi <code>FROM</code> la tabella dei prodotti.`
    ],
    traps: [
      `L'ordine delle colonne conta: minimo, massimo, media.`,
      `La media va arrotondata: <code>ROUND(AVG(prezzo), 2)</code>, con le parentesi nel posto giusto.`
    ]
  },
  'aggrega-3': {
    goal: `Contare <b>quanti clienti</b> ci sono in <b>ogni città</b>: una riga per città.`,
    idea: `<code>GROUP BY</code> divide le righe in gruppi con lo stesso valore, e le funzioni come <code>COUNT</code> lavorano su ogni gruppo. Come smistare le lettere per città e poi contare ogni mucchietto.`,
    example: {
      code: `SELECT reparto,
  COUNT(*) AS persone
FROM dipendenti
GROUP BY reparto;`,
      note: `Una riga per ogni reparto, con il numero dei suoi dipendenti.`
    },
    steps: [
      `Nel <code>SELECT</code> metti la colonna della città e <code>COUNT(*)</code>.`,
      `Completa con <code>FROM</code> e la tabella dei clienti.`,
      `In fondo aggiungi <code>GROUP BY</code> con la colonna della città.`
    ],
    traps: [
      `Senza <code>GROUP BY</code> ottieni un solo conteggio totale.`,
      `La colonna del <code>GROUP BY</code> deve essere la stessa che mostri nel <code>SELECT</code>.`
    ]
  },
  'aggrega-4': {
    goal: `Calcolare il <b>totale di ogni ordine</b> sommando quantità × prezzo unitario delle sue righe.`,
    idea: `Dentro <code>SUM()</code> puoi mettere un calcolo: viene fatto riga per riga e poi sommato per ogni gruppo. Come lo scontrino: ogni riga è quantità × prezzo, il totale è la somma delle righe.`,
    example: {
      code: `SELECT prodotto_id,
  COUNT(*) AS righe,
  MAX(quantita) AS max_q
FROM dettagli_ordine
GROUP BY prodotto_id;`,
      note: `Per ogni prodotto: in quante righe d'ordine compare e la quantità più alta ordinata in una volta.`
    },
    steps: [
      `Nel <code>SELECT</code> metti la colonna dell'ordine.`,
      `Aggiungi la somma del prodotto quantità × prezzo unitario, chiamata <code>totale</code>.`,
      `Dalla tabella <code>dettagli_ordine</code>, raggruppa per ordine con <code>GROUP BY</code>.`
    ],
    traps: [
      `Il calcolo va <b>dentro</b> <code>SUM( )</code>: <code>SUM(quantita * prezzo_unitario)</code>.`,
      `Il prezzo da usare è <code>prezzo_unitario</code> di <code>dettagli_ordine</code>, non quello della tabella prodotti.`
    ]
  },
  'aggrega-5': {
    goal: `Mostrare solo le città con <b>almeno 2 clienti</b>, con il numero di clienti di ciascuna.`,
    idea: `<code>WHERE</code> filtra le righe <i>prima</i> di raggruppare; <code>HAVING</code> filtra i <b>gruppi</b> <i>dopo</i>, e può usare <code>COUNT</code>, <code>SUM</code>... Prima fai i mucchietti, poi scarti quelli troppo piccoli.`,
    example: {
      code: `SELECT categoria_id,
  COUNT(*) AS prodotti
FROM prodotti
GROUP BY categoria_id
HAVING COUNT(*) > 2;`,
      note: `Restano solo le categorie con più di 2 prodotti.`
    },
    steps: [
      `Conta i clienti per città con <code>COUNT(*)</code> e <code>GROUP BY</code>.`,
      `Dopo il <code>GROUP BY</code> aggiungi <code>HAVING</code>.`,
      `Nella condizione usa il conteggio con «almeno 2».`
    ],
    traps: [
      `<code>WHERE COUNT(*) &gt;= 2</code> dà errore: sui gruppi serve <code>HAVING</code>.`,
      `«Almeno 2» vuol dire <code>&gt;= 2</code>, non <code>&gt; 2</code>.`
    ]
  },
  'aggrega-6': {
    goal: `Contare quanti clienti <b>diversi</b> hanno fatto almeno un ordine, usando solo la tabella ordini.`,
    idea: `<code>COUNT(DISTINCT colonna)</code> conta i valori diversi, senza contare due volte lo stesso. Se un cliente ha fatto 5 ordini, conta una volta sola, come un timbro per persona.`,
    example: {
      code: `SELECT COUNT(DISTINCT
  prodotto_id) AS venduti
FROM dettagli_ordine;`,
      note: `Quanti prodotti diversi compaiono almeno una volta negli ordini.`
    },
    steps: [
      `Scrivi <code>SELECT COUNT(DISTINCT</code> seguito dalla colonna del cliente nella tabella ordini.`,
      `Chiudi la parentesi e dai un nome alla colonna con <code>AS</code>.`,
      `Completa con <code>FROM</code> e la tabella degli ordini.`
    ],
    traps: [
      `<code>COUNT(*)</code> conterebbe gli <i>ordini</i>, non i clienti diversi.`,
      `<code>DISTINCT</code> va <b>dentro</b> le parentesi di COUNT.`
    ]
  },
  'join-1': {
    goal: `Mostra il nome di ogni prodotto insieme al nome della sua categoria. Collega le righe tramite l'identificativo della categoria.`,
    idea: `Un JOIN è come abbinare una ricevuta alla scheda del suo proprietario. La condizione ON indica quali righe appartengono alla stessa coppia. Un INNER JOIN conserva solo le coppie che trovano una corrispondenza.`,
    example: {
      code: `SELECT o.id, c.cognome
FROM ordini o
JOIN clienti c
  ON c.id = o.cliente_id
WHERE o.id <= 3;`,
      note: `Ogni ordine viene affiancato al cognome del suo cliente. Gli alias brevi aiutano a distinguere le colonne delle due tabelle.`
    },
    steps: [
      `Parti dalla tabella prodotti e assegna alias brevi alle due tabelle.`,
      `Collega il riferimento alla categoria con la chiave id di categorie.`,
      `Seleziona i due nomi nell'ordine richiesto; puoi usare AS per distinguerli.`
    ],
    traps: [
      `Collegare l'id del prodotto all'id della categoria anziché usare <code>categoria_id</code>.`,
      `Aspettarsi anche il prodotto senza categoria: con INNER JOIN non trova una coppia.`
    ]
  },
  'join-2': {
    goal: `Trova gli ordini dei clienti di Milano. Mostra id, data e stato dell'ordine, poi il cognome del cliente.`,
    idea: `Il JOIN costruisce le coppie, mentre WHERE sceglie quali tenere. È come unire ordini e rubriche e poi cercare soltanto le schede di una città. Il filtro può leggere una colonna che non mostri nel risultato.`,
    example: {
      code: `SELECT p.nome, p.prezzo
FROM prodotti p
JOIN categorie c
  ON c.id = p.categoria_id
WHERE c.nome = 'Sport';`,
      note: `La categoria serve per scegliere i prodotti sportivi. Il risultato mostra soltanto colonne dei prodotti.`
    },
    steps: [
      `Collega ordini e clienti tramite il riferimento al cliente.`,
      `Filtra la città del cliente con il testo Milano.`,
      `Seleziona le quattro colonne richieste, distinguendo gli id con gli alias.`
    ],
    traps: [
      `Filtrare una città nella tabella ordini, che non contiene quel dato.`,
      `Dimenticare ON e moltiplicare le righe combinando clienti e ordini senza legame.`
    ]
  },
  'join-3': {
    goal: `Per l'ordine numero 8 mostra il nome dei prodotti, le quantità e i prezzi unitari registrati nell'ordine.`,
    idea: `Una riga di dettaglio è come una voce dello scontrino: contiene un riferimento al prodotto e i dati dell'acquisto. Il JOIN recupera il nome dal catalogo. Per questo compito bastano dettagli e prodotti, perché il numero d'ordine è già nei dettagli.`,
    example: {
      code: `SELECT o.id, c.cognome, d.quantita
FROM dettagli_ordine d
JOIN ordini o
  ON o.id = d.ordine_id
JOIN clienti c
  ON c.id = o.cliente_id
WHERE o.id = 2;`,
      note: `Qui seguiamo due collegamenti, dal dettaglio all'ordine e poi al cliente. Un ordine con più dettagli produce più righe.`
    },
    steps: [
      `Parti da dettagli_ordine e collegala a prodotti tramite il riferimento al prodotto.`,
      `Filtra il numero d'ordine presente nella tabella dei dettagli.`,
      `Mostra nome del prodotto, quantità e prezzo unitario del dettaglio.`
    ],
    traps: [
      `Usare il prezzo attuale del catalogo al posto di <code>prezzo_unitario</code>.`,
      `Confondere <code>ordine_id</code> con <code>prodotto_id</code> nel collegamento o nel filtro.`
    ]
  },
  'join-4': {
    goal: `Mostra nome, cognome e numero di ordini di tutti i clienti. Chi non ha mai ordinato deve comparire con zero.`,
    idea: `Un LEFT JOIN è come un registro presenze che conserva tutti i nomi della lista di sinistra. Se manca una corrispondenza, le colonne di destra valgono NULL. COUNT su una colonna non nulla della tabella destra conta soltanto le corrispondenze reali.`,
    example: {
      code: `SELECT r.nome,
  COUNT(d.id) AS collaboratori
FROM dipendenti r
LEFT JOIN dipendenti d
  ON d.responsabile_id = r.id
GROUP BY r.id;`,
      note: `L'esempio conta i collaboratori di ogni dipendente. Anche chi non ne ha compare, con conteggio zero.`
    },
    steps: [
      `Metti clienti a sinistra del LEFT JOIN.`,
      `Collega gli ordini al cliente corrispondente.`,
      `Raggruppa per id del cliente e conta gli id degli ordini.`,
      `Mostra nome, cognome e conteggio in questo ordine.`
    ],
    traps: [
      `Usare INNER JOIN e perdere i clienti senza ordini.`,
      `Usare <code>COUNT(*)</code>: conterebbe anche la riga senza ordine come uno.`,
      `Raggruppare soltanto per nome, unendo persone diverse con lo stesso nome.`
    ]
  },
  'join-5': {
    goal: `Mostra soltanto il nome dei prodotti che non compaiono in nessun dettaglio d'ordine.`,
    idea: `Per trovare ciò che manca, parti dall'elenco completo e cerca gli abbinamenti assenti. È come controllare chi non ha una firma sul registro. Dopo un LEFT JOIN, una chiave NULL sul lato destro segnala la mancata corrispondenza.`,
    example: {
      code: `SELECT c.cognome
FROM clienti c
LEFT JOIN ordini o
  ON o.cliente_id = c.id
WHERE o.id IS NULL;`,
      note: `Qui cerchiamo clienti senza ordini. Il filtro usa l'id dell'ordine, che sarebbe presente in ogni corrispondenza reale.`
    },
    steps: [
      `Conserva tutti i prodotti mettendoli a sinistra del LEFT JOIN.`,
      `Collega i dettagli tramite l'id del prodotto.`,
      `Tieni le righe senza un ordine corrispondente e mostra solo il nome del prodotto.`
    ],
    traps: [
      `Scrivere <code>= NULL</code> invece di <code>IS NULL</code>.`,
      `Cercare disponibilità zero: un prodotto esaurito potrebbe essere stato ordinato molte volte.`
    ]
  },
  'join-6': {
    goal: `Per ogni dipendente con un responsabile mostra il suo nome, il suo cognome e il cognome del responsabile.`,
    idea: `Una self join legge la stessa tabella in due ruoli diversi. È come consultare due copie della rubrica, una per il collaboratore e una per il capo. Gli alias rendono chiaro a quale persona appartiene ogni dato.`,
    example: {
      code: `SELECT a.nome, b.nome AS collega
FROM dipendenti a
JOIN dipendenti b
  ON a.reparto = b.reparto
  AND a.id < b.id
WHERE a.reparto = 'IT';`,
      note: `Le due copie trovano colleghi dello stesso reparto. Il confronto tra id evita sia la coppia con sé stessi sia le coppie invertite.`
    },
    steps: [
      `Usa dipendenti due volte, con un alias per il dipendente e uno per il responsabile.`,
      `Collega il riferimento al responsabile della prima copia con l'id della seconda.`,
      `Mostra i dati personali del dipendente e il cognome preso dalla seconda copia.`
    ],
    traps: [
      `Collegare gli id delle due copie e ottenere ogni dipendente abbinato a sé stesso.`,
      `Usare LEFT JOIN e includere anche chi non ha un responsabile, fuori dalla richiesta.`
    ]
  },
  'join-7': {
    goal: `Calcola il fatturato di ogni categoria escludendo gli ordini annullati. Mostra categoria e totale, dal fatturato più alto.`,
    idea: `Prima ricostruisci le righe di vendita, come pezzi di scontrino collegati al reparto giusto. Poi raccogli i pezzi per categoria e sommi gli importi. Il filtro sugli ordini va applicato prima del raggruppamento.`,
    example: {
      code: `SELECT c.citta,
  COUNT(o.id) AS spedizioni
FROM clienti c
JOIN ordini o
  ON o.cliente_id = c.id
WHERE o.stato = 'consegnato'
GROUP BY c.citta
ORDER BY spedizioni DESC;`,
      note: `L'esempio raggruppa gli ordini consegnati per città e ordina i conteggi dal maggiore al minore.`
    },
    steps: [
      `Collega dettagli, ordini, prodotti e categorie usando i rispettivi riferimenti.`,
      `Escludi gli ordini con stato annullato.`,
      `Raggruppa per categoria e somma quantità per prezzo unitario dei dettagli.`,
      `Mostra nome della categoria e fatturato; ordina il totale in senso decrescente.`
    ],
    traps: [
      `Sommare i prezzi senza moltiplicarli per la quantità.`,
      `Usare il prezzo di catalogo anziché quello registrato nel dettaglio.`,
      `Dimenticare <code>ORDER BY</code> decrescente: qui il motore controlla anche l'ordine delle righe.`
    ]
  },
  'sub-1': {
    goal: `Mostra nome e prezzo dei prodotti che costano più della media di tutti i prezzi.`,
    idea: `Una subquery scalare prepara un singolo valore per la query esterna. È come calcolare una soglia su un foglietto e poi usarla per scegliere le schede. La media viene calcolata sull'intero insieme dei prodotti.`,
    example: {
      code: `SELECT nome, stipendio
FROM dipendenti
WHERE stipendio < (
  SELECT AVG(stipendio)
  FROM dipendenti
);`,
      note: `La query interna calcola lo stipendio medio. Quella esterna mostra chi riceve meno di quella soglia.`
    },
    steps: [
      `Prepara una subquery che restituisce il prezzo medio dei prodotti.`,
      `Usala tra parentesi come termine di confronto nel WHERE esterno.`,
      `Tieni i prezzi strettamente maggiori della media e mostra nome e prezzo.`
    ],
    traps: [
      `Scrivere AVG direttamente nel WHERE esterno senza subquery.`,
      `Usare maggiore o uguale anziché strettamente maggiore, oppure calcolare la media solo sui prodotti già filtrati.`
    ]
  },
  'sub-2': {
    goal: `Mostra nome e cognome dei clienti con almeno un ordine in lavorazione. Ogni cliente deve comparire una sola volta.`,
    idea: `IN confronta un valore con un elenco prodotto da un'altra query. È come controllare se un nominativo è nella lista degli invitati. Le ripetizioni nella lista interna non moltiplicano le righe esterne.`,
    example: {
      code: `SELECT nome
FROM categorie
WHERE id IN (
  SELECT categoria_id
  FROM prodotti
  WHERE disponibili = 0
);`,
      note: `La query interna elenca le categorie di prodotti esauriti. Quella esterna mostra i nomi di quelle categorie.`
    },
    steps: [
      `Nella subquery seleziona gli identificativi dei clienti dagli ordini.`,
      `Filtra lo stato con il testo esatto in lavorazione.`,
      `Nella query su clienti usa IN su quegli identificativi e mostra nome e cognome.`
    ],
    traps: [
      `Confrontare l'id del cliente con l'id dell'ordine invece che con <code>cliente_id</code>.`,
      `Restituire più colonne nella subquery usata per questo IN.`
    ]
  },
  'sub-3': {
    goal: `Usa NOT EXISTS per trovare i clienti che non hanno mai ordinato. Mostra nome e cognome.`,
    idea: `EXISTS chiede soltanto se esiste almeno una riga corrispondente. NOT EXISTS ribalta la risposta. È come chiedere, per ogni persona, se nel registro manca qualsiasi ricevuta a suo nome.`,
    example: {
      code: `SELECT c.nome
FROM categorie c
WHERE EXISTS (
  SELECT 1
  FROM prodotti p
  WHERE p.categoria_id = c.id
    AND p.prezzo > 300
);`,
      note: `Ogni categoria viene controllata separatamente. Basta un prodotto oltre la soglia per includerla nel risultato.`
    },
    steps: [
      `Parti da clienti con un alias per la query esterna.`,
      `Nel NOT EXISTS cerca gli ordini collegati al cliente corrente.`,
      `Se la ricerca interna non trova righe, conserva nome e cognome del cliente.`
    ],
    traps: [
      `Dimenticare il collegamento al cliente esterno: la ricerca diventerebbe uguale per tutti.`,
      `Usare EXISTS senza NOT e ottenere i clienti che hanno ordinato.`
    ]
  },
  'sub-4': {
    goal: `Calcola il totale di ogni ordine, poi la media di quei totali. Mostra un solo valore arrotondato a due decimali.`,
    idea: `La subquery nel FROM è come un tavolo di lavoro intermedio. Prima prepari una riga per gruppo, poi la query esterna lavora su quelle righe. In questo modo ogni ordine pesa una sola volta nella media.`,
    example: {
      code: `SELECT MAX(pezzi) AS massimo
FROM (
  SELECT categoria_id,
    SUM(disponibili) AS pezzi
  FROM prodotti
  GROUP BY categoria_id
) AS scorte;`,
      note: `Prima sommiamo le scorte per categoria. Poi cerchiamo il maggiore dei totali ottenuti.`
    },
    steps: [
      `Nella query interna raggruppa i dettagli per ordine.`,
      `Calcola la somma di quantità per prezzo unitario e assegna un alias al totale.`,
      `Usa la tabella intermedia nel FROM esterno e fai la media dei totali.`,
      `Arrotonda la media finale a due decimali.`
    ],
    traps: [
      `Fare la media dei prezzi delle singole righe anziché dei totali per ordine.`,
      `Omettere il raggruppamento interno o arrotondare troppo presto i singoli importi.`
    ]
  },
  'sub-5': {
    goal: `Trova il prodotto più caro di ogni categoria. Mostra nome, categoria_id e prezzo, includendo eventuali prodotti a pari massimo.`,
    idea: `Una subquery correlata usa un dato della riga esterna per scegliere il proprio gruppo. È come cercare il record soltanto nella squadra della persona che stai osservando. La soglia può quindi cambiare da una categoria all'altra.`,
    example: {
      code: `SELECT d.nome, d.stipendio
FROM dipendenti d
WHERE d.stipendio = (
  SELECT MIN(x.stipendio)
  FROM dipendenti x
  WHERE x.reparto = d.reparto
);`,
      note: `Qui ogni dipendente viene confrontato con lo stipendio minimo del proprio reparto, non con il minimo globale.`
    },
    steps: [
      `Dai alias diversi ai prodotti della query esterna e di quella interna.`,
      `Calcola nella subquery il massimo dei prezzi della categoria della riga esterna.`,
      `Conserva i prodotti il cui prezzo coincide con quel massimo e mostra le tre colonne richieste.`
    ],
    traps: [
      `Calcolare un unico massimo globale dimenticando la correlazione tra categorie.`,
      `Usare LIMIT 1 e perdere altri prodotti a pari prezzo massimo.`,
      `Aspettarsi il prodotto senza categoria: con il confronto tramite =, due NULL non risultano uguali.`
    ]
  },
  'avanzato-1': {
    goal: `Con WITH calcola la spesa di ogni cliente sugli ordini non annullati. Mostra nome, cognome e totale soltanto per chi supera 500 euro.`,
    idea: `Una CTE è come dare un nome a un foglio di calcolo intermedio. WITH descrive come prepararlo e la query finale lo consulta. Il nome vale soltanto per quel comando, senza creare una tabella permanente.`,
    example: {
      code: `WITH scorte AS (
  SELECT categoria_id,
    SUM(disponibili) AS pezzi
  FROM prodotti
  GROUP BY categoria_id
)
SELECT c.nome, s.pezzi
FROM scorte s
JOIN categorie c
  ON c.id = s.categoria_id
WHERE s.pezzi > 80;`,
      note: `La CTE prepara le scorte per categoria. La query finale aggiunge il nome della categoria e applica una soglia.`
    },
    steps: [
      `Nella CTE collega ordini e dettagli ed escludi gli ordini annullati.`,
      `Raggruppa per cliente e somma quantità per prezzo unitario.`,
      `Collega la CTE a clienti per recuperare nome e cognome.`,
      `Filtra i totali strettamente oltre 500 e mostra le tre colonne richieste.`
    ],
    traps: [
      `Dimenticare di escludere gli annullati prima della somma.`,
      `Usare il totale del singolo ordine invece della somma di tutti gli ordini del cliente.`,
      `Chiudere WITH con un punto e virgola prima della query finale.`
    ]
  },
  'avanzato-2': {
    goal: `Unisci i nomi di battesimo di clienti e dipendenti in un solo elenco senza doppioni.`,
    idea: `UNION impila due elenchi compatibili, come versare due mazzi di cartoncini nella stessa scatola. Poi elimina le righe identiche. UNION ALL conserva invece anche le ripetizioni.`,
    example: {
      code: `SELECT citta AS luogo
FROM clienti
WHERE citta = 'Roma'
UNION
SELECT citta
FROM clienti
WHERE citta IN ('Roma', 'Milano');`,
      note: `Roma è presente in entrambi gli elenchi, ma nel risultato compare una sola volta insieme a Milano.`
    },
    steps: [
      `Scrivi una SELECT con la sola colonna nome dei clienti.`,
      `Prepara una seconda SELECT con la sola colonna nome dei dipendenti.`,
      `Unisci i risultati usando UNION per eliminare i nomi ripetuti.`
    ],
    traps: [
      `Usare UNION ALL e mantenere i doppioni.`,
      `Aggiungere cognomi o id: UNION elimina soltanto righe interamente identiche, non nomi uguali dentro righe diverse.`
    ]
  },
  'avanzato-3': {
    goal: `Numera i dipendenti dallo stipendio più alto al più basso. In caso di parità usa il cognome in ordine alfabetico e mostra nome, stipendio e posizione.`,
    idea: `ROW_NUMBER assegna un numero diverso a ogni riga, come i biglietti di una fila. L'ORDER BY dentro OVER decide a chi spetta ciascun numero. Un secondo criterio risolve le parità del primo.`,
    example: {
      code: `SELECT nome, prezzo,
  ROW_NUMBER() OVER (
    ORDER BY prezzo ASC, nome
  ) AS numero
FROM prodotti
WHERE categoria_id = 3
ORDER BY numero;`,
      note: `I prodotti di Casa ricevono numeri dal meno caro al più caro. Il nome è il criterio secondario per eventuali prezzi uguali.`
    },
    steps: [
      `Seleziona nome e stipendio dalla tabella dipendenti.`,
      `Aggiungi ROW_NUMBER con OVER e ordina al suo interno per stipendio decrescente, poi cognome crescente.`,
      `Assegna alla numerazione l'alias posizione.`
    ],
    traps: [
      `Mettere l'ordinamento soltanto alla fine della query: non definisce i numeri della funzione finestra.`,
      `Dimenticare il cognome come secondo criterio nei due stipendi uguali.`
    ]
  },
  'avanzato-4': {
    goal: `Crea la classifica degli stipendi separatamente per ogni reparto. Mostra reparto, nome, stipendio e posizione calcolata con RANK.`,
    idea: `PARTITION BY crea classifiche separate, come tornei di squadre diverse. RANK assegna la stessa posizione ai pari merito. Dopo una parità può saltare un numero: primo, secondo, secondo, quarto.`,
    example: {
      code: `SELECT categoria_id, nome,
  disponibili,
  RANK() OVER (
    PARTITION BY categoria_id
    ORDER BY disponibili DESC
  ) AS posto
FROM prodotti
WHERE categoria_id IS NOT NULL;`,
      note: `Ogni categoria ha la propria classifica di disponibilità. I numeri di posizione ripartono quando cambia categoria.`
    },
    steps: [
      `Seleziona reparto, nome e stipendio.`,
      `Aggiungi RANK con una partizione per reparto.`,
      `Ordina la finestra per stipendio decrescente e chiama il risultato posizione.`
    ],
    traps: [
      `Omettere PARTITION BY e ottenere un'unica classifica generale.`,
      `Usare ROW_NUMBER o aggiungere il nome al criterio della finestra, separando i pari merito.`
    ]
  },
  'avanzato-5': {
    goal: `Mostra cognome, data d'iscrizione e numero totale di clienti iscritti fino a quella data compresa. Conserva una riga per cliente.`,
    idea: `Un conteggio progressivo è come un contatore che cresce scorrendo un calendario. Una funzione finestra mantiene visibili le singole righe. Con il frame predefinito, le righe con la stessa data condividono il totale fino a quella data.`,
    example: {
      code: `SELECT id, data_ordine,
  COUNT(*) OVER (
    ORDER BY data_ordine
  ) AS ordini_finora
FROM ordini
WHERE stato = 'consegnato'
ORDER BY data_ordine;`,
      note: `Il contatore cresce seguendo le date degli ordini consegnati. Il WHERE limita prima l'insieme su cui viene calcolata la finestra.`
    },
    steps: [
      `Seleziona cognome e data_iscrizione da clienti senza raggruppare.`,
      `Aggiungi COUNT su tutte le righe come funzione finestra.`,
      `Dentro OVER ordina per data_iscrizione e assegna un alias al conteggio progressivo.`
    ],
    traps: [
      `Usare GROUP BY e perdere le righe individuali dei clienti.`,
      `Omettere l'ordinamento dentro OVER e ripetere il totale generale su ogni riga.`,
      `Usare PARTITION BY data e far ripartire il conteggio a ogni data.`
    ]
  },
  'avanzato-6': {
    goal: `Per ogni dipendente mostra nome, reparto, stipendio e differenza rispetto alla media del suo reparto. Arrotonda la differenza a due decimali.`,
    idea: `La finestra è come una scheda che mostra accanto a ogni persona il valore medio della sua squadra. La riga resta individuale, ma può usare una misura del gruppo. Sottraendo la media scopri quanto il valore è sopra o sotto quel riferimento.`,
    example: {
      code: `SELECT nome, categoria_id, prezzo,
  ROUND(AVG(prezzo) OVER (
    PARTITION BY categoria_id
  ), 2) AS media_categoria
FROM prodotti
WHERE categoria_id IS NOT NULL;`,
      note: `Ogni prodotto mantiene la propria riga e vede la media dei prezzi della propria categoria. Qui mostriamo la media, senza calcolare uno scarto.`
    },
    steps: [
      `Seleziona nome, reparto e stipendio dei dipendenti.`,
      `Calcola la media degli stipendi con OVER e partizione per reparto.`,
      `Sottrai quella media allo stipendio della riga.`,
      `Arrotonda lo scarto finale a due decimali e assegnagli un alias.`
    ],
    traps: [
      `Usare GROUP BY e ottenere una sola riga per reparto.`,
      `Sottrarre lo stipendio dalla media invertendo il segno della differenza.`,
      `Aggiungere un ordinamento progressivo dentro OVER: qui serve la media dell'intero reparto.`
    ]
  },
  'modifica-1': {
    goal: `Aggiungi Giovanni Verdi ai clienti con città, email e data d'iscrizione indicate. La nuova riga deve avere id 13.`,
    idea: `INSERT è come compilare una nuova scheda del registro. L'elenco delle colonne stabilisce dove finirà ciascun valore. Se ometti un id INTEGER PRIMARY KEY, SQLite può assegnarlo automaticamente.`,
    example: {
      code: `INSERT INTO categorie (id, nome)
VALUES (6, 'Giardinaggio');
SELECT id, nome
FROM categorie
WHERE id = 6;`,
      note: `Aggiungiamo una categoria diversa dai dati dell'esercizio. Il SELECT finale mostra la nuova riga realmente inserita.`
    },
    steps: [
      `Elenca le colonne dei clienti da compilare, includendo tutti i dati richiesti.`,
      `Inserisci i valori nello stesso ordine usando apici per testi e data.`,
      `Usa id 13 oppure lascialo assegnare automaticamente sulla copia iniziale del database.`,
      `Controlla la riga inserita con una SELECT.`
    ],
    traps: [
      `Scambiare nome e cognome o trascrivere male email e data.`,
      `Mostrare soltanto i dati con SELECT: il motore verifica che il nuovo cliente sia stato inserito.`,
      `Ripetere l'inserimento con lo stesso id sulla stessa copia e creare un conflitto di chiave.`
    ]
  },
  'modifica-2': {
    goal: `Aumenta del dieci per cento il prezzo di tutti i prodotti Libri, con categoria_id 2. Gli altri prezzi devono restare invariati.`,
    idea: `UPDATE riscrive alcuni campi delle schede già presenti. SET descrive il nuovo valore e WHERE sceglie le schede. Per un aumento percentuale il nuovo prezzo si ricava moltiplicando quello attuale per un fattore.`,
    example: {
      code: `UPDATE dipendenti
SET stipendio = stipendio * 1.05
WHERE reparto = 'Magazzino';
SELECT nome, stipendio
FROM dipendenti
WHERE reparto = 'Magazzino';`,
      note: `Il cinque per cento viene applicato soltanto al reparto Magazzino. Il SELECT mostra gli stipendi dopo l'aggiornamento.`
    },
    steps: [
      `Scegli prodotti come tabella da aggiornare.`,
      `Nel SET ricava il nuovo prezzo da quello esistente usando il fattore dell'aumento richiesto.`,
      `Limita le righe alla categoria con id 2 e controlla i prezzi dopo il comando.`
    ],
    traps: [
      `Omettere WHERE e aumentare tutti i prodotti.`,
      `Aggiungere dieci euro anziché il dieci per cento o conservare soltanto la quota dell'aumento.`,
      `Fare solo un calcolo nel SELECT: il controllo legge i prezzi salvati dopo i comandi.`
    ]
  },
  'modifica-3': {
    goal: `Elimina gli ordini con stato annullato. Tutti gli altri ordini devono rimanere nel database.`,
    idea: `DELETE toglie intere righe, come rimuovere schede da un archivio. WHERE decide quali righe eliminare. Il conteggio successivo permette di osservare l'effetto anche quando le righe eliminate non sono più visibili.`,
    example: {
      code: `DELETE FROM dettagli_ordine
WHERE quantita = 3;
SELECT COUNT(*) AS righe_rimaste
FROM dettagli_ordine
WHERE quantita = 3;`,
      note: `Eliminiamo i dettagli con quantità tre. Il risultato contiene una riga con conteggio zero, che conferma l'assenza di quelle righe.`
    },
    steps: [
      `Indica ordini come tabella del DELETE.`,
      `Limita l'eliminazione allo stato annullato con un confronto tra testi.`,
      `Verifica con SELECT che gli ordini negli altri stati siano rimasti.`
    ],
    traps: [
      `Dimenticare WHERE e cancellare tutti gli ordini.`,
      `Usare UPDATE per cambiare lo stato invece di rimuovere le righe.`,
      `Eliminare anche i dettagli: il compito richiede di cancellare gli ordini annullati.`
    ]
  },
  'modifica-4': {
    goal: `Imposta a zero le disponibilità dei prodotti mai ordinati. Mantieni le disponibilità degli altri prodotti.`,
    idea: `Una subquery può preparare l'elenco che guida un aggiornamento. È come confrontare l'inventario con le schede di vendita prima di segnare le quantità. NOT IN seleziona i riferimenti che non compaiono nell'elenco interno.`,
    example: {
      code: `UPDATE clienti
SET email = NULL
WHERE id IN (
  SELECT cliente_id FROM ordini
  WHERE stato = 'spedito'
);
SELECT cognome, email FROM clienti
WHERE id IN (
  SELECT cliente_id FROM ordini
  WHERE stato = 'spedito'
);`,
      note: `La subquery sceglie i clienti con ordini spediti. Il SELECT finale mostra le loro email dopo la modifica.`
    },
    steps: [
      `Prepara la subquery con i prodotto_id presenti nei dettagli d'ordine.`,
      `Nell'UPDATE di prodotti seleziona gli id assenti da quell'elenco.`,
      `Imposta disponibili a zero e controlla i valori salvati.`
    ],
    traps: [
      `Usare IN invece di NOT IN e azzerare i prodotti che sono stati ordinati.`,
      `Confrontare l'id del prodotto con ordine_id anziché prodotto_id.`,
      `Usare NOT IN su elenchi con NULL senza considerarne l'effetto; qui prodotto_id è NOT NULL.`
    ]
  },
  'modifica-5': {
    goal: `Crea fornitori con tre colonne nell'ordine richiesto: id intero e chiave primaria, nome testuale obbligatorio, citta testuale.`,
    idea: `CREATE TABLE prepara un nuovo schedario prima di riempirlo. Ogni colonna definisce una casella e i suoi vincoli. PRIMARY KEY identifica la scheda, mentre NOT NULL rende obbligatorio un valore.`,
    example: {
      code: `CREATE TABLE promemoria (
  id INTEGER PRIMARY KEY,
  testo TEXT NOT NULL
);
INSERT INTO promemoria (testo)
VALUES ('Controllare le scorte');
SELECT id, testo FROM promemoria;`,
      note: `Creiamo uno schedario diverso e vi inseriamo una nota. Il SELECT mostra una riga, così puoi osservare anche l'id assegnato.`
    },
    steps: [
      `Usa il nome fornitori nel comando di creazione.`,
      `Definisci id come INTEGER PRIMARY KEY nella prima posizione.`,
      `Aggiungi nome TEXT NOT NULL e poi citta TEXT.`,
      `Chiudi parentesi e comando; non servono righe da inserire nell'esercizio.`
    ],
    traps: [
      `Cambiare l'ordine o i nomi delle colonne: il motore controlla la struttura della tabella.`,
      `Dimenticare NOT NULL su nome o rendere obbligatoria anche citta.`,
      `Scrivere soltanto un SELECT con intestazioni simili senza creare la tabella.`
    ]
  },
  'modifica-6': {
    goal: `Crea la vista vendite_per_cliente con cliente_id e totale speso. Somma quantità per prezzo unitario su tutti gli ordini di ciascun cliente.`,
    idea: `Una vista è come una ricetta salvata con un nome. Quando la consulti, il database esegue la query che la definisce. Non è una fotografia separata dei dati: usa quelli presenti nelle tabelle sottostanti.`,
    example: {
      code: `CREATE VIEW clienti_romani AS
SELECT id, cognome
FROM clienti
WHERE citta = 'Roma';
SELECT * FROM clienti_romani;`,
      note: `La vista salva la regola per leggere i clienti romani. Il SELECT finale la consulta come se fosse una tabella.`
    },
    steps: [
      `Apri CREATE VIEW con il nome esatto richiesto e AS.`,
      `Nella SELECT collega ordini e dettagli tramite il numero d'ordine.`,
      `Raggruppa per cliente e somma quantità per prezzo unitario.`,
      `Esponi le colonne cliente_id e totale, usando AS per nominare la somma.`
    ],
    traps: [
      `Creare una tabella al posto di una vista o eseguire soltanto la SELECT.`,
      `Usare nomi di colonne diversi: la query di verifica legge cliente_id e totale dalla vista.`,
      `Escludere gli annullati per abitudine: questo compito richiede tutti gli ordini.`
    ]
  },
  'modifica-7': {
    goal: `Crea idx_ordini_cliente sulla colonna cliente_id della tabella ordini. Rispetta esattamente il nome richiesto.`,
    idea: `Un indice è come l'indice analitico di un libro: aiuta a trovare le pagine senza sfogliarle tutte. Non cambia le righe restituite dalla query. Il database può usarlo per velocizzare ricerche e collegamenti sulla colonna indicizzata.`,
    example: {
      code: `CREATE INDEX idx_clienti_citta
ON clienti (citta);
SELECT name, tbl_name
FROM sqlite_master
WHERE name = 'idx_clienti_citta'
  AND type = 'index';`,
      note: `Creiamo un indice sulle città dei clienti. Il SELECT del catalogo conferma il nome e la tabella dell'indice creato.`
    },
    steps: [
      `Inizia CREATE INDEX e indica il nome idx_ordini_cliente.`,
      `Con ON scegli ordini e racchiudi cliente_id tra parentesi.`,
      `Esegui il comando; puoi controllare l'indice nel catalogo del database.`
    ],
    traps: [
      `Creare l'indice su id anziché su cliente_id.`,
      `Scegliere un altro nome: la verifica cerca esattamente idx_ordini_cliente.`,
      `Usare UNIQUE: un cliente può avere più ordini, quindi cliente_id può ripetersi.`
    ]
  },
};

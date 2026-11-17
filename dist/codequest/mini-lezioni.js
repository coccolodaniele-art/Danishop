/* CodeQuest — Mini-lezioni: spiegazione veloce di ogni esercizio (bottone «🎓 Mini-lezione» / «🎓 Spiega»).
   Per ogni id di lezione:
     goal    cosa chiede l'esercizio
     idea    il concetto chiave, con un paragone
     example un esempio simile (NON la soluzione): code (testo puro, righe <= 38 caratteri), out (output esatto), note
     steps   3-5 passi per risolvere
     traps   1-3 errori da evitare
   Nei testi è ammesso solo <code>, <b>, <i>; i caratteri < > vanno scritti &lt; &gt;.
   Scritte da Claude (fond, dati) e Codex (func, avan, algo); esempi verificati eseguendoli con Python 3.12. */
window.MINI_LESSONS = {
  'fond-1': {
    goal: `Devi far comparire nella console la frase <code>Ciao, Python!</code>, identica: stessa virgola, stesso spazio, stesso punto esclamativo.`,
    idea: `<code>print()</code> è come un altoparlante: quello che metti tra le parentesi viene «annunciato» nella console. Un testo va sempre tra virgolette, altrimenti Python lo scambia per il nome di una variabile.`,
    example: {
      code: `print("Buongiorno!")
print('Oggi studio Python')`,
      out: `Buongiorno!
Oggi studio Python`,
      note: `Ogni <code>print</code> scrive una riga. Virgolette doppie o singole vanno bene, purché uguali all'inizio e alla fine.`
    },
    steps: [
      `Scrivi <code>print</code> seguito da parentesi tonde.`,
      `Dentro le parentesi apri le virgolette e scrivi la frase esatta.`,
      `Chiudi virgolette e parentesi, poi premi <b>▶ Esegui</b> per vedere il risultato.`,
      `Quando l'output è identico, premi <b>✅ Verifica</b>.`
    ],
    traps: [
      `Maiuscole e punteggiatura contano: <code>ciao python</code> non è <code>Ciao, Python!</code>.`,
      `Dimenticare una virgoletta o una parentesi: Python segnala <i>SyntaxError</i>.`,
      `Scrivere <code>Print</code> con la P maiuscola: Python distingue maiuscole e minuscole.`
    ]
  },
  'fond-2': {
    goal: `Crea due variabili, <code>citta</code> con il testo <code>"Roma"</code> e <code>abitanti</code> con il numero <code>2873000</code>, poi stampale insieme sulla stessa riga.`,
    idea: `Una variabile è un'etichetta attaccata a una scatola: il segno <code>=</code> mette il valore nella scatola, il nome serve a ritrovarlo. I testi vanno tra virgolette, i numeri no.`,
    example: {
      code: `animale = "gatto"
zampe = 4
print(animale, zampe)`,
      out: `gatto 4`,
      note: `<code>print</code> con più valori separati da virgola li scrive sulla stessa riga, con uno spazio in mezzo.`
    },
    steps: [
      `Scrivi <code>citta = "Roma"</code> (senza accento sulla a).`,
      `Sotto, crea <code>abitanti</code> con il numero, senza virgolette e senza punti.`,
      `Usa <code>print</code> con i due nomi separati da una virgola.`
    ],
    traps: [
      `Mettere i nomi delle variabili tra virgolette: stamperesti la parola <code>citta</code>, non <code>Roma</code>.`,
      `Scrivere il numero come <code>2.873.000</code>: in Python il punto separa i decimali.`
    ]
  },
  'fond-3': {
    goal: `Calcola l'area di un cerchio di raggio 5 usando le variabili già pronte <code>r</code> e <code>pi</code>, e stampa il risultato (circa 78.54).`,
    idea: `Python è una calcolatrice: <code>*</code> moltiplica e <code>**</code> eleva a potenza. Come in matematica, la potenza si calcola prima della moltiplicazione: <code>pi * r ** 2</code> fa prima r² e poi lo moltiplica per pi.`,
    example: {
      code: `lato = 3
area = lato ** 2
perimetro = 4 * lato
print(area, perimetro)`,
      out: `9 12`,
      note: `I risultati si salvano in variabili e poi si stampano. <code>lato ** 2</code> vale 3 × 3.`
    },
    steps: [
      `Ricorda la formula: area = π × raggio².`,
      `Traducila in Python con <code>pi</code>, <code>r</code>, <code>*</code> e <code>**</code>.`,
      `Salva il risultato in una variabile (per esempio <code>area</code>) e stampala.`
    ],
    traps: [
      `Scrivere il risultato a mano (<code>print(78.54)</code>): la verifica vuole il calcolo.`,
      `Usare <code>^</code> per la potenza: in Python <code>^</code> è un'altra operazione, la potenza è <code>**</code>.`
    ]
  },
  'fond-4': {
    goal: `Stampa <code>Salve Mario, hai 42 anni e fra 10 anni ne avrai 52.</code> costruendo la frase con una f-string a partire da <code>nome</code> e <code>anni</code>.`,
    idea: `Una f-string è un modulo da compilare: scrivi il testo fisso e lasci degli spazi <code>{ }</code> che Python riempie. Dentro le graffe puoi mettere una variabile o anche un calcolo, come <code>{anni + 10}</code>.`,
    example: {
      code: `cibo = "pane"
euro = 2
print(f"{cibo}: {euro} euro")
print(f"Per 3: {euro * 3} euro")`,
      out: `pane: 2 euro
Per 3: 6 euro`,
      note: `La <code>f</code> prima delle virgolette attiva le graffe. <code>{euro * 3}</code> viene calcolato al momento della stampa.`
    },
    steps: [
      `Apri <code>print(f"...")</code> con la f attaccata alle virgolette.`,
      `Copia la frase richiesta e sostituisci <code>Mario</code> con <code>{nome}</code> e <code>42</code> con <code>{anni}</code>.`,
      `Al posto di 52 metti il calcolo tra graffe.`,
      `Controlla virgola e punto finale: l'output deve essere identico.`
    ],
    traps: [
      `Dimenticare la <code>f</code>: verrebbe stampato <code>{nome}</code> così com'è.`,
      `Scrivere 52 a mano: il conto deve farlo Python.`
    ]
  },
  'fond-5': {
    goal: `Fai calcolare a Python se è vero che «10 è maggiore di 5 <b>e</b> 7 è minore di 3», e stampa il risultato (<code>True</code> o <code>False</code>).`,
    idea: `Un confronto è una domanda con risposta sì/no: <code>10 &gt; 5</code> risponde <code>True</code>. <code>and</code> è un controllo doppio: passa solo se <b>entrambe</b> le risposte sono sì. <code>or</code> invece si accontenta di una.`,
    example: {
      code: `eta = 16
print(eta >= 18)
print(eta > 10 and eta < 20)
print(eta < 5 or eta == 16)`,
      out: `False
True
True`,
      note: `Ogni riga stampa la risposta di Python alla domanda tra parentesi.`
    },
    steps: [
      `Scrivi il primo confronto con <code>&gt;</code>.`,
      `Scrivi il secondo con <code>&lt;</code>.`,
      `Uniscili con <code>and</code> e metti tutto dentro <code>print( )</code>.`
    ],
    traps: [
      `Stampare direttamente <code>False</code>: la verifica vuole l'espressione intera.`,
      `Usare <code>&amp;&amp;</code> come in altri linguaggi: in Python si scrive <code>and</code>.`
    ]
  },
  'fond-6': {
    goal: `Con <code>temperatura = 28</code> il programma deve stampare <code>caldo</code>, ma deve funzionare con qualsiasi temperatura: sotto 15 <code>freddo</code>, da 15 a 25 <code>mite</code>, sopra 25 <code>caldo</code>.`,
    idea: `È come un incrocio con più strade: Python controlla le condizioni dall'alto in basso e prende la <b>prima</b> vera, ignorando le altre. <code>else</code> è la strada «in tutti gli altri casi».`,
    example: {
      code: `ore = 14
if ore < 12:
    print("mattina")
elif ore < 18:
    print("pomeriggio")
else:
    print("sera")`,
      out: `pomeriggio`,
      note: `14 non è minore di 12, ma è minore di 18: Python si ferma alla seconda strada.`
    },
    steps: [
      `Prima condizione: <code>if temperatura &lt; 15:</code> e sotto, rientrato di 4 spazi, il <code>print</code>.`,
      `Poi <code>elif</code> per il caso mite: lì sai già che è almeno 15, basta controllare <code>&lt;= 25</code>.`,
      `Infine <code>else:</code> per il caldo.`,
      `La verifica prova anche 10, 15 e 25: pensa bene ai confini.`
    ],
    traps: [
      `Usare <code>&lt; 25</code> invece di <code>&lt;= 25</code>: con 25 uscirebbe «caldo».`,
      `Dimenticare i due punti <code>:</code> o il rientro di 4 spazi.`
    ]
  },
  'fond-7': {
    goal: `Calcola con un ciclo la somma dei numeri da 1 a 100 e stampala (deve venire <code>5050</code>).`,
    idea: `Un ciclo <code>for</code> è come contare i passi: <code>range(1, 101)</code> ti dà i numeri da 1 a 100 uno alla volta e il blocco rientrato viene eseguito per ognuno. Una variabile «accumulatore» raccoglie il totale, come un salvadanaio.`,
    example: {
      code: `totale = 0
for n in range(1, 4):
    totale += n * 10
print(totale)`,
      out: `60`,
      note: `<code>range(1, 4)</code> dà 1, 2, 3: il secondo numero è escluso. <code>+=</code> aggiunge al totale: 10 + 20 + 30.`
    },
    steps: [
      `La variabile <code>somma = 0</code> c'è già.`,
      `Scrivi <code>for i in range(...):</code> scegliendo bene dove finire.`,
      `Nel blocco rientrato aggiungi <code>i</code> a <code>somma</code>.`,
      `Il <code>print</code> resta fuori dal ciclo, senza rientro.`
    ],
    traps: [
      `<code>range(1, 100)</code> si ferma a 99: il secondo numero è escluso.`,
      `Mettere il <code>print</code> dentro il ciclo: stamperesti 100 righe.`,
      `Scrivere 5050 nel codice: lo deve calcolare il ciclo.`
    ]
  },
  'fond-8': {
    goal: `Parti da <code>n = 64</code> e dividilo per 2 finché resta almeno 1, contando le divisioni in <code>count</code>. Il programma deve stampare <code>7</code>.`,
    idea: `<code>while</code> vuol dire «continua finché»: prima di ogni giro controlla la condizione e, quando diventa falsa, si ferma. Dentro il ciclo qualcosa deve cambiare, altrimenti gira per sempre.`,
    example: {
      code: `soldi = 10
giorni = 0
while soldi > 0:
    soldi -= 3
    giorni += 1
print(giorni)`,
      out: `4`,
      note: `Ogni giro spende 3 e conta un giorno (10, 7, 4, 1, poi -2): quando i soldi finiscono la condizione è falsa e il ciclo termina.`
    },
    steps: [
      `Condizione: <code>while n &gt;= 1:</code>.`,
      `Nel blocco: dimezza <code>n</code> (<code>n = n / 2</code>).`,
      `Sempre nel blocco: aumenta <code>count</code> di 1.`,
      `Il <code>print(count)</code> è già in fondo, fuori dal ciclo.`
    ],
    traps: [
      `Dimenticare di cambiare <code>n</code>: il ciclo non finisce mai.`,
      `Usare <code>&gt; 1</code> invece di <code>&gt;= 1</code>: conteresti una divisione in meno.`
    ]
  },
  'fond-9': {
    goal: `Dalla lista <code>nums</code> ricava lunghezza, minimo, massimo e somma, e stampali separati da virgole senza spazi: <code>10,1,9,39</code>.`,
    idea: `Una lista è un elenco ordinato, come la lista della spesa. Python ha funzioni pronte che la leggono tutta in un colpo: <code>len</code> conta, <code>min</code> e <code>max</code> trovano gli estremi, <code>sum</code> somma.`,
    example: {
      code: `voti = [7, 9, 6, 8]
print(len(voti), sum(voti))
print(f"{min(voti)}-{max(voti)}")`,
      out: `4 30
6-9`,
      note: `Con una f-string decidi tu cosa mettere tra i valori: qui un trattino.`
    },
    steps: [
      `Calcola i quattro valori con le quattro funzioni (puoi salvarli in variabili).`,
      `Componi la riga con una f-string, mettendo le virgole tra le graffe.`,
      `Controlla che non ci siano spazi.`
    ],
    traps: [
      `<code>print(a, b, c, d)</code> separa con spazi, non con virgole.`,
      `Scrivere i numeri a mano: devono uscire dalle funzioni.`
    ]
  },
  'fond-10': {
    goal: `Il testo <code>cifre = "12 34 56 78"</code> contiene dei numeri: separali, trasformali in numeri veri e stampa la loro somma (<code>180</code>).`,
    idea: `<code>"12"</code> e <code>12</code> sembrano uguali ma non lo sono: il primo è testo, il secondo un numero. Sommando testi li incolli (<code>"12" + "34"</code> dà <code>"1234"</code>). <code>split()</code> taglia il testo dove ci sono spazi, <code>int()</code> trasforma ogni pezzo in numero.`,
    example: {
      code: `prezzi = "5 10 20"
pezzi = prezzi.split()
print(pezzi)
print(int(pezzi[0]) * 2)`,
      out: `['5', '10', '20']
10`,
      note: `Dopo <code>split</code> i pezzi sono ancora testi (lo dicono le virgolette); <code>int</code> li rende numeri.`
    },
    steps: [
      `Dividi <code>cifre</code> con <code>.split()</code>.`,
      `Prepara un totale che parte da 0.`,
      `Con un <code>for</code> sui pezzi aggiungi <code>int(pezzo)</code> al totale.`,
      `Stampa il totale.`
    ],
    traps: [
      `Sommare i pezzi senza <code>int()</code>: Python dà errore o incolla i testi.`,
      `Scrivere 180 nel codice: è la somma che deve calcolare il programma.`
    ]
  },
  'dati-1': {
    goal: `Da <code>a = list(range(20))</code> (i numeri da 0 a 19) estrai solo i dispari, dal più grande al più piccolo: <code>[19, 17, ..., 1]</code>.`,
    idea: `Lo slicing <code>[inizio:fine:passo]</code> è come sfogliare un libro: scegli da che pagina partire, dove fermarti e di quante pagine saltare. Un passo negativo sfoglia all'indietro; l'indice <code>-1</code> è l'ultimo elemento.`,
    example: {
      code: `lettere = list("abcdefgh")
print(lettere[0:4])
print(lettere[::3])
print(lettere[::-1][:3])`,
      out: `['a', 'b', 'c', 'd']
['a', 'd', 'g']
['h', 'g', 'f']`,
      note: `<code>[::3]</code> prende un elemento ogni tre; <code>[::-1]</code> rovescia la lista, e <code>[:3]</code> ne tiene i primi tre.`
    },
    steps: [
      `Ragiona: i dispari sono nelle posizioni 1, 3, 5… e l'ultimo (19) è in posizione <code>-1</code>.`,
      `Parti dalla fine e vai all'indietro saltando di 2.`,
      `Stampa la fetta ottenuta.`
    ],
    traps: [
      `Scrivere la lista a mano: deve uscire da <code>a</code> con lo slicing.`,
      `Confondere posizione e valore: qui coincidono solo perché la lista parte da 0.`
    ]
  },
  'dati-2': {
    goal: `Prendi <code>coppia = (10, 20)</code>, scambia i due valori e stampa la nuova tupla <code>(20, 10)</code>.`,
    idea: `Una tupla è una confezione sigillata: non puoi cambiarne il contenuto, ma puoi «spacchettarla» in variabili (<b>unpacking</b>) e preparare una confezione nuova.`,
    example: {
      code: `data = (25, 12)
giorno, mese = data
print(mese, giorno)
nuova = (mese, giorno)
print(nuova)`,
      out: `12 25
(12, 25)`,
      note: `<code>giorno, mese = data</code> mette il primo valore in <code>giorno</code> e il secondo in <code>mese</code>.`
    },
    steps: [
      `Spacchetta: <code>a, b = coppia</code>.`,
      `Crea una nuova tupla con i valori invertiti, tra parentesi tonde.`,
      `Stampala.`
    ],
    traps: [
      `Provare <code>coppia[0] = 20</code>: le tuple non si modificano (<i>TypeError</i>).`,
      `Scrivere <code>print(b, a)</code>: uscirebbe <code>20 10</code>, non la tupla con le parentesi.`
    ]
  },
  'dati-3': {
    goal: `Conta quante parole compaiono sia in <code>l1</code> sia in <code>l2</code> (la risposta è <code>3</code>).`,
    idea: `Un set è un sacchetto dove ogni elemento può stare una volta sola. Con due set puoi chiedere a Python cosa hanno in comune: è l'<b>intersezione</b>, si scrive <code>&amp;</code>, come la zona dove due cerchi si sovrappongono.`,
    example: {
      code: `anna = ["Luca", "Sara", "Pio"]
bea = ["Sara", "Ugo", "Pio"]
comuni = set(anna) & set(bea)
print(sorted(comuni))
print(len(comuni))`,
      out: `['Pio', 'Sara']
2`,
      note: `<code>sorted</code> serve solo a stampare in ordine alfabetico: i set non hanno un ordine fisso.`
    },
    steps: [
      `Trasforma ciascuna lista in set con <code>set(...)</code>.`,
      `Fai l'intersezione con <code>&amp;</code>.`,
      `Conta gli elementi con <code>len(...)</code> e stampa il numero.`
    ],
    traps: [
      `Stampare il set invece del numero.`,
      `Scrivere 3 a mano: lo deve contare il programma.`
    ]
  },
  'dati-4': {
    goal: `Nel dizionario <code>scores</code> trova chi ha il punteggio più alto e stampa il suo <b>nome</b> (<code>Lara</code>).`,
    idea: `Un dizionario è una rubrica: a ogni <b>chiave</b> (il nome) corrisponde un <b>valore</b> (il punteggio). <code>max</code> su un dizionario confronta le chiavi; con <code>key=scores.get</code> gli dici di confrontare i valori, ma di restituire la chiave.`,
    example: {
      code: `prezzi = {"pane": 2, "olio": 9,
          "sale": 1}
print(prezzi["olio"])
caro = max(prezzi, key=prezzi.get)
print(caro)`,
      out: `9
olio`,
      note: `<code>max(prezzi)</code> da solo darebbe <code>sale</code> (ordine alfabetico); con <code>key=prezzi.get</code> sceglie il prezzo più alto.`
    },
    steps: [
      `Usa <code>max</code> sul dizionario con l'argomento <code>key=</code>…`,
      `…oppure scorri le coppie con <code>for nome, punti in scores.items():</code> tenendo da parte il migliore.`,
      `Stampa il nome trovato.`
    ],
    traps: [
      `<code>max(scores.values())</code> dà 91, il punteggio, non il nome.`,
      `Scrivere "Lara" a mano: va ricavato dal dizionario.`
    ]
  },
  'dati-5': {
    goal: `Costruisci con una list comprehension la lista dei cubi dei numeri pari da 2 a 10: <code>[8, 64, 216, 512, 1000]</code>.`,
    idea: `Una list comprehension è una ricetta in una riga: «per ogni x di questo elenco, metti nella lista quest'altra cosa». Si legge quasi in italiano: <code>[cosa for x in elenco]</code>, con un <code>if</code> facoltativo in fondo per filtrare.`,
    example: {
      code: `doppi = [n * 2 for n in range(1, 5)]
print(doppi)
dispari = [n for n in range(10)
           if n % 2 == 1]
print(dispari)`,
      out: `[2, 4, 6, 8]
[1, 3, 5, 7, 9]`,
      note: `La prima trasforma ogni numero, la seconda li filtra e tiene solo i dispari.`
    },
    steps: [
      `Ottieni i pari da 2 a 10 con <code>range</code> (inizio, fine esclusa, passo 2) oppure con un <code>if</code>.`,
      `Per ciascuno calcola il cubo con <code>** 3</code>.`,
      `Scrivi tutto tra parentesi quadre e stampa la lista.`
    ],
    traps: [
      `<code>range(2, 10, 2)</code> si ferma a 8: la fine è esclusa.`,
      `Scrivere la lista a mano: la verifica vuole la comprehension.`
    ]
  },
  'dati-6': {
    goal: `Da <code>parole</code> costruisci un dizionario che associa a ogni parola la sua lunghezza, e stampalo.`,
    idea: `È la sorella della list comprehension, ma con le graffe e due pezzi separati dai due punti: <code>{chiave: valore for x in elenco}</code>. È come compilare un cartellino «nome → misura» per ogni elemento.`,
    example: {
      code: `nomi = ["Ada", "Bruno"]
iniziali = {n: n[0] for n in nomi}
print(iniziali)`,
      out: `{'Ada': 'A', 'Bruno': 'B'}`,
      note: `Per ogni nome, la chiave è il nome stesso e il valore la sua prima lettera.`
    },
    steps: [
      `Apri le parentesi graffe.`,
      `Chiave: la parola; valore: <code>len(parola)</code>.`,
      `Aggiungi <code>for p in parole</code>, chiudi e stampa il risultato.`
    ],
    traps: [
      `Usare le quadre: otterresti una lista, non un dizionario.`,
      `Scrivere il dizionario a mano.`
    ]
  },
  'dati-7': {
    goal: `Trasforma <code>s</code> in modo che ogni parola inizi con la maiuscola: <code>Il Rapido Lupo Bruno Salta Sul Cane</code>.`,
    idea: `Le stringhe hanno tanti attrezzi già pronti, chiamati <b>metodi</b>, che si usano con il punto: <code>testo.metodo()</code>. Non cambiano il testo originale: ne restituiscono una copia modificata.`,
    example: {
      code: `t = "  buona SERATA  "
print(t.strip())
print(t.strip().lower())
print(t.strip().capitalize())`,
      out: `buona SERATA
buona serata
Buona serata`,
      note: `<code>strip</code> toglie gli spazi ai lati e i metodi si possono mettere in fila. <code>capitalize</code> rende maiuscola solo la prima lettera della frase.`
    },
    steps: [
      `Rileggi l'elenco dei metodi nella teoria.`,
      `Cerca quello che mette la maiuscola a <b>ogni</b> parola (in inglese «titolo»).`,
      `Applicalo a <code>s</code> con il punto e stampa il risultato.`
    ],
    traps: [
      `<code>capitalize()</code> cambia solo la prima parola.`,
      `Riscrivere la frase a mano.`
    ]
  },
  'dati-8': {
    goal: `Abbina ogni città alla sua popolazione e stampa una riga per coppia: <code>Roma:2873000</code>, <code>Milano:1379000</code>, <code>Napoli:967000</code>.`,
    idea: `<code>zip</code> funziona come una cerniera: prende due liste e unisce gli elementi nella stessa posizione, il primo col primo, il secondo col secondo. <code>enumerate</code> invece numera gli elementi di una lista.`,
    example: {
      code: `piatti = ["pizza", "pasta"]
prezzi = [8, 7]
for p, e in zip(piatti, prezzi):
    print(f"{p} = {e} euro")
for i, p in enumerate(piatti):
    print(i, p)`,
      out: `pizza = 8 euro
pasta = 7 euro
0 pizza
1 pasta`,
      note: `Nel primo ciclo <code>p</code> e <code>e</code> ricevono una coppia per giro; nel secondo <code>i</code> è la posizione, che parte da 0.`
    },
    steps: [
      `Scrivi un <code>for</code> con due variabili, per esempio <code>c</code> e <code>p</code>.`,
      `Dopo <code>in</code> metti <code>zip(citta, popolazione)</code>: a ogni giro arriva una coppia.`,
      `Nel blocco stampa una f-string con i due valori separati da <code>:</code>, senza spazi.`
    ],
    traps: [
      `Spazi attorno ai due punti: l'output deve essere identico.`,
      `Scrivere le righe a mano: vanno composte nel ciclo.`
    ]
  },
  'dati-9': {
    goal: `Ordina la lista <code>punti</code> dal punteggio più alto al più basso e stampala.`,
    idea: `<code>sorted</code> mette in ordine, ma su una lista di tuple guarda prima il nome. Con <code>key=</code> gli dici <b>cosa guardare</b> (come scegliere la colonna di una tabella), con <code>reverse=True</code> inverti l'ordine. Una <code>lambda</code> è una mini-funzione scritta al volo.`,
    example: {
      code: `film = [("Up", 96), ("Cars", 117),
        ("Coco", 105)]
print(sorted(film))
durata = sorted(film,
                key=lambda f: f[1])
print(durata)`,
      out: `[('Cars', 117), ('Coco', 105), ('Up', 96)]
[('Up', 96), ('Coco', 105), ('Cars', 117)]`,
      note: `Senza <code>key</code> ordina per nome (il primo elemento); con <code>key=lambda f: f[1]</code> ordina per durata, dal più corto.`
    },
    steps: [
      `Usa <code>sorted(punti, ...)</code>.`,
      `Con <code>key=lambda t: t[1]</code> scegli il punteggio (posizione 1 della tupla).`,
      `Aggiungi <code>reverse=True</code> e stampa.`
    ],
    traps: [
      `Dimenticare <code>reverse=True</code>: l'ordine sarebbe crescente.`,
      `<code>t[0]</code> è il nome, non il punteggio.`
    ]
  },
  'dati-10': {
    goal: `Nella frase trova la parola che compare più volte e stampala (<code>il</code>).`,
    idea: `<code>Counter</code> è un contapersone automatico: gli dai un elenco e lui conta quante volte compare ogni elemento. <code>most_common(n)</code> restituisce le <code>n</code> coppie (elemento, conteggio) più frequenti.`,
    example: {
      code: `from collections import Counter
voti = ["sì", "no", "sì", "sì"]
c = Counter(voti)
print(c["sì"])
print(c.most_common(1))`,
      out: `3
[('sì', 3)]`,
      note: `<code>most_common(1)</code> è una lista con una coppia dentro: <code>[0]</code> prende la coppia, un altro <code>[0]</code> la parola.`
    },
    steps: [
      `Dividi la frase in parole con <code>split()</code>.`,
      `Passa le parole a <code>Counter</code>.`,
      `Prendi la più frequente con <code>most_common(1)</code> ed estrai solo la parola.`,
      `Stampala.`
    ],
    traps: [
      `<code>Counter(frase)</code> senza <code>split</code> conta le lettere, non le parole.`,
      `Stampare <code>[('il', 3)]</code> invece di <code>il</code>.`
    ]
  },
  'func-1': {
    goal: `Crea <code>area_triangolo(base, altezza)</code> e restituisci l'area. Stampa il risultato per base 10 e altezza 8.`,
    idea: `Una funzione è come una piccola macchina: riceve dati e produce un risultato. I parametri sono gli ingredienti. Con <code>return</code> consegni il risultato a chi l'ha chiamata.`,
    example: {
      code: `def costo_biglietti(quanti, prezzo):
    return quanti * prezzo

print(costo_biglietti(3, 7))`,
      out: `21`,
      note: `La funzione calcola il costo di tre biglietti. È la chiamata esterna a stampare il valore restituito.`
    },
    steps: [
      `Mantieni i due parametri della funzione.`,
      `Calcola l'area moltiplicando base e altezza e dividendo per due.`,
      `Restituisci il valore e stampa la chiamata con i dati richiesti.`
    ],
    traps: [
      `Stampare dentro la funzione al posto di restituire il valore.`,
      `Usare sempre 10 e 8 nel calcolo: la funzione deve funzionare anche con altre misure.`
    ]
  },
  'func-2': {
    goal: `Scrivi <code>potenza</code> con esponente predefinito 2. Stampa la chiamata con base 5 e quella con base 2 ed esponente 10.`,
    idea: `Un valore predefinito è come l'opzione già scelta in un modulo. Viene usato se non passi quel parametro. Con un argomento nominato puoi scegliere esplicitamente quale opzione cambiare.`,
    example: {
      code: `def etichetta(nome, lingua="IT"):
    return lingua + ": " + nome

print(etichetta("Mela"))
print(etichetta("Apple", lingua="EN"))`,
      out: `IT: Mela
EN: Apple`,
      note: `La prima chiamata usa la lingua predefinita. La seconda la sostituisce passando il parametro per nome.`
    },
    steps: [
      `Lascia il valore predefinito 2 per <code>esp</code>.`,
      `Usa l'operatore di elevamento a potenza e restituisci il risultato.`,
      `Stampa le due chiamate su righe separate, passando <code>esp</code> per nome nella seconda.`
    ],
    traps: [
      `Confondere <code>**</code> con la moltiplicazione o con <code>^</code>.`,
      `Ignorare il parametro esplicito: i test cambiano base ed esponente.`
    ]
  },
  'func-3': {
    goal: `Scrivi <code>media(*nums)</code> per calcolare la media dei numeri ricevuti. Stampa la media di 2, 4, 6, 8 e 10.`,
    idea: `Il parametro con un asterisco è come una borsa che raccoglie tutti gli argomenti posizionali. Dentro la funzione trovi una tupla. Puoi sommare i suoi elementi e contarli senza sapere in anticipo quanti saranno.`,
    example: {
      code: `def totale_pagine(*libri):
    return sum(libri)

print(totale_pagine(80, 120, 60))
print(totale_pagine(25, 35))`,
      out: `260
60`,
      note: `La stessa funzione accetta sia tre sia due quantità. L'asterisco raccoglie i valori senza richiedere una lista.`
    },
    steps: [
      `Mantieni l'asterisco davanti a <code>nums</code>.`,
      `Calcola la somma dei valori e il loro numero.`,
      `Restituisci il rapporto tra somma e quantità, poi stampa la chiamata richiesta.`
    ],
    traps: [
      `Definire cinque parametri fissi invece di un parametro variabile.`,
      `Dividere sempre per cinque: i test passano anche solo due numeri.`
    ]
  },
  'func-4': {
    goal: `Ordina le parole date dalla più lunga alla più corta. Stampa la lista ottenuta usando una lambda come criterio.`,
    idea: `La chiave di ordinamento è come il numero sul cartellino di un prodotto. Python confronta quel numero invece dell'oggetto intero. Una <code>lambda</code> descrive al volo come ricavare il cartellino.`,
    example: {
      code: `pesi = [-8, 3, -1, 5]
ordinati = sorted(
    pesi, key=lambda p: abs(p)
)
print(ordinati)`,
      out: `[-1, 3, 5, -8]`,
      note: `Qui il cartellino è il valore assoluto del numero. I valori originali restano nella lista, ma cambia il loro ordine.`
    },
    steps: [
      `Passa la lista a <code>sorted</code>.`,
      `Imposta <code>key</code> con una lambda che misura la lunghezza di una parola.`,
      `Scegli l'ordine decrescente e stampa il risultato.`
    ],
    traps: [
      `Ordinare alfabeticamente dimenticando <code>key</code>.`,
      `Dimenticare <code>reverse=True</code> oppure evitare la lambda richiesta dai test.`
    ]
  },
  'func-5': {
    goal: `Calcola la somma dei quadrati dei soli numeri pari della lista. Fai calcolare il risultato a Python con le funzioni del capitolo.`,
    idea: `Immagina una catena di lavoro con tre stazioni. <code>filter</code> sceglie gli elementi, <code>map</code> li trasforma e <code>sum</code> li somma. Gli oggetti prodotti da map e filter forniscono i valori quando vengono richiesti.`,
    example: {
      code: `prezzi = [3, 8, 5, 10]
scelti = filter(
    lambda p: p > 5, prezzi
)
scontati = map(
    lambda p: p - 1, scelti
)
print(sum(scontati))`,
      out: `16`,
      note: `Si scelgono i prezzi maggiori di cinque, si toglie uno a ciascuno e si sommano i nuovi prezzi.`
    },
    steps: [
      `Filtra i numeri divisibili per due.`,
      `Trasforma ogni numero scelto nel suo quadrato con <code>map</code>.`,
      `Somma i valori trasformati e stampa il totale.`
    ],
    traps: [
      `Scrivere direttamente 220: il test lo vieta.`,
      `Sommare tutti i quadrati senza filtrare, o consumare un iteratore prima della somma.`
    ]
  },
  'func-6': {
    goal: `Completa la classe <code>Conto</code> con i metodi per versare e prelevare. Esegui le quattro operazioni richieste e stampa il saldo.`,
    idea: `Una classe è come il progetto di un contenitore. Ogni oggetto costruito con quel progetto conserva i propri dati. <code>self</code> indica il contenitore su cui stai lavorando in quel momento.`,
    example: {
      code: `class Scatola:
    def __init__(self, pezzi=0):
        self.pezzi = pezzi
    def aggiungi(self, quanti):
        self.pezzi += quanti

s = Scatola(2)
s.aggiungi(3)
print(s.pezzi)`,
      out: `5`,
      note: `Il metodo cambia il dato conservato nella scatola. Una seconda scatola avrebbe un conteggio indipendente.`
    },
    steps: [
      `Conserva il saldo iniziale nell'attributo dell'istanza, con default zero.`,
      `Aggiungi i metodi <code>versa</code> e <code>preleva</code> con parametro per l'importo.`,
      `Aggiorna il saldo dell'oggetto in ciascun metodo.`,
      `Esegui le operazioni dello starter e stampa il saldo finale.`
    ],
    traps: [
      `Cambiare una variabile locale invece di <code>self.saldo</code>.`,
      `Dimenticare <code>self</code> nei metodi o ignorare un saldo iniziale diverso da zero.`
    ]
  },
  'func-7': {
    goal: `Crea <code>Auto</code> come sottoclasse di <code>Veicolo</code>. Ogni classe deve restituire la propria descrizione, da stampare su due righe.`,
    idea: `Ereditare è come partire da una ricetta di famiglia. La nuova classe riceve i metodi della classe base. Se ridefinisce un metodo con lo stesso nome, usa la propria variante.`,
    example: {
      code: `class Strumento:
    def suono(self):
        return "nota"

class Tamburo(Strumento):
    def suono(self):
        return "tum"

print(Strumento().suono())
print(Tamburo().suono())`,
      out: `nota
tum`,
      note: `Il tamburo eredita da Strumento e sostituisce il metodo suono con la propria versione.`
    },
    steps: [
      `Mantieni il metodo <code>descrivi</code> della classe base.`,
      `Indica <code>Veicolo</code> tra le parentesi nella definizione di <code>Auto</code>.`,
      `Ridefinisci <code>descrivi</code> nella sottoclasse con il testo richiesto.`,
      `Crea un oggetto per classe e stampa le due descrizioni.`
    ],
    traps: [
      `Creare due classi indipendenti: il test controlla l'ereditarietà.`,
      `Cambiare nome al metodo invece di ridefinire <code>descrivi</code>.`
    ]
  },
  'func-8': {
    goal: `Aggiungi a <code>Punto</code> il metodo che decide come appare con print. Per le coordinate 3 e 4 deve apparire <code>Punto(3, 4)</code>.`,
    idea: `<code>__str__</code> è come il cartellino leggibile di un oggetto. Quando stampi l'oggetto, Python chiede a questo metodo quale testo mostrare. Il metodo restituisce una stringa costruita con i dati dell'istanza.`,
    example: {
      code: `class Libro:
    def __init__(self, titolo):
        self.titolo = titolo
    def __str__(self):
        return f"Libro: {self.titolo}"

print(Libro("Il viaggio"))`,
      out: `Libro: Il viaggio`,
      note: `Non stampiamo direttamente il titolo: stampiamo un oggetto che sa presentarsi come testo.`
    },
    steps: [
      `Mantieni le coordinate salvate dal costruttore.`,
      `Definisci <code>__str__</code> con il parametro <code>self</code>.`,
      `Restituisci una stringa con nome, parentesi e coordinate dell'oggetto.`,
      `Stampa l'istanza richiesta.`
    ],
    traps: [
      `Usare print dentro <code>__str__</code> invece di restituire una stringa.`,
      `Scrivere coordinate fisse o dimenticare lo spazio dopo la virgola.`,
      `Aggiungere <code>__eq__</code> pensando sia necessario: qui viene richiesto <code>__str__</code>.`
    ]
  },
  'func-9': {
    goal: `Aggiungi a <code>Temperatura</code> la proprietà di sola lettura <code>fahrenheit</code>. Stampala per una temperatura di 25 gradi Celsius.`,
    idea: `Una proprietà è come un display che mostra un valore ricavato da un dato interno. Si legge come un attributo, ma dietro viene eseguito un metodo. Senza setter non puoi assegnare direttamente un nuovo valore a quella proprietà.`,
    example: {
      code: `class Distanza:
    def __init__(self, metri):
        self._metri = metri
    @property
    def centimetri(self):
        return self._metri * 100

print(Distanza(3).centimetri)`,
      out: `300`,
      note: `Il valore in centimetri viene calcolato leggendo la proprietà, senza parentesi di chiamata.`
    },
    steps: [
      `Salva i Celsius nell'attributo <code>_celsius</code>.`,
      `Metti <code>@property</code> sopra il metodo <code>fahrenheit</code>.`,
      `Restituisci la conversione: moltiplica i Celsius per nove quinti e aggiungi 32.`,
      `Leggi la proprietà dell'oggetto e stampala.`
    ],
    traps: [
      `Chiamare <code>fahrenheit()</code> con le parentesi.`,
      `Restituire sempre 77.0: il test controlla anche un'altra temperatura.`
    ]
  },
  'func-10': {
    goal: `Crea il decoratore <code>doppio_risultato</code> e applicalo a <code>somma</code>. La chiamata con 3 e 4 deve restituire il doppio della somma.`,
    idea: `Un decoratore è come una confezione che aggiunge qualcosa a un prodotto. Il wrapper riceve la chiamata, usa la funzione originale e ne modifica il risultato. Il decoratore restituisce il wrapper, che prende il posto della funzione.`,
    example: {
      code: `def maiuscolo(fn):
    def wrapper(*a, **kw):
        return fn(*a, **kw).upper()
    return wrapper

@maiuscolo
def avviso(testo):
    return "nota: " + testo

print(avviso("pausa"))`,
      out: `NOTA: PAUSA`,
      note: `Il decoratore conserva gli argomenti della chiamata e trasforma in maiuscolo il testo restituito.`
    },
    steps: [
      `Nel wrapper inoltra gli argomenti alla funzione ricevuta dal decoratore.`,
      `Raddoppia il valore restituito da quella chiamata.`,
      `Restituisci il wrapper dal decoratore.`,
      `Applica <code>@doppio_risultato</code> a <code>somma</code> e stampa la chiamata richiesta.`
    ],
    traps: [
      `Restituire <code>wrapper()</code> invece di <code>wrapper</code> dal decoratore.`,
      `Raddoppiare valori fissi o dimenticare di inoltrare gli argomenti.`,
      `Modificare soltanto il corpo di somma senza usare il decoratore controllato dal test.`
    ]
  },
  'avan-1': {
    goal: `Scrivi <code>safe_div(a, b)</code>: restituisce la divisione oppure il testo <code>errore</code> se il divisore è zero. Stampa la chiamata con 10 e 0.`,
    idea: `<code>try</code> è come provare ad aprire una porta. <code>except</code> stabilisce cosa fare se incontri uno specifico ostacolo. Se l'operazione riesce, quel blocco di recupero viene saltato.`,
    example: {
      code: `def leggi_eta(testo):
    try:
        return int(testo)
    except ValueError:
        return "dato non valido"

print(leggi_eta("dodici"))
print(leggi_eta("12"))`,
      out: `dato non valido
12`,
      note: `La conversione non valida viene gestita, mentre quella valida restituisce normalmente un intero.`
    },
    steps: [
      `Metti la divisione nel blocco <code>try</code>.`,
      `Intercetta precisamente <code>ZeroDivisionError</code>.`,
      `Restituisci il testo richiesto nel caso di errore e il quoziente nel caso normale.`,
      `Stampa la chiamata dello starter.`
    ],
    traps: [
      `Eseguire la divisione prima del try.`,
      `Restituire sempre il testo di errore: il test verifica anche una divisione valida.`
    ]
  },
  'avan-2': {
    goal: `Completa il context manager <code>Stampante</code>. Deve stampare inizio, il messaggio interno e fine, in questo ordine su tre righe.`,
    idea: `<code>with</code> è come entrare e uscire da una stanza con una procedura automatica. <code>__enter__</code> prepara l'ingresso. Dopo un ingresso riuscito, <code>__exit__</code> gestisce l'uscita anche se il blocco solleva un errore.`,
    example: {
      code: `class Luce:
    def __enter__(self):
        print("luce accesa")
        return self
    def __exit__(self, *errori):
        print("luce spenta")

with Luce():
    print("leggo")`,
      out: `luce accesa
leggo
luce spenta`,
      note: `Il messaggio centrale appartiene al blocco with. Gli altri vengono dai due metodi del context manager.`
    },
    steps: [
      `Stampa il messaggio di ingresso in <code>__enter__</code>.`,
      `Completa <code>__exit__</code> con il messaggio di uscita e mantieni i parametri previsti.`,
      `Usa la classe con <code>with</code> e stampa il messaggio centrale nel blocco indentato.`
    ],
    traps: [
      `Stampare le tre righe direttamente senza classe e with: il test controlla entrambi.`,
      `Dare a <code>__exit__</code> solo self: Python gli passa anche i dati dell'eventuale errore.`
    ]
  },
  'avan-3': {
    goal: `Scrivi <code>pari_fino_a(n)</code> come generatore dei pari da zero fino a n incluso. Stampa la lista prodotta per n uguale a 10.`,
    idea: `Un generatore è come un distributore che consegna un prodotto alla volta. Con <code>yield</code> consegna un valore e si mette in pausa. Alla richiesta successiva riparte da dove si era fermato.`,
    example: {
      code: `def tappe(n):
    for km in range(3, n + 1, 3):
        yield km

print(list(tappe(10)))`,
      out: `[3, 6, 9]`,
      note: `Il generatore produce tappe ogni tre chilometri. list richiede tutti i valori fino alla fine.`
    },
    steps: [
      `Definisci la funzione con il limite <code>n</code>.`,
      `Scorri i pari partendo da zero e considera anche il limite se è pari.`,
      `Produci ogni numero con <code>yield</code>.`,
      `Converti il generatore in lista per stamparlo.`
    ],
    traps: [
      `Usare return al primo valore: terminerebbe la funzione.`,
      `Escludere 10 dal range o includere il numero dispari successivo quando n è dispari.`
    ]
  },
  'avan-4': {
    goal: `Completa <code>concatena</code> mantenendo i type hint e il separatore predefinito. Unisci le parole ricevute e stampa il risultato della chiamata data.`,
    idea: `Le annotazioni sono come etichette sui contenitori: indicano quali dati ci si aspetta. Aiutano a capire il codice, ma da sole non controllano i tipi durante l'esecuzione. Il separatore è il piccolo ponte da mettere tra due parole.`,
    example: {
      code: `def conta(nomi: list[str]) -> int:
    return len(nomi)

print(conta(["Lia", "Teo", "Ada"]))`,
      out: `3`,
      note: `L'annotazione descrive una lista di stringhe in ingresso e un intero in uscita. Non converte automaticamente i dati.`
    },
    steps: [
      `Mantieni le annotazioni dei due parametri e del valore restituito.`,
      `Usa il separatore ricevuto per unire gli elementi della lista.`,
      `Restituisci il testo e stampa la chiamata dello starter.`
    ],
    traps: [
      `Rimuovere i type hint: il test ne controlla la presenza.`,
      `Scrivere sempre la virgola invece di usare <code>sep</code>: viene provato anche un separatore diverso.`
    ]
  },
  'avan-5': {
    goal: `Estrai dal testo tutti i numeri d'ordine preceduti da cancelletto. Stampali come lista di interi, senza includere le cifre delle date.`,
    idea: `Una regex è come una sagoma che riconosce una forma nel testo. Il simbolo prima delle cifre aiuta a distinguere un codice da una data. Un gruppo tra parentesi cattura soltanto la parte che vuoi conservare.`,
    example: {
      code: `import re
testo = "posti A12 e A7, piano 3"
trovati = re.findall(r"A(\\d+)", testo)
print([int(x) for x in trovati])`,
      out: `[12, 7]`,
      note: `La sagoma cerca cifre dopo A e cattura solo le cifre. Il numero del piano viene ignorato.`
    },
    steps: [
      `Importa <code>re</code> e usa il testo fornito.`,
      `Con <code>re.findall</code> cerca il cancelletto seguito da una o più cifre, catturando solo le cifre.`,
      `Converti ogni testo trovato con <code>int</code>.`,
      `Stampa la lista nell'ordine di comparsa.`
    ],
    traps: [
      `Cercare tutte le cifre senza il cancelletto: prenderesti anche le date.`,
      `Lasciare i numeri come stringhe o scrivere gli ordini a mano: i test richiedono estrazione e conversione.`
    ]
  },
  'avan-6': {
    goal: `Calcola i giorni trascorsi dal primo gennaio al 31 dicembre 2024. Stampa il numero ricavato dalla differenza tra le due date.`,
    idea: `Sottrarre due date è come misurare la distanza tra due caselle del calendario. Il risultato è una durata, chiamata <code>timedelta</code>. Il suo attributo <code>days</code> indica il numero di giorni.`,
    example: {
      code: `from datetime import date
partenza = date(2025, 5, 10)
ritorno = date(2025, 5, 14)
durata = ritorno - partenza
print(durata.days)`,
      out: `4`,
      note: `Tra il giorno 10 e il giorno 14 trascorrono quattro giorni. Non si contano entrambe le date come giornate intere aggiuntive.`
    },
    steps: [
      `Costruisci o mantieni le due date indicate.`,
      `Sottrai la data iniziale da quella finale.`,
      `Leggi <code>.days</code> dalla durata e stampalo.`
    ],
    traps: [
      `Invertire le date ottenendo un numero negativo.`,
      `Aggiungere uno per contare gli estremi o scrivere direttamente 365: serve la differenza calcolata.`
    ]
  },
  'avan-7': {
    goal: `Leggi la stringa JSON fornita e calcola il totale dei prezzi dei prodotti. Stampa il totale numerico.`,
    idea: `Il JSON è come un pacco di dati scritto sotto forma di testo. <code>json.loads</code> lo apre e crea liste e dizionari Python. A quel punto puoi visitare i dati come normali contenitori.`,
    example: {
      code: `import json
s = '{"squadra":["Lia","Teo"]}'
dati = json.loads(s)
print(len(dati["squadra"]))`,
      out: `2`,
      note: `Dopo la lettura, squadra è una lista Python. Possiamo contarne gli elementi con len.`
    },
    steps: [
      `Importa <code>json</code> e mantieni la stringa originale.`,
      `Trasforma il testo in dati con <code>json.loads</code>.`,
      `Scorri la lista associata a prodotti e somma i valori prezzo.`,
      `Stampa il totale calcolato.`
    ],
    traps: [
      `Tentare di accedere ai prodotti prima di convertire il testo JSON.`,
      `Scrivere direttamente 18: il test richiede la lettura del JSON e il calcolo.`
    ]
  },
  'avan-8': {
    goal: `Conta i gruppi di tre elementi ottenibili da dieci elementi distinti. Usa <code>combinations</code> e stampa il numero dei gruppi.`,
    idea: `Una combinazione è come scegliere una squadra: conta chi partecipa, non l'ordine dei nomi. <code>combinations</code> produce ogni gruppo una sola volta. Non va confusa con una permutazione, dove l'ordine conta.`,
    example: {
      code: `from itertools import combinations
gusti = ["mela", "pera", "kiwi"]
coppie = list(combinations(gusti, 2))
print(coppie)`,
      out: `[('mela', 'pera'), ('mela', 'kiwi'), ('pera', 'kiwi')]`,
      note: `Ogni coppia di gusti compare una volta. Non compare anche la stessa coppia con i nomi invertiti.`
    },
    steps: [
      `Importa <code>combinations</code> da itertools.`,
      `Prepara dieci elementi distinti e richiedi gruppi di tre.`,
      `Raccogli i gruppi in una lista, contali e stampa il conteggio.`
    ],
    traps: [
      `Usare permutations e contare più volte lo stesso gruppo.`,
      `Scrivere direttamente 120: il test verifica l'uso di combinations e vieta il risultato fisso.`
    ]
  },
  'avan-9': {
    goal: `Scrivi <code>fib(n)</code> ricorsiva con <code>@lru_cache</code>. Stampa il numero di Fibonacci di indice 50.`,
    idea: `La cache è come un quaderno dei risultati già trovati. Se una chiamata con gli stessi argomenti torna, il risultato viene letto dal quaderno. Nella ricorsione questo evita di ripetere molti calcoli uguali.`,
    example: {
      code: `from functools import lru_cache
@lru_cache(maxsize=None)
def gradini(n):
    if n == 0:
        return 0
    return n + gradini(n - 1)

print(gradini(4))
print(gradini(4))
print(gradini.cache_info().hits)`,
      out: `10
10
1`,
      note: `La funzione somma i numeri da uno a n. La seconda chiamata legge il valore in cache: il contatore hits aumenta a uno.`
    },
    steps: [
      `Importa il decoratore e applicalo a <code>fib</code> con cache senza limite.`,
      `Gestisci i casi base di indice zero e uno.`,
      `Per gli altri indici combina le due chiamate ricorsive ai termini precedenti.`,
      `Stampa la chiamata con indice 50.`
    ],
    traps: [
      `Omettere i casi base: la ricorsione non termina correttamente.`,
      `Usare solo un ciclo o decorare un'altra funzione: i test controllano ricorsione e decoratore di fib.`
    ]
  },
  'avan-10': {
    goal: `Completa <code>classifica</code> usando match/case per riconoscere le forme dei comandi. Gestisci anche l'uscita e i comandi sconosciuti.`,
    idea: `Il pattern matching è come smistare pacchi in base alla loro forma. Un caso controlla quanti elementi ci sono e quali valori fissi contengono. I nomi nel pattern raccolgono le parti variabili.`,
    example: {
      code: `def leggi(pacco):
    match pacco:
        case ["libro", titolo]:
            return f"Leggo {titolo}"
        case ["vuoto"]:
            return "Niente da leggere"
        case _:
            return "Altro pacco"

print(leggi(["libro", "Fiabe"]))
print(leggi(["penna"]))`,
      out: `Leggo Fiabe
Altro pacco`,
      note: `Il primo caso cattura il titolo solo per un pacco di due elementi che inizia con libro. Il caso finale accoglie il resto.`
    },
    steps: [
      `Mantieni <code>match</code> sull'argomento ricevuto.`,
      `Distingui il comando di uscita dalle due forme di go, con due o tre elementi totali.`,
      `Usa i valori catturati per costruire esattamente i messaggi richiesti.`,
      `Aggiungi il caso generale finale e stampa le due chiamate dello starter.`
    ],
    traps: [
      `Mettere <code>case _</code> prima dei casi specifici.`,
      `Confondere valori fissi tra virgolette e nomi che catturano dati.`,
      `Dimenticare i casi quit e sconosciuto, verificati dai test aggiuntivi.`
    ]
  },
  'algo-1': {
    goal: `Esegui FizzBuzz per i numeri da 1 a 15 inclusi. Stampa una sola riga per ogni numero, scegliendo il testo adatto quando è un multiplo.`,
    idea: `Le condizioni sono come bivi lungo una strada. Il resto <code>%</code> dice se una divisione è esatta. Il bivio più specifico va controllato prima, perché un numero può soddisfare più regole.`,
    example: {
      code: `for giorno in range(1, 5):
    if giorno % 4 == 0:
        print("pausa lunga")
    elif giorno % 2 == 0:
        print("pausa breve")
    else:
        print("lavoro")`,
      out: `lavoro
pausa breve
lavoro
pausa lunga`,
      note: `Il giorno quattro soddisfa entrambe le divisibilità. Il primo ramo gli assegna la pausa lunga.`
    },
    steps: [
      `Scorri i numeri da uno a quindici con un ciclo for.`,
      `Controlla prima il caso comune ai multipli di tre e cinque.`,
      `Gestisci i due casi singoli con elif e stampa il numero negli altri casi.`
    ],
    traps: [
      `Controllare il multiplo di tre prima del caso combinato.`,
      `Usare if indipendenti e stampare più righe per un numero.`,
      `Scrivere quindici print separati: i test richiedono ciclo e operatore resto.`
    ]
  },
  'algo-2': {
    goal: `Scrivi <code>reverse(s)</code> che restituisce la stringa letta al contrario. Stampa la chiamata con il testo dello starter.`,
    idea: `Lo slicing è come percorrere una fila di caselle con un passo scelto. Un passo negativo cammina verso sinistra. Lasciando liberi gli estremi puoi attraversare tutta la sequenza al contrario.`,
    example: {
      code: `fermate = ["porto", "parco", "centro"]
ritorno = fermate[::-1]
print(ritorno)`,
      out: `['centro', 'parco', 'porto']`,
      note: `Lo slicing inverte l'ordine delle fermate senza cambiare la lista di partenza. La stessa idea vale per i caratteri di un testo.`
    },
    steps: [
      `Usa il parametro ricevuto dalla funzione.`,
      `Ricava una copia dei caratteri in ordine inverso tramite slicing.`,
      `Restituisci la nuova stringa e stampa la chiamata richiesta.`
    ],
    traps: [
      `Stampare il testo invertito dentro la funzione senza return.`,
      `Scrivere a mano la stringa attesa: il test prova anche un altro testo.`
    ]
  },
  'algo-3': {
    goal: `Scrivi <code>is_pal(s)</code> per riconoscere i palindromi ignorando maiuscole e minuscole. Stampa i due risultati booleani richiesti.`,
    idea: `Un palindromo è come una fila che appare uguale guardandola dai due lati. Prima del confronto metti le lettere nella stessa forma. È come confrontare due etichette dopo averle entrambe scritte in minuscolo.`,
    example: {
      code: `codice = "AbC"
conferma = "abc"
print(
    codice.lower() == conferma.lower()
)
print(codice[::-1])`,
      out: `True
CbA`,
      note: `Il primo confronto ignora le maiuscole. La seconda riga mostra separatamente come si legge il codice al contrario.`
    },
    steps: [
      `Normalizza il testo ricevuto in minuscolo.`,
      `Confronta il testo normalizzato con la propria versione invertita.`,
      `Restituisci il booleano e stampa le chiamate per Anna e Pippo.`
    ],
    traps: [
      `Normalizzare soltanto uno dei due lati del confronto.`,
      `Restituire le stringhe True e False anziché i valori booleani.`,
      `Scrivere risposte fisse per i due nomi: i test cambiano le parole.`
    ]
  },
  'algo-4': {
    goal: `Calcola il numero di Fibonacci di indice 30 usando un ciclo. Stampa il valore calcolato.`,
    idea: `Bastano due caselle per ricordare gli ultimi due numeri. È come avanzare con due pedine: una prende il posto dell'altra e l'altra riceve la somma precedente. L'assegnazione simultanea usa i vecchi valori per entrambi i nuovi risultati.`,
    example: {
      code: `prima, dopo = 2, 3
for _ in range(3):
    prima, dopo = dopo, prima + dopo
    print(prima, dopo)`,
      out: `3 5
5 8
8 13`,
      note: `Questa coppia parte da valori diversi da quelli iniziali di Fibonacci. Ogni giro conserva solo i due valori necessari.`
    },
    steps: [
      `Inizializza la coppia con i valori di indice zero e uno.`,
      `Ripeti trenta avanzamenti con un ciclo.`,
      `Aggiorna insieme i due valori e stampa quello che rappresenta l'indice trenta.`
    ],
    traps: [
      `Aggiornare prima un valore e poi usare quello già modificato per l'altro.`,
      `Fare un giro in più o in meno.`,
      `Scrivere direttamente 832040: il test richiede il calcolo con un ciclo.`
    ]
  },
  'algo-5': {
    goal: `Ordina la lista data con bubble sort. Implementa confronti e scambi tra vicini, poi stampa la lista ottenuta.`,
    idea: `Immagina persone in fila che si scambiano se il più alto è prima del più basso. Una passata porta il massimo della zona esaminata in fondo. Ripetendo le passate sistemi progressivamente tutta la fila.`,
    example: {
      code: `fila = [6, 2, 4]
for j in range(len(fila) - 1):
    if fila[j] > fila[j + 1]:
        x, y = fila[j:j + 2]
        fila[j], fila[j + 1] = y, x
print(fila)`,
      out: `[2, 4, 6]`,
      note: `Qui mostriamo una sola passata, che porta sei in fondo. Con altre liste una passata non basta a completare l'ordinamento.`
    },
    steps: [
      `Prepara un ciclo esterno per ripetere le passate.`,
      `Nel ciclo interno confronta solo coppie di vicini ancora da sistemare.`,
      `Scambia i due elementi con assegnazione simultanea quando sono fuori ordine.`,
      `Stampa la lista dopo tutti i cicli.`
    ],
    traps: [
      `Usare <code>sorted()</code> o <code>.sort()</code>: sono vietati.`,
      `Accedere a un vicino oltre la fine della lista.`,
      `Scrivere una seconda lista già ordinata invece di fare gli scambi.`
    ]
  },
  'algo-6': {
    goal: `Scrivi <code>bsearch</code> per cercare un valore nella lista ordinata. Restituisci il suo indice, oppure -1 se manca, e prova la ricerca di 42.`,
    idea: `La ricerca binaria è come cercare una pagina aprendo un libro a metà. Il confronto con il centro permette di scartare metà delle pagine. Ripeti finché trovi il valore o la zona di ricerca diventa vuota.`,
    example: {
      code: `segreto = 11
basso, alto = 1, 16
while basso < alto:
    centro = (basso + alto) // 2
    if centro < segreto:
        basso = centro + 1
    else:
        alto = centro
print(basso)`,
      out: `11`,
      note: `Il gioco restringe un intervallo di numeri fino a indovinare il segreto. In una lista il confronto avviene invece con il valore all'indice centrale.`
    },
    steps: [
      `Imposta gli estremi agli indici iniziale e finale della lista.`,
      `Finché l'intervallo non è vuoto, calcola l'indice centrale con divisione intera.`,
      `Restituisci l'indice se trovi il valore; altrimenti escludi il centro e la metà sbagliata.`,
      `Se il ciclo termina senza trovarlo, restituisci -1.`
    ],
    traps: [
      `Usare <code>.index()</code>: il test richiede while e divisione intera.`,
      `Lasciare un estremo fermo sul centro e creare un ciclo infinito.`,
      `Restituire il valore trovato invece del suo indice o dimenticare il caso assente.`
    ]
  },
  'algo-7': {
    goal: `Scrivi <code>two_sum</code> che restituisce due indici distinti i cui valori sommano al target. Per i dati forniti stampa la tupla degli indici.`,
    idea: `Per ogni numero chiediti quale compagno manca per arrivare al totale. Un dizionario dei valori già visti è come una rubrica: dal valore risali alla sua posizione. Cercare prima di registrare il numero corrente evita di usarlo due volte.`,
    example: {
      code: `scaffale = {4: "ripiano A"}
peso = 6
obiettivo = 10
manca = obiettivo - peso
if manca in scaffale:
    print(scaffale[manca])`,
      out: `ripiano A`,
      note: `Sapendo il peso attuale, calcoliamo il peso mancante e cerchiamo dove si trova. Qui il dizionario conserva un ripiano anziché un indice.`
    },
    steps: [
      `Crea un dizionario vuoto per associare valori a indici.`,
      `Scorri la lista tenendo sia indice sia valore e calcola il complemento rispetto al target.`,
      `Se il complemento è già presente, restituisci il suo indice e quello corrente come tupla.`,
      `Altrimenti registra il valore corrente e continua.`
    ],
    traps: [
      `Restituire i numeri invece delle loro posizioni.`,
      `Registrare il valore prima della ricerca e rischiare di scegliere lo stesso elemento due volte.`,
      `Restituire sempre la coppia iniziale: un test usa dati diversi.`
    ]
  },
  'algo-8': {
    goal: `Scrivi <code>is_anagram</code> ignorando maiuscole e minuscole. Stampa un booleano per ciascuna delle due coppie di parole richieste.`,
    idea: `Due anagrammi usano lo stesso sacchetto di lettere, anche ripetute. Ordinare le lettere è come disporre i pezzi sul tavolo nello stesso ordine. Se i pezzi coincidono uno per uno, anche il loro numero coincide.`,
    example: {
      code: `gettoni_a = [3, 1, 3]
gettoni_b = [3, 3, 1]
gettoni_c = [1, 3]
ordinati = sorted(gettoni_a)
print(ordinati == sorted(gettoni_b))
print(ordinati == sorted(gettoni_c))`,
      out: `True
False`,
      note: `Le prime due raccolte hanno gli stessi gettoni con le stesse quantità. Nella terza manca un gettone, quindi il confronto è falso.`
    },
    steps: [
      `Porta entrambe le parole in minuscolo.`,
      `Ordina i caratteri di ciascuna parola.`,
      `Restituisci il confronto delle due raccolte ordinate.`,
      `Stampa le due chiamate richieste.`
    ],
    traps: [
      `Usare insiemi: perderebbero il numero di lettere ripetute.`,
      `Ignorare le maiuscole solo in una parola o limitarsi a confrontare le lunghezze.`,
      `Stampare dentro la funzione senza restituire il booleano richiesto dai test.`
    ]
  },
  'algo-9': {
    goal: `Trova la somma massima tra i gruppi di tre elementi consecutivi della lista. Fai scorrere una finestra e stampa il massimo.`,
    idea: `Immagina una cornice che mostra sempre lo stesso numero di caselle. Quando la sposti, una casella esce e una entra. Aggiorni la somma togliendo il valore uscito e aggiungendo quello entrato.`,
    example: {
      code: `visite = [4, 2, 7, 1]
ampiezza = 2
totale = sum(visite[:ampiezza])
print(totale)
for i in range(ampiezza, len(visite)):
    totale += visite[i]
    totale -= visite[i - ampiezza]
    print(totale)`,
      out: `6
9
8`,
      note: `L'esempio stampa le somme di tutte le finestre di due elementi. Nell'esercizio devi conservare soltanto la migliore somma incontrata.`
    },
    steps: [
      `Calcola la somma della prima finestra di ampiezza <code>k</code>.`,
      `Inizializza il massimo con quella somma.`,
      `Con un ciclo for sposta la finestra, aggiungendo il valore entrante e togliendo quello uscente.`,
      `Aggiorna il massimo quando serve e stampalo dopo il ciclo.`
    ],
    traps: [
      `Scrivere direttamente 17: i test cambiano anche la lista.`,
      `Scegliere elementi non consecutivi o cambiare l'ampiezza della finestra.`,
      `Dimenticare la prima finestra nel confronto del massimo.`
    ]
  },
  'algo-10': {
    goal: `Trova il millesimo numero primo contando i primi a partire da 2. Scrivi anche <code>is_prime(n)</code>, che restituisce True o False.`,
    idea: `Un divisore è come un modo di disporre oggetti in un rettangolo pieno. Se trovi una coppia di divisori, almeno uno non supera la radice del numero. Per questo basta cercare i divisori fino a quel limite, compreso.`,
    example: {
      code: `numero = 36
d = 2
while d * d <= numero:
    if numero % d == 0:
        print(d, numero // d)
    d += 1`,
      out: `2 18
3 12
4 9
6 6`,
      note: `Le coppie mostrano perché basta provare i divisori fino alla radice. Si include anche sei, che è la radice di trentasei.`
    },
    steps: [
      `In <code>is_prime</code> escludi subito i numeri minori di due.`,
      `Cerca divisori da due finché il loro quadrato non supera il numero; se ne trovi uno, restituisci False.`,
      `Restituisci True solo dopo avere escluso tutti i divisori possibili.`,
      `Prova candidati crescenti e incrementa il conteggio soltanto quando trovi un primo.`,
      `Fermati al millesimo primo e stampa l'ultimo candidato valido.`
    ],
    traps: [
      `Considerare uno come primo o escludere due.`,
      `Saltare il controllo sul divisore uguale alla radice e accettare alcuni quadrati.`,
      `Scrivere direttamente 7919 o contare tutti i candidati invece dei soli primi.`
    ]
  },
};

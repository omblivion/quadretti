# quadretti — Product & Design Document

## 1. Visione

quadretti digitalizza il gioco spontaneo del disegno geometrico sui quaderni a quadretti. L’utente costruisce figure collegando esclusivamente i vertici della griglia; ogni gesto può essere riprodotto in tempo reale rispetto a uno o due assi centrali.

Il prodotto deve trasmettere la libertà del foglio e la precisione di uno strumento geometrico, senza assumere l’aspetto di un software CAD.

## 2. Obiettivi e principi

- Iniziare a disegnare senza onboarding obbligatorio.
- Vincolare ogni estremo di linea a un vertice della griglia.
- Passare tra nessuna simmetria, simmetria bilaterale e quadrilaterale durante la stessa sessione.
- Riempire cromaticamente regioni chiuse applicando la simmetria attiva.
- Esportare un PDF A4: inventario geometrico nella prima pagina, tavola completa nella seconda.
- Mantenere il foglio bianco e quieto; concentrare il colore negli strumenti e nel disegno.

## 3. Utenti e flusso principale

Il pubblico comprende studenti, famiglie, insegnanti e utenti interessati a pattern, pixel art geometrica e attività rilassanti. Flusso: scegliere strumento e colore → scegliere simmetria → disegnare → chiudere e riempire forme → controllare il riepilogo → esportare.

## 4. Modello di interazione

### Foglio

La superficie occupa lo spazio dominante. L’origine `(0,0)` coincide con il centro. La griglia usa coordinate intere e un’unità astratta invariabile; lo zoom cambia soltanto la scala visiva. Gli assi centrali sono più marcati della griglia ordinaria.

### Linee

Un segmento è `{id, groupId, a:{x,y}, b:{x,y}, color, strokeWidth}`. `groupId` identifica il gesto originario e tutte le copie generate dalla simmetria. Pointer down e pointer up sono arrotondati al vertice più vicino. Non esiste un limite funzionale al numero di segmenti; in produzione il rendering deve usare Canvas o WebGL e indicizzazione spaziale.

### Puntatore, selezione e snapping

Il foglio mantiene sempre un **punto attivo** su coordinate intere. Il punto è rappresentato soltanto da un anello blu e un centro pieno; le coordinate numeriche non vengono mostrate né come overlay né come tooltip. Il vertice candidato sotto al mouse usa un secondo alone più tenue, distinguibile dal punto già selezionato.

Durante un gesto con il mouse, la linea provvisoria collega il punto iniziale alla posizione continua del puntatore. Un raccordo visivo più leggero mostra il vertice di destinazione a cui la linea verrà agganciata al rilascio. Questo rende contemporaneamente percepibili intenzione libera e risultato vincolato.

La tolleranza di selezione delle linee è espressa in pixel dello schermo e non in unità geometriche, per restare stabile a ogni livello di zoom. Valore iniziale: 9 px.

### Navigazione da tastiera

- Le frecce muovono il punto attivo di una unità rispettivamente a sinistra, destra, sopra o sotto.
- La pressione iniziale di `Spazio` salva il punto di partenza.
- Mentre `Spazio` resta premuto, le frecce spostano il punto finale e aggiornano l’anteprima.
- Il rilascio di `Spazio` conferma una singola transazione di disegno, comprese tutte le copie simmetriche.
- `Esc` annulla l’anteprima corrente senza modificare il documento.

Il browser non deve scorrere la pagina quando frecce o barra spaziatrice controllano il foglio. I comandi sono sospesi quando il focus si trova in un campo di testo o controllo equivalente.

### Selezione ed eliminazione

Lo strumento Seleziona usa hit testing punto-segmento. Quando viene scelta una linea, l’intero `groupId` è evidenziato: sono quindi visibili anche tutte le sue copie simmetriche. `Canc`, `Backspace` e il pulsante cestino eliminano il gruppo in un’unica transazione annullabile.

Ogni riempimento conserva i riferimenti ai gruppi di bordo da cui dipende. Eliminare un gruppo invalida e rimuove soltanto i riempimenti la cui regione non è più chiusa. Nel prototipo l’associazione è locale e conservativa; il motore planare definitivo deve ricalcolare le facce interessate dopo la mutazione del grafo.

### Simmetria

La modalità selezionata si applica soltanto ai nuovi gesti, così il suo cambio non altera il lavoro precedente.

| Modalità | Trasformazioni |
|---|---|
| Off | `(x,y)` |
| 2 lati | `(x,y)`, `(-x,y)` |
| 4 lati | `(x,y)`, `(-x,y)`, `(x,-y)`, `(-x,-y)` |

I duplicati prodotti da punti o segmenti sugli assi devono essere deduplicati.

### Riempimento

Il secchiello non colora celle arbitrarie. I segmenti vengono interpretati come un grafo planare: per ogni semiarco si percorre il contorno mantenendo la medesima faccia, si eliminano la faccia esterna e i cicli degeneri, quindi si verifica con un test point-in-polygon quale faccia chiusa contiene il clic.

Se nessuna faccia contiene il punto, l’operazione non modifica il documento e mostra il messaggio “Questa zona è aperta: chiudi prima il contorno”. Se il punto appartiene a più contorni annidati, viene scelta la faccia valida di area minore, cioè la regione visivamente più specifica.

Il colore viene applicato all’intero poligono della faccia, non a una singola unità della griglia e non tramite una bitmap. Per lo specchiamento, il sistema trasforma il punto di clic e cerca separatamente una faccia chiusa in ciascuna posizione risultante: una copia viene riempita soltanto se il suo contorno esiste realmente.

### Contorni annidati e fori

Una regione può essere delimitata da un contorno esterno e contenere uno o più poligoni interni. I cicli chiusi vengono quindi organizzati in un albero di contenimento. Ogni faccia memorizza un anello esterno e i suoi figli immediati come fori.

Nel caso di due quadrati concentrici, un clic nel quadrato interno colora soltanto l’area interna; un clic nella fascia tra i due quadrati colora l’anello esterno lasciando intatto il quadrato interno. Il rendering utilizza la regola di riempimento pari-dispari, così i fori non vengono dipinti dal colore della regione circostante.

Prima dell’enumerazione delle facce, ogni segmento viene suddiviso in corrispondenza delle intersezioni e dei punti di contatto con altri segmenti. Gli archi atomici sovrapposti vengono deduplicati conservando i riferimenti ai gesti originari.

I riempimenti sono sempre opachi: il valore cromatico memorizzato e quello passato al renderer coincidono esattamente con il colore selezionato. Non vengono applicate trasparenze, gradienti o variazioni automatiche della tinta.

### Stato iniziale

Ogni nuovo documento parte senza segmenti e senza riempimenti. Sono visibili esclusivamente il foglio bianco, la griglia azzurra, gli assi e il punto attivo; nessuna figura dimostrativa viene precaricata.

### Cronologia

Ogni gesto e ogni riempimento è una transazione atomica, comprensiva delle copie simmetriche. Undo/redo agisce sull’intera transazione.

## 5. Architettura informativa

- Canvas a piena finestra come unica superficie strutturale.
- Firma “quadretti” discreta nell’angolo superiore sinistro.
- Pulsanti flottanti a sinistra: selezione, linea, secchiello, gomma, cronologia, eliminazione e pulizia.
- Pulsanti flottanti a destra: esportazione, simmetria, colori e zoom.
- Nessun header, pannello laterale, riepilogo persistente o sezione di impostazioni predefinite.
- Su mobile i gruppi restano flottanti e si avvicinano ai margini senza coprire il centro del foglio.

## 6. Direzione visiva

La metafora è “quaderno pulito, astuccio vivace”. Superfici bianche, griglia azzurro chiarissimo, bordi freddi e ombre minime. Il blu identifica selezione e precisione; la palette di disegno contiene tinte sature. Raggi contenuti e icone lineari evitano un’estetica infantile pur mantenendo il prodotto giocoso.

## 7. Inventario delle forme

La pipeline di analisi opera sul grafo planare: normalizzazione dei segmenti, rilevamento dei cicli minimi, canonicalizzazione indipendente da traslazione/riflessione/rotazione, calcolo di area e perimetro in unità, raggruppamento per firma geometrica e colore.

Ogni voce contiene nome derivato quando riconoscibile (quadrato, triangolo, esagono), quantità, colore, area, perimetro e miniatura. Forme non classificabili ricevono il nome “poligono a N lati”. Le figure replicate per simmetria vengono conteggiate singolarmente, mentre la catalogazione raggruppa le equivalenti.

## 8. Export PDF

Formato A4 verticale. Pagina 1: titolo, metadati, tabella delle forme raggruppate e totali. Pagina 2: foglio completo, centrato e scalato senza alterare proporzioni o colori. Il prototipo usa la stampa nativa del browser; la produzione dovrà generare un PDF deterministico lato client o in un worker.

## 9. Stato, persistenza e backend

Per l’MVP lo stato resta locale e può essere serializzato in `localStorage` come documento versionato. Un backend diventa necessario per account, salvataggi multipli, condivisione e gallerie. API futura minima: `POST /documents`, `GET /documents/:id`, `PATCH /documents/:id`, `POST /documents/:id/export`.

## 10. Accessibilità e qualità

- Comandi con etichette accessibili e target minimi di 40–44 px.
- Stato selezionato comunicato anche senza colore.
- Scorciatoie previste: frecce, `Spazio`, `Esc`, `Canc`/`Backspace`, `L`, `F`, `E`, `Cmd/Ctrl+Z`, `+`, `-`.
- Contrasto AA per testo e controlli; il disegno mantiene i colori scelti dall’utente.
- Canvas affiancato in produzione da una descrizione testuale aggiornata per tecnologie assistive.

## 11. Roadmap

1. MVP: segmenti vincolati, tre simmetrie, colori, zoom, undo/redo, riempimento base, export tramite stampa.
2. Motore geometrico: facce chiuse arbitrarie, deduplicazione, catalogazione canonica e PDF deterministico.
3. Persistenza: documenti locali versionati, salvataggio cloud opzionale e recupero.
4. Espansioni su validazione: condivisione, modelli didattici, galleria e modalità collaborativa.

## 12. Criteri di accettazione MVP

- Nessun segmento può terminare fuori da un vertice.
- Il punto attivo è evidenziato graficamente senza mostrare le coordinate numeriche.
- L’anteprima segue il mouse in modo continuo e mostra separatamente il vertice di aggancio.
- Frecce e barra spaziatrice permettono di completare un segmento senza mouse.
- Selezionare ed eliminare una linea rimuove l’intero gruppo simmetrico con un solo undo.
- La rimozione di un bordo invalida i riempimenti che dipendono dalla regione aperta.
- Un clic del secchiello fuori da qualsiasi contorno chiuso non modifica lo stato né la cronologia.
- Un clic dentro un contorno colora tutta la faccia poligonale e non singoli quadretti.
- In modalità simmetrica vengono riempite soltanto le facce chiuse effettivamente presenti nelle posizioni riflesse.
- Un documento nuovo contiene zero segmenti e zero aree riempite.
- Il colore applicato a una faccia coincide esattamente con il valore della palette e viene renderizzato con opacità 100%.
- Le intersezioni interne vengono convertite in vertici del grafo prima di cercare le facce chiuse.
- Nei poligoni annidati, riempire la regione esterna conserva come foro ogni regione interna immediata.
- Il clic seleziona una sola faccia topologica: non propaga il colore attraverso un contorno chiuso annidato.
- Cambiare simmetria non modifica gli elementi già creati.
- Un gesto simmetrico è annullato con un solo undo.
- Zoom tra 55% e 180% senza cambiare le coordinate logiche.
- L’esportazione produce due pagine nell’ordine richiesto.
- L’interfaccia resta utilizzabile da 360 px di larghezza in su.

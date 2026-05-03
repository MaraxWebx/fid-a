# Fidea - Product Specification

## Obiettivo

Fidea e una piattaforma mobile per centri estetici con due aree prodotto:

* B2B per il centro
* B2C per il cliente finale

L'obiettivo dell'MVP e rendere reale il flusso di:

* scoperta centro
* consultazione servizi
* dashboard operativa del centro
* onboarding commerciale del centro con abbonamento mensile

## Stato attuale

Oggi il prodotto e strutturato come monorepo con:

* `mobile/` app Expo React Native
* `backend/` API FastAPI
* `docs/` specifiche di prodotto e tecniche

Stato dei servizi:

* repository GitHub attivo
* backend deployato su Railway
* database MongoDB collegato al backend
* app mobile collegata di default all'endpoint Railway

## Ruoli

1. Cliente finale
2. Centro estetico

## Funzionalita attuali cliente

Il lato cliente mostra gia:

* elenco centri
* elenco servizi per centro
* profilo utente
* storico prenotazioni reale da backend
* creazione prenotazione da app
* centro notifiche in-app con campanella fissa
* prompt recensione post trattamento con notifica `Valuta il tuo trattamento!`
* invio recensione con:
* stelle da 1 a 5
* commento massimo 128 caratteri

## Funzionalita attuali centro

Il lato centro mostra gia:

* dashboard con KPI del giorno
* agenda della giornata
* calendario operativo con eccezioni giornaliere
* chiusura giorno
* modifica orari singola data
* nota interna per data
* lista clienti aggregata dalle prenotazioni
* area impostazioni con profilo centro editabile in modale
* configurazione catalogo trattamenti per categorie
* griglia categorie con icona
* apertura categoria in modale
* step interno lista trattamenti
* step interno configurazione prezzo e durata
* salvataggio trattamenti attivi
* lista trattamenti configurati
* ultima recensione in home centro
* lista completa recensioni in area config
* centro notifiche in-app con campanella fissa
* notifica nuova prenotazione
* notifica nuova recensione ricevuta

## Flusso centro gia implementato

Il flusso di acquisizione centro oggi copre gia:

1. registrazione anagrafica centro
2. checkout Stripe
3. login centro
4. onboarding post pagamento
5. accesso alla dashboard privata
6. configurazione operativa di orari, servizi, recensioni e notifiche

### Step 1 - Registrazione anagrafica centro

La schermata di registrazione deve raccogliere:

* nome centro estetico
* partita IVA
* indirizzo
* citta
* CAP
* provincia
* paese

Output atteso:

* creazione record centro in stato preliminare
* avanzamento al checkout Stripe

### Step 2 - Checkout Stripe

Dopo il form anagrafico il centro deve essere inviato al checkout Stripe di test.

Prodotto richiesto:

* abbonamento mensile
* prezzo: 20 EUR al mese

Vincoli:

* il checkout deve essere agganciato al centro appena registrato
* l'esito pagamento deve aggiornare lo stato sottoscrizione del centro

### Step 3 - Onboarding post pagamento

Dopo la registrazione e il pagamento, il centro deve completare un onboarding profilo.

Campi richiesti:

* logo
* giorni di apertura settimanali
* orari di apertura settimanali
* servizi principali configurati dal catalogo

Micro-funzionalita onboarding oggi presenti:

* progress bar step-by-step
* step brand
* step schedule con lista giorni tappabile
* modale per impostare orario di default del singolo giorno
* step servizi con widget categorie condiviso con area privata
* griglia categorie 3 colonne
* modale categoria
* step lista trattamenti
* step configurazione trattamento con ritorno alla lista
* riepilogo finale attivazione

### Regola di disponibilita

Un centro non deve essere disponibile in app finche non ha completato almeno:

* giorni di apertura
* servizi principali

Stato logico suggerito:

* `draft`
* `payment_pending`
* `onboarding_pending`
* `inactive_incomplete`
* `active`

### Notifica in-app

Se il pagamento e completato ma onboarding minimo non e ancora completo, il centro riceve un messaggio applicativo che segnala:

* profilo incompleto
* impossibilita di essere pubblicato
* call to action per completare giorni di apertura e servizi principali

## Catalogo trattamenti centro

Il centro configura i trattamenti da un catalogo strutturato per categorie.

Categorie oggi previste:

* MANICURE
* PEDICURE
* EPILAZIONE
* LAMINAZIONE
* SOPRACCIGLIA
* TRATTAMENTI VISO
* TRATTAMENTI CORPO
* MACCHINARI

Per ogni trattamento il centro puo:

* selezionarlo
* aprire la configurazione in modale
* inserire prezzo
* inserire durata
* salvare e tornare alla lista trattamenti della stessa categoria

## Recensioni e notifiche

Flusso recensioni oggi previsto:

* dopo un trattamento passato il cliente riceve una notifica in-app
* la notifica invita a valutare il trattamento
* il cliente apre una modale di recensione
* inserisce stelle da 1 a 5
* inserisce commento massimo 128 caratteri
* il centro vede l'ultima recensione in home
* il centro vede tutte le recensioni in config

Flusso notifiche oggi previsto:

* campanella fissa in app
* badge notifiche non lette
* notifica nuova prenotazione per il centro
* notifica richiesta recensione per il cliente
* notifica nuova recensione ricevuta per il centro

## Requisiti UX per il flusso centro

La registrazione centro deve essere:

* lineare
* corta nel primo step
* orientata alla conversione
* con chiaro stato avanzamento

Flusso consigliato:

1. form registrazione centro
2. checkout Stripe
3. conferma pagamento
4. onboarding profilo
5. avviso di attivazione incompleta finche mancano giorni o servizi

## Scope prossimo sviluppo

Prossimi step consigliati:

* notifiche push native reali
* disattivazione o modifica rapida dei trattamenti gia attivi
* moderazione recensioni
* media voto centro e KPI recensioni in dashboard
* disponibilita cliente agganciata alle eccezioni calendario reali

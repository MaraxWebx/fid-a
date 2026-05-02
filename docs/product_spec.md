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
* profilo utente demo
* storico prenotazioni demo

## Funzionalita attuali centro

Il lato centro mostra gia:

* dashboard con KPI del giorno
* agenda della giornata
* lista clienti aggregata dalle prenotazioni
* area impostazioni ancora parziale

## Prossima simulazione prioritaria: registrazione centro

Il prossimo flusso da implementare e simulare e la registrazione del centro estetico.

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
* colore brand
* orari di apertura
* giorni di apertura
* servizi principali

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

Se il pagamento e completato ma onboarding minimo non e ancora completo, il centro deve ricevere una notifica pop in app che segnala:

* profilo incompleto
* impossibilita di essere pubblicato
* call to action per completare giorni di apertura e servizi principali

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

Per partire con la simulazione del flusso centro servono:

* schermata registrazione centro
* integrazione Stripe Checkout test
* persistenza stato centro
* schermata onboarding centro
* controllo `is_listable` o equivalente
* pop notifica in app per onboarding incompleto

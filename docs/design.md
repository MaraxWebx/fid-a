# Fidea - UX and Design Notes

## Direzione prodotto

Fidea deve sembrare una esperienza beauty premium, non un gestionale grigio o un CRM tradizionale.

L'interfaccia deve tenere insieme:

* chiarezza operativa per il centro
* percezione premium per il cliente
* conversione nel flusso di acquisizione del centro

## Palette attuale

Colori guida:

* warm white `#FAF9F7`
* soft sky blue `#DCEEF5`
* light sand `#EADFD8`
* warm grey `#8A8F94`
* deep desaturated blue `#2F4F6F`

Uso consigliato:

* background principali: warm white
* CTA principali: deep desaturated blue
* card e superfici soft: sky blue o light sand
* testi secondari: warm grey

## Principi UX

* pochi step
* stato chiaro
* lessico semplice
* frizione minima sui task principali
* una sola modale per task quando possibile
* evitare modali annidate
* pattern coerenti tra onboarding e area privata centro

## Flusso centro oggi in uso

La registrazione centro e un funnel commerciale, non un semplice form amministrativo.

### Step 1 - Form centro

Campi:

* nome centro estetico
* partita IVA
* indirizzo
* citta
* CAP
* provincia
* paese

Linee guida:

* una colonna
* CTA unica e chiara
* rassicurazione su attivazione rapida

### Step 2 - Checkout

Il passaggio a Stripe deve sembrare una prosecuzione naturale del funnel.

Messaggi chiave:

* abbonamento mensile da 20 EUR
* attivazione account centro
* completamento profilo subito dopo il pagamento

### Step 3 - Onboarding post checkout

L'onboarding deve raccogliere:

* logo
* giorni apertura
* orari apertura
* servizi principali

Va progettato come checklist di attivazione.

Pattern oggi adottati:

* step fullscreen
* progress bar
* giorni apertura come lista tappabile
* modale dedicata per configurare il singolo giorno
* catalogo trattamenti con widget condiviso
* griglia categorie 3 colonne
* categoria aperta in modale
* step lista trattamenti
* step configurazione trattamento nella stessa modale
* back interno alla modale per tornare alla lista

## Regola di pubblicazione

Il centro non e disponibile in app finche non completa almeno:

* giorni di apertura
* servizi principali

UX attesa:

* banner o pop notifica persistente
* messaggio esplicito sul perche il centro non e attivo
* CTA per completare i campi mancanti

## Copy suggerito per notifica in app

Titolo:

* `Completa il profilo del centro`

Messaggio:

* `Il pagamento e completato, ma il centro non e ancora visibile finche non inserisci giorni di apertura e servizi principali.`

CTA:

* `Completa ora`

## Pattern area privata centro

### Dashboard

La home centro oggi contiene:

* KPI del giorno
* agenda appuntamenti
* clienti recenti
* ultima recensione ricevuta

### Agenda centro

La gestione disponibilita usa:

* calendario con prossimi giorni
* tap sul giorno
* modale di dettaglio
* chiusura giorno
* modifica orario singola data
* nota interna

### Config centro

La sezione config oggi contiene:

* widget unico profilo centro
* pulsante edit con icona
* modale modifica dati centro
* widget catalogo trattamenti
* lista trattamenti attivi
* lista completa recensioni

## Pattern notifiche e recensioni

Elementi oggi previsti:

* campanella fixed con badge
* centro notifiche in-app
* notifica nuova prenotazione per il centro
* notifica richiesta recensione per il cliente
* notifica nuova recensione ricevuta per il centro

Flusso recensione cliente:

* apertura dal centro notifiche
* modale dedicata
* stelle 1-5
* commento breve
* limite 128 caratteri

## Vincoli UX attuali

* non usare doppia modale per selezione categoria e configurazione trattamento
* il passaggio categoria > trattamento > configurazione deve stare in un solo contenitore modale
* la lista dei trattamenti non deve allungare la pagina principale

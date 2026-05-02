# Beauty SaaS App - MVP Specification

## Obiettivo Prodotto

Costruire una piattaforma mobile multi-tenant per centri estetici con:

* gestione appuntamenti
* CRM clienti
* prenotazione lato cliente finale

Focus MVP:
velocita, semplicita, utilizzo reale.

---

# Architettura Prodotto

## Tipologia

* app unica configurabile
* branding e catalogo personalizzati per ogni centro
* dati isolati logicamente per tenant

## Ruoli

1. Cliente finale
2. Centro estetico

---

# B2C - Funzionalita Cliente

## Accesso

* prodotto reale: login telefono OTP
* demo frontend pubblica: solo scelta "accedi come cliente" o "accedi come centro"

## Navigazione Cliente

Il menu cliente deve avere:

* Home
* Prenotazioni
* Profilo

## Home

La home cliente deve mostrare:

* KPI personali
* prenotazioni prossime
* scelta del centro
* accesso al booking solo dopo scelta del centro

## Prenotazioni

La sezione prenotazioni deve contenere:

* storico prenotazioni cliente
* prenotazioni attive
* prenotazioni completate

## Profilo

La sezione profilo deve contenere:

* dati cliente
* centro preferito
* note o preferenze

## Prenotazione

Flusso:

1. scelta centro
2. selezione servizio
3. selezione operatore opzionale
4. selezione data e ora
5. conferma

---

# B2B - Funzionalita Centro

## Navigazione Centro

Il menu del centro deve avere:

* Home
* Calendario
* Clienti
* Impostazioni

## Home

La home centro deve mostrare:

* KPI del giorno
* prossimi appuntamenti
* stato operativo della giornata

## Calendario

La sezione calendario deve permettere:

* vista agenda giornaliera o settimanale
* aggiunta slot
* gestione slot
* gestione disponibilita operatori

## Clienti

La sezione clienti deve includere:

* anagrafica cliente
* telefono
* storico appuntamenti
* note
* informazioni operative utili

## Impostazioni

La sezione impostazioni deve permettere la configurazione del centro:

* logo
* informazioni centro
* posizione
* catalogo trattamenti
* branding base


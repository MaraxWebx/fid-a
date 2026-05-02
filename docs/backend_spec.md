# Fidea - Backend Specification

## Stato attuale

Il backend e una API FastAPI deployata su Railway e collegata a MongoDB.

Responsabilita attuali:

* lettura dati centro
* lettura servizi
* lettura profilo cliente demo
* lettura prenotazioni cliente demo
* dashboard centro
* clienti centro
* health check API e database

## Stack

* FastAPI
* Uvicorn
* PyMongo
* python-dotenv
* Railway

## Struttura

```txt
backend/
  app/
    __init__.py
    config.py
    db.py
    main.py
  .env
  README.md
  requirements.txt
```

## Configurazione

Variabili usate:

* `MONGODB_URI` obbligatoria
* `MONGODB_DB_NAME` opzionale, default `fidea`
* `DEFAULT_PROFILE_EMAIL` opzionale

## Endpoint attivi

### Health

* `GET /health`
* `GET /api/health`

Risposta attuale:

* stato API
* stato database
* nome database
* eventuale errore database
* endpoint principali
* timestamp

### Dati app

* `GET /api/centers`
* `GET /api/centers/{center_id}/services`
* `GET /api/users/profile?email=...`
* `GET /api/users/bookings?email=...`
* `GET /api/centers/{center_id}/dashboard`
* `GET /api/centers/{center_id}/clients`

## Collection oggi usate

### `centers`

Campi letti oggi:

* `_id`
* `email` o `mail`
* `name`
* `branding`
* `opening_hours`
* `created_at`

### `services`

Campi letti oggi:

* `_id`
* `center_id`
* `name`
* `category`
* `subcategory`
* `duration`
* `price`
* `description`
* `visibility`
* `created_at`

### `users`

Campi letti oggi:

* `_id`
* `email`
* `name`
* `role`
* `phone`
* `center_id`
* `created_at`

### `bookings`

Campi letti oggi:

* `_id`
* `user_id`
* `center_id`
* `service_id`
* `service_name`
* `operator_name`
* `start_time`
* `end_time`
* `status`
* `created_at`

## Seed attuale

Lo script `mobile/scripts/seed-demo-data.mjs` crea o aggiorna:

* 1 centro demo
* 40 servizi demo
* 1 cliente demo
* 3 prenotazioni demo

## Prossimo scope backend: registrazione centro

Il backend dovra supportare il flusso di acquisizione centro con persistenza stato e checkout Stripe.

### Campi centro richiesti in registrazione

* `name`
* `vat_number`
* `address`
* `city`
* `postal_code`
* `province`
* `country`

### Campi onboarding centro richiesti

* `logo_url` o asset equivalente
* `brand_color`
* `opening_days`
* `opening_hours`
* `primary_services`

### Stati centro suggeriti

* `draft`
* `payment_pending`
* `payment_completed`
* `onboarding_pending`
* `inactive_incomplete`
* `active`

### Flag derivati suggeriti

* `subscription_status`
* `onboarding_completed`
* `has_opening_days`
* `has_primary_services`
* `is_listable`

## Endpoint da introdurre nel prossimo step

### Registrazione e checkout

* `POST /api/centers/register`
* `POST /api/centers/{center_id}/checkout-session`
* `POST /api/stripe/webhooks`

### Onboarding centro

* `GET /api/centers/{center_id}/onboarding-status`
* `PATCH /api/centers/{center_id}/profile`
* `PATCH /api/centers/{center_id}/availability`
* `PATCH /api/centers/{center_id}/primary-services`

### Notifiche e gating

* `GET /api/centers/{center_id}/activation-status`

Risposta attesa:

* stato pagamento
* stato onboarding
* campi mancanti
* `is_listable`
* eventuale messaggio da mostrare come pop notifica in app

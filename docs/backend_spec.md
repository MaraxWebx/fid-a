# Fidea - Backend Specification

## Stato attuale

Il backend e una API FastAPI deployata su Railway e collegata a MongoDB.

Responsabilita attuali:

* lettura dati centro
* lettura servizi
* aggiornamento profilo centro
* aggiornamento onboarding centro
* aggiornamento disponibilita centro
* configurazione servizi centro
* lettura profilo cliente
* lettura prenotazioni cliente
* scrittura prenotazioni
* lettura recensioni centro
* scrittura recensioni cliente
* lettura notifiche in-app
* mark as read notifiche
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
* `PATCH /api/centers/{center_id}/services`
* `PATCH /api/centers/{center_id}/profile`
* `PATCH /api/centers/{center_id}/onboarding`
* `PATCH /api/centers/{center_id}/availability`
* `GET /api/centers/{center_id}/reviews`
* `GET /api/users/profile?email=...`
* `GET /api/users/bookings?email=...`
* `GET /api/centers/{center_id}/dashboard`
* `GET /api/centers/{center_id}/clients`
* `POST /api/bookings`
* `POST /api/reviews`
* `GET /api/notifications`
* `PATCH /api/notifications/read`
* `GET /api/centers/{center_id}/activation-status`

## Collection oggi usate

### `centers`

Campi letti oggi:

* `_id`
* `email` o `mail`
* `name`
* `branding`
* `opening_hours`
* `opening_days`
* `availability_overrides`
* `primary_services`
* `registration_status`
* `subscription_status`
* `is_listable`
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

### `reviews`

Campi usati oggi:

* `_id`
* `booking_id`
* `center_id`
* `user_id`
* `user_name`
* `service_name`
* `rating`
* `comment`
* `created_at`

### `notifications`

Campi usati oggi:

* `_id`
* `role`
* `center_id`
* `user_id`
* `type`
* `title`
* `message`
* `is_read`
* `metadata`
* `created_at`

## Seed attuale

Lo script `mobile/scripts/seed-demo-data.mjs` crea o aggiorna:

* 1 centro demo
* 40 servizi demo
* 1 cliente demo
* 3 prenotazioni demo

## Flussi backend oggi attivi

Il backend oggi supporta:

* registrazione centro con checkout Stripe
* login centro e login cliente
* onboarding centro persistente
* gating attivazione centro
* calendario centro con override giornalieri
* configurazione catalogo servizi
* creazione prenotazione
* creazione recensione
* notifiche applicative per centro e cliente

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
* `opening_days`
* `opening_hours`
* `primary_services`

Campi extra oggi supportati:

* `availability_overrides`
* configurazione servizi per categoria
* prezzo servizio
* durata servizio

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

## Endpoint attivi oggi

### Registrazione e checkout

* `POST /api/centers/register`
* `POST /api/stripe/webhooks`
* `POST /api/auth/centers/login`
* `POST /api/auth/clients/register`
* `POST /api/auth/clients/login`

### Onboarding centro

* `PATCH /api/centers/{center_id}/profile`
* `PATCH /api/centers/{center_id}/onboarding`
* `PATCH /api/centers/{center_id}/availability`
* `PATCH /api/centers/{center_id}/services`

### Notifiche e gating

* `GET /api/centers/{center_id}/activation-status`
* `GET /api/notifications`
* `PATCH /api/notifications/read`

### Servizi, prenotazioni, recensioni

* `GET /api/centers/{center_id}/services`
* `GET /api/centers/{center_id}/reviews`
* `POST /api/bookings`
* `POST /api/reviews`

Risposta attesa:

* stato pagamento
* stato onboarding
* campi mancanti
* `is_listable`
* eventuale messaggio da mostrare come pop notifica in app

## Automazioni applicative oggi implementate

Alla creazione di una prenotazione:

* viene creato il booking
* viene creata una notifica per il centro di tipo `new_booking`

Quando un booking risulta nel passato e non ha recensione:

* viene generata una notifica cliente di tipo `review_prompt`

Alla creazione di una recensione:

* viene salvata la review
* viene marcata come letta la notifica di review prompt legata al booking
* viene creata una notifica centro di tipo `review_received`

## Limiti attuali

* le notifiche sono in-app, non ancora push native
* non esiste ancora un vero stato `completed` del trattamento distinto dalla sola data passata
* le recensioni non hanno ancora moderazione o media aggregata per centro

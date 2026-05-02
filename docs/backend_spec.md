# Fidèa - Backend Specification

## Obiettivo

Fornire una API locale minima ma reale che permetta al frontend Expo di leggere dati veri da MongoDB Atlas.

---

# Stack attuale

* FastAPI
* PyMongo
* Python dotenv
* Uvicorn

---

# Struttura attuale

```txt
backend/
  .env
  .env.example
  app/
    __init__.py
    config.py
    db.py
    main.py
  requirements.txt
  README.md
```

---

# Configurazione

Il backend legge le variabili da:

* `backend/.env`

Variabili usate:

* `MONGODB_URI`
* `MONGODB_DB_NAME` opzionale
* `DEFAULT_PROFILE_EMAIL` opzionale

Default:

* database: `fidea`
* profile email: `anotniomarettax@gmail.com`

---

# Collection usate oggi

## `centers`

Campi attualmente letti:

* `_id`
* `email`
* `mail`
* `name`
* `branding`
* `opening_hours`
* `created_at`

## `services`

Campi attualmente letti:

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

## `users`

Campi attualmente letti:

* `_id`
* `email`
* `name`
* `role`
* `phone`
* `center_id`
* `created_at`

## `bookings`

Campi attualmente letti:

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

Nota:
al momento non esiste collection `operators` nel flusso reale del progetto.

---

# Endpoint attivi

## `GET /health`

Verifica avvio API e database attivo.

## `GET /api/centers`

Restituisce i centri disponibili.

## `GET /api/centers/{center_id}/services`

Restituisce i servizi attivi del centro.

## `GET /api/users/profile?email=...`

Restituisce il profilo cliente.

## `GET /api/users/bookings?email=...`

Restituisce le prenotazioni del cliente con dettagli servizio.

## `GET /api/centers/{center_id}/dashboard`

Restituisce:

* KPI centro
* agenda del giorno
* clienti recenti

## `GET /api/centers/{center_id}/clients`

Restituisce i clienti del centro aggregati dalle prenotazioni.

---

# Seed attuale

Lo script `mobile/scripts/seed-demo-data.mjs` crea o aggiorna:

* 1 centro
* 40 servizi del listino
* 1 utente cliente
* 3 prenotazioni demo

Legge le variabili da `backend/.env`.

---

# Cosa manca ancora

* autenticazione OTP
* refresh token
* creazione booking da API
* disponibilita reali
* lock slot
* calendario centro persistente

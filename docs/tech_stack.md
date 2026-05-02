# Fidèa - Tech Stack and Current Architecture

## Frontend

* React Native
* Expo
* TypeScript

## Backend locale

* FastAPI
* PyMongo
* Uvicorn

## Database

* MongoDB Atlas

---

# Architettura Attuale

## Regola importante

L app mobile non legge direttamente MongoDB Atlas.

Il frontend parla con una API locale FastAPI che legge il database.

## Cartelle principali

* `mobile/`
  frontend Expo
* `backend/`
  API locale FastAPI
* `docs/`
  specifiche e riferimenti

---

# Environment separation

## Backend

`backend/.env` contiene:

* `MONGODB_URI`
* `MONGODB_DB_NAME`
* `DEFAULT_PROFILE_EMAIL`

## Frontend

`mobile/.env` contiene solo variabili pubbliche Expo come:

* `EXPO_PUBLIC_API_BASE_URL`
* `EXPO_PUBLIC_PROFILE_EMAIL`

---

# Endpoint locali attivi

## Generali

* `GET /health`

## Cliente

* `GET /api/centers`
* `GET /api/centers/{center_id}/services`
* `GET /api/users/profile?email=...`
* `GET /api/users/bookings?email=...`

## Centro

* `GET /api/centers/{center_id}/dashboard`
* `GET /api/centers/{center_id}/clients`

---

# Seed dati attuale

Lo script seed attuale:

* legge Mongo da `backend/.env`
* usa database `fidea` come default
* crea o aggiorna centro, servizi, utente e prenotazioni demo

Comando:

```bash
npm run seed:demo
```

---

# Stato Reale vs Mock

## Reale

* centri
* servizi
* profilo cliente
* prenotazioni cliente
* dashboard centro
* clienti centro

## Ancora mock o ibrido

* KPI cliente
* operatori nel booking
* slot disponibilita
* calendario centro
* impostazioni centro salvate a DB
* creazione booking dall app

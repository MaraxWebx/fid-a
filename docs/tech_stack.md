# Fidea - Tech Stack and Architecture

## Monorepo

Il progetto e organizzato come monorepo:

* `mobile/` app Expo React Native
* `backend/` API FastAPI
* `docs/` specifiche prodotto e tecniche

## Frontend

* Expo
* React Native
* TypeScript

Nota attuale:

* il client mobile usa di default il backend remoto Railway
* `EXPO_PUBLIC_API_BASE_URL` puo comunque sovrascrivere l'endpoint

Endpoint remoto attuale:

* `https://fid-a-production.up.railway.app`

## Backend

* FastAPI
* Uvicorn
* PyMongo
* python-dotenv

Start command Railway:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Deployment

### Git

* repository GitHub attivo
* branch principale `main`

### Railway

* servizio backend deployato da monorepo
* `Root Directory`: `backend`
* `Build Command`: `pip install -r requirements.txt`
* `Start Command`: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`

### Database

* MongoDB Atlas
* connessione fornita via `MONGODB_URI`
* database logico corrente: `fidea`

## Environment variables

### Backend

* `MONGODB_URI`
* `MONGODB_DB_NAME`
* `DEFAULT_PROFILE_EMAIL`

### Frontend

* `EXPO_PUBLIC_API_BASE_URL`
* `EXPO_PUBLIC_PROFILE_EMAIL`

## Endpoint attivi

* `GET /health`
* `GET /api/health`
* `GET /api/centers`
* `GET /api/centers/{center_id}/services`
* `GET /api/users/profile`
* `GET /api/users/bookings`
* `GET /api/centers/{center_id}/dashboard`
* `GET /api/centers/{center_id}/clients`

## Stato attuale

### Gia reale

* backend remoto deployato
* app collegata al backend remoto
* database remoto collegato
* health check API e database
* lettura dati demo da MongoDB

### Ancora da costruire

* autenticazione reale
* scrittura prenotazioni da app
* registrazione centro
* Stripe subscription flow
* onboarding centro persistente
* gating disponibilita centro
* notifiche di profilo incompleto

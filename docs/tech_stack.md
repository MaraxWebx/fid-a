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
* React Native Vector Icons

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
* `PATCH /api/centers/{center_id}/services`
* `PATCH /api/centers/{center_id}/profile`
* `PATCH /api/centers/{center_id}/onboarding`
* `PATCH /api/centers/{center_id}/availability`
* `GET /api/centers/{center_id}/reviews`
* `GET /api/users/profile`
* `GET /api/users/bookings`
* `GET /api/centers/{center_id}/dashboard`
* `GET /api/centers/{center_id}/clients`
* `GET /api/centers/{center_id}/activation-status`
* `POST /api/centers/register`
* `POST /api/auth/centers/login`
* `POST /api/auth/clients/register`
* `POST /api/auth/clients/login`
* `POST /api/bookings`
* `POST /api/reviews`
* `GET /api/notifications`
* `PATCH /api/notifications/read`

## Stato attuale

### Gia reale

* backend remoto deployato
* app collegata al backend remoto
* database remoto collegato
* health check API e database
* lettura dati demo da MongoDB
* registrazione centro con checkout Stripe
* login centro e cliente
* onboarding centro step-by-step
* configurazione giorni e orari di default
* agenda centro con override giornalieri
* configurazione trattamenti per categorie in modale
* profilo centro editabile
* creazione booking da app
* notifiche in-app con badge
* recensioni cliente con stelle e commento
* home centro con ultima recensione
* config centro con lista completa recensioni

### Ancora da costruire

* notifiche push native reali
* stato trattamento completato esplicito
* moderazione recensioni
* analytics recensioni e media voto centro
* sincronizzazione disponibilita cliente con calendario centro avanzato

## Pattern UI oggi presenti

* header con logo centro
* campanella notifiche fixed
* onboarding a step full screen
* modali operative per orari, servizi, recensioni e profilo
* widget categorie trattamenti condiviso tra onboarding e config

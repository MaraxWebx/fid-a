# Fidea Local API

## Setup

```bash
pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example` and fill in the values.

Stripe variables for center registration:

* `STRIPE_SECRET_KEY`
* `STRIPE_PRICE_ID`
* `STRIPE_CHECKOUT_SUCCESS_URL` optional
* `STRIPE_CHECKOUT_CANCEL_URL` optional

## Run

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Registration flow

`POST /api/centers/register` creates a center draft and returns a Stripe Checkout URL for the
monthly subscription.

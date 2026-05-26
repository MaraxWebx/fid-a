from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ALLOW_ORIGINS
from .routers import (
    auth,
    bookings,
    centers,
    clients,
    health,
    insights,
    notifications,
    reviews,
    stripe,
    uploads,
)


app = FastAPI(title="Fidea Local API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(centers.router)
app.include_router(clients.router)
app.include_router(bookings.router)
app.include_router(reviews.router)
app.include_router(notifications.router)
app.include_router(stripe.router)
app.include_router(insights.router)
app.include_router(uploads.router)

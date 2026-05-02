from pathlib import Path
import os

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "backend" / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "fidea")
DEFAULT_PROFILE_EMAIL = os.getenv("DEFAULT_PROFILE_EMAIL", "anotniomarettax@gmail.com")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "")
STRIPE_CHECKOUT_SUCCESS_URL = os.getenv("STRIPE_CHECKOUT_SUCCESS_URL", "")
STRIPE_CHECKOUT_CANCEL_URL = os.getenv("STRIPE_CHECKOUT_CANCEL_URL", "")
DEMO_BYPASS_STRIPE = os.getenv("DEMO_BYPASS_STRIPE", "true").lower() == "true"

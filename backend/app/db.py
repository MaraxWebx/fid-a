from pymongo import MongoClient

from .config import MONGODB_DB_NAME, MONGODB_URI


if not MONGODB_URI:
    raise RuntimeError("Missing MONGODB_URI environment variable.")


client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]

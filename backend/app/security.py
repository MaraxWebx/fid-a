from datetime import UTC, datetime, timedelta
import hashlib
import hmac

from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import JWT_ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, JWT_SECRET_KEY


password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return password_context.hash(password)


def _verify_legacy_password(plain_password: str, stored_hash: str) -> bool:
    if "$" not in stored_hash:
        return False

    salt, digest = stored_hash.split("$", 1)
    computed = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt.encode("utf-8"),
        100000,
    )
    return hmac.compare_digest(digest, computed.hex())


def is_legacy_password_hash(stored_hash: str | None) -> bool:
    return bool(stored_hash and not stored_hash.startswith("$2"))


def password_needs_rehash(stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    if is_legacy_password_hash(stored_hash):
        return True
    return password_context.needs_update(stored_hash)


def verify_password(plain_password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False

    if is_legacy_password_hash(password_hash):
        return _verify_legacy_password(plain_password, password_hash)

    try:
        return password_context.verify(plain_password, password_hash)
    except Exception:  # noqa: BLE001
        return False


def create_access_token(
    subject: str,
    role: str,
    center_id: str | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": subject,
        "role": role,
        "center_id": center_id,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token.") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    access_token: str | None = Query(default=None),
) -> dict:
    token = credentials.credentials if credentials else access_token
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token is required.")

    payload = decode_access_token(token)
    if not payload.get("sub") or payload.get("role") not in {"center", "client"}:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    return payload


def require_role(*roles: str):
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions.")
        return current_user

    return dependency


def get_current_center(current_user: dict = Depends(require_role("center"))) -> dict:
    if not current_user.get("center_id"):
        raise HTTPException(status_code=403, detail="Center token is missing center ownership.")
    return current_user


def get_current_client(current_user: dict = Depends(require_role("client"))) -> dict:
    return current_user

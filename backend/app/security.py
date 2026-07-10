# backend/app/security.py
"""
Authentication helpers: verify Google Sign-In ID tokens server-side and issue /
validate our own signed session tokens (JWT). This replaces the previous scheme
where the frontend sent a bare email string that the backend trusted as identity.

Required environment variables:
  GOOGLE_CLIENT_ID   - OAuth client ID (same value as the frontend VITE_GOOGLE_CLIENT_ID)
  JWT_SECRET_KEY     - long random string used to sign session tokens
  ADMIN_EMAILS       - comma-separated list of exact admin Google emails (allow-list)
  SESSION_TTL_SECONDS- optional, session lifetime in seconds (default 12h)
"""
import os
import time
import logging

import jwt  # PyJWT
from fastapi import HTTPException, status
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

logger = logging.getLogger("auth")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "").strip()
JWT_ALGORITHM = "HS256"
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", str(60 * 60 * 12)))

_ACCEPTED_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def get_admin_emails() -> set:
    """Exact-match allow-list of admin emails, read fresh so env changes take effect."""
    raw = os.getenv("ADMIN_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def verify_google_credential(credential: str) -> dict:
    """Verify a Google Sign-In ID token and return its (trusted) claims."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth is not configured (GOOGLE_CLIENT_ID missing).",
        )
    try:
        info = id_token.verify_oauth2_token(
            credential, google_requests.Request(), GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except Exception as e:
        logger.warning("Google credential verification failed: %s: %s", type(e).__name__, e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google sign-in.",
        )

    if info.get("iss") not in _ACCEPTED_ISSUERS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Untrusted token issuer.")
    if not info.get("email") or not info.get("email_verified", False):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified.")
    return info


def create_session_token(email: str) -> str:
    """Issue a short-lived signed session token for an authenticated email."""
    if not JWT_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth is not configured (JWT_SECRET_KEY missing).",
        )
    now = int(time.time())
    payload = {"sub": email.strip().lower(), "iat": now, "exp": now + SESSION_TTL_SECONDS}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> str:
    """Validate a session token and return the email it was issued for."""
    if not JWT_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server auth is not configured (JWT_SECRET_KEY missing).",
        )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again.",
        )
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed session token.")
    return email


def bearer_token(authorization: str) -> str:
    """Extract the raw token from an Authorization header value."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    if authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1].strip()
    return authorization.strip()

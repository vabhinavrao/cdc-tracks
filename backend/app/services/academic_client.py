# cdc-backend/app/services/academic_client.py
import os
import time
import logging
import httpx
from fastapi import HTTPException, status

logger = logging.getLogger("academic_gateway")

ADS_API_URL = os.getenv("ADS_API_URL", "https://api.cdchitam.xyz").strip("/")
ADS_API_KEY = os.getenv("ADS_API_KEY", "").strip()

# Circuit Breaker state
_circuit_tripped = False
_circuit_tripped_until = 0.0
_consecutive_failures = 0
FAILURE_THRESHOLD = 3
COOLDOWN_SECONDS = 30.0

# Initialize async client connection pool
limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
_client = httpx.AsyncClient(limits=limits)

def check_circuit_breaker():
    global _circuit_tripped, _circuit_tripped_until
    if _circuit_tripped:
        if time.time() > _circuit_tripped_until:
            logger.info("Circuit breaker entering half-open state, cooldown expired.")
            _circuit_tripped = False
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Academic service is temporarily offline (circuit broken)."
            )

def record_failure():
    global _circuit_tripped, _circuit_tripped_until, _consecutive_failures
    _consecutive_failures += 1
    if _consecutive_failures >= FAILURE_THRESHOLD:
        _circuit_tripped = True
        _circuit_tripped_until = time.time() + COOLDOWN_SECONDS
        logger.error(f"Circuit breaker tripped! Blocking ADS requests for {COOLDOWN_SECONDS} seconds.")

def record_success():
    global _consecutive_failures
    _consecutive_failures = 0

async def call_ads(method: str, path: str, json_data: dict = None, timeout: float = 5.0) -> dict:
    """
    Executes a backend-to-backend API request to ADS.
    Translates raw network errors into unified 503 gateway exceptions.
    """
    check_circuit_breaker()

    if not ADS_API_KEY:
        logger.error("ADS_API_KEY is not configured in the environment.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Academic Data Service client credentials are not configured."
        )

    headers = {
        "X-API-Key": ADS_API_KEY,
        "Content-Type": "application/json"
    }

    url = f"{ADS_API_URL}{path}"
    
    try:
        if method.upper() == "GET":
            response = await _client.get(url, headers=headers, timeout=timeout)
        elif method.upper() == "POST":
            response = await _client.post(url, headers=headers, json=json_data, timeout=timeout)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
            
        record_success()
        
        if response.status_code >= 500:
            logger.error(f"ADS returned 5xx status code {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Academic server returned an internal error."
            )
            
        return {
            "status_code": response.status_code,
            "data": response.json() if response.status_code in [200, 201, 202] else None,
            "text": response.text
        }
    except httpx.TimeoutException as e:
        logger.error(f"Timeout connecting to ADS at {url}: {e}")
        record_failure()
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to academic server timed out."
        )
    except httpx.RequestError as e:
        logger.error(f"Network error connecting to ADS at {url}: {e}")
        record_failure()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Academic server is temporarily unreachable."
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Unexpected error calling ADS: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred inside the gateway."
        )

import hashlib
from fastapi import Header, HTTPException, Depends, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from app import config, models
from app.database import get_db
from app.utils.logger import get_logger

logger = get_logger(__name__)

# FastAPI security scheme for API Key header
api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)

def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode('utf-8')).hexdigest()

def verify_api_key(
    x_api_key: str = Security(api_key_header_scheme),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> dict:
    api_key = None
    
    # 1. Check for token in X-API-Key header
    if x_api_key:
        api_key = x_api_key.strip()
    # 2. Fallback to Authorization: Bearer token header
    elif authorization and authorization.startswith("Bearer "):
        api_key = authorization[7:].strip()
        
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "code": "API_KEY_REQUIRED",
                "message": "Authentication required: provide an API key in X-API-Key or Authorization header"
            }
        )
        
    # Check against static config (e.g. for simple setups or local testing)
    if config.ADS_API_KEY and api_key == config.ADS_API_KEY:
        return {"client_id": "static-config-client", "scopes": ["read", "register", "refresh"]}
        
    # 3. Lookup key in Neon DB (Node-compatible key auth)
    prefix = api_key[:8]
    hashed = hash_key(api_key)
    
    try:
        # Join api_keys and api_clients to check status
        db_key = (
            db.query(models.ApiKey, models.ApiClient.status)
            .join(models.ApiClient, models.ApiKey.client_id == models.ApiClient.id)
            .filter(
                models.ApiKey.key_hash == hashed,
                models.ApiKey.key_prefix == prefix,
                models.ApiKey.revoked_at.is_(None)
            )
            .first()
        )
        
        if not db_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "code": "API_KEY_INVALID",
                    "message": "Invalid, expired, or revoked API key"
                }
            )
            
        key_record, client_status = db_key
        
        if client_status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "code": "CLIENT_SUSPENDED",
                    "message": "The API client associated with this key is suspended or revoked"
                }
            )
            
        # Update last_used_at asynchronously/best effort
        try:
            from datetime import datetime, timezone
            key_record.last_used_at = datetime.now(timezone.utc)
            db.commit()
        except Exception as update_err:
            logger.warning(f"Failed to update last_used_at for key: {str(update_err)}")
            
        return {
            "key_id": str(key_record.id),
            "client_id": str(key_record.client_id),
            "scopes": key_record.scopes or []
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"API key database authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "code": "SERVER_ERROR",
                "message": "Internal authorization error"
            }
        )

def require_scope(scope: str):
    def dependency(client_info: dict = Depends(verify_api_key)):
        scopes = client_info.get("scopes", [])
        if scope not in scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "code": "INSUFFICIENT_SCOPE",
                    "message": f"This action requires the '{scope}' scope"
                }
            )
        return client_info
    return dependency

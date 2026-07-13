# cdc-backend/app/routes/academic.py
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from typing import Optional
from app.routes.student import get_current_user, User
from app.services.academic_client import call_ads

router = APIRouter(prefix="/api/student/academic", tags=["Academic Gateway"])

class ERPRegisterRequest(BaseModel):
    password: str

@router.get("/summary")
async def get_academic_summary(
    current_user: User = Depends(get_current_user)
):
    """
    Gateway to fetch academic summary for the authenticated student.
    Returns status mapping and translates internal API errors.
    """
    roll = current_user.roll_number
    # Use cdc as the client name in the path
    res = await call_ads("GET", f"/v1/clients/cdc/students/{roll}/academic-summary", timeout=5.0)
    
    status_code = res["status_code"]
    data = res["data"]
    
    if status_code == 200:
        # Handle cases where backend returned valid status mapping
        if data and data.get("syncStatus") == "failed" and data.get("errorCode") == "INVALID_CREDENTIALS":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "RECONNECT_ERP",
                    "message": "Please reconnect your ERP account. Your login credentials are invalid."
                }
            )
        return data

    if status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "RECONNECT_ERP",
                "message": "Academic token is invalid or expired. Re-authenticate."
            }
        )
        
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={
            "code": "ACADEMIC_SERVER_ERROR",
            "message": "Failed to retrieve academic data from the core service."
        }
    )

@router.post("/register")
async def register_erp_credentials(
    payload: ERPRegisterRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Secure gateway to link student ERP password with ADS.
    Transits credentials directly in memory, validation takes up to 25s.
    """
    roll = current_user.roll_number
    body = {
        "password": payload.password
    }
    
    # 25 seconds timeout to support live validation checks against university web portals
    res = await call_ads("POST", f"/v1/clients/cdc/students/{roll}/register", json_data=body, timeout=25.0)
    
    status_code = res["status_code"]
    data = res["data"]
    
    if status_code in [200, 201]:
        return {
            "success": True,
            "message": "Account successfully linked and provisioning started."
        }
        
    if status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Please check your JNTU Roll Number and password. ERP authentication failed."
            }
        )
        
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={
            "code": "REGISTRATION_FAILED",
            "message": "Failed to link credentials. The academic service might be down."
        }
    )

@router.post("/refresh")
async def trigger_manual_refresh(
    current_user: User = Depends(get_current_user)
):
    """
    Gateway to enqueue manual scrape job for attendance and results.
    """
    roll = current_user.roll_number
    res = await call_ads("POST", f"/v1/clients/cdc/students/{roll}/refresh", timeout=5.0)
    
    status_code = res["status_code"]
    data = res["data"]
    
    if status_code == 202:
        return {
            "success": True,
            "message": "Academic data is currently being refreshed."
        }
        
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail={
            "code": "REFRESH_FAILED",
            "message": "Failed to request manual data refresh."
        }
    )

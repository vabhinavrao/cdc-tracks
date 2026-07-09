from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User
from app.utils import parse_roll_number, get_auto_allocated_track_id

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

ADMIN_PREFIXES_SUPER = {
    # System accounts
    "admin": "System Administrator",
    "cdc_admin": "CDC Administrator",
    "management": "College Management",
    # Hierarchy - Full Access
    "principal": "Principal",
    "dean.careers": "Dean Careers",
    "director": "Director",
    "dean.academics": "Dean Academics",
    "registrar": "Registrar",
    "assistantdean.careers": "Assistant Dean Careers",
}

ADMIN_PREFIXES_BRANCH = {
    # Branch Access
    "cse.hod": ("CSE", "HOD CSE"),
    "csm.hod": ("CSM", "HOD CSM"),
    "ece.hod": ("ECE", "HOD ECE"),
    "eee.hod": ("EEE", "HOD EEE"),
    "mech.hod": ("MECH", "HOD MECH"),
    # Keep old HOD prefix support for backward compatibility
    "hod_cse": ("CSE", "HOD CSE"),
    "hod_csm": ("CSM", "HOD CSE AI/ML"),
    "hod_ece": ("ECE", "HOD ECE"),
    "hod_mech": ("MECH", "HOD MECH"),
    "hod_eee": ("EEE", "HOD EEE"),
}

class GoogleLoginRequest(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None

@router.post("/google-login")
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    
    email_parts = email.split('@')
    if len(email_parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
        
    prefix, domain = email_parts
    
    # Check if prefix matches an authorized Admin or Branch HOD prefix (allowing both @hitam.org and @gmail.com/etc.)
    if prefix in ADMIN_PREFIXES_SUPER:
        role = "super_admin"
        assigned_branch = None
        default_name = payload.name or ADMIN_PREFIXES_SUPER[prefix]
        parsed_data = {
            "roll_number": f"ADMIN-{prefix.upper()}",
            "joining_year": 2020,
            "graduation_year": 2024,
            "admission_type": "Staff",
            "branch": "Management"
        }
    elif prefix in ADMIN_PREFIXES_BRANCH:
        role = "branch_admin"
        branch_code, hod_title = ADMIN_PREFIXES_BRANCH[prefix]
        assigned_branch = branch_code
        default_name = payload.name or hod_title
        parsed_data = {
            "roll_number": f"HOD-{branch_code}",
            "joining_year": 2020,
            "graduation_year": 2024,
            "admission_type": "Faculty",
            "branch": branch_code
        }
    else:
        # Standard Student Account - MUST be @hitam.org
        if domain != "hitam.org":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Access restricted. Students must use @hitam.org email address."
            )
            
        role = "student"
        assigned_branch = None
        default_name = payload.name
        try:
            parsed_data = parse_roll_number(email)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    user = db.query(User).filter(User.email == email).first()
    
    if user:
        user.roll_number = parsed_data["roll_number"]
        user.joining_year = parsed_data["joining_year"]
        user.graduation_year = parsed_data["graduation_year"]
        user.admission_type = parsed_data["admission_type"]
        user.branch = parsed_data["branch"]
        user.role = role
        user.assigned_branch = assigned_branch
        if default_name:
            user.name = default_name
        if payload.picture:
            user.picture = payload.picture
    else:
        user = User(
            email=email,
            roll_number=parsed_data["roll_number"],
            joining_year=parsed_data["joining_year"],
            graduation_year=parsed_data["graduation_year"],
            admission_type=parsed_data["admission_type"],
            branch=parsed_data["branch"],
            name=default_name,
            picture=payload.picture,
            selected_track_id=None,
            bookmarked_tracks=[],
            role=role,
            assigned_branch=assigned_branch
        )
        db.add(user)

    # Automatically resolve and assign track if student doesn't have an active track selected
    if role == "student" and not user.selected_track_id:
        auto_track_id = get_auto_allocated_track_id(db, user.roll_number)
        if auto_track_id:
            user.selected_track_id = auto_track_id
        
    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error occurred: {str(e)}"
        )
        
    return {
        "id": user.id,
        "email": user.email,
        "roll_number": user.roll_number,
        "joining_year": user.joining_year,
        "graduation_year": user.graduation_year,
        "admission_type": user.admission_type,
        "branch": user.branch,
        "name": user.name,
        "picture": user.picture,
        "selected_track_id": user.selected_track_id,
        "bookmarked_tracks": user.bookmarked_tracks,
        "role": user.role,
        "assigned_branch": user.assigned_branch
    }

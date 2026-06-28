# backend/app/routes/admin.py
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import User, CDCPerformance

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard & Analytics"])

def get_current_admin(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header"
        )
    
    email = authorization
    if authorization.startswith("Bearer "):
        email = authorization.split(" ")[1]
        
    email = email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user or user.role not in ["super_admin", "branch_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized admin users."
        )
    return user

@router.get("/analytics")
def get_admin_analytics(
    branch: Optional[str] = Query(None, description="Filter by branch (e.g. CSE, ECE, EEE, MECH, CSM)"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Enforce branch restriction if user is a branch_admin
    effective_branch = branch
    if current_admin.role == "branch_admin":
        effective_branch = current_admin.assigned_branch

    query = db.query(CDCPerformance)
    if effective_branch and effective_branch.upper() != "ALL":
        query = query.filter(func.upper(CDCPerformance.branch) == effective_branch.upper())
        
    records = query.all()
    total_students = len(records)
    
    if total_students == 0:
        return {
            "total_students": 0,
            "branch_filter": effective_branch or "ALL",
            "avg_performance": 0,
            "avg_cie": 0,
            "avg_consistency": 0,
            "band_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "Unassigned": 0},
            "available_branches": [b[0] for b in db.query(CDCPerformance.branch).distinct().all() if b[0]]
        }
        
    avg_perf = sum(r.avg_performance or 0 for r in records) / total_students
    avg_cie = sum(r.cie_score or 0 for r in records) / total_students
    avg_cons = sum(r.consistency_score or 0 for r in records) / total_students
    
    band_counts = {"A": 0, "B": 0, "C": 0, "D": 0, "Unassigned": 0}
    for r in records:
        band = (r.cdc_band or "Unassigned").strip().upper()
        if band in band_counts:
            band_counts[band] += 1
        else:
            band_counts["Unassigned"] += 1
            
    # Get all unique branches available in the system
    all_branches = [b[0] for b in db.query(CDCPerformance.branch).distinct().all() if b[0]]
    
    return {
        "total_students": total_students,
        "branch_filter": effective_branch or "ALL",
        "avg_performance": round(avg_perf, 2),
        "avg_cie": round(avg_cie, 2),
        "avg_consistency": round(avg_cons, 2),
        "band_distribution": band_counts,
        "available_branches": sorted(all_branches)
    }

@router.get("/students")
def get_admin_students(
    branch: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    effective_branch = branch
    if current_admin.role == "branch_admin":
        effective_branch = current_admin.assigned_branch
        
    query = db.query(CDCPerformance)
    if effective_branch and effective_branch.upper() != "ALL":
        query = query.filter(func.upper(CDCPerformance.branch) == effective_branch.upper())
        
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (CDCPerformance.name.ilike(search_term)) | 
            (CDCPerformance.roll_number.ilike(search_term)) |
            (CDCPerformance.email.ilike(search_term))
        )
        
    records = query.order_by(CDCPerformance.cdc_rank.asc().nullslast()).all()
    
    student_list = []
    for r in records:
        student_list.append({
            "roll_number": r.roll_number,
            "name": r.name or "N/A",
            "branch": r.branch or "N/A",
            "email": r.email or "N/A",
            "cdc_rank": r.cdc_rank,
            "cdc_band": r.cdc_band or "N/A",
            "avg_performance": r.avg_performance,
            "cie_score": r.cie_score,
            "consistency_score": r.consistency_score
        })
        
    return {
        "count": len(student_list),
        "students": student_list
    }

@router.get("/student/{roll_number}")
def get_admin_student_detail(
    roll_number: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    clean_identifier = roll_number.strip()
    # Try matching by roll number first
    record = db.query(CDCPerformance).filter(func.upper(CDCPerformance.roll_number) == clean_identifier.upper()).first()
    
    # Fallback to email search if not found
    if not record:
        record = db.query(CDCPerformance).filter(func.lower(CDCPerformance.email) == clean_identifier.lower()).first()
        
    if not record:
        raise HTTPException(status_code=404, detail=f"Student record '{roll_number}' not found.")
        
    # Security check for branch admin
    if current_admin.role == "branch_admin":
        if record.branch and record.branch.upper() != current_admin.assigned_branch.upper():
            raise HTTPException(status_code=403, detail="You do not have access to students outside your assigned branch.")
            
    # Also fetch user record if available
    user_record = db.query(User).filter(
        (func.upper(User.roll_number) == record.roll_number.upper()) |
        (func.lower(User.email) == (record.email or "").lower())
    ).first()
    
    return {
        "student": {
            "name": record.name,
            "roll_number": record.roll_number,
            "branch": record.branch,
            "email": record.email,
            "mobile": record.mobile,
            "batch_year": record.batch_year
        },
        "overall": {
            "cdc_band": record.cdc_band,
            "cdc_rank": record.cdc_rank,
            "cdc_grade_score": record.cdc_grade_score,
            "avg_performance": record.avg_performance,
            "consistency_score": record.consistency_score,
            "participation": record.participation,
            "cie_score": record.cie_score
        },
        "post_assessments": record.post_assessments or {},
        "domain_tracks": record.domain_tracks or {},
        "test_scores": record.test_scores or {},
        "user_profile": {
            "selected_track_id": user_record.selected_track_id if user_record else None,
            "bookmarked_tracks": user_record.bookmarked_tracks if user_record else [],
            "joining_year": user_record.joining_year if user_record else None,
            "graduation_year": user_record.graduation_year if user_record else None,
            "admission_type": user_record.admission_type if user_record else None,
            "picture": user_record.picture if user_record else None
        } if user_record else None
    }


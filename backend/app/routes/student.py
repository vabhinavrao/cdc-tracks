# backend/app/routes/student.py
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models import User, Track, BatchSchedule, TrackSelectionHistory, FinalisedTrack
from app.utils import calculate_current_year
from app.services.cdc_service import get_cdc_performance_by_roll

router = APIRouter(prefix="/api/student", tags=["Student Profile & Tracks"])

# Helper dependency to authenticate/retrieve user by Authorization header
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header"
        )
    
    # Expect "Bearer <email>" or just "<email>"
    email = authorization
    if authorization.startswith("Bearer "):
        email = authorization.split(" ")[1]
        
    email = email.strip().lower()
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Student not registered or authenticated"
        )
    return user

class TrackSelectionRequest(BaseModel):
    track_id: Optional[str] = None # Allow null/None to uncommit

class TrackBookmarkRequest(BaseModel):
    track_id: str

@router.post("/select-track")
def select_track(
    payload: TrackSelectionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    track_id = payload.track_id
    
    # Check student batch schedule and track selection window
    batch_year = f"{user.joining_year}-{user.graduation_year}"
    batch_schedule = db.query(BatchSchedule).filter(BatchSchedule.batch_year == batch_year).first()
    if not batch_schedule:
        batch_schedule = db.query(BatchSchedule).first()

    now = datetime.utcnow()
    is_active = True
    contact_email = "support.cdc@hitam.org"
    
    if batch_schedule:
        contact_email = batch_schedule.contact_email or contact_email
        if batch_schedule.track_selection_start and now < batch_schedule.track_selection_start:
            is_active = False
        if batch_schedule.track_selection_end and now > batch_schedule.track_selection_end:
            is_active = False

    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Track selection for the semester has ended. Contact: {contact_email} for track changes or related issues."
        )

    # If a track_id is provided, verify it exists in our seeded Tracks table
    if track_id:
        track = db.query(Track).filter(Track.id == track_id).first()
        if not track:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Track '{track_id}' not found in database."
            )
            
    current_academic_year = calculate_current_year(user.joining_year)
    prev_track = user.selected_track_id
    user.selected_track_id = track_id
    
    try:
        # Record audit log entry
        audit = TrackSelectionHistory(
            roll_number=user.roll_number,
            student_name=user.name,
            student_email=user.email,
            batch_year=batch_year,
            academic_year=current_academic_year,
            semester="Active",
            previous_track_id=prev_track,
            new_track_id=track_id,
            timestamp=now
        )
        db.add(audit)

        # Mirror/upsert into FinalisedTrack
        fin = db.query(FinalisedTrack).filter(
            FinalisedTrack.roll_number == user.roll_number,
            FinalisedTrack.batch_year == batch_year,
            FinalisedTrack.academic_year == current_academic_year
        ).first()
        if fin:
            fin.track_id = track_id
            fin.finalised_at = now
        else:
            fin = FinalisedTrack(
                roll_number=user.roll_number,
                batch_year=batch_year,
                academic_year=current_academic_year,
                semester="Active",
                track_id=track_id,
                finalised_at=now
            )
            db.add(fin)

        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update selected track: {str(e)}"
        )
        
    return {
        "message": "Selected track updated successfully",
        "selected_track_id": user.selected_track_id
    }

@router.post("/bookmark-track")
def bookmark_track(
    payload: TrackBookmarkRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    track_id = payload.track_id
    
    # Verify track exists
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track '{track_id}' not found."
        )
        
    # Get copy of bookmarks list to prevent SQLAlchemy mutation detection issues
    bookmarks = list(user.bookmarked_tracks) if user.bookmarked_tracks else []
    
    if track_id in bookmarks:
        bookmarks.remove(track_id)
        action = "removed"
    else:
        bookmarks.append(track_id)
        action = "added"
        
    user.bookmarked_tracks = bookmarks
    
    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update bookmarks: {str(e)}"
        )
        
    return {
        "message": f"Track {action} successfully",
        "bookmarked_tracks": user.bookmarked_tracks
    }

@router.get("/dashboard-data")
def get_dashboard_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Calculate academic year
    current_academic_year = calculate_current_year(user.joining_year)
    batch_year = f"{user.joining_year}-{user.graduation_year}"
    
    # Fetch selection window schedule
    batch_schedule = db.query(BatchSchedule).filter(BatchSchedule.batch_year == batch_year).first()
    if not batch_schedule:
        batch_schedule = db.query(BatchSchedule).first()

    now = datetime.utcnow()
    is_selection_open = True
    contact_email = "support.cdc@hitam.org"
    start_str = None
    end_str = None

    if batch_schedule:
        contact_email = batch_schedule.contact_email or contact_email
        start_str = batch_schedule.track_selection_start.isoformat() if batch_schedule.track_selection_start else None
        end_str = batch_schedule.track_selection_end.isoformat() if batch_schedule.track_selection_end else None

        if batch_schedule.track_selection_start and now < batch_schedule.track_selection_start:
            is_selection_open = False
        if batch_schedule.track_selection_end and now > batch_schedule.track_selection_end:
            is_selection_open = False

    # Retrieve complete details for the selected track
    selected_track_data = None
    if user.selected_track_id:
        track = db.query(Track).filter(Track.id == user.selected_track_id).first()
        if track:
            selected_track_data = track.data
            
    # Retrieve summaries for bookmarked tracks
    bookmarked_summaries = []
    if user.bookmarked_tracks:
        tracks = db.query(Track).filter(Track.id.in_(user.bookmarked_tracks)).all()
        for t in tracks:
            bookmarked_summaries.append({
                "id": t.id,
                "track_name": t.track_name
            })
            
    return {
        "student": {
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
            "status": user.status or "active"
        },
        "current_year": current_academic_year,
        "selected_track": selected_track_data,
        "bookmarked_tracks_data": bookmarked_summaries,
        "track_selection_window": {
            "is_open": is_selection_open,
            "start_time": start_str,
            "end_time": end_str,
            "contact_email": contact_email
        }
    }


@router.get("/cdc-dashboard-data")
def get_cdc_dashboard_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cdc_record = get_cdc_performance_by_roll(db, user.roll_number, user.email)
    
    if not cdc_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No CDC Performance record found for roll number '{user.roll_number}' or email '{user.email}'."
        )
        
    return {
        "student": {
            "name": cdc_record.name or user.name,
            "roll_number": cdc_record.roll_number,
            "branch": cdc_record.branch or user.branch,
            "email": cdc_record.email or user.email,
            "batch_year": cdc_record.batch_year
        },
        "overall": {
            "cdc_band": cdc_record.cdc_band,
            "cdc_rank": cdc_record.cdc_rank,
            "cdc_grade_score": cdc_record.cdc_grade_score,
            "avg_performance": cdc_record.avg_performance,
            "consistency_score": cdc_record.consistency_score,
            "participation": cdc_record.participation,
            "cie_score": cdc_record.cie_score
        },
        "post_assessments": cdc_record.post_assessments,
        "domain_tracks": cdc_record.domain_tracks,
        "test_scores": cdc_record.test_scores
    }

class SyncSheetsRequest(BaseModel):
    sheet1_id: str
    sheet2_id: str

@router.post("/sync-google-sheets")
def trigger_google_sheets_sync(
    payload: SyncSheetsRequest,
    db: Session = Depends(get_db)
):
    from app.services.google_sheets_sync import sync_live_google_sheets
    res = sync_live_google_sheets(db, payload.sheet1_id, payload.sheet2_id)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res



# backend/app/routes/student.py
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models import User, Track, BatchSchedule, TrackSelectionHistory, FinalisedTrack, ProjectTopic, StudentProjectSelection, HitamProjectRequest, CDCPerformance, InternshipRequest
from app.utils import calculate_current_year, get_auto_allocated_track_id
from app.services.cdc_service import get_cdc_performance_by_roll, get_test_mappings


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

class SelectProjectRequest(BaseModel):
    project_id: int
    faculty_guide: str
    confirmed: bool

class HitamRequestModel(BaseModel):
    project_id: int
    phone_number: str
    reason: str

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
    is_project_selection_open = True
    contact_email = "support.cdc@hitam.org"
    start_str = None
    end_str = None
    proj_start_str = None
    proj_end_str = None

    if batch_schedule:
        contact_email = batch_schedule.contact_email or contact_email
        start_str = batch_schedule.track_selection_start.isoformat() if batch_schedule.track_selection_start else None
        end_str = batch_schedule.track_selection_end.isoformat() if batch_schedule.track_selection_end else None
        proj_start_str = batch_schedule.project_selection_start.isoformat() if batch_schedule.project_selection_start else None
        proj_end_str = batch_schedule.project_selection_end.isoformat() if batch_schedule.project_selection_end else None

        if batch_schedule.track_selection_start and now < batch_schedule.track_selection_start:
            is_selection_open = False
        if batch_schedule.track_selection_end and now > batch_schedule.track_selection_end:
            is_selection_open = False

        if batch_schedule.project_selection_start and now < batch_schedule.project_selection_start:
            is_project_selection_open = False
        if batch_schedule.project_selection_end and now > batch_schedule.project_selection_end:
            is_project_selection_open = False

    # Retrieve complete details for the selected track (auto-resolve if null or if raw value doesn't match a valid slug)
    if user.selected_track_id:
        # Check if the stored value actually resolves to a real track
        existing_track = db.query(Track).filter(Track.id == user.selected_track_id).first()
        if not existing_track:
            # The stored value is stale/raw — clear it so auto-resolve can fix it
            user.selected_track_id = None

    if not user.selected_track_id:
        auto_track_id = get_auto_allocated_track_id(db, user.roll_number)
        if auto_track_id:
            user.selected_track_id = auto_track_id
            try:
                db.commit()
                db.refresh(user)
            except Exception:
                db.rollback()

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
            
    # Fetch active student project selection
    active_project = None
    student_proj_sel = db.query(StudentProjectSelection).filter(StudentProjectSelection.roll_number == user.roll_number).first()
    if student_proj_sel:
        proj_topic = db.query(ProjectTopic).filter(ProjectTopic.id == student_proj_sel.project_id).first()
        if proj_topic:
            active_project = {
                "id": student_proj_sel.id,
                "project_id": proj_topic.id,
                "project_code": proj_topic.project_code,
                "title": proj_topic.title,
                "problem_statement": proj_topic.problem_statement,
                "key_objectives": proj_topic.key_objectives,
                "technologies": proj_topic.technologies,
                "difficulty": proj_topic.difficulty,
                "faculty_guide": student_proj_sel.faculty_guide,
                "selected_at": student_proj_sel.selected_at.isoformat() if student_proj_sel.selected_at else None
            }

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
        },
        "project_selection_window": {
            "is_open": is_project_selection_open,
            "start_time": proj_start_str,
            "end_time": proj_end_str,
            "contact_email": contact_email
        },
        "active_project": active_project
    }


@router.get("/cdc-dashboard-data")
def get_cdc_dashboard_data(
    academic_year: Optional[int] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func as sqlfunc
    
    # Fetch all available academic years for this student
    all_records_q = db.query(CDCPerformance).filter(
        sqlfunc.upper(CDCPerformance.roll_number) == (user.roll_number or "").strip().upper()
    ).all()
    available_years = sorted(set(r.academic_year for r in all_records_q if r.academic_year))

    if academic_year is not None:
        cdc_record = get_cdc_performance_by_roll(db, user.roll_number, user.email, academic_year=academic_year)
        if not cdc_record:
            # Requested year not found — fall through to smart default
            academic_year = None

    if academic_year is None:
        # Pick the most recent year that has actual test data (test_scores not empty/null)
        # to avoid defaulting to a future year with no data
        best_record = None
        for rec in sorted(all_records_q, key=lambda r: r.academic_year or 0, reverse=True):
            if rec.test_scores and len(rec.test_scores) > 0:
                best_record = rec
                break
        # If none has test data, fall back to the one with the smallest academic_year (earliest = most likely to have data)
        if not best_record and all_records_q:
            best_record = min(all_records_q, key=lambda r: r.academic_year or 99)
        cdc_record = best_record

    if not cdc_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No CDC Performance record found for roll number '{user.roll_number}' or email '{user.email}'."
        )

    # ── Cumulative merge: only domain_tracks accumulates across all years ────
    # Sort other records oldest-first so more recent data wins
    other_records = sorted(
        [r for r in all_records_q if r.academic_year != cdc_record.academic_year],
        key=lambda r: r.academic_year or 0
    )

    merged_domain_tracks = {}
    for r in other_records:
        if r.domain_tracks:
            merged_domain_tracks.update(r.domain_tracks)
    # Selected year always wins on top
    if cdc_record.domain_tracks:
        merged_domain_tracks.update(cdc_record.domain_tracks)
    final_domain_tracks = merged_domain_tracks or cdc_record.domain_tracks
    # ────────────────────────────────────────────────────────────────────────

    from app.services.cdc_service import calculate_ranks
    ranks = calculate_ranks(db, cdc_record)

    test_mappings_result = get_test_mappings(db, cdc_record.batch_year, cdc_record.academic_year)
    # Dynamic test count: union of keys from test_scores and test_mappings
    all_test_keys = set(cdc_record.test_scores.keys() if cdc_record.test_scores else [])
    all_test_keys |= set(test_mappings_result.keys() if test_mappings_result else [])
    test_count = len(all_test_keys) if all_test_keys else 0

    return {
        "student": {
            "name": cdc_record.name or user.name,
            "roll_number": cdc_record.roll_number,
            "branch": cdc_record.branch or user.branch,
            "email": cdc_record.email or user.email,
            "batch_year": cdc_record.batch_year,
            "academic_year": cdc_record.academic_year
        },
        "overall": {
            "cdc_band": cdc_record.cdc_band,
            "cdc_rank": cdc_record.cdc_rank,
            "cdc_grade_score": cdc_record.cdc_grade_score,
            "avg_performance": cdc_record.avg_performance,
            "consistency_score": cdc_record.consistency_score,
            "participation": cdc_record.participation,
            "cie_score": cdc_record.cie_score,
            "batch_rank": ranks["batch_rank"],
            "branch_rank": ranks["branch_rank"],
            "batch_students": ranks["batch_students"],
            "branch_students": ranks["branch_students"]
        },
        "post_assessments": cdc_record.post_assessments,
        "domain_tracks": final_domain_tracks,
        "test_scores": cdc_record.test_scores,
        "test_mappings": test_mappings_result,
        "test_count": test_count,
        "available_years": available_years
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


@router.get("/projects")
def get_track_projects(
    track_slug: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_slug = track_slug or user.selected_track_id
    if not target_slug:
        raise HTTPException(status_code=400, detail="No track specified or selected.")

    projects = db.query(ProjectTopic).filter(ProjectTopic.track_slug == target_slug, ProjectTopic.is_hitam == False).all()
    
    # Get student active selection if any
    active_sel = db.query(StudentProjectSelection).filter(StudentProjectSelection.roll_number == user.roll_number).first()
    
    return {
        "track_slug": target_slug,
        "projects": [
            {
                "id": p.id,
                "project_code": p.project_code,
                "title": p.title,
                "problem_statement": p.problem_statement,
                "key_objectives": p.key_objectives,
                "technologies": p.technologies,
                "concepts": p.concepts,
                "difficulty": p.difficulty
            } for p in projects
        ],
        "selected_project_id": active_sel.project_id if active_sel else None,
        "selected_faculty_guide": active_sel.faculty_guide if active_sel else None
    }

@router.post("/select-project")
def select_project(
    payload: SelectProjectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.confirmed:
        raise HTTPException(status_code=400, detail="You must confirm that you have obtained permission from your faculty guide.")
        
    if not payload.faculty_guide or not payload.faculty_guide.strip():
        raise HTTPException(status_code=400, detail="Faculty guide/incharge name is required.")

    # Check project selection window
    batch_year = f"{user.joining_year}-{user.graduation_year}"
    batch_schedule = db.query(BatchSchedule).filter(BatchSchedule.batch_year == batch_year).first()
    if not batch_schedule:
        batch_schedule = db.query(BatchSchedule).first()

    now = datetime.utcnow()
    if batch_schedule:
        if batch_schedule.project_selection_start and now < batch_schedule.project_selection_start:
            raise HTTPException(status_code=403, detail="Project selection window has not opened yet.")
        if batch_schedule.project_selection_end and now > batch_schedule.project_selection_end:
            raise HTTPException(status_code=403, detail=f"Project selection window has closed. Contact {batch_schedule.contact_email} for assistance.")

    proj = db.query(ProjectTopic).filter(ProjectTopic.id == payload.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project topic not found.")

    existing_sel = db.query(StudentProjectSelection).filter(StudentProjectSelection.roll_number == user.roll_number).first()
    if existing_sel:
        existing_sel.project_id = proj.id
        existing_sel.track_slug = proj.track_slug
        existing_sel.faculty_guide = payload.faculty_guide.strip()
        existing_sel.confirmed_with_faculty = True
        existing_sel.selected_at = now
    else:
        new_sel = StudentProjectSelection(
            roll_number=user.roll_number,
            student_name=user.name,
            student_email=user.email,
            branch=user.branch,
            track_slug=proj.track_slug,
            project_id=proj.id,
            faculty_guide=payload.faculty_guide.strip(),
            confirmed_with_faculty=True,
            selected_at=now
        )
        db.add(new_sel)

    db.commit()
    return {"message": "Project selected successfully!", "project_id": proj.id, "faculty_guide": payload.faculty_guide.strip()}

@router.delete("/select-project")
def unselect_project(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing_sel = db.query(StudentProjectSelection).filter(StudentProjectSelection.roll_number == user.roll_number).first()
    if existing_sel:
        db.delete(existing_sel)
        db.commit()
    return {"message": "Project choice cleared successfully."}

@router.get("/hitam-projects")
def get_hitam_projects(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    projects = db.query(ProjectTopic).filter(ProjectTopic.is_hitam == True).all()
    requests = db.query(HitamProjectRequest).filter(HitamProjectRequest.roll_number == user.roll_number).all()

    req_map = {r.project_id: {"id": r.id, "status": r.status, "phone": r.phone_number, "reason": r.reason, "requested_at": r.requested_at.isoformat() if r.requested_at else None} for r in requests}

    return {
        "projects": [
            {
                "id": p.id,
                "project_code": p.project_code,
                "title": p.title,
                "problem_statement": p.problem_statement,
                "key_objectives": p.key_objectives,
                "technologies": p.technologies,
                "concepts": p.concepts,
                "difficulty": p.difficulty,
                "student_request": req_map.get(p.id)
            } for p in projects
        ]
    }

@router.post("/request-hitam-project")
def request_hitam_project(
    payload: HitamRequestModel,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.phone_number or len(payload.phone_number.strip()) < 10:
        raise HTTPException(status_code=400, detail="Valid phone number (at least 10 digits) is required.")
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Please explain why you want to work on this HITAM project.")

    proj = db.query(ProjectTopic).filter(ProjectTopic.id == payload.project_id, ProjectTopic.is_hitam == True).first()
    if not proj:
        raise HTTPException(status_code=404, detail="HITAM project not found.")

    existing = db.query(HitamProjectRequest).filter(HitamProjectRequest.roll_number == user.roll_number, HitamProjectRequest.project_id == proj.id).first()
    if existing:
        existing.phone_number = payload.phone_number.strip()
        existing.reason = payload.reason.strip()
        existing.status = "pending"
        existing.requested_at = datetime.utcnow()
    else:
        req = HitamProjectRequest(
            roll_number=user.roll_number,
            student_name=user.name,
            student_email=user.email,
            branch=user.branch,
            project_id=proj.id,
            phone_number=payload.phone_number.strip(),
            reason=payload.reason.strip(),
            status="pending",
            requested_at=datetime.utcnow()
        )
        db.add(req)

    db.commit()
    return {"message": "HITAM project request submitted successfully! CDC team will review your application."}


class InternshipRequestModel(BaseModel):
    phone_number: str
    company_name: str
    company_website: Optional[str] = None
    internship_obtained_through: Optional[str] = None
    internship_domain: Optional[str] = None
    internship_mode: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_duration: Optional[str] = None
    internship_location: Optional[str] = None
    stipend: Optional[str] = None
    ppo_offered: Optional[str] = None
    expected_ctc: Optional[str] = None
    spoc_name: Optional[str] = None
    spoc_designation: Optional[str] = None
    spoc_email: Optional[str] = None
    spoc_phone: Optional[str] = None
    section: Optional[str] = None


@router.get("/internship-data")
def get_student_internship_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_academic_year = calculate_current_year(user.joining_year)
    
    cdc_record = db.query(CDCPerformance).filter(
        CDCPerformance.roll_number == user.roll_number
    ).order_by(CDCPerformance.academic_year.desc()).first()
    cdc_band = cdc_record.cdc_band if cdc_record else "Unassigned"
    phone_number = cdc_record.mobile if cdc_record else ""
    
    existing_request = db.query(InternshipRequest).filter(InternshipRequest.roll_number == user.roll_number).first()
    
    request_data = None
    if existing_request:
        request_data = {
            "id": existing_request.id,
            "phone_number": existing_request.phone_number,
            "company_name": existing_request.company_name,
            "company_website": existing_request.company_website,
            "internship_obtained_through": existing_request.internship_obtained_through,
            "internship_domain": existing_request.internship_domain,
            "internship_mode": existing_request.internship_mode,
            "start_date": existing_request.start_date,
            "end_date": existing_request.end_date,
            "total_duration": existing_request.total_duration,
            "internship_location": existing_request.internship_location,
            "stipend": existing_request.stipend,
            "ppo_offered": existing_request.ppo_offered,
            "expected_ctc": existing_request.expected_ctc,
            "spoc_name": existing_request.spoc_name,
            "spoc_designation": existing_request.spoc_designation,
            "spoc_email": existing_request.spoc_email,
            "spoc_phone": existing_request.spoc_phone,
            "section": existing_request.section,
            "status": existing_request.status,
            "admin_notes": existing_request.admin_notes,
            "requested_at": existing_request.requested_at.isoformat() if existing_request.requested_at else None
        }
        
    return {
        "student": {
            "name": user.name,
            "roll_number": user.roll_number,
            "email": user.email,
            "branch": user.branch,
            "current_year": current_academic_year,
            "cdc_band": cdc_band,
            "auto_phone": phone_number
        },
        "existing_request": request_data
    }


@router.post("/apply-internship")
def apply_for_internship(
    payload: InternshipRequestModel,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.company_name or not payload.company_name.strip():
        raise HTTPException(status_code=400, detail="Company Name is required.")
    if not payload.phone_number or len(payload.phone_number.strip()) < 10:
        raise HTTPException(status_code=400, detail="A valid contact number is required.")

    existing = db.query(InternshipRequest).filter(InternshipRequest.roll_number == user.roll_number).first()
    
    now = datetime.utcnow()
    
    if existing:
        existing.student_name = user.name
        existing.student_email = user.email
        existing.branch = user.branch
        existing.phone_number = payload.phone_number.strip()
        existing.company_name = payload.company_name.strip()
        existing.company_website = payload.company_website.strip() if payload.company_website else None
        existing.internship_obtained_through = payload.internship_obtained_through
        existing.internship_domain = payload.internship_domain
        existing.internship_mode = payload.internship_mode
        existing.start_date = payload.start_date
        existing.end_date = payload.end_date
        existing.total_duration = payload.total_duration
        existing.internship_location = payload.internship_location
        existing.stipend = payload.stipend
        existing.ppo_offered = payload.ppo_offered
        existing.expected_ctc = payload.expected_ctc
        existing.spoc_name = payload.spoc_name
        existing.spoc_designation = payload.spoc_designation
        existing.spoc_email = payload.spoc_email
        existing.spoc_phone = payload.spoc_phone
        existing.section = payload.section
        existing.status = "pending"
        existing.requested_at = now
        db.commit()
        db.refresh(existing)
        return {"message": "Internship request updated and submitted successfully!", "request_id": existing.id}
    else:
        req = InternshipRequest(
            roll_number=user.roll_number,
            student_name=user.name,
            student_email=user.email,
            branch=user.branch,
            phone_number=payload.phone_number.strip(),
            company_name=payload.company_name.strip(),
            company_website=payload.company_website.strip() if payload.company_website else None,
            internship_obtained_through=payload.internship_obtained_through,
            internship_domain=payload.internship_domain,
            internship_mode=payload.internship_mode,
            start_date=payload.start_date,
            end_date=payload.end_date,
            total_duration=payload.total_duration,
            internship_location=payload.internship_location,
            stipend=payload.stipend,
            ppo_offered=payload.ppo_offered,
            expected_ctc=payload.expected_ctc,
            spoc_name=payload.spoc_name,
            spoc_designation=payload.spoc_designation,
            spoc_email=payload.spoc_email,
            spoc_phone=payload.spoc_phone,
            section=payload.section,
            status="pending",
            requested_at=now
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return {"message": "Internship request submitted successfully!", "request_id": req.id}





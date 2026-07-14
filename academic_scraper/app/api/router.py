import re
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app import config, models, schemas
from app.database import get_db
from app.api.dependencies import require_scope
from app.scraper.client import ErpClient, ErpScraperError
from app.scraper.parsers.profile import parse_profile
from app.scraper.parsers.attendance import parse_attendance
from app.scraper.parsers.marks import parse_marks_data
from app.scraper.parsers.spf import parse_spf
from app.scraper.parsers.semester import parse_previous_semesters_attendance
from app.security.crypto import encrypt_credential, decrypt_credential
from app.utils.logger import get_logger, log_duration

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/clients/{client_id}/students/{roll}", tags=["Scraper v1"])

async def scrape_and_persist(
    roll_number: str,
    password: str,
    db: Session,
    metrics: dict
) -> schemas.AcademicData:
    """
    Executes a single-login ERP scraping session for all academic details,
    normalizes data into unified AcademicData Pydantic model, and persists to Neon.
    """
    roll_number = roll_number.strip().upper()
    parser_metrics = {}
    
    async with ErpClient() as erp:
        # 1. Login
        with log_duration("login", parser_metrics):
            await erp.login(roll_number, password)
            
        # 2. Fetch HTML sources
        with log_duration("fetch_profile_html", parser_metrics):
            profile_html = await erp.fetch_profile_html()
            
        with log_duration("fetch_attendance_html", parser_metrics):
            attendance_html = await erp.fetch_attendance_html()
            
        # 3. Parse HTML details into Python structures
        with log_duration("parse_profile", parser_metrics):
            profile_data = parse_profile(profile_html)
            
        with log_duration("parse_attendance", parser_metrics):
            attendance_data = parse_attendance(attendance_html)
            
        with log_duration("parse_marks", parser_metrics):
            marks_raw = parse_marks_data(profile_html)
            
        with log_duration("parse_spf", parser_metrics):
            spf_bands_raw = parse_spf(profile_html)
            
        with log_duration("parse_semesters", parser_metrics):
            semester_attendance_raw = parse_previous_semesters_attendance(profile_html)
            
        # 4. Perform sequential logout
        await erp.logout()

    # Compile the final lists for validation
    exams = []
    for sem in marks_raw.get("externalMarks", []):
        exams.append(schemas.ExamData(
            examId=f"EXTERNAL-{sem['semesterLabel']}",
            title="External Marks",
            term=sem["semesterLabel"],
            sgpa=sem.get("sgpa"),
            items=[schemas.ExamItem(name=s["name"], grade=s["grade"], credits=s["credits"]) for s in sem["subjects"]]
        ))
        
    for sem in marks_raw.get("internalMarks", []):
        for exam in sem.get("exams", []):
            exams.append(schemas.ExamData(
                examId=f"INTERNAL-{exam['examName']}-{sem['semesterLabel']}",
                title=exam['examName'],
                term=sem['semesterLabel'],
                items=[schemas.ExamItem(name=s["name"], scored=s["marks"]) for s in exam["subjects"]]
            ))

    spf_bands = [schemas.SpfBandData(**b) for b in spf_bands_raw]
    semester_attendance = [schemas.SemesterAttendanceData(
        semesterLabel=s["semesterLabel"],
        academicYear=s["academicYear"],
        semester=s["semester"],
        totalHeld=s["totalHeld"],
        totalAttended=s["totalAttended"],
        percentage=s["percentage"],
        subjects=[schemas.SemesterAttendanceSubject(
            name=sub["name"], held=sub["held"], attended=sub["attended"], percentage=sub["percentage"]
        ) for sub in s["subjects"]]
    ) for s in semester_attendance_raw]

    # Validate against unified AcademicData schema
    academic_payload = schemas.AcademicData(
        profile=schemas.StudentProfileData(**profile_data),
        attendance=schemas.AttendanceData(
            overallPercentage=attendance_data["overallPercentage"],
            held=attendance_data["held"],
            attended=attendance_data["attended"],
            subjects=[schemas.SubjectAttendance(**s) for s in attendance_data["subjects"]]
        ),
        exams=exams,
        spf_bands=spf_bands,
        semester_attendance=semester_attendance
    )
    
    # 5. Database transaction persistence using purely UPSERT constructs
    now = datetime.now(timezone.utc)
    with log_duration("db_write", parser_metrics):
        # 1. Upsert Student Identity
        stmt_student = insert(models.Student).values(
            roll_number=roll_number,
            name=academic_payload.profile.name,
            branch=academic_payload.profile.branch,
            program=academic_payload.profile.program,
            regulation=None,
            cgpa=academic_payload.profile.cgpa,
            cgpa_credits=academic_payload.profile.cgpaCredits,
            cgpa_percentage=academic_payload.profile.cgpaPercentage,
            status="active",
            created_at=now,
            updated_at=now
        ).on_conflict_do_update(
            constraint="students_pkey",
            set_={
                "name": academic_payload.profile.name,
                "branch": academic_payload.profile.branch,
                "program": academic_payload.profile.program,
                "regulation": None,
                "cgpa": academic_payload.profile.cgpa,
                "cgpa_credits": academic_payload.profile.cgpaCredits,
                "cgpa_percentage": academic_payload.profile.cgpaPercentage,
                "status": "active",
                "updated_at": now
            }
        )
        db.execute(stmt_student)
        
        # 2. Upsert Attendance Cache snapshot
        stmt_att = insert(models.Attendance).values(
            roll_number=roll_number,
            overall_percentage=academic_payload.attendance.overallPercentage,
            held=academic_payload.attendance.held,
            attended=academic_payload.attendance.attended,
            subjects=[s.model_dump() for s in academic_payload.attendance.subjects],
            previous_semesters=[s.model_dump() for s in academic_payload.semester_attendance],
            last_scraped_at=now,
            updated_at=now
        ).on_conflict_do_update(
            constraint="attendance_pkey",
            set_={
                "overall_percentage": academic_payload.attendance.overallPercentage,
                "held": academic_payload.attendance.held,
                "attended": academic_payload.attendance.attended,
                "subjects": [s.model_dump() for s in academic_payload.attendance.subjects],
                "previous_semesters": [s.model_dump() for s in academic_payload.semester_attendance],
                "last_scraped_at": now,
                "updated_at": now
            }
        )
        db.execute(stmt_att)
        
        # 3. Upsert Marks (CGPA duplicated in both places)
        stmt_marks = insert(models.Mark).values(
            roll_number=roll_number,
            exams=[e.model_dump() for e in academic_payload.exams],
            cgpa=academic_payload.profile.cgpa,
            cgpa_credits=academic_payload.profile.cgpaCredits,
            cgpa_percentage=academic_payload.profile.cgpaPercentage,
            last_scraped_at=now,
            updated_at=now
        ).on_conflict_do_update(
            constraint="marks_pkey",
            set_={
                "exams": [e.model_dump() for e in academic_payload.exams],
                "cgpa": academic_payload.profile.cgpa,
                "cgpa_credits": academic_payload.profile.cgpaCredits,
                "cgpa_percentage": academic_payload.profile.cgpaPercentage,
                "last_scraped_at": now,
                "updated_at": now
            }
        )
        db.execute(stmt_marks)
        
        # 4. Upsert SPF Bands snapshot
        stmt_spf = insert(models.SpfBand).values(
            roll_number=roll_number,
            bands=[b.model_dump() for b in academic_payload.spf_bands],
            last_scraped_at=now,
            updated_at=now
        ).on_conflict_do_update(
            constraint="spf_bands_pkey",
            set_={
                "bands": [b.model_dump() for b in academic_payload.spf_bands],
                "last_scraped_at": now,
                "updated_at": now
            }
        )
        db.execute(stmt_spf)
        
        db.commit()
        
    metrics.update(parser_metrics)
    return academic_payload

@router.get("/academic-summary")
async def get_academic_summary(
    client_id: str,
    roll: str,
    db: Session = Depends(get_db),
    auth_info: dict = Depends(require_scope("read"))
):
    """
    Returns cached JNTU academic data from PostgreSQL.
    Matches legacy response format exactly.
    """
    roll_number = roll.strip().upper()
    student = db.query(models.Student).filter_by(roll_number=roll_number).first()
    
    if not student:
        return {
            "registered": False,
            "syncStatus": None,
            "lastSuccessAt": None,
            "data": None
        }
        
    if student.status == 'invalid_credentials':
        return {
            "registered": True,
            "syncStatus": "failed",
            "errorCode": "INVALID_CREDENTIALS",
            "lastSuccessAt": student.updated_at.isoformat(),
            "data": None
        }
        
    # Get cached snapshots
    attendance = db.query(models.Attendance).filter_by(roll_number=roll_number).first()
    marks = db.query(models.Mark).filter_by(roll_number=roll_number).first()
    spf = db.query(models.SpfBand).filter_by(roll_number=roll_number).first()
    
    sync_status = "queued"
    if attendance and marks:
        sync_status = "completed"
        
    data_payload = None
    if sync_status == "completed":
        # Reconstruct marks payload format
        reconstructed_marks = []
        for m in marks.exams:
            reconstructed_marks.append({
                "examId": m["examId"],
                "examLabel": m["title"],
                "scrapedAt": marks.last_scraped_at.isoformat(),
                "title": m["title"],
                "term": m["term"],
                "sgpa": m.get("sgpa"),
                "items": m["items"]
            })
            
        # Reconstruct SPF Bands payload format
        reconstructed_spf = []
        if spf:
            for b in spf.bands:
                reconstructed_spf.append({
                    "semesterLabel": b["semesterLabel"],
                    "cycle": b["cycle"],
                    "band": b["band"],
                    "academicYear": b["academicYear"],
                    "semester": b["semester"],
                    "scrapedAt": spf.last_scraped_at.isoformat()
                })
                
        data_payload = {
            "attendance": {
                "overallPercentage": float(attendance.overall_percentage) if attendance.overall_percentage else 0.0,
                "held": attendance.held or 0,
                "attended": attendance.attended or 0,
                "scrapedAt": attendance.last_scraped_at.isoformat(),
                "subjects": attendance.subjects
            },
            "marks": reconstructed_marks,
            "spfBands": reconstructed_spf
        }
        
    return {
        "registered": True,
        "syncStatus": sync_status,
        "errorCode": None,
        "lastSuccessAt": student.updated_at.isoformat(),
        "data": data_payload
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_student(
    client_id: str,
    roll: str,
    payload: schemas.ERPRegisterRequest,
    db: Session = Depends(get_db),
    auth_info: dict = Depends(require_scope("register"))
):
    """
    Saves encrypted student credentials, validates via ERP login,
    scrapes details synchronously, and updates cache tables.
    """
    roll_number = roll.strip().upper()
    if not re.match(r'^[A-Z0-9]{10}$', roll_number):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "code": "BAD_REQUEST",
                "message": "Invalid roll number format: must be 10 alphanumeric characters"
            }
        )
        
    logger.info(f"Validating ERP login credentials synchronously for student: {roll_number}")
    
    # 1. Ensure profile record is initialized
    student = db.query(models.Student).filter_by(roll_number=roll_number).first()
    if not student:
        student = models.Student(
            college_id="hitam",
            roll_number=roll_number,
            status="active"
        )
        db.add(student)
        db.flush()
        
    metrics = {}
    try:
        # Run synchronous login, scrape and DB persistence
        with log_duration("total_scrape", metrics):
            await scrape_and_persist(roll_number, payload.password, db, metrics)
            
        logger.info(f"Scraper registration completed successfully in {metrics.get('total_scrape_duration_ms')}ms")
    except ErpScraperError as erp_err:
        logger.warn(f"ERP validation failed for student {roll_number}: {erp_err.message}")
        student.status = "invalid_credentials"
        db.commit()
        
        status_code = status.HTTP_401_UNAUTHORIZED if erp_err.code == "INVALID_CREDENTIALS" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "code": erp_err.code or "BAD_REQUEST",
                "message": erp_err.message
            }
        )
    except Exception as e:
        logger.error(f"Synchronous scrape/save failed during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "code": "DATABASE_ERROR",
                "message": "Registration failed during database update"
            }
        )
        
    # Save the encrypted credentials for future refreshes using clean UPSERT
    enc_pwd = encrypt_credential(payload.password, config.EDS_ENCRYPTION_KEY, config.EDS_ENCRYPTION_KEY_VERSION)
    stmt_cred = insert(models.ErpCredential).values(
        roll_number=roll_number,
        password_enc=enc_pwd,
        key_version=config.EDS_ENCRYPTION_KEY_VERSION,
        last_validated_at=datetime.now(timezone.utc),
        invalid_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    ).on_conflict_do_update(
        constraint="erp_credentials_pkey",
        set_={
            "password_enc": enc_pwd,
            "key_version": config.EDS_ENCRYPTION_KEY_VERSION,
            "last_validated_at": datetime.now(timezone.utc),
            "invalid_at": None,
            "updated_at": datetime.now(timezone.utc)
        }
    )
    db.execute(stmt_cred)
    db.commit()
    
    return {
        "success": True,
        "message": "Student registered and initial sync completed successfully",
        "data": {
            "studentId": roll_number,
            "rollNumber": roll_number,
            "status": "completed",
            "syncJobs": {},
            "metrics": metrics
        }
    }

@router.post("/refresh", status_code=status.HTTP_202_ACCEPTED)
async def refresh_student(
    client_id: str,
    roll: str,
    db: Session = Depends(get_db),
    auth_info: dict = Depends(require_scope("refresh"))
):
    """
    Decrypts saved credentials, logs in to ERP, crawls details
    synchronously, normalizes, and updates the database cache.
    """
    roll_number = roll.strip().upper()
    student = db.query(models.Student).filter_by(roll_number=roll_number).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "code": "STUDENT_NOT_FOUND",
                "message": f"No registered student found for roll number {roll_number}"
            }
        )
        
    # Fetch student credentials
    cred = db.query(models.ErpCredential).filter_by(roll_number=roll_number).first()
    if not cred or cred.invalid_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "code": "NO_CREDENTIALS",
                "message": "No active credentials found for the student"
            }
        )
        
    # Decrypt JNTU password
    try:
        password = decrypt_credential(cred.password_enc, config.EDS_ENCRYPTION_KEY)
    except Exception as dec_err:
        logger.error(f"Failed to decrypt credentials for student {roll_number}: {str(dec_err)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "code": "DECRYPTION_FAILED",
                "message": "Internal credentials decryption failed"
            }
        )
        
    metrics = {}
    try:
        with log_duration("total_scrape", metrics):
            await scrape_and_persist(roll_number, password, db, metrics)
            
        logger.info(f"Sync refresh completed successfully in {metrics.get('total_scrape_duration_ms')}ms")
    except ErpScraperError as erp_err:
        logger.warn(f"Sync refresh failed for student {roll_number}: {erp_err.message}")
        if erp_err.code == "INVALID_CREDENTIALS":
            student.status = "invalid_credentials"
            cred.invalid_at = datetime.now(timezone.utc)
        db.commit()
        
        status_code = status.HTTP_401_UNAUTHORIZED if erp_err.code == "INVALID_CREDENTIALS" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "code": erp_err.code or "BAD_REQUEST",
                "message": erp_err.message
            }
        )
    except Exception as e:
        logger.error(f"Sync refresh execution failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "code": "SERVER_ERROR",
                "message": "Failed to scrape refresh data"
            }
        )
        
    return {
        "success": True,
        "message": "Manual refresh sync completed successfully",
        "data": {
            "syncJobs": {},
            "metrics": metrics
        }
    }

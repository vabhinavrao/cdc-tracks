from sqlalchemy import Column, Integer, String, JSON, Float, DateTime, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    roll_number = Column(String, unique=True, index=True, nullable=False)
    joining_year = Column(Integer, nullable=False)
    graduation_year = Column(Integer, nullable=False)
    admission_type = Column(String, nullable=False)
    branch = Column(String, nullable=False)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    selected_track_id = Column(String, nullable=True)
    bookmarked_tracks = Column(JSON, default=list, nullable=False)
    role = Column(String, default="student", nullable=False)
    assigned_branch = Column(String, nullable=True)
    status = Column(String, default="active", nullable=False) # active, alumni
    current_academic_year = Column(Integer, nullable=True) # 1, 2, 3, 4

    performance_records = relationship(
        "CDCPerformance",
        back_populates="student_user",
        primaryjoin="User.roll_number == CDCPerformance.roll_number",
        foreign_keys="CDCPerformance.roll_number",
        cascade="all, delete-orphan"
    )


class Track(Base):
    __tablename__ = "tracks"

    id = Column(String, primary_key=True, index=True) # The track slug
    track_name = Column(String, nullable=False)
    data = Column(JSON, nullable=False) # Stores the complete curriculum JSON structure

class CDCPerformance(Base):
    __tablename__ = "cdc_performance"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, index=True, nullable=False)
    batch_year = Column(String, default="2024-2028", nullable=False)
    academic_year = Column(Integer, default=1, nullable=False)
    name = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint('roll_number', 'academic_year', name='uq_roll_number_academic_year'),
    )
    branch = Column(String, nullable=True)
    email = Column(String, nullable=True)
    mobile = Column(String, nullable=True)
    status = Column(String, default="active", nullable=False) # active, alumni
    
    # Aggregated metrics
    participation = Column(Integer, default=0)
    consistency_score = Column(Float, default=0.0)
    avg_performance = Column(Float, default=0.0)
    cdc_grade_score = Column(Float, default=0.0)
    cie_score = Column(Float, default=0.0)
    cdc_rank = Column(Integer, nullable=True)
    cdc_band = Column(String, nullable=True) # A, B, C, D
    
    # Detailed dynamic fields
    test_scores = Column(JSON, default=dict)       # e.g. {"Test 1": 80.0, ...}
    post_assessments = Column(JSON, default=dict)  # e.g. {"Post Assessment II-I": 82.86, ...}
    domain_tracks = Column(JSON, default=dict)     # e.g. {"I-II": {"domain": "Aptitude and Reasoning", "performance": 60}, ...}

    student_user = relationship(
        "User",
        back_populates="performance_records",
        primaryjoin="CDCPerformance.roll_number == User.roll_number",
        foreign_keys="CDCPerformance.roll_number",
        uselist=False
    )

class BatchSchedule(Base):
    __tablename__ = "batch_schedules"

    id = Column(Integer, primary_key=True, index=True)
    batch_year = Column(String, unique=True, index=True, nullable=False) # e.g. "2024-2028"
    track_selection_start = Column(DateTime, nullable=True)
    track_selection_end = Column(DateTime, nullable=True)
    project_selection_start = Column(DateTime, nullable=True)
    project_selection_end = Column(DateTime, nullable=True)
    contact_email = Column(String, default="support.cdc@hitam.org", nullable=False)
    
    # Academic Year Timelines (ISO Strings or Datetimes stored)
    year_1_start = Column(String, nullable=True)
    year_1_end = Column(String, nullable=True)
    year_2_start = Column(String, nullable=True)
    year_2_end = Column(String, nullable=True)
    year_3_start = Column(String, nullable=True)
    year_3_end = Column(String, nullable=True)
    year_4_start = Column(String, nullable=True)
    year_4_end = Column(String, nullable=True)
    
    # Semester dates for current cycle
    sem_1_start = Column(String, nullable=True)
    sem_1_end = Column(String, nullable=True)
    sem_2_start = Column(String, nullable=True)
    sem_2_end = Column(String, nullable=True)

class TrackSelectionHistory(Base):
    __tablename__ = "track_selection_history"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=True)
    student_email = Column(String, nullable=True)
    batch_year = Column(String, nullable=True)
    academic_year = Column(Integer, nullable=True)
    semester = Column(String, nullable=True)
    previous_track_id = Column(String, nullable=True)
    new_track_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

class FinalisedTrack(Base):
    __tablename__ = "finalised_tracks"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, index=True, nullable=False)
    batch_year = Column(String, nullable=True)
    academic_year = Column(Integer, nullable=True)
    semester = Column(String, nullable=True)
    track_id = Column(String, nullable=True)
    finalised_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ProjectTopic(Base):
    __tablename__ = "project_topics"

    id = Column(Integer, primary_key=True, index=True)
    project_code = Column(String, index=True, nullable=False) # e.g. DT-01, DA-01, CDC-01
    track_slug = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    problem_statement = Column(String, nullable=True)
    key_objectives = Column(String, nullable=True)
    technologies = Column(String, nullable=True)
    concepts = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    is_hitam = Column(Boolean, default=False, nullable=False)

class StudentProjectSelection(Base):
    __tablename__ = "student_project_selections"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=True)
    student_email = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    track_slug = Column(String, nullable=False)
    project_id = Column(Integer, nullable=False)
    faculty_guide = Column(String, nullable=False)
    confirmed_with_faculty = Column(Boolean, default=True, nullable=False)
    selected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String, default="selected", nullable=False)

class HitamProjectRequest(Base):
    __tablename__ = "hitam_project_requests"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=True)
    student_email = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    project_id = Column(Integer, nullable=False)
    phone_number = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False) # pending, contacted, approved, rejected
    admin_notes = Column(String, nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class InternshipRequest(Base):
    __tablename__ = "internship_requests"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=True)
    student_email = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    phone_number = Column(String, nullable=False)
    
    # Section B: Internship Details
    company_name = Column(String, nullable=False)
    company_website = Column(String, nullable=True)
    internship_obtained_through = Column(String, nullable=True)
    internship_domain = Column(String, nullable=True)
    internship_mode = Column(String, nullable=True) # Online, Offline, Hybrid
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    total_duration = Column(String, nullable=True) # e.g. "3 months"
    internship_location = Column(String, nullable=True)
    stipend = Column(String, nullable=True)
    ppo_offered = Column(String, nullable=True) # Yes/No
    expected_ctc = Column(String, nullable=True)
    
    # Section C: Company SPOC Details
    spoc_name = Column(String, nullable=True)
    spoc_designation = Column(String, nullable=True)
    spoc_email = Column(String, nullable=True)
    spoc_phone = Column(String, nullable=True)
    
    # Section D: Student Section field
    section = Column(String, nullable=True)
    
    # Approval Workflow
    status = Column(String, default="pending", nullable=False) # pending, contacted, approved, rejected
    admin_notes = Column(String, nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class GoogleSheetConnection(Base):
    __tablename__ = "google_sheet_connections"

    id = Column(Integer, primary_key=True, index=True)
    batch_year = Column(String, nullable=False) # e.g. "2024-2028"
    academic_year = Column(Integer, nullable=False) # e.g. 1, 2, 3, 4
    sheet_type = Column(String, nullable=False) # "overall_marks" or "domain_info"
    sheet_url = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced = Column(DateTime, nullable=True)
    sync_status = Column(String, nullable=True) # "success", "failed", "syncing"
    sync_message = Column(String, nullable=True)
    test_mappings = Column(JSON, default=dict, nullable=True)
    column_mappings = Column(JSON, default=dict, nullable=True)


class DetainedStudent(Base):
    __tablename__ = "detained_students"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, unique=True, index=True, nullable=False)
    detained_to_batch = Column(String, nullable=False) # e.g. "2025-2029"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)






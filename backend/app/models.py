from sqlalchemy import Column, Integer, String, JSON, Float, DateTime, Boolean
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


class Track(Base):
    __tablename__ = "tracks"

    id = Column(String, primary_key=True, index=True) # The track slug
    track_name = Column(String, nullable=False)
    data = Column(JSON, nullable=False) # Stores the complete curriculum JSON structure

class CDCPerformance(Base):
    __tablename__ = "cdc_performance"

    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String, unique=True, index=True, nullable=False)
    batch_year = Column(String, default="2024-2028", nullable=False)
    name = Column(String, nullable=True)
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

class BatchSchedule(Base):
    __tablename__ = "batch_schedules"

    id = Column(Integer, primary_key=True, index=True)
    batch_year = Column(String, unique=True, index=True, nullable=False) # e.g. "2024-2028"
    track_selection_start = Column(DateTime, nullable=True)
    track_selection_end = Column(DateTime, nullable=True)
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



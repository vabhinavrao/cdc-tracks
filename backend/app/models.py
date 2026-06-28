# backend/app/models.py
from sqlalchemy import Column, Integer, String, JSON, Float
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


import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, JSON, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class ApiClient(Base):
    __tablename__ = "api_clients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")
    daily_quota = Column(Integer, nullable=False, default=10000)
    rpm_limit = Column(Integer, nullable=False, default=60)
    scrape_quota_day = Column(Integer, nullable=False, default=500)
    client_metadata = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("api_clients.id", ondelete="CASCADE"), nullable=False)
    key_prefix = Column(String, nullable=False, index=True)
    key_hash = Column(String, nullable=False, unique=True)
    scopes = Column(JSON, nullable=False, default=lambda: ["read", "register", "refresh"])
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())

class Student(Base):
    __tablename__ = "students"
    
    roll_number = Column(String, primary_key=True)
    college_id = Column(String, nullable=False, default="hitam")
    name = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    program = Column(String, nullable=True, default="B.Tech")
    regulation = Column(String, nullable=True)
    current_semester = Column(String, nullable=True)
    cgpa = Column(Numeric(4, 2), nullable=True)
    cgpa_credits = Column(String, nullable=True)
    cgpa_percentage = Column(Numeric(5, 2), nullable=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())

class ErpCredential(Base):
    __tablename__ = "erp_credentials"
    
    roll_number = Column(String, ForeignKey("students.roll_number", ondelete="CASCADE"), primary_key=True)
    password_enc = Column(String, nullable=False)
    key_version = Column(Integer, nullable=False, default=1)
    last_validated_at = Column(DateTime(timezone=True), nullable=True)
    invalid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())

class Attendance(Base):
    __tablename__ = "attendance"
    
    roll_number = Column(String, ForeignKey("students.roll_number", ondelete="CASCADE"), primary_key=True)
    semester_label = Column(String, nullable=True)
    overall_percentage = Column(Numeric(5, 2), nullable=True)
    held = Column(Integer, nullable=True)
    attended = Column(Integer, nullable=True)
    subjects = Column(JSON, nullable=False, default=list)
    previous_semesters = Column(JSON, nullable=False, default=list)
    last_scraped_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())

class Mark(Base):
    __tablename__ = "marks"
    
    roll_number = Column(String, ForeignKey("students.roll_number", ondelete="CASCADE"), primary_key=True)
    exams = Column(JSON, nullable=False, default=list)
    cgpa = Column(Numeric(4, 2), nullable=True)
    cgpa_credits = Column(String, nullable=True)
    cgpa_percentage = Column(Numeric(5, 2), nullable=True)
    last_scraped_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())

class SpfBand(Base):
    __tablename__ = "spf_bands"
    
    roll_number = Column(String, ForeignKey("students.roll_number", ondelete="CASCADE"), primary_key=True)
    bands = Column(JSON, nullable=False, default=list)
    last_scraped_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), onupdate=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String, nullable=True)
    client_id = Column(UUID(as_uuid=True), nullable=True)
    api_key_id = Column(UUID(as_uuid=True), nullable=True)
    method = Column(String, nullable=False)
    path = Column(String, nullable=False)
    roll_number = Column(String, nullable=True)
    status_code = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    ip_hash = Column(String, nullable=True)
    meta = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())

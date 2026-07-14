import os
import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app import models, schemas

@pytest.fixture(scope="function")
def test_db_setup():
    # Generate a unique db file for this test execution
    db_file = f"test_refactor_{uuid.uuid4().hex}.db"
    db_url = f"sqlite:///{db_file}"
    
    # Create engine with check_same_thread=False
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    
    # Enforce foreign keys in SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    yield TestingSessionLocal, engine
    
    # Dispose engine to close all pool connections before deleting file
    engine.dispose()
    
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except OSError:
            pass

def test_mvp_schema_constraints(test_db_setup):
    TestingSessionLocal, _ = test_db_setup
    db = TestingSessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        # 1. Create student
        student = models.Student(
            roll_number="25E51A05V0",
            name="TEST STUDENT",
            branch="CSE",
            program="B.Tech"
        )
        db.add(student)
        db.commit()
        
        # Verify FK constraints on child tables
        # 2. Add credential
        cred = models.ErpCredential(
            roll_number="25E51A05V0",
            password_enc="some_encrypted_password"
        )
        db.add(cred)
        
        # 3. Add attendance snapshot
        att = models.Attendance(
            roll_number="25E51A05V0",
            overall_percentage=85.50,
            held=100,
            attended=85,
            subjects=[],
            previous_semesters=[],
            last_scraped_at=now
        )
        db.add(att)
        
        # 4. Add marks snapshot (replicated CGPA)
        marks = models.Mark(
            roll_number="25E51A05V0",
            exams=[],
            cgpa=8.55,
            cgpa_credits="20/20",
            cgpa_percentage=78.0,
            last_scraped_at=now
        )
        db.add(marks)
        
        # 5. Add SPF snapshot
        spf = models.SpfBand(
            roll_number="25E51A05V0",
            bands=[],
            last_scraped_at=now
        )
        db.add(spf)
        db.commit()
        
        # Verify count of rows
        assert db.query(models.Student).count() == 1
        assert db.query(models.ErpCredential).count() == 1
        assert db.query(models.Attendance).count() == 1
        assert db.query(models.Mark).count() == 1
        assert db.query(models.SpfBand).count() == 1
        
        # Assert Primary Keys and relationships
        att_record = db.query(models.Attendance).filter_by(roll_number="25E51A05V0").first()
        assert att_record.overall_percentage == 85.50
        
        # Verify cascade deletes: dropping student deletes all references
        db.delete(student)
        db.commit()
        
        assert db.query(models.Student).count() == 0
        assert db.query(models.ErpCredential).count() == 0
        assert db.query(models.Attendance).count() == 0
        assert db.query(models.Mark).count() == 0
        assert db.query(models.SpfBand).count() == 0
        
    finally:
        db.close()

def test_upsert_logic_and_summary_endpoint(test_db_setup):
    TestingSessionLocal, _ = test_db_setup
    db = TestingSessionLocal()
    try:
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from app.database import get_db
        from app.main import app
        
        # Override get_db for TestClient to yield our test db session
        def override_get_db():
            try:
                yield db
            finally:
                pass
                
        app.dependency_overrides[get_db] = override_get_db
        
        # Create student profile
        student = models.Student(
            roll_number="25E51A05V0",
            name="TEST STUDENT",
            branch="CSE",
            program="B.Tech"
        )
        db.add(student)
        db.commit()
        
        # Use FastAPI TestClient to test GET /academic-summary before scraping
        client = TestClient(app)
        # Mock auth dependency
        from app.api import dependencies
        app.dependency_overrides[dependencies.verify_api_key] = lambda: {"scopes": ["read", "register", "refresh"]}
        
        response = client.get("/v1/clients/cdc/students/25E51A05V0/academic-summary")
        assert response.status_code == 200
        assert response.json()["registered"] is True
        assert response.json()["syncStatus"] == "queued"
        
        # Seed cache snapshots directly representing scraped state
        now = datetime.now(timezone.utc)
        
        # Seeding Attendance
        att = models.Attendance(
            roll_number="25E51A05V0",
            overall_percentage=84.00,
            held=100,
            attended=84,
            subjects=[{"name": "DM", "held": 10, "attended": 9, "percentage": 90.0}],
            previous_semesters=[],
            last_scraped_at=now
        )
        db.add(att)
        
        # Seeding Marks
        marks = models.Mark(
            roll_number="25E51A05V0",
            exams=[{
                "examId": "EXTERNAL-I-I",
                "title": "External Marks",
                "term": "I/IV B.Tech I Semester",
                "sgpa": 8.55,
                "items": [{"name": "MAC", "scored": None, "grade": "A+", "credits": "4.0"}]
            }],
            cgpa=8.55,
            cgpa_credits="20/20",
            cgpa_percentage=78.0,
            last_scraped_at=now
        )
        db.add(marks)
        db.commit()
        
        # Query GET /academic-summary after seeding
        response2 = client.get("/v1/clients/cdc/students/25E51A05V0/academic-summary")
        assert response2.status_code == 200
        res_data = response2.json()
        assert res_data["syncStatus"] == "completed"
        assert res_data["data"]["attendance"]["overallPercentage"] == 84.0
        assert res_data["data"]["marks"][0]["examId"] == "EXTERNAL-I-I"
        assert res_data["data"]["marks"][0]["sgpa"] == 8.55
        
        # Clear overrides
        app.dependency_overrides.clear()
    finally:
        db.close()

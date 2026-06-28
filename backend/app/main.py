# backend/app/main.py
import os
import json
import glob
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models import Track
from app.routes import auth, student, admin

app = FastAPI(title="HITAM Student Track Explorer API")

# Configure CORS so the React frontend can fetch from the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev simplicity, allow all. In production, restrict to frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(admin.router)

def generate_slug(name: str) -> str:
    """Helper to generate URL-friendly slugs, mirroring the frontend's trackLoader.js logic"""
    if not name:
        return "unknown-track"
    # Convert to lowercase
    slug = name.lower()
    # Replace non-alphanumeric characters with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Trim leading/trailing hyphens
    slug = slug.strip('-')
    return slug

@app.on_event("startup")
def startup_event():
    # 1. Create database tables
    Base.metadata.create_all(bind=engine)
    
    # 1.5 Try to add new columns if the table already existed previously
    db = SessionLocal()
    user_cols = ["name VARCHAR", "picture VARCHAR", "role VARCHAR DEFAULT 'student'", "assigned_branch VARCHAR", "status VARCHAR DEFAULT 'active'", "current_academic_year INTEGER"]
    for col_def in user_cols:
        try:
            from sqlalchemy import text
            db.execute(text(f"ALTER TABLE users ADD COLUMN {col_def}"))
            db.commit()
        except Exception:
            db.rollback()

    cdc_cols = ["status VARCHAR DEFAULT 'active'"]
    for col_def in cdc_cols:
        try:
            from sqlalchemy import text
            db.execute(text(f"ALTER TABLE cdc_performance ADD COLUMN {col_def}"))
            db.commit()
        except Exception:
            db.rollback()

    # 1.5.1 Ensure default BatchSchedule exists and has clean timestamps
    try:
        from app.models import BatchSchedule
        from datetime import datetime, timedelta
        schedules = db.query(BatchSchedule).all()
        if not schedules:
            now = datetime.utcnow()
            start_dt = (now - timedelta(days=5)).replace(hour=0, minute=0, second=0)
            end_dt = (now + timedelta(days=30)).replace(hour=23, minute=59, second=59)
            new_bs = BatchSchedule(
                batch_year="2024-2028",
                track_selection_start=start_dt,
                track_selection_end=end_dt,
                contact_email="support.cdc@hitam.org",
                year_1_start="2024-08-01", year_1_end="2025-05-31",
                year_2_start="2025-08-01", year_2_end="2026-05-31",
                year_3_start="2026-08-01", year_3_end="2027-05-31",
                year_4_start="2027-08-01", year_4_end="2028-05-31",
                sem_1_start="2026-08-01", sem_1_end="2026-12-31",
                sem_2_start="2027-01-15", sem_2_end="2027-05-31"
            )
            db.add(new_bs)
        else:
            for s in schedules:
                if s.track_selection_start:
                    s.track_selection_start = s.track_selection_start.replace(hour=0, minute=0, second=0)
                if s.track_selection_end:
                    s.track_selection_end = s.track_selection_end.replace(hour=23, minute=59, second=59)
        db.commit()
    except Exception as e:
        print(f"Default batch schedule notice: {e}")
        db.rollback()


    # 1.6 Seed CDC Performance data

    try:
        from app.services.cdc_service import seed_cdc_performance_data
        seed_cdc_performance_data(db)
        
        # Also attempt live Google Sheets sync if credentials exist
        from app.services.google_sheets_sync import sync_live_google_sheets
        s1 = os.getenv("GOOGLE_SHEET_1_URL", "https://docs.google.com/spreadsheets/d/1U5X1r6ZQv4LH2WEEvmh3bEE4voOdqsIw3YG7DbpivAc/edit?gid=0#gid=0")
        s2 = os.getenv("GOOGLE_SHEET_2_URL", "https://docs.google.com/spreadsheets/d/1yEZgkE2egyQqF67Vzh6LGdjTgh1zXqyjhNcQV38JUTU/edit?gid=0#gid=0")
        res = sync_live_google_sheets(db, s1, s2)
        print(f"Startup Google Sheets sync result: {res}")
    except Exception as e:
        print(f"CDC seeding notice: {e}")
        db.rollback()
        
    # 2. Seed Track data from frontend JSON files
    try:
        # Determine the relative path to frontend track JSON files
        current_dir = os.path.dirname(os.path.abspath(__file__))
        json_pattern = os.path.abspath(os.path.join(current_dir, "../../frontend/src/data/track-json/*.json"))
        
        json_files = glob.glob(json_pattern)
        if not json_files:
            print(f"Warning: No track JSON files found at path: {json_pattern}")
            return
            
        print(f"Seeding database with {len(json_files)} track(s) from JSON files...")
        
        for file_path in json_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    track_data = json.load(f)
                    
                track_name = track_data.get("track_name")
                if not track_name:
                    continue
                    
                track_id = generate_slug(track_name)
                
                # Check if this track already exists
                existing_track = db.query(Track).filter(Track.id == track_id).first()
                
                # Inject slug into track data to match frontend expectations
                track_data["slug"] = track_id
                
                if existing_track:
                    # Update existing track data
                    existing_track.track_name = track_name
                    existing_track.data = track_data
                else:
                    # Insert new track
                    new_track = Track(
                        id=track_id,
                        track_name=track_name,
                        data=track_data
                    )
                    db.add(new_track)
            except Exception as e:
                print(f"Error seeding track from {file_path}: {e}")
                
        db.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        print(f"Failed to seed tracks database on startup: {e}")
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "HITAM Student Track Explorer API is running."}

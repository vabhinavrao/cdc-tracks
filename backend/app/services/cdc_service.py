# backend/app/services/cdc_service.py
from sqlalchemy.orm import Session
from app.models import CDCPerformance, User

SEED_CDC_RECORDS = [
    {
        "roll_number": "23E51A6675",
        "name": "MIDIMILLA LAXMI BALAJI THARUN",
        "branch": "CSM",
        "email": "23E51A6675@hitam.org",
        "mobile": "9100214018",
        "participation": 10,
        "consistency_score": 33.33,
        "avg_performance": 80.38,
        "cdc_grade_score": 61.6,
        "cie_score": 3.08,
        "cdc_rank": 426,
        "cdc_band": "B",
        "post_assessments": {
            "Post Assessment II-I": 82.86,
            "Post Assessment II-II": 82.5
        },
        "domain_tracks": {
            "I-II": {"domain": "Aptitude and Reasoning", "performance": 60.0},
            "II-I": {"domain": "App Development", "performance": 82.86},
            "II-II": {"domain": "App Development", "performance": 82.5}
        },
        "test_scores": {
            "Test 6": 86.67,
            "Test 9": 82.86,
            "Test 11": 40.0,
            "Test 12": 80.0,
            "Test 13": 80.0,
            "Test 14": 82.50,
            "Test 15": 94.29,
            "Test 16": 85.0,
            "Test 20": 90.0,
            "Test 23": 82.50
        }
    },
    {
        "roll_number": "23E51A0522",
        "name": "BANOTHU NAVEEN",
        "branch": "CSE",
        "email": "23E51A0522@hitam.org",
        "mobile": "8341051727",
        "participation": 17,
        "consistency_score": 58.62,
        "avg_performance": 69.37,
        "cdc_grade_score": 65.1,
        "cie_score": 3.25,
        "cdc_rank": 337,
        "cdc_band": "B",
        "post_assessments": {
            "Post Assessment II-I": 92.86,
            "Post Assessment II-II": 67.50
        },
        "domain_tracks": {
            "I-II": {"domain": "Aptitude and Reasoning", "performance": 75.0},
            "II-I": {"domain": "Web Development", "performance": 92.86},
            "II-II": {"domain": "AI & ML", "performance": 67.50}
        },
        "test_scores": {
            "Test 3": 70.0,
            "Test 4": 0.0,
            "Test 6": 72.5,
            "Test 9": 92.86,
            "Test 11": 60.0,
            "Test 16": 42.5,
            "Test 20": 87.5,
            "Test 21": 0.0,
            "Test 22": 22.5,
            "Test 23": 67.5,
            "Test 24": 87.5,
            "Test 25": 95.0,
            "Test 26": 98.75,
            "Test 27": 97.5,
            "Test 28": 95.71,
            "Test 29": 89.43,
            "Test 30": 100.0
        }
    },
    {
        "roll_number": "23E51A0541",
        "name": "DASARI SRUJANA",
        "branch": "CSE",
        "email": "23E51A0541@hitam.org",
        "mobile": "7396994861",
        "participation": 6,
        "consistency_score": 20.0,
        "avg_performance": 81.53,
        "cdc_grade_score": 56.9,
        "cie_score": 2.85,
        "cdc_rank": 523,
        "cdc_band": "C",
        "post_assessments": {
            "Post Assessment II-I": 85.0,
            "Post Assessment II-II": 42.5
        },
        "domain_tracks": {
            "I-II": {"domain": "Aptitude and Reasoning", "performance": 65.0},
            "II-I": {"domain": "Cybersecurity", "performance": 85.0},
            "II-II": {"domain": "Data Analytics", "performance": 42.5}
        },
        "test_scores": {
            "Test 1": 80.0,
            "Test 3": 86.67,
            "Test 5": 100.0,
            "Test 6": 95.0,
            "Test 9": 85.0,
            "Test 23": 42.5
        }
    },
    {
        "roll_number": "23E51A0306",
        "name": "SURAPURAJU YUVARAJU",
        "branch": "MECH",
        "email": "23E51A0306@hitam.org",
        "mobile": "9505936588",
        "participation": 2,
        "consistency_score": 6.67,
        "avg_performance": 25.0,
        "cdc_grade_score": 17.7,
        "cie_score": 0.88,
        "cdc_rank": 789,
        "cdc_band": "D",
        "post_assessments": {
            "Post Assessment II-I": 25.0,
            "Post Assessment II-II": 0.0
        },
        "domain_tracks": {
            "I-II": {"domain": "Mechanical Design", "performance": 40.0},
            "II-I": {"domain": "CAD & Automation", "performance": 25.0},
            "II-II": {"domain": "Robotics", "performance": 0.0}
        },
        "test_scores": {
            "Test 9": 25.0,
            "Test 10": 25.0
        }
    }
]

from sqlalchemy import func

def seed_cdc_performance_data(db: Session):
    """
    Seeds initial CDC performance data into the database.
    Also links mock records to logged-in users if needed.
    """
    for record in SEED_CDC_RECORDS:
        existing = db.query(CDCPerformance).filter(CDCPerformance.roll_number == record["roll_number"]).first()
        if not existing:
            cdc_obj = CDCPerformance(**record)
            db.add(cdc_obj)
    
    db.commit()

def get_cdc_performance_by_roll(db: Session, roll_number: str, email: str = None, academic_year: int = None):
    """
    Retrieves CDC performance record for a given roll number or email case-insensitively.
    If academic_year is provided, returns that specific year, otherwise returns the latest year available.
    """
    if not roll_number and not email:
        return None

    clean_roll = (roll_number or "").strip().upper()
    clean_email = (email or "").strip().lower()

    # Import func if needed
    from sqlalchemy import func

    query = db.query(CDCPerformance)
    if clean_roll:
        query = query.filter(func.upper(CDCPerformance.roll_number) == clean_roll)
    elif clean_email:
        query = query.filter(func.lower(CDCPerformance.email) == clean_email)
    else:
        return None

    if academic_year is not None:
        query = query.filter(CDCPerformance.academic_year == academic_year)
    else:
        query = query.order_by(CDCPerformance.academic_year.desc())

    return query.first()


def calculate_ranks(db: Session, student_record: CDCPerformance):
    """
    Calculates batch_rank and branch_rank for a student record based on cdc_rank.
    """
    if not student_record:
        return {
            "batch_rank": None,
            "branch_rank": None,
            "batch_students": 0,
            "branch_students": 0
        }

    batch_students = db.query(CDCPerformance).filter(
        CDCPerformance.batch_year == student_record.batch_year,
        CDCPerformance.academic_year == student_record.academic_year
    ).count()
    branch_students = db.query(CDCPerformance).filter(
        CDCPerformance.batch_year == student_record.batch_year,
        CDCPerformance.academic_year == student_record.academic_year,
        func.upper(CDCPerformance.branch) == func.upper(student_record.branch)
    ).count()

    if student_record.cdc_rank is None:
        return {
            "batch_rank": None,
            "branch_rank": None,
            "batch_students": batch_students,
            "branch_students": branch_students
        }

    batch_rank = db.query(CDCPerformance).filter(
        CDCPerformance.batch_year == student_record.batch_year,
        CDCPerformance.academic_year == student_record.academic_year,
        CDCPerformance.cdc_rank < student_record.cdc_rank
    ).count() + 1

    branch_rank = db.query(CDCPerformance).filter(
        CDCPerformance.batch_year == student_record.batch_year,
        CDCPerformance.academic_year == student_record.academic_year,
        func.upper(CDCPerformance.branch) == func.upper(student_record.branch),
        CDCPerformance.cdc_rank < student_record.cdc_rank
    ).count() + 1

    return {
        "batch_rank": batch_rank,
        "branch_rank": branch_rank,
        "batch_students": batch_students,
        "branch_students": branch_students
    }


def get_branch_ranks_map(db: Session, batch_year: str = None, academic_year: int = None):
    """
    Computes absolute branch ranks for all students in the database.
    Returns a dictionary mapping (roll_number, academic_year) to its branch rank.
    """
    query = db.query(
        CDCPerformance.roll_number,
        CDCPerformance.branch,
        CDCPerformance.batch_year,
        CDCPerformance.academic_year,
        CDCPerformance.cdc_rank
    )
    if batch_year and batch_year.upper() != "ALL":
        query = query.filter(CDCPerformance.batch_year == batch_year)
    if academic_year is not None:
        query = query.filter(CDCPerformance.academic_year == academic_year)
        
    all_records = query.all()

    # Group by (batch_year, academic_year, branch)
    by_group = {}
    for roll, branch, batch, acad_yr, rank in all_records:
        key = (batch, acad_yr, (branch or "").upper())
        if key not in by_group:
            by_group[key] = []
        by_group[key].append((roll, rank))

    # Sort each group by rank ascending (treating None as infinity)
    branch_ranks = {}
    for key, members in by_group.items():
        members.sort(key=lambda x: x[1] if x[1] is not None else 999999)
        for idx, (roll, rank) in enumerate(members):
            branch_ranks[(roll, key[1])] = idx + 1

    return branch_ranks

def get_test_mappings(db: Session, batch_year: str, academic_year: int) -> dict:
    """
    Retrieves the test name mappings from the overall marks sheet connection.
    """
    from app.models import GoogleSheetConnection
    connection = db.query(GoogleSheetConnection).filter(
        GoogleSheetConnection.batch_year == batch_year,
        GoogleSheetConnection.academic_year == academic_year,
        GoogleSheetConnection.sheet_type == "overall_marks"
    ).first()
    
    if connection and connection.test_mappings:
        return connection.test_mappings
        
    # Fallback to any connection's test_mappings if specific is not found
    fallback = db.query(GoogleSheetConnection).filter(
        GoogleSheetConnection.sheet_type == "overall_marks"
    ).first()
    if fallback and fallback.test_mappings:
        return fallback.test_mappings
        
    return {}



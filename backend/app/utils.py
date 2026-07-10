# backend/app/utils.py
import re
from datetime import datetime

def parse_roll_number(email: str) -> dict:
    """
    Parses a student's roll number from their @hitam.org email address.
    
    Exact rule logic:
      - Positions 1-2: Year of Joining (Convert to full year, e.g. 24 -> 2024. Graduation year is joining + 4).
      - Position 5: Admission Type (1 = Regular, 5 = Lateral Entry).
      - Positions 7-8: Branch Code Mapping (02=EEE, 03=MECH, 04=ECE, 05=CSE, 66=CSE AI/ML, 67=CSE Data Science).
    """
    email = email.strip().lower()
    if not email.endswith("@hitam.org"):
        raise ValueError("Email domain must be @hitam.org")
    
    roll_number = email.split("@")[0].upper()
    
    # HITAM student roll numbers are standard JNTU roll numbers, e.g., 24121A0501 (10 characters)
    # Positions: 1-indexed. So position 1 is index 0.
    if len(roll_number) != 10:
        raise ValueError("Invalid student roll number length. Must be exactly 10 characters.")
    
    # 1. Admission Type (position 5, index 4)
    admission_char = roll_number[4]
    if admission_char == '1':
        admission_type = "Regular"
    elif admission_char == '5':
        admission_type = "Lateral Entry"
    else:
        admission_type = f"Unknown ({admission_char})"

    # 2. Joining & Graduation Year (positions 1-2, index 0-1)
    try:
        joining_digits = int(roll_number[0:2])
        raw_year = 2000 + joining_digits
        if admission_type == "Lateral Entry":
            # Direct join to 2nd year. Grad year is raw_year + 3. Cohort starting year is raw_year - 1.
            graduation_year = raw_year + 3
            joining_year = raw_year - 1
        else:
            graduation_year = raw_year + 4
            joining_year = raw_year
    except ValueError:
        raise ValueError("Could not parse joining year from roll number.")
        
    # 3. Branch Code Mapping (positions 7-8, index 6-7)
    branch_code = roll_number[6:8]
    branch_mapping = {
        "02": "EEE",
        "03": "MECH",
        "04": "ECE",
        "05": "CSE",
        "66": "CSE AI/ML",
        "67": "CSE Data Science"
    }
    branch = branch_mapping.get(branch_code, f"Unknown ({branch_code})")
    
    return {
        "roll_number": roll_number,
        "joining_year": joining_year,
        "graduation_year": graduation_year,
        "admission_type": admission_type,
        "branch": branch
    }

def calculate_current_year(joining_year: int) -> int:
    """
    Calculates the current academic year of a student based on their joining year
    and the current system date, assuming the academic year shifts in June.
    """
    now = datetime.now()
    year_diff = now.year - joining_year
    
    # Academic year transitions in June (month 6)
    if now.month >= 6:
        current_year = year_diff + 1
    else:
        current_year = year_diff
        
    # Standard engineering courses are 4 years, cap it between 1 and 4.
    return max(1, min(4, current_year))

DOMAIN_TO_TRACK_ID = {
    "Data Analyst / Data Scientist / AI/ML Engineer": "data-analyst-data-scientist-ai-ml-engineer",
    "Full Stack Developer": "full-stack-developer",
    "Software Engineer / Developer": "software-engineer-software-developer",
    "Cloud / DevOps / Security Engineer": "cloud-engineer-devops-engineer-cyber-security-engineer",
    "VLSI / Semiconductor Engineer": "vlsi-semiconductor-engineer",
    "Embedded Systems / IoT Design Engineer": "embedded-system-iot-design-engineer",
    "Design / CAE / Manufacturing Engineer": "design-cae-manufacturing-engineer",
    "EV / Industrial Automation Engineer": "ev-power-systems-automation-engineer"
}

def get_auto_allocated_track_id(db, roll_number: str):
    """
    Looks up a student's auto-allocated track from finalised_tracks or cdc_performance.
    """
    if not roll_number:
        return None
    from sqlalchemy import func
    from app.models import FinalisedTrack, CDCPerformance
    
    roll_clean = roll_number.strip().upper()
    
    # 1. Check FinalisedTrack
    fin = db.query(FinalisedTrack).filter(func.upper(FinalisedTrack.roll_number) == roll_clean).first()
    if fin and fin.track_id:
        return fin.track_id
        
    # 2. Check CDCPerformance domain_tracks
    cdc = db.query(CDCPerformance).filter(
        func.upper(CDCPerformance.roll_number) == roll_clean
    ).order_by(CDCPerformance.academic_year.desc()).first()
    if cdc and cdc.domain_tracks:
        for sem in ["III-I", "II-II", "II-I", "I-II"]:
            sem_info = cdc.domain_tracks.get(sem)
            if isinstance(sem_info, dict) and sem_info.get("domain"):
                dom_name = str(sem_info.get("domain")).strip()
                if dom_name in DOMAIN_TO_TRACK_ID:
                    return DOMAIN_TO_TRACK_ID[dom_name]
    return None


import re
from bs4 import BeautifulSoup
from app.scraper.parsers.profile import extract_student_name

def is_malformed_subject_name(value: str) -> bool:
    cleaned = re.sub(r'\s+', ' ', str(value or '')).strip()
    if not cleaned:
        return True
    if len(cleaned) > 120:
        return True
        
    compact = re.sub(r'[^A-Z0-9]', '', cleaned.upper())
    header_tokens = ['SLNO', 'SNO', 'SUBJECT', 'HELD', 'ATTEND', 'TOTAL']
    header_hits = sum(1 for token in header_tokens if token in compact)
    
    if header_hits >= 2 and any(char.isdigit() for char in compact) and len(cleaned) > 24:
        return True
    return False

def parse_attendance(html: str) -> dict:
    soup = BeautifulSoup(html, 'html.parser')
    
    held = 0
    attended = 0
    found_total = False
    subjects = []
    
    for row in soup.find_all('tr'):
        cells = row.find_all('td')
        if len(cells) < 3:
            continue
            
        first_text = cells[0].get_text(strip=True).upper()
        if not first_text:
            continue
            
        nums = []
        for i, cell in enumerate(cells):
            if i == 0:
                continue
            try:
                n = int(cell.get_text(strip=True))
                if n >= 0:
                    nums.append(n)
            except ValueError:
                pass
                
        if first_text == 'TOTAL':
            if len(nums) >= 2:
                held = nums[0]
                attended = nums[1]
                found_total = True
        elif len(nums) >= 2 and first_text not in ['S.NO', 'SUBJECT', 'SUBJECTS']:
            name = cells[0].get_text(strip=True)
            if name.isdigit() and len(cells) > 3:
                name = cells[1].get_text(strip=True)
            name = re.sub(r'\s+', ' ', name).strip()
            
            if not is_malformed_subject_name(name) and len(name) > 1:
                subj_held = nums[0]
                subj_attended = nums[1]
                percentage = round((subj_attended / subj_held) * 100, 2) if subj_held > 0 else 0.0
                subjects.append({
                    "name": name,
                    "held": subj_held,
                    "attended": subj_attended,
                    "percentage": percentage
                })
                
    if not found_total:
        if 'Database error' in html or 'No attendance tables' in html:
            return {
                "termLabel": None,
                "overallPercentage": 0.0,
                "subjects": [],
                "held": 0,
                "attended": 0,
                "studentName": None,
                "erpDbError": True
            }
        preview = re.sub(r'\s+', ' ', soup.get_text()).strip()[:200]
        raise ValueError(f"TOTAL row not found in attendance response. Preview: '{preview}'")
        
    student_name = extract_student_name(soup)
    overall_percentage = round((attended / held) * 100, 2) if held > 0 else 0.0
    
    return {
        "termLabel": None,
        "overallPercentage": overall_percentage,
        "subjects": subjects,
        "held": held,
        "attended": attended,
        "studentName": student_name,
        "erpDbError": False
    }

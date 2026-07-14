import re
from bs4 import BeautifulSoup
from app.scraper.parsers.profile import extract_current_semester_label

def parse_term_label(label: str) -> dict:
    normalized = re.sub(r'\s+', ' ', (label or '').upper()).strip()
    
    roman_patterns = [
        ('IV/IV', 4),
        ('III/IV', 3),
        ('II/IV', 2),
        ('I/IV', 1)
    ]
    academic_year = None
    for pattern, year in roman_patterns:
        if pattern in normalized:
            academic_year = year
            break
            
    semester = None
    sem_2 = ['II SEMESTER', '2 SEMESTER', '2ND SEMESTER']
    sem_1 = ['I SEMESTER', '1 SEMESTER', '1ST SEMESTER']
    
    if any(p in normalized for p in sem_2):
        semester = 2
    elif any(p in normalized for p in sem_1):
        semester = 1
        
    return {"academicYear": academic_year, "semester": semester}

def parse_marks_data(html: str) -> dict:
    soup = BeautifulSoup(html, 'html.parser')
    
    result = {
        "externalMarks": [],
        "internalMarks": []
    }
    
    # 1. Extract External Marks
    ext_header_el = None
    for el in soup.find_all(['span', 'td', 'b', 'center', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div']):
        txt = el.get_text(strip=True).upper()
        if txt == 'EXTERNAL MARKS':
            ext_header_el = el
            break
            
    if ext_header_el:
        # Find index boundaries to parse only external marks section (before previous semesters attendance starts)
        ext_start_idx = html.find('EXTERNAL MARKS')
        att_start_idx = html.find('PREVIOUS SEMESTERS ATTENDANCE')
        
        ext_html = html[ext_start_idx:att_start_idx] if att_start_idx > 0 else html[ext_start_idx:]
        ext_soup = BeautifulSoup(ext_html, 'html.parser')
        
        for span in ext_soup.find_all(class_=re.compile(r'reportHeading2')):
            label = re.sub(r'\u00a0', ' ', span.get_text(strip=True))
            if 'semester' not in label.lower():
                continue
                
            # Find next table sibling
            table = None
            curr = span
            while curr:
                curr = curr.next_sibling
                if curr and curr.name == 'table':
                    table = curr
                    break
                elif curr and curr.name == 'span' and 'reportHeading2' in curr.get('class', []):
                    # Stopped at next semester heading
                    break
                    
            if not table:
                continue
                
            rows = table.find_all('tr')
            if len(rows) < 2:
                continue
                
            headers = [cell.get_text(strip=True) for cell in rows[0].find_all('td')]
            grades = [cell.get_text(strip=True) for cell in rows[1].find_all('td')]
            
            credits = []
            if len(rows) > 2:
                credits = [cell.get_text(strip=True) for cell in rows[2].find_all('td')]
                
            sgpa = None
            sgpa_idx = -1
            for idx, h in enumerate(headers):
                if h.upper() == 'SGPA':
                    sgpa_idx = idx
                    break
            
            if sgpa_idx >= 0 and sgpa_idx < len(grades):
                try:
                    sgpa = float(grades[sgpa_idx]) if grades[sgpa_idx] else None
                except ValueError:
                    sgpa = None
                    
            subjects = []
            for i in range(1, len(headers)):
                name = headers[i]
                if not name or name.upper() == 'SGPA':
                    continue
                
                grade_val = grades[i] if i < len(grades) else None
                credit_val = credits[i] if i < len(credits) else None
                
                subjects.append({
                    "name": name,
                    "grade": grade_val,
                    "credits": credit_val
                })
                
            result["externalMarks"].append({
                "semesterLabel": label,
                "sgpa": sgpa,
                "subjects": subjects
            })

    # 2. Extract Previous Semester Internal Marks
    int_header_cell = None
    for el in soup.find_all(['td', 'b']):
        txt = el.get_text(strip=True).upper()
        if 'PREVIOUS SEMESTERS INTERNAL MARKS' in txt:
            int_header_cell = el
            break
            
    if int_header_cell:
        # Traverse rows inside parent tables
        parent_row = int_header_cell.find_parent('tr')
        if parent_row:
            curr_row = parent_row
            while True:
                curr_row = curr_row.find_next_sibling('tr')
                if not curr_row:
                    break
                
                # Check if it has a semester label heading
                heading_td = curr_row.find('td', class_='reportHeading2')
                sem_label = None
                if heading_td:
                    sem_label = heading_td.get_text(strip=True)
                elif 'reportHeading2' in curr_row.get('class', []):
                    sem_label = curr_row.find('td').get_text(strip=True)
                    
                if sem_label and 'semester' in sem_label.lower():
                    next_data_row = curr_row.find_next_sibling('tr')
                    if not next_data_row:
                        continue
                        
                    inner_table = next_data_row.find('table')
                    if not inner_table:
                        continue
                        
                    inner_rows = inner_table.find_all('tr')
                    if len(inner_rows) < 2:
                        continue
                        
                    exam_headers = [cell.get_text(strip=True) for cell in inner_rows[0].find_all('td')]
                    subject_names = exam_headers[1:]
                    
                    exams = []
                    for row in inner_rows[1:]:
                        cells = [re.sub(r'\u00a0', '', cell.get_text(strip=True)) or None for cell in row.find_all('td')]
                        if not cells:
                            continue
                            
                        exam_name = cells[0]
                        if not exam_name:
                            continue
                            
                        subjects = []
                        for idx, sub_name in enumerate(subject_names):
                            val_idx = idx + 1
                            val = cells[val_idx] if val_idx < len(cells) else None
                            subjects.append({
                                "name": sub_name,
                                "marks": val
                            })
                            
                        exams.append({
                            "examName": exam_name,
                            "subjects": subjects
                        })
                        
                    result["internalMarks"].append({
                        "semesterLabel": sem_label,
                        "exams": exams
                    })
                    
    return result

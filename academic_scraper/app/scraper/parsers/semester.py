import re
from bs4 import BeautifulSoup
from app.scraper.parsers.marks import parse_term_label

def parse_previous_semesters_attendance(html: str) -> list:
    soup = BeautifulSoup(html, 'html.parser')
    results = []
    
    # 1. Locate the cell containing "PREVIOUS SEMESTERS ATTENDANCE"
    start_cell = None
    for td in soup.find_all('td'):
        txt = td.get_text(strip=True).upper()
        if 'PREVIOUS SEMESTERS ATTENDANCE' in txt:
            start_cell = td
            break
            
    if not start_cell:
        return results
        
    start_row = start_cell.find_parent('tr')
    if not start_row:
        return results
        
    # Traverse following siblings of start_row to find semester heading rows
    curr = start_row
    while True:
        curr = curr.find_next_sibling('tr')
        if not curr:
            break
            
        # If we hit next major section (like internal marks), we might stop,
        # but JNTU layout has reportHeading2 for semesters under previous attendance.
        # Let's inspect class list
        classes = curr.get('class', [])
        is_heading = 'reportHeading2' in classes or curr.find('td', class_='reportHeading2') is not None
        
        if is_heading:
            semester_name = curr.get_text(strip=True)
            # Find the next row which should contain the table of attendance for this semester
            next_row = curr.find_next_sibling('tr')
            if not next_row:
                continue
                
            nested_table = next_row.find('table')
            if nested_table:
                rows = nested_table.find_all('tr')
                if len(rows) >= 3:
                    headers = [cell.get_text(strip=True) for cell in rows[0].find_all('td')]
                    held = [cell.get_text(strip=True) for cell in rows[1].find_all('td')]
                    attended = [cell.get_text(strip=True) for cell in rows[2].find_all('td')]
                    
                    if headers and headers[0].lower() == 'subject':
                        subjects = []
                        # Skip first cell ("Subject") and last cell ("Total")
                        for i in range(1, len(headers) - 1):
                            subject_name = headers[i]
                            if not subject_name or subject_name == 'Total':
                                continue
                                
                            try:
                                h_val = int(held[i]) if i < len(held) else 0
                            except ValueError:
                                h_val = 0
                                
                            try:
                                a_val = int(attended[i]) if i < len(attended) else 0
                            except ValueError:
                                a_val = 0
                                
                            pct = round((a_val / h_val) * 100, 2) if h_val > 0 else 0.0
                            subjects.append({
                                "name": subject_name,
                                "held": h_val,
                                "attended": a_val,
                                "percentage": pct
                            })
                            
                        try:
                            total_held = int(held[-1]) if held else 0
                        except ValueError:
                            total_held = 0
                            
                        try:
                            total_attended = int(attended[-1]) if attended else 0
                        except ValueError:
                            total_attended = 0
                            
                        total_pct = round((total_attended / total_held) * 100, 2) if total_held > 0 else 0.0
                        
                        term_info = parse_term_label(semester_name)
                        results.append({
                            "semesterLabel": semester_name,
                            "academicYear": term_info["academicYear"],
                            "semester": term_info["semester"],
                            "totalHeld": total_held,
                            "totalAttended": total_attended,
                            "percentage": total_pct,
                            "subjects": subjects
                        })
                        
    # Filter semesters that have actual attendance held classes > 0
    return [r for r in results if r["totalHeld"] > 0]

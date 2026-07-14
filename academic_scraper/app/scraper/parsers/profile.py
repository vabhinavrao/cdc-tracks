import re
from bs4 import BeautifulSoup

def get_branch_acronym(branch_name: str) -> str:
    if not branch_name:
        return None
        
    lower = branch_name.lower()
    if 'computer science' in lower:
        if 'artificial intelligence' in lower or 'ai' in lower:
            if 'machine learning' in lower or 'ml' in lower:
                return 'CSE-AIML'
            return 'CSE-AI'
        if 'data science' in lower or 'ds' in lower:
            return 'CSE-DS'
        if 'cyber security' in lower or 'cyber' in lower:
            return 'CSE-CS'
        if 'iot' in lower:
            return 'CSE-IOT'
        return 'CSE'
        
    if 'electronics' in lower and 'communication' in lower:
        return 'ECE'
    if 'electrical' in lower:
        return 'EEE'
    if 'mechanical' in lower:
        return 'ME'
    if 'civil' in lower:
        return 'CE'
    if 'information technology' in lower:
        return 'IT'
        
    words = re.sub(r'[^a-zA-Z\s]', '', branch_name).split()
    initials = "".join([w[0] for w in words]).upper()
    return initials if len(initials) > 1 else branch_name

def extract_student_name(soup: BeautifulSoup) -> str:
    name = None
    for row in soup.find_all('tr'):
        cells = row.find_all('td')
        for i, cell in enumerate(cells):
            txt = cell.get_text(strip=True)
            if re.match(r'^(Student\s*)?Name\s*:?$', txt, re.IGNORECASE):
                if i + 1 < len(cells):
                    val = cells[i + 1].get_text(strip=True)
                    val = re.sub(r'^:\s*', '', val)
                    val = re.sub(r'\s+', ' ', val).upper()
                    if val and len(val) > 2 and val != 'STUDENT' and len(val) < 100:
                        name = val
                        break
        if name:
            break
            
    if name:
        return name
        
    body_text = soup.get_text()
    m = re.search(r'(?:Student\s*)?Name\s*:?\s*([A-Z][A-Z\s.]+?)(?:\s*(?:Course|Roll|Branch|\n))', body_text, re.IGNORECASE)
    if m:
        n = re.sub(r'\s+', ' ', m.group(1)).strip().upper()
        if len(n) > 2 and len(n) < 100:
            return n
            
    return None

def extract_branch(soup: BeautifulSoup) -> str:
    branch_name = None
    for row in soup.find_all('tr'):
        cells = row.find_all('td')
        for i, cell in enumerate(cells):
            txt = cell.get_text(strip=True)
            if re.match(r'^Branch\s*:?$', txt, re.IGNORECASE):
                val_cell = cells[i + 1] if i + 1 < len(cells) else None
                if val_cell:
                    text = val_cell.get_text(strip=True)
                    if text in [':', ':-'] and i + 2 < len(cells):
                        val_cell = cells[i + 2]
                        text = val_cell.get_text(strip=True)
                    b = re.sub(r'^:\s*', '', text)
                    b = re.sub(r'\s+', ' ', b).strip()
                    if b and len(b) > 1 and len(b) < 100:
                        branch_name = b
                        break
        if branch_name:
            break
            
    if branch_name:
        return get_branch_acronym(branch_name)
        
    body_text = soup.get_text()
    m = re.search(r'Branch\s*:?\s*([A-Za-z\s.,()-]+?)(?:\s*(?:Semester|Gender|DOB|Join|\n))', body_text, re.IGNORECASE)
    if m:
        b = re.sub(r'\s+', ' ', m.group(1)).strip()
        if len(b) > 1 and len(b) < 100:
            return get_branch_acronym(b)
            
    return None

def extract_current_semester_label(soup: BeautifulSoup) -> str:
    label = None
    for row in soup.find_all('tr'):
        cells = row.find_all('td')
        for i, cell in enumerate(cells):
            txt = cell.get_text(strip=True)
            if re.match(r'^Semester\s*:?$', txt, re.IGNORECASE):
                val_cell = cells[i + 1] if i + 1 < len(cells) else None
                if val_cell:
                    text = val_cell.get_text(strip=True)
                    if text in [':', ':-'] and i + 2 < len(cells):
                        val_cell = cells[i + 2]
                        text = val_cell.get_text(strip=True)
                    l = re.sub(r'^:\s*', '', text)
                    l = re.sub(r'\s+', ' ', l).strip()
                    if l and len(l) > 1 and len(l) < 100:
                        label = l
                        break
        if label:
            break
            
    if label:
        return label
        
    body_text = soup.get_text()
    m = re.search(r'Semester\s*:?\s*([A-Za-z0-9/.\s]+?)(?:\s*(?:Gender|DOB|Join|\n))', body_text, re.IGNORECASE)
    if m:
        l = re.sub(r'\s+', ' ', m.group(1)).strip()
        if len(l) > 1 and len(l) < 100:
            return l
            
    return None

def parse_profile(html: str) -> dict:
    soup = BeautifulSoup(html, 'html.parser')
    
    name = extract_student_name(soup)
    branch = extract_branch(soup)
    current_term_id = extract_current_semester_label(soup)
    
    # Extract CGPA metrics from reportHeadings
    cgpa = None
    cgpa_credits = None
    cgpa_percentage = None
    
    for el in soup.find_all(class_=re.compile(r'reportHeading2')):
        t = re.sub(r'\u00a0', ' ', el.get_text(strip=True))
        if t.startswith('CGPA:'):
            cgpa_m = re.search(r'CGPA:\s*([\d.]+)', t)
            cred_m = re.search(r'Credits:([\d/]+)', t)
            pct_m = re.search(r'([\d.]+)\s*%', t)
            
            if cgpa_m:
                cgpa = float(cgpa_m.group(1))
            if cred_m:
                cgpa_credits = cred_m.group(1)
            if pct_m:
                cgpa_percentage = float(pct_m.group(1))
                
    return {
        "name": name,
        "branch": branch,
        "program": "B.Tech",
        "currentTermId": current_term_id,
        "cgpa": cgpa,
        "cgpaCredits": cgpa_credits,
        "cgpaPercentage": cgpa_percentage
    }

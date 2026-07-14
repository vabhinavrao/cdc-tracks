import re
from bs4 import BeautifulSoup
from app.scraper.parsers.marks import parse_term_label

def parse_spf(html: str) -> list:
    soup = BeautifulSoup(html, 'html.parser')
    bands = []
    
    spf_div = soup.find(id='divProfile_SPF')
    if not spf_div:
        return bands
        
    table = spf_div.find('table')
    if not table:
        return bands
        
    rows = table.find_all('tr')
    current_label = None
    
    for idx, row in enumerate(rows):
        if idx == 0:
            continue
            
        cells = [re.sub(r'\u00a0', ' ', cell.get_text(strip=True)) for cell in row.find_all('td')]
        if not cells:
            continue
            
        semester_label = None
        cycle = None
        band = None
        
        if len(cells) >= 3:
            semester_label = cells[0]
            try:
                cycle = int(cells[1])
            except ValueError:
                cycle = None
            band = cells[2]
            current_label = semester_label
        elif len(cells) == 2 and current_label:
            semester_label = current_label
            try:
                cycle = int(cells[0])
            except ValueError:
                cycle = None
            band = cells[1]
            
        if not semester_label or cycle is None or not band:
            continue
            
        term_info = parse_term_label(semester_label)
        bands.append({
            "semesterLabel": semester_label,
            "cycle": cycle,
            "band": band.strip().upper(),
            "academicYear": term_info["academicYear"],
            "semester": term_info["semester"]
        })
        
    return bands

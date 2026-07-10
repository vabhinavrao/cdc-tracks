# backend/app/services/ai_mapper.py
import os
import json
import logging
import urllib.request
import urllib.error
from typing import List, Dict, Any

logger = logging.getLogger("ai_mapper")

# Standard database columns for overall_marks sheets
DB_FIELDS_OVERALL = {
    "roll_number": "Unique Roll Number or Registration ID of the student.",
    "name": "Full Name of the student.",
    "branch": "Academic branch (e.g., CSE, ECE, EEE).",
    "email": "Email address of the student.",
    "mobile": "Contact number / Phone number.",
    "participation": "Participation or attendance score.",
    "consistency_score": "Consistency index or consistency score.",
    "avg_performance": "Average performance / midscore.",
    "cdc_grade_score": "Grade score assigned by CDC.",
    "cdc_rank": "Rank of the student.",
    "cdc_band": "Performance band (A, B, C, D) of the student."
}

# Standard database columns for domain_info sheets
DB_FIELDS_DOMAIN = {
    "roll_number": "Unique Roll Number or Registration ID of the student.",
    "name": "Full Name of the student.",
    "branch": "Academic branch (e.g., CSE, ECE, EEE).",
    "email": "Email address of the student."
}

def analyze_sheet_headers_with_ai(headers: List[str], sample_rows: List[List[Any]]) -> Dict[str, Any]:
    """
    Sends Google Sheet headers and sample rows to Gemini to detect:
    1. Sheet type ('overall_marks' or 'domain_info')
    2. Column mappings from DB fields to sheet headers
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    # We will use models/gemini-2.5-flash as default, or fallback to models/gemini-2.0-flash if needed.
    # If key is missing or set to a placeholder, run in mock mode so the user can test the workflow.
    if not api_key or api_key.strip() == "" or "placeholder" in api_key.lower():
        logger.warning("GEMINI_API_KEY not set. Using rule-based fallback analyzer.")
        return generate_rule_based_mappings(headers, sample_rows)
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    # Build prompt with instructions, database schema descriptions, and source data
    prompt = f"""
You are an AI assistant designed to map academic Google Sheet headers to database fields.
Your goal is to inspect the headers and sample data, determine if this sheet is an "overall_marks" tracker or a "domain_info" tracker, and map the column names precisely.

Target Database Fields:
- overall_marks sheet fields:
{json.dumps(DB_FIELDS_OVERALL, indent=2)}
- domain_info sheet fields:
{json.dumps(DB_FIELDS_DOMAIN, indent=2)}

Google Sheet Data to Map:
- Headers: {json.dumps(headers)}
- First few sample rows: {json.dumps(sample_rows[:5])}

Instructions:
1. Determine the "sheet_type" ("overall_marks" or "domain_info").
   - If the headers contain words like "domain", "I-II", "II-I" or "track selection", it is likely a "domain_info" sheet.
   - If the headers contain words like "marks", "test", "avg", "grade", "rank", "consistency", it is likely an "overall_marks" sheet.
2. Produce a JSON dictionary under "column_mappings" where the key is the target database field name, and the value is the EXACT sheet header name that maps to it. If a field cannot be found, set it to null.
3. For "overall_marks":
   - Identify any headers representing test scores (e.g. "Test 1", "Aptitude Test 3", "Post Assessment: Python") and list them in the "test_scores" array.
   - Identify any headers representing post-assessments specifically, and list them in the "post_assessments" array.
4. For "domain_info":
   - Group domain and performance column pairs per semester in the "domain_mappings" dictionary. Format:
     {{
       "I-II": {{"domain": "I-II Domain Header", "performance": "I-II Performance Header"}},
       "II-I": {{"domain": "II-I Domain Header", "performance": "II-I Performance Header"}},
       ...
     }}
5. Respond strictly with a JSON object containing the schema mapping. Do not include markdown formatting or quotes outside of the JSON block.

Expected JSON Response Schema:
{{
  "sheet_type": "overall_marks" or "domain_info",
  "confidence_score": 0.95,
  "column_mappings": {{
    "roll_number": "Sheet Roll Number Header",
    "name": "Sheet Name Header",
    "branch": "Sheet Branch Header",
    "email": "Sheet Email Header",
    "mobile": "Sheet Phone Header",
    "participation": "Sheet Attendance/Participation Header",
    "consistency_score": "Sheet Consistency Header",
    "avg_performance": "Sheet Avg Perf Header",
    "cdc_grade_score": "Sheet Grade Header",
    "cdc_rank": "Sheet Rank Header",
    "cdc_band": "Sheet Band Header"
  }},
  "test_scores": ["List of test column headers"],
  "post_assessments": ["List of post-assessment column headers"],
  "domain_mappings": {{
    "I-II": {{"domain": "I-II Domain Column", "performance": "I-II Performance Column"}}
  }}
}}
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
            text_response = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            return json.loads(text_response)
    except urllib.error.HTTPError as he:
        err_msg = he.read().decode('utf-8')
        logger.error(f"Gemini API HTTP Error {he.code}: {err_msg}")
        # Fall back to rule-based mapping so the UI remains functional
        return generate_rule_based_mappings(headers, sample_rows, error_context=f"AI Error: {he.code}")
    except Exception as e:
        logger.error(f"Gemini API Connection Error: {e}")
        return generate_rule_based_mappings(headers, sample_rows, error_context=f"AI Connection Error: {str(e)}")

def generate_rule_based_mappings(headers: List[str], sample_rows: List[List[Any]], error_context: str = None) -> Dict[str, Any]:
    """
    Fallback deterministic analyzer if the Gemini API is offline or key is missing.
    Matches using string matching logic.
    """
    def normalize(h):
        return "".join(str(h).lower().replace("\n", " ").split())
        
    def find_match(candidates):
        for cand in candidates:
            cand_norm = normalize(cand)
            for h in headers:
                if normalize(h) == cand_norm:
                    return h
        for cand in candidates:
            cand_norm = normalize(cand)
            for h in headers:
                if cand_norm in normalize(h) or normalize(h) in cand_norm:
                    return h
        return None

    # Detect sheet type
    is_domain = False
    for h in headers:
        h_lower = h.lower()
        if "domain" in h_lower or "track" in h_lower or "semester info" in h_lower:
            is_domain = True
            break
            
    sheet_type = "domain_info" if is_domain else "overall_marks"
    
    roll_col = find_match(["roll number", "roll no", "roll_number", "rollno", "roll"])
    name_col = find_match(["name", "student name", "studentname"])
    branch_col = find_match(["branch"])
    email_col = find_match(["mail id", "email", "email id", "mail_id", "email_id"])
    mobile_col = find_match(["mobile number", "mobile", "phone number", "phone"])
    
    mappings = {
        "roll_number": roll_col,
        "name": name_col,
        "branch": branch_col,
        "email": email_col,
        "mobile": mobile_col
    }
    
    test_scores = []
    post_assessments = []
    domain_mappings = {}
    
    if sheet_type == "overall_marks":
        mappings["participation"] = find_match(["participation"])
        mappings["consistency_score"] = find_match(["consistency score", "consistency"])
        mappings["avg_performance"] = find_match(["avg performance", "average performance", "avg_performance"])
        mappings["cdc_grade_score"] = find_match(["cdc grade score", "grade score", "cdc_grade_score"])
        mappings["cdc_rank"] = find_match(["cdc rank", "rank"])
        mappings["cdc_band"] = find_match(["cdc band", "band"])
        
        # Gather test columns
        for h in headers:
            h_lower = h.lower()
            if h in mappings.values():
                continue
            if "cie" in h_lower:
                continue
            if "test" in h_lower or "post" in h_lower or "assess" in h_lower:
                test_scores.append(h)
                if "post" in h_lower or "assess" in h_lower:
                    post_assessments.append(h)
                    
    elif sheet_type == "domain_info":
        # Build domain semester pairs
        semesters = ["I-II", "II-I", "II-II"]
        for sem in semesters:
            d_col = find_match([f"{sem} domain", f"{sem}_domain"])
            p_col = find_match([f"{sem} performance", f"{sem} perf", f"{sem}_performance"])
            if d_col or p_col:
                domain_mappings[sem] = {
                    "domain": d_col,
                    "performance": p_col
                }

    return {
        "sheet_type": sheet_type,
        "confidence_score": 0.85 if error_context else 1.0,
        "column_mappings": mappings,
        "test_scores": test_scores,
        "post_assessments": post_assessments,
        "domain_mappings": domain_mappings,
        "note": f"Rule-based fallback used. {error_context or 'No Gemini API key detected.'}"
    }

# backend/app/services/google_sheets_sync.py
import os
import json
import logging
from sqlalchemy.orm import Session
from app.models import CDCPerformance

logger = logging.getLogger("cdc_sync")

def clean_sheet_value(val):
    """
    Cleans Google Sheet cell values.
    Handles VLOOKUP errors (#N/A, #VALUE!, #REF!) and empty cells by treating them as None.
    """
    if val is None:
        return None
    val_str = str(val).strip()
    if val_str in ["", "#N/A", "#VALUE!", "#REF!", "#NAME?", "#DIV/0!"]:
        return None
    try:
        # Try converting numeric values
        if "." in val_str:
            return float(val_str)
        return int(val_str)
    except ValueError:
        return val_str

def extract_sheet_name_from_formula(formula):
    """
    Extracts the referenced sheet name from a VLOOKUP or similar formula.
    E.g. =IFERROR(VLOOKUP(E3,'Quantitative Aptitude: Numbers'!D:I,6,0),"") -> Quantitative Aptitude: Numbers
    """
    if not formula or not str(formula).startswith("="):
        return None
    import re
    # Quoted sheet name: 'Sheet Name'!
    match_quoted = re.search(r"'([^']+)'\s*!", formula)
    if match_quoted:
        return match_quoted.group(1).strip()
    # Unquoted sheet name: SheetName!
    match_unquoted = re.search(r"([\w\-:]+)\s*!", formula)
    if match_unquoted:
        return match_unquoted.group(1).strip()
    return None

def fetch_sheet_records(wks):
    all_values = wks.get_all_values(value_render_option='FORMATTED_VALUE')
    if not all_values:
        return []
    raw_headers = all_values[0]
    seen = {}
    headers = []
    for h in raw_headers:
        h_clean = str(h).replace("\n", " ").strip()
        if h_clean in seen:
            seen[h_clean] += 1
            headers.append(f"{h_clean}_{seen[h_clean]}")
        else:
            seen[h_clean] = 1
            headers.append(h_clean)
            
    records = []
    for row_values in all_values[1:]:
        row_dict = {}
        for idx, header in enumerate(headers):
            val = row_values[idx] if idx < len(row_values) else ""
            row_dict[header] = val
        records.append(row_dict)
    return records

def sync_live_google_sheets(db: Session, sheet1_id_or_url: str, sheet2_id_or_url: str, credentials_path: str = "service_account.json"):
    """
    Connects to live Google Sheets via gspread and syncs evaluated values (including VLOOKUP results).
    """
    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        logger.error("gspread or google-auth not installed. Run: pip install gspread google-auth")
        return {"success": False, "message": "Missing dependencies: gspread or google-auth"}

    scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    
    # Check if JSON content is provided via environment variable
    env_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if env_json:
        try:
            info = json.loads(env_json)
            creds = Credentials.from_service_account_info(info, scopes=scopes)
        except Exception as e_env:
            logger.error(f"Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON env var: {e_env}")
            creds = None
    else:
        creds = None

    if not creds:
        # Fallback to check backend directory if credentials_path doesn't exist directly
        if not os.path.exists(credentials_path):
            alt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), credentials_path)
            if os.path.exists(alt_path):
                credentials_path = alt_path
            else:
                return {
                    "success": False, 
                    "message": f"Service account credential file '{credentials_path}' not found."
                }
        creds = Credentials.from_service_account_file(credentials_path, scopes=scopes)

    client = gspread.authorize(creds)

    try:
        # Extract keys or open by url
        try:
            sheet1 = client.open_by_url(sheet1_id_or_url) if sheet1_id_or_url.startswith("http") else client.open_by_key(sheet1_id_or_url)
        except Exception as e1:
            return {"success": False, "message": f"Failed to access Google Sheet 1: {str(e1)}. Make sure it is shared with {creds.service_account_email}"}

        try:
            sheet2 = client.open_by_url(sheet2_id_or_url) if sheet2_id_or_url.startswith("http") else client.open_by_key(sheet2_id_or_url)
        except Exception as e2:
            return {"success": False, "message": f"Failed to access Google Sheet 2: {str(e2)}. Make sure it is shared with {creds.service_account_email}"}

        # 1. Process File 1 (Overall Metrics & Tests)
        wks1 = sheet1.sheet1
        records1 = fetch_sheet_records(wks1)
        
        # Get headers and row 2 formulas to extract actual exam names
        test_mappings = {}
        try:
            a1_formula = wks1.acell('A1', value_render_option='FORMULA').value or ""
            target_wks = wks1
            if a1_formula.upper().startswith("=IMPORTRANGE"):
                try:
                    import re
                    matches = re.findall(r'["\']([^"\']+)["\']', a1_formula)
                    if len(matches) >= 2:
                        src_sheet_key = matches[0]
                        src_wks_name = matches[1].split("!")[0].strip("'\"")
                        src_sheet = client.open_by_key(src_sheet_key)
                        target_wks = src_sheet.worksheet(src_wks_name)
                except Exception as e_link:
                    logger.warning(f"Could not follow IMPORTRANGE link in sync_live: {e_link}")
            
            raw_headers = target_wks.row_values(1)
            headers_list = [str(h).replace("\n", " ").strip() for h in raw_headers]
            formulas_row = target_wks.row_values(2, value_render_option='FORMULA')
            for idx, h in enumerate(headers_list):
                if idx < len(formulas_row):
                    formula = formulas_row[idx]
                    if formula and str(formula).startswith("="):
                        sheet_name = extract_sheet_name_from_formula(formula)
                        if sheet_name:
                            test_mappings[h] = sheet_name
        except Exception as e_form:
            logger.warning(f"Could not fetch formulas in sync_live_google_sheets: {e_form}")
        
        # 2. Process File 2 (Semester Domains)
        wks2 = sheet2.sheet1
        records2 = fetch_sheet_records(wks2)

        # Create dictionary map for File 2 by Roll Number
        domain_map = {}
        for row in records2:
            roll = str(row.get("Roll Number") or row.get("Roll No") or "").strip()
            if roll:
                domain_map[roll] = {
                    "I-II": {
                        "domain": clean_sheet_value(row.get("I-II Domain")),
                        "performance": clean_sheet_value(row.get("I-II Performance"))
                    },
                    "II-I": {
                        "domain": clean_sheet_value(row.get("II-I Domain")),
                        "performance": clean_sheet_value(row.get("II-I Performance"))
                    },
                    "II-II": {
                        "domain": clean_sheet_value(row.get("II-II Domain")),
                        "performance": clean_sheet_value(row.get("II-II Performance"))
                    }
                }

        synced_count = 0
        # Get academic year and batch year context
        academic_year = 1
        batch_year = "2024-2028"
        try:
            from app.models import GoogleSheetConnection
            connections = db.query(GoogleSheetConnection).filter(
                GoogleSheetConnection.sheet_type == "overall_marks"
            ).all()
            
            matched_conn = None
            for conn in connections:
                if conn.sheet_url and sheet1_id_or_url in conn.sheet_url:
                    matched_conn = conn
                    break
                    
            if not matched_conn:
                # Follow IMPORTRANGE in A1 first to find the source key
                a1_formula = wks1.acell('A1', value_render_option='FORMULA').value or ""
                if a1_formula.upper().startswith("=IMPORTRANGE"):
                    import re
                    matches = re.findall(r'["\']([^"\']+)["\']', a1_formula)
                    if len(matches) >= 2:
                        src_key = matches[0]
                        for conn in connections:
                            if conn.sheet_url and src_key in conn.sheet_url:
                                matched_conn = conn
                                break
                                
            if matched_conn:
                academic_year = matched_conn.academic_year
                batch_year = matched_conn.batch_year
                logger.info(f"Matched live sync to Connection ID {matched_conn.id}: Year {academic_year}, Batch {batch_year}")
            else:
                # Fallback to the first connection if no match
                conn = connections[0] if connections else None
                if conn:
                    academic_year = conn.academic_year
                    batch_year = conn.batch_year
        except Exception as e_match:
            logger.warning(f"Error matching connection context in sync_live: {e_match}")

        for row in records1:
            roll = str(row.get("Roll Number") or row.get("Roll No") or "").strip()
            if not roll:
                continue

            # Extract test scores (Test 1 - Test 30) and post assessments
            test_scores = {}
            post_assessments = {}
            for col, val in row.items():
                col_clean = " ".join(col.replace("\n", " ").split()).strip()
                # Standardize common typos in sheet headers
                col_clean_norm = col_clean.replace("Asssessment", "Assessment").replace("asssessment", "assessment")
                
                if "test" in col_clean_norm.lower() or "post assessment" in col_clean_norm.lower():
                    cleaned_val = clean_sheet_value(val)
                    test_scores[col_clean_norm] = cleaned_val
                    if "post" in col_clean_norm.lower():
                        post_assessments[col_clean_norm] = cleaned_val

            # Upsert into database
            cdc_obj = db.query(CDCPerformance).filter(
                CDCPerformance.roll_number == roll,
                CDCPerformance.academic_year == academic_year
            ).first()
            if not cdc_obj:
                cdc_obj = CDCPerformance(
                    roll_number=roll, 
                    batch_year=batch_year, 
                    academic_year=academic_year
                )
                db.add(cdc_obj)
            else:
                cdc_obj.batch_year = batch_year

            cdc_obj.name = str(row.get("Name") or "")
            cdc_obj.branch = str(row.get("Branch") or "")
            cdc_obj.email = str(row.get("Mail ID") or row.get("Email") or "")
            cdc_obj.mobile = str(row.get("Mobile Number") or "")
            cdc_obj.participation = clean_sheet_value(row.get("Participation")) or 0
            cdc_obj.consistency_score = clean_sheet_value(row.get("Consistency Score")) or 0.0
            cdc_obj.avg_performance = clean_sheet_value(row.get("Avg Performance")) or 0.0
            cdc_obj.cdc_grade_score = clean_sheet_value(row.get("CDC Grade Score")) or 0.0
            
            raw_cie = clean_sheet_value(row.get("CIE/5")) or clean_sheet_value(row.get("CIE/5_2")) or 0.0
            import math
            try:
                cdc_obj.cie_score = math.ceil(float(raw_cie) * 2) / 2
            except (ValueError, TypeError):
                cdc_obj.cie_score = 0.0

            cdc_obj.cdc_rank = clean_sheet_value(row.get("CDC Rank"))
            cdc_obj.cdc_band = str(clean_sheet_value(row.get("CDC Band")) or "D").upper()
            
            cdc_obj.test_scores = test_scores
            cdc_obj.post_assessments = post_assessments
            if roll in domain_map:
                cdc_obj.domain_tracks = domain_map[roll]

            synced_count += 1

        # Update or create default overall_marks connection to store test_mappings
        try:
            from app.models import GoogleSheetConnection
            from datetime import datetime
            connection = db.query(GoogleSheetConnection).filter(
                GoogleSheetConnection.sheet_type == "overall_marks"
            ).first()
            if not connection:
                connection = GoogleSheetConnection(
                    batch_year="2024-2028",
                    academic_year=1,
                    sheet_type="overall_marks",
                    sheet_url=sheet1_id_or_url,
                    sync_status="success",
                    sync_message="Automatically created during live sheets sync"
                )
                db.add(connection)
            connection.test_mappings = test_mappings
            connection.last_synced = datetime.utcnow()
        except Exception as e_conn:
            logger.warning(f"Could not save test mappings to GoogleSheetConnection: {e_conn}")
            
        db.commit()
        return {"success": True, "message": f"Successfully synced {synced_count} student CDC records from Google Sheets!"}

    except Exception as e:
        db.rollback()
        logger.error(f"Error syncing Google Sheets: {e}")
        return {"success": False, "message": f"Failed to sync Google Sheets: {str(e)}"}


def sync_google_sheet_connection(db: Session, connection_id: int, credentials_path: str = "service_account.json"):
    from app.models import GoogleSheetConnection, CDCPerformance
    from datetime import datetime
    import math
    import re
    
    connection = db.query(GoogleSheetConnection).filter(GoogleSheetConnection.id == connection_id).first()
    if not connection:
        return {"success": False, "message": f"Connection {connection_id} not found."}
        
    connection.sync_status = "syncing"
    db.commit()
    
    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        connection.sync_status = "failed"
        connection.sync_message = "Missing dependencies: gspread or google-auth"
        db.commit()
        return {"success": False, "message": "Missing dependencies: gspread or google-auth"}

    scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    
    env_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if env_json:
        try:
            info = json.loads(env_json)
            creds = Credentials.from_service_account_info(info, scopes=scopes)
        except Exception as e_env:
            logger.error(f"Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON env var: {e_env}")
            creds = None
    else:
        creds = None

    if not creds:
        if not os.path.exists(credentials_path):
            alt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), credentials_path)
            if os.path.exists(alt_path):
                credentials_path = alt_path
            else:
                connection.sync_status = "failed"
                connection.sync_message = f"Service account credential file '{credentials_path}' not found."
                db.commit()
                return {"success": False, "message": f"Service account credentials not found."}
        creds = Credentials.from_service_account_file(credentials_path, scopes=scopes)

    try:
        client = gspread.authorize(creds)
        
        sheet_url = connection.sheet_url.strip()
        try:
            sheet = client.open_by_url(sheet_url) if sheet_url.startswith("http") else client.open_by_key(sheet_url)
        except Exception as e_open:
            import gspread
            if isinstance(e_open, gspread.exceptions.SpreadsheetNotFound):
                err_msg = "Spreadsheet not found (404). Ensure the link is correct and explicitly shared with the service account email."
            elif isinstance(e_open, PermissionError) or (hasattr(e_open, 'code') and e_open.code == 403) or "403" in str(e_open):
                err_msg = "Access Denied (403). The service account has not been added as a Viewer/Editor in the Google Sheet's Share settings."
            else:
                err_msg = str(e_open) or type(e_open).__name__
                if hasattr(e_open, 'response') and hasattr(e_open.response, 'text'):
                    try:
                        import json
                        err_data = json.loads(e_open.response.text)
                        err_msg = err_data.get("error", {}).get("message", err_msg)
                    except Exception:
                        err_msg = e_open.response.text
            raise Exception(f"Failed to access Google Sheet: {err_msg}. Make sure it is shared with {creds.service_account_email}")

        wks = sheet.sheet1
        records = fetch_sheet_records(wks)
        if not records:
            raise Exception("No data found in the first sheet of the spreadsheet.")
            
        # Get raw headers
        all_values = wks.get_all_values(value_render_option='FORMATTED_VALUE')
        raw_headers = all_values[0] if all_values else []
        headers = []
        for h in raw_headers:
            headers.append(str(h).replace("\n", " ").strip())
            
        # Get formulas for row 2 to extract actual exam names from formulas
        test_mappings = {}
        try:
            a1_formula = wks.acell('A1', value_render_option='FORMULA').value or ""
            target_wks = wks
            if a1_formula.upper().startswith("=IMPORTRANGE"):
                try:
                    import re
                    matches = re.findall(r'["\']([^"\']+)["\']', a1_formula)
                    if len(matches) >= 2:
                        src_sheet_key = matches[0]
                        src_wks_name = matches[1].split("!")[0].strip("'\"")
                        src_sheet = client.open_by_key(src_sheet_key)
                        target_wks = src_sheet.worksheet(src_wks_name)
                except Exception as e_link:
                    logger.warning(f"Could not follow IMPORTRANGE link: {e_link}")
            
            raw_headers = target_wks.row_values(1)
            headers_list = [str(h).replace("\n", " ").strip() for h in raw_headers]
            formulas_row = target_wks.row_values(2, value_render_option='FORMULA')
            for idx, h in enumerate(headers_list):
                if idx < len(formulas_row):
                    formula = formulas_row[idx]
                    if formula and str(formula).startswith("="):
                        sheet_name = extract_sheet_name_from_formula(formula)
                        if sheet_name:
                            test_mappings[h] = sheet_name
        except Exception as e_form:
            logger.warning(f"Could not fetch formulas for row 2: {e_form}")
            
        def normalize_header(h):
            return "".join(str(h).lower().replace("\n", " ").split())
            
        def find_matching_header(headers, candidates):
            for candidate in candidates:
                cand_norm = normalize_header(candidate)
                for h in headers:
                    h_norm = normalize_header(h)
                    if h_norm == cand_norm:
                        return h
            for candidate in candidates:
                cand_norm = normalize_header(candidate)
                for h in headers:
                    h_norm = normalize_header(h)
                    if cand_norm in h_norm or h_norm in cand_norm:
                        return h
            return None

        # Candidate mappings
        ROLL_CANDIDATES = ["roll number", "roll no", "roll_number", "rollno", "roll"]
        NAME_CANDIDATES = ["name", "student name", "studentname"]
        BRANCH_CANDIDATES = ["branch"]
        EMAIL_CANDIDATES = ["mail id", "email", "email id", "mail_id", "email_id"]
        MOBILE_CANDIDATES = ["mobile number", "mobile", "phone number", "phone"]
        
        roll_col = find_matching_header(headers, ROLL_CANDIDATES)
        if not roll_col:
            raise Exception(f"Could not identify a 'Roll Number' column in the sheet. Available columns: {', '.join(headers[:10])}...")
            
        name_col = find_matching_header(headers, NAME_CANDIDATES)
        branch_col = find_matching_header(headers, BRANCH_CANDIDATES)
        email_col = find_matching_header(headers, EMAIL_CANDIDATES)
        mobile_col = find_matching_header(headers, MOBILE_CANDIDATES)

        synced_count = 0

        if connection.sheet_type == "overall_marks":
            PARTICIPATION_CANDIDATES = ["participation"]
            CONSISTENCY_CANDIDATES = ["consistency score", "consistency"]
            AVG_PERF_CANDIDATES = ["avg performance", "average performance", "avg_performance", "average_performance"]
            GRADE_CANDIDATES = ["cdc grade score", "grade score", "cdc_grade_score"]
            RANK_CANDIDATES = ["cdc rank", "rank"]
            BAND_CANDIDATES = ["cdc band", "band"]
            
            participation_col = find_matching_header(headers, PARTICIPATION_CANDIDATES)
            consistency_col = find_matching_header(headers, CONSISTENCY_CANDIDATES)
            avg_perf_col = find_matching_header(headers, AVG_PERF_CANDIDATES)
            grade_col = find_matching_header(headers, GRADE_CANDIDATES)
            rank_col = find_matching_header(headers, RANK_CANDIDATES)
            band_col = find_matching_header(headers, BAND_CANDIDATES)
            
            # CIE columns - find all headers containing "cie"
            cie_cols = [h for h in headers if "cie" in h.lower()]
            
            # Mapped columns to ignore when scanning for test scores
            mapped_cols = {roll_col, name_col, branch_col, email_col, mobile_col, 
                           participation_col, consistency_col, avg_perf_col, grade_col, rank_col, band_col}
            mapped_cols.update(cie_cols)
            mapped_cols = {c for c in mapped_cols if c is not None}
            
            for row in records:
                roll = str(row.get(roll_col) or "").strip()
                if not roll:
                    continue
                    
                cdc_obj = db.query(CDCPerformance).filter(
                    CDCPerformance.roll_number == roll,
                    CDCPerformance.academic_year == connection.academic_year
                ).first()
                if not cdc_obj:
                    cdc_obj = CDCPerformance(
                        roll_number=roll, 
                        batch_year=connection.batch_year,
                        academic_year=connection.academic_year
                    )
                    db.add(cdc_obj)
                else:
                    cdc_obj.batch_year = connection.batch_year
                    
                # Dynamic basic info update
                if name_col and row.get(name_col):
                    cdc_obj.name = str(row.get(name_col)).strip()
                if branch_col and row.get(branch_col):
                    cdc_obj.branch = str(row.get(branch_col)).strip()
                if email_col and row.get(email_col):
                    cdc_obj.email = str(row.get(email_col)).strip()
                if mobile_col and row.get(mobile_col):
                    cdc_obj.mobile = str(row.get(mobile_col)).strip()
                    
                # Dynamic metrics update
                if participation_col:
                    cdc_obj.participation = clean_sheet_value(row.get(participation_col)) or 0
                if consistency_col:
                    cdc_obj.consistency_score = clean_sheet_value(row.get(consistency_col)) or 0.0
                if avg_perf_col:
                    cdc_obj.avg_performance = clean_sheet_value(row.get(avg_perf_col)) or 0.0
                if grade_col:
                    cdc_obj.cdc_grade_score = clean_sheet_value(row.get(grade_col)) or 0.0
                if rank_col:
                    cdc_obj.cdc_rank = clean_sheet_value(row.get(rank_col))
                if band_col:
                    cdc_obj.cdc_band = str(clean_sheet_value(row.get(band_col)) or "D").upper()
                    
                # CIE Score: Rightmost non-empty CIE score
                cie_val = None
                for col in reversed(cie_cols):
                    val = clean_sheet_value(row.get(col))
                    if val is not None and val != "":
                        cie_val = val
                        break
                if cie_val is not None:
                    try:
                        cdc_obj.cie_score = math.ceil(float(cie_val) * 2) / 2
                    except (ValueError, TypeError):
                        pass
                        
                # Dynamic tests extraction
                new_test_scores = {}
                new_post_assessments = {}
                for h in headers:
                    if h in mapped_cols:
                        continue
                    h_lower = h.lower()
                    if "test" in h_lower or "post" in h_lower or "assess" in h_lower:
                        val = clean_sheet_value(row.get(h))
                        if "post" in h_lower or "assess" in h_lower:
                            new_post_assessments[h] = val
                            new_test_scores[h] = val
                        elif "test" in h_lower:
                            new_test_scores[h] = val
                            
                # Merge test scores
                existing_test_scores = dict(cdc_obj.test_scores or {})
                existing_test_scores.update(new_test_scores)
                cdc_obj.test_scores = existing_test_scores
                
                # Merge post assessments
                existing_post_assessments = dict(cdc_obj.post_assessments or {})
                existing_post_assessments.update(new_post_assessments)
                cdc_obj.post_assessments = existing_post_assessments
                
                synced_count += 1
                
        elif connection.sheet_type == "domain_info":
            domain_cols = {}
            for h in headers:
                m = re.match(r"^(.*?)\s*domain\b", h, re.IGNORECASE)
                if m:
                    prefix = m.group(1).strip()
                    perf_col = None
                    for candidate_h in headers:
                        cand_norm = normalize_header(candidate_h)
                        if cand_norm == normalize_header(f"{prefix} Performance") or cand_norm == normalize_header(f"{prefix} Perf"):
                            perf_col = candidate_h
                            break
                    if perf_col:
                        domain_cols[prefix] = (h, perf_col)
                        
            if not domain_cols:
                raise Exception("Could not find any matching 'Domain' and 'Performance' column pairs (e.g. 'I-II Domain' and 'I-II Performance').")
                
            for row in records:
                roll = str(row.get(roll_col) or "").strip()
                if not roll:
                    continue
                    
                cdc_obj = db.query(CDCPerformance).filter(
                    CDCPerformance.roll_number == roll,
                    CDCPerformance.academic_year == connection.academic_year
                ).first()
                if not cdc_obj:
                    cdc_obj = CDCPerformance(
                        roll_number=roll, 
                        batch_year=connection.batch_year,
                        academic_year=connection.academic_year
                    )
                    db.add(cdc_obj)
                else:
                    cdc_obj.batch_year = connection.batch_year
                    
                # Dynamic basic info update
                if name_col and row.get(name_col):
                    cdc_obj.name = str(row.get(name_col)).strip()
                if branch_col and row.get(branch_col):
                    cdc_obj.branch = str(row.get(branch_col)).strip()
                if email_col and row.get(email_col):
                    cdc_obj.email = str(row.get(email_col)).strip()
                    
                # Dynamic domain selection update
                existing_domain_tracks = dict(cdc_obj.domain_tracks or {})
                for prefix, (d_col, p_col) in domain_cols.items():
                    d_val = clean_sheet_value(row.get(d_col))
                    p_val = clean_sheet_value(row.get(p_col))
                    if d_val is not None and d_val != "":
                        existing_domain_tracks[prefix] = {
                            "domain": str(d_val).strip(),
                            "performance": p_val
                        }
                cdc_obj.domain_tracks = existing_domain_tracks
                synced_count += 1
                
        connection.sync_status = "success"
        connection.last_synced = datetime.utcnow()
        connection.sync_message = f"Successfully synced {synced_count} student records."
        if connection.sheet_type == "overall_marks":
            connection.test_mappings = test_mappings
        db.commit()
        return {"success": True, "message": connection.sync_message}
        
    except Exception as e:
        db.rollback()
        connection.sync_status = "failed"
        connection.sync_message = str(e)
        db.commit()
        logger.error(f"Error syncing connection {connection_id}: {e}")
        return {"success": False, "message": f"Failed to sync: {str(e)}"}

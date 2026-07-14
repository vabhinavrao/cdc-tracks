import asyncio
import base64
import urllib.parse
from bs4 import BeautifulSoup
import httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from app import config
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ErpScraperError(Exception):
    def __init__(self, message, module=None, code=None):
        super().__init__(message)
        self.message = message
        self.module = module
        self.code = code

def encrypt_erp_password(password: str, aes_key: str, aes_iv: str) -> str:
    """
    Encrypts password using AES-128-CBC as expected by the ERP client-side login form.
    """
    key_bytes = aes_key.encode('utf-8')
    iv_bytes = aes_iv.encode('utf-8')
    
    # PKCS7 padding to 16 bytes block size
    pad_len = 16 - (len(password) % 16)
    padded = password + chr(pad_len) * pad_len
    
    cipher = Cipher(
        algorithms.AES(key_bytes),
        modes.CBC(iv_bytes),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded.encode('utf-8')) + encryptor.finalize()
    return base64.b64encode(ciphertext).decode('utf-8')

def extract_hidden_fields(soup: BeautifulSoup) -> dict:
    fields = {}
    for tag in soup.find_all('input', type='hidden'):
        name = tag.get('name')
        val = tag.get('value', '')
        if name:
            fields[name] = val
    return fields

def decode_ajax_html(raw: str) -> str:
    if not isinstance(raw, str):
        return ""
    if not (raw.startswith("'") or raw.startswith('"')):
        return raw
    
    content = raw[1:-1]
    content = (content
               .replace("\\'", "'")
               .replace('\\"', '"')
               .replace("\\n", "\n")
               .replace("\\r", "\r")
               .replace("\\\\", "\\"))
    return content

class ErpClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(config.HTTP_TIMEOUT, connect=config.LOGIN_TIMEOUT),
            follow_redirects=True,
            headers={
                'User-Agent': (
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        )
        self.roll_number = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def close(self):
        await self.client.aclose()

    async def _request_with_retry(self, method: str, url: str, **kwargs) -> httpx.Response:
        retries = 2
        backoff = 1.0
        
        for attempt in range(retries + 1):
            try:
                if method.upper() == "GET":
                    response = await self.client.get(url, **kwargs)
                elif method.upper() == "POST":
                    response = await self.client.post(url, **kwargs)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                # Retry transient 5xx server errors
                if response.status_code >= 500:
                    if attempt < retries:
                        logger.warning(f"ERP returned 5xx status {response.status_code}, retrying in {backoff}s...")
                        await asyncio.sleep(backoff)
                        backoff *= 2.0
                        continue
                return response
            except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError) as e:
                if attempt < retries:
                    logger.warning(f"ERP request failed ({type(e).__name__}), retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                    backoff *= 2.0
                    continue
                raise e

    async def login(self, roll_number: str, password: str):
        self.roll_number = roll_number.strip().upper()
        
        # 1. Load login page to get session cookie and hidden elements
        try:
            resp = await self._request_with_retry("GET", config.ERP_LOGIN_URL)
        except Exception as e:
            raise ErpScraperError(
                f"ERP unavailable: failed to load login page ({str(e)})",
                code="ERP_UNAVAILABLE"
            )
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        hidden_fields = extract_hidden_fields(soup)
        
        # Encrypt plaintext password using client-side AES scheme
        enc_pwd = encrypt_erp_password(password, config.ERP_AES_KEY, config.ERP_AES_IV)
        
        # 2. Build login form payload
        form = {}
        for key, val in hidden_fields.items():
            if not key.startswith('hdnpwd'):
                form[key] = val
                
        form.update({
            'txtId2': self.roll_number,
            'txtPwd2': enc_pwd,
            'hdnpwd2': enc_pwd,
            'txtId1': '',
            'txtPwd1': '',
            'hdnpwd1': '',
            'txtId3': '',
            'txtPwd3': '',
            'hdnpwd3': '',
            'imgBtn2.x': '50',
            'imgBtn2.y': '15'
        })
        
        # 3. Post login form
        try:
            login_resp = await self._request_with_retry(
                "POST",
                config.ERP_LOGIN_URL,
                data=form,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': config.ERP_LOGIN_URL,
                    'Origin': config.ERP_BASE_URL
                }
            )
        except Exception as e:
            raise ErpScraperError(
                f"ERP unavailable: login request failed ({str(e)})",
                code="ERP_UNAVAILABLE"
            )
            
        resp_soup = BeautifulSoup(login_resp.text, 'html.parser')
        
        # Look for explicit JNTU login validation labels/errors
        for selector in ['#lblError', '#lblMsg', '#lblMessage', '.alert-danger', '.error']:
            err_el = resp_soup.select_one(selector)
            if err_el:
                err_text = err_el.get_text(strip=True)
                if err_text:
                    raise ErpScraperError(f"Login failed: {err_text}", code="INVALID_CREDENTIALS")
                    
        # Check if we were redirected to profile or stayed on login page
        still_on_login = resp_soup.select_one('#txtId2') is not None and resp_soup.select_one('#imgBtn2') is not None
        if still_on_login:
            body_snippet = resp_soup.get_text().lower()
            if 'invalid' in body_snippet or 'incorrect' in body_snippet:
                raise ErpScraperError("Login failed: Invalid username or password", code="INVALID_CREDENTIALS")
            raise ErpScraperError("Login failed: Credentials rejected (still on login page)", code="INVALID_CREDENTIALS")
            
        logger.info(f"Successfully logged in student: {self.roll_number}")

    async def logout(self):
        try:
            await self.client.get(
                f"{config.ERP_BASE_URL}logout.aspx",
                timeout=5.0
            )
        except Exception as e:
            logger.warning(f"ERP logout request failed (non-fatal): {str(e)}")

    async def _post_ajax(self, url: str, body_lines: list, referer: str, module: str) -> str:
        body = "\r\n".join(body_lines)
        try:
            resp = await self._request_with_retry(
                "POST",
                url,
                content=body,
                headers={
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': referer,
                }
            )
        except Exception as e:
            raise ErpScraperError(
                f"ERP unavailable: AJAX request failed for {module} ({str(e)})",
                module=module,
                code="ERP_UNAVAILABLE"
            )
            
        raw = resp.text
        if 'ajax_error' in raw:
            # Match error details like ajax_error(..., "message")
            import re
            m = re.search(r"ajax_error\([^,]+,\s*['\"]([^'\"]+)['\"]", raw)
            err_msg = m.group(1) if m else "unknown"
            raise ErpScraperError(
                f"ERP AJAX error: {err_msg}",
                module=module,
                code="ERP_AJAX_ERROR"
            )
            
        return decode_ajax_html(raw)

    async def fetch_attendance_html(self, subjecttype: str = "B") -> str:
        ajax_url = (
            f"{config.ERP_BASE_URL}ajax/StudentAttendance,"
            "App_Web_studentattendance.aspx.a2a1b31c.ashx?_method=ShowAttendance&_session=r"
        )
        return await self._post_ajax(
            ajax_url,
            [
                f"rollNo={urllib.parse.quote(self.roll_number)}",
                "fromDate=",
                "toDate=",
                f"subjecttype={subjecttype}"
            ],
            f"{config.ERP_BASE_URL}Academics/StudentAttendance.aspx",
            "attendance"
        )

    async def fetch_profile_html(self) -> str:
        ajax_url = (
            f"{config.ERP_BASE_URL}ajax/StudentProfile,"
            "App_Web_studentprofile.aspx.a2a1b31c.ashx?_method=ShowStudentProfileNew&_session=rw"
        )
        return await self._post_ajax(
            ajax_url,
            [
                f"RollNo={urllib.parse.quote(self.roll_number)}",
                "isImageDisplay=false"
            ],
            f"{config.ERP_BASE_URL}Academics/StudentProfile.aspx",
            "profile"
        )

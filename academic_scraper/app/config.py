import os
from dotenv import load_dotenv

# Load root-level .env if present
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

# PostgreSQL Config
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://eds_user:eds_password@localhost:5432/erp_data")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# API Keys & Auth Config
# The key shared with the FastAPI backend
ADS_API_KEY = os.getenv("ADS_API_KEY", "cdc_api_key_for_local_testing_54321")
EDS_ADMIN_API_KEY = os.getenv("EDS_ADMIN_API_KEY", "default_admin_api_key_value")

# Credentials Crypto Master Key (32 bytes hex)
EDS_ENCRYPTION_KEY = os.getenv("EDS_ENCRYPTION_KEY", "4571f96ffa2ca77dda67ff1dca99883734dd1033475db8b5f3190849d7949dbe")
EDS_ENCRYPTION_KEY_VERSION = int(os.getenv("EDS_ENCRYPTION_KEY_VERSION", "1"))

# Timeouts in seconds
HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT_MS", "15000")) / 1000.0
LOGIN_TIMEOUT = float(os.getenv("LOGIN_TIMEOUT_MS", "8000")) / 1000.0

# ERP Configuration
ERP_BASE_URL = os.getenv("ERP_BASE_URL", "https://www.webprosindia.com/hitam/").rstrip("/") + "/"
ERP_LOGIN_URL = os.getenv("ERP_LOGIN_URL", f"{ERP_BASE_URL}default.aspx")

# AES Key/IV used by the JNTU ERP's own client-side JavaScript password hashing
ERP_AES_KEY = os.getenv("ERP_AES_KEY", "8701661282118308")
ERP_AES_IV = os.getenv("ERP_AES_IV", "8701661282118308")

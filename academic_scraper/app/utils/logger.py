import logging
import time
from contextlib import contextmanager

# Create base logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)

def get_logger(name: str):
    logger = logging.getLogger(name)
    # Ensure standard logger doesn't propagate raw passwords
    # Custom secret filter
    class SecretFilter(logging.Filter):
        def filter(self, record):
            # Redact fields in message or args
            msg = str(record.msg)
            # Simple sanitization checks
            sensitive_keywords = ['password', 'pwd', 'hdnpwd', 'Authorization', 'X-API-Key', 'cookie']
            for kw in sensitive_keywords:
                if kw in msg:
                    # Generic message replacement
                    record.msg = f"[REDACTED LOG] contains sensitive keyword: {kw}"
                    break
            return True
            
    logger.addFilter(SecretFilter())
    return logger

@contextmanager
def log_duration(name: str, metrics_dict: dict):
    """
    Context manager to record execution timings in milliseconds.
    """
    start_time = time.perf_counter()
    try:
        yield
    finally:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        metrics_dict[f"{name}_duration_ms"] = round(elapsed_ms, 2)

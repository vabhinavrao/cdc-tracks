import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import get_db

client = TestClient(app)

# Dummy verification override for API key checking during unit test
from app.api import dependencies
app.dependency_overrides[dependencies.verify_api_key] = lambda: {
    "key_id": "test-key-uuid",
    "client_id": "test-client-uuid",
    "scopes": ["read", "register", "refresh"]
}

def test_health_liveness():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_metrics_endpoint():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "process_cpu_user_seconds_total" in response.text

def test_health_readiness_healthy():
    # Override get_db to return a mock DB session that returns success on execution
    class MockSession:
        def execute(self, query):
            return True
        def close(self):
            pass
            
    app.dependency_overrides[get_db] = lambda: MockSession()
    
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["checks"]["db"] is True

def test_health_readiness_unhealthy():
    # Override get_db to raise an exception
    class MockSessionUnhealthy:
        def execute(self, query):
            raise Exception("DB Down")
        def close(self):
            pass
            
    app.dependency_overrides[get_db] = lambda: MockSessionUnhealthy()
    
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["detail"]["status"] == "not_ready"
    assert response.json()["detail"]["checks"]["db"] is False

# Clean up overrides
app.dependency_overrides.clear()

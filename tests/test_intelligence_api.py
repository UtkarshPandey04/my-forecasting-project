"""Integration and unit tests for AeroSense Intelligence API:
- POST /api/v1/intelligence/ask
- GET /api/v1/intelligence/models
- POST /api/v1/atmospheric/ask
"""

import sys
import os
import pytest

_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _root not in sys.path:
    sys.path.insert(0, _root)
_backend = os.path.join(_root, "backend")
if _backend not in sys.path:
    sys.path.insert(0, _backend)

os.environ["APP_MODE"] = "DEMO"
os.environ["DATABASE_URL"] = "sqlite:///./data/test_aerosense.db"

from fastapi.testclient import TestClient
from backend.app.main import app
from app.core.database import init_db, SessionLocal
from seed_stations import seed_stations

init_db()
_db = SessionLocal()
try:
    seed_stations(_db)
finally:
    _db.close()

client = TestClient(app)


class TestIntelligenceAPI:
    def test_get_available_ai_models(self):
        resp = client.get("/api/v1/intelligence/models")
        assert resp.status_code == 200
        data = resp.json()
        assert "models" in data
        assert len(data["models"]) >= 3
        assert "active_model" in data
        model_ids = [m["id"] for m in data["models"]]
        assert "aerosense-coupled-physics" in model_ids
        assert "gemini-2.0-flash" in model_ids

    def test_ask_preset_why_pollution_rises(self):
        payload = {"query": "Why is pollution expected to worsen tomorrow?"}
        resp = client.post("/api/v1/intelligence/ask", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["query"] == payload["query"]
        assert "assessment" in data and len(data["assessment"]) > 20
        assert "forecast_trajectory" in data
        assert 0.50 <= data["confidence"] <= 0.98
        assert data["confidence_level"] in ["HIGH", "MODERATE", "CAUTIONARY"]
        assert len(data["confidence_drivers"]) > 0
        assert data["primary_driver"]
        assert data["ventilation_status"] in ["Critical", "Moderate", "High"]
        assert data["ventilation_index"] > 0
        assert len(data["evidence_sources"]) >= 2
        assert data["predicted_pm25"] is not None

    def test_ask_inversion_strength_query(self):
        payload = {"query": "How strong is the current thermal inversion?"}
        resp = client.post("/api/v1/intelligence/ask", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "inversion" in data["assessment"].lower() or "boundary" in data["assessment"].lower()
        assert data["inversion_risk"] >= 0
        assert data["confidence"] >= 0.60

    def test_ask_stubble_fires_query(self):
        payload = {"query": "Are stubble fires impacting Delhi right now?"}
        resp = client.post("/api/v1/intelligence/ask", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "fire" in data["primary_driver"].lower() or "emissions" in data["primary_driver"].lower()
        assert len(data["suggested_actions"]) > 0

    def test_ask_station_specific_query(self):
        payload = {
            "query": "What will be PM2.5 in Punjabi Bagh tomorrow?",
            "station_id": "punjabi_bagh",
            "horizon_hours": 24
        }
        resp = client.post("/api/v1/intelligence/ask", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["station_id"] == "punjabi_bagh"
        assert "punjab" in data["station_name"].lower()
        assert data["predicted_pm25"] > 0
        assert data["predicted_category"] is not None

    def test_ask_atmospheric_alias_endpoint(self):
        payload = {"query": "Will pollution clear up this weekend?"}
        resp = client.post("/api/v1/atmospheric/ask", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["confidence"] > 0
        assert "trajectory" in data["forecast_trajectory"].lower() or "pm2.5" in data["forecast_trajectory"].lower() or len(data["forecast_trajectory"]) > 10

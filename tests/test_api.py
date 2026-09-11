"""Tests for FastAPI endpoints."""

import sys
import os

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


class TestRootEndpoint:
    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "AeroSense API"
        assert "version" in data

    def test_root_has_mode(self):
        response = client.get("/")
        data = response.json()
        assert "mode" in data


class TestStationsEndpoint:
    def test_list_stations(self):
        response = client.get("/api/v1/stations")
        assert response.status_code == 200
        data = response.json()
        assert "stations" in data
        assert "count" in data
        assert data["count"] == 40

    def test_single_station(self):
        response = client.get("/api/v1/stations/anand_vihar")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "anand_vihar"
        assert data["name"] == "Anand Vihar"
        assert abs(data["latitude"] - 28.6468) < 0.01

    def test_station_not_found(self):
        response = client.get("/api/v1/stations/nonexistent_station")
        assert response.status_code == 404


class TestObservationsEndpoint:
    def test_current_observations(self):
        response = client.get("/api/v1/observations/current?station_id=anand_vihar")
        assert response.status_code == 200
        data = response.json()
        assert "observations" in data
        assert data["mode"] == "DEMO"

    def test_station_observations_have_aqi(self):
        response = client.get("/api/v1/observations/current?station_id=ito")
        assert response.status_code == 200
        data = response.json()
        if data["observations"]:
            obs = data["observations"][0]
            assert "aqi" in obs
            assert "pollutants" in obs
            assert "meteorology" in obs


class TestForecastEndpoint:
    def test_forecast(self):
        response = client.get("/api/v1/forecast/anand_vihar")
        assert response.status_code == 200
        data = response.json()
        assert data["station_id"] == "anand_vihar"
        assert data["mode"] == "DEMO"
        assert len(data["points"]) == 72  # 72-hour forecast
        # Each point should have required fields
        point = data["points"][0]
        assert "hour_offset" in point
        assert "pm25_predicted" in point
        assert "timestamp" in point

    def test_forecast_not_found(self):
        response = client.get("/api/v1/forecast/nonexistent_station")
        assert response.status_code == 404


class TestHealthEndpoint:
    def test_health(self):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "mode" in data
        assert "providers" in data

    def test_data_freshness(self):
        response = client.get("/api/v1/data-freshness")
        assert response.status_code == 200
        data = response.json()
        assert "station_count" in data


class TestDisasterRiskEndpoint:
    def test_disaster_risk(self):
        response = client.get("/api/v1/disaster/risk")
        assert response.status_code == 200
        data = response.json()
        assert "overall_score" in data
        assert "hazards" in data
        assert "telemetry_mesh" in data
        assert data["telemetry_mesh"]["total_sources"] == 11
        assert len(data["telemetry_mesh"]["sources"]) == 11

    def test_telemetry_mesh_endpoint(self):
        response = client.get("/api/v1/disaster/telemetry-mesh")
        assert response.status_code == 200
        data = response.json()
        assert data["total_sources"] == 11
        assert data["live_sources_count"] == 11
        sources = data["sources"]
        source_names = [s["name"] for s in sources]
        assert "Weather + forecast" in source_names
        assert "Fire / stubble burning" in source_names
        assert "Rainfall" in source_names
        assert "River / water level" in source_names
        assert "Public / social reports" in source_names
        assert "Road + infrastructure" in source_names
        assert "Soil + terrain" in source_names
        assert "Satellite imagery" in source_names
        assert "Population density" in source_names
        assert "Historical disaster data" in source_names
        assert "Citizen reports" in source_names
        for s in sources:
            assert s["live"] is True
            assert s["status"] in ("CONNECTED", "DEMO_CONNECTED")
            assert "latency_ms" in s
            assert "endpoint_url" in s
            assert "raw_payload" in s

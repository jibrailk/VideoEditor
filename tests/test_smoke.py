from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_homepage_loads():
    response = client.get("/")
    assert response.status_code == 200
    assert "VideoEditor Studio" in response.text


def test_health_endpoint_has_expected_fields():
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "degraded"}
    assert "ffmpeg_available" in payload
    assert "ffprobe_available" in payload

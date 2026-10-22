from fastapi.testclient import TestClient

from app import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_features_endpoint():
    response = client.post(
        "/predict-features",
        json={
            "stream_features": {"IoT": {}, "Clinical": {}, "Medication": {}, "Static": {}},
            "tvl_sources": {},
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "final_risk_probability" in body
    assert "stream_risks" in body
    assert "tvl" in body
    assert "input_warnings" in body


def test_predict_endpoint_accepts_patient_payload():
    response = client.post(
        "/predict",
        json={
            "iot_history": [{"day": 0, "hr": 72}],
            "clinical_history": [{"day": 0, "pef_max_mean": 420}],
            "static": {"severity": "moderate"},
        },
    )
    assert response.status_code == 200
    assert 0 <= response.json()["final_risk_probability"] <= 1


def test_invalid_json_shape_returns_controlled_error():
    response = client.post("/predict-features", json={"stream_features": "invalid"})
    assert response.status_code in {400, 422}

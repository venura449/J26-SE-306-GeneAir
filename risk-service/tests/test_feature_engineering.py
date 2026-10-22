from src.risk_model.feature_engineering import build_stream_features


def test_build_stream_features_returns_all_streams():
    result = build_stream_features(
        {
            "iot_history": [{"day": 0, "hr": 72, "temperature": 25}],
            "clinical_history": [{"day": 0, "pef_max_mean": 420}],
            "medication_history": [{"day": 0, "relief_inhaler": 1}],
            "static": {"bmi_range": "normal", "severity": "moderate"},
        }
    )

    assert set(result) == {"IoT", "Clinical", "Medication", "Static"}
    assert "watch__hr_value_last" in result["IoT"]
    assert "peak__pef_max_mean_last" in result["Clinical"]
    assert "med__daily_relief_inhaler_last" in result["Medication"]
    assert result["Static"]["static__severity"] == "moderate"

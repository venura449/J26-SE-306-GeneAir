import math

from src.risk_model.predictor import compute_tvl, predict_from_features


def test_complete_prediction_returns_required_fields(complete_stream_features, complete_tvl_sources):
    result = predict_from_features(complete_stream_features, complete_tvl_sources)
    assert 0 <= result["final_risk_probability"] <= 1
    assert 0 <= result["raw_late_fusion_probability"] <= 1
    assert set(result["stream_risks"]) == {"IoT", "Clinical", "Medication", "Static"}
    assert "tvl" in result and "input_warnings" in result


def test_late_fusion_is_mean_of_stream_risks(complete_stream_features, complete_tvl_sources):
    result = predict_from_features(complete_stream_features, complete_tvl_sources)
    expected = sum(result["stream_risks"].values()) / len(result["stream_risks"])
    assert math.isclose(result["raw_late_fusion_probability"], expected, rel_tol=1e-9)


def test_missing_stream_features_generate_warning(complete_tvl_sources):
    result = predict_from_features({"IoT": {}}, complete_tvl_sources)
    assert result["input_warnings"]
    assert any("expected features missing" in warning for warning in result["input_warnings"])


def test_tvl_age_reduces_time_reliability(complete_tvl_sources):
    fresh = compute_tvl(complete_tvl_sources)
    old_sources = {name: values.copy() for name, values in complete_tvl_sources.items()}
    old_sources["watch"]["age_days"] = 1
    old = compute_tvl(old_sources)
    assert old["families"]["watch"]["gamma_time"] < fresh["families"]["watch"]["gamma_time"]


def test_tvl_expired_data_is_stale(complete_tvl_sources):
    expired = {name: values.copy() for name, values in complete_tvl_sources.items()}
    expired["watch"]["age_days"] = 10_000
    result = compute_tvl(expired)
    assert result["families"]["watch"]["stale"] == 1
    assert result["families"]["watch"]["gamma"] == 0


def test_tvl_missing_coverage_reduces_quality(complete_tvl_sources):
    reduced = {name: values.copy() for name, values in complete_tvl_sources.items()}
    reduced["watch"]["coverage"] = 0.5
    result = compute_tvl(reduced)
    assert result["families"]["watch"]["gamma_quality"] < 1


def test_repeated_prediction_is_deterministic(complete_stream_features, complete_tvl_sources):
    first = predict_from_features(complete_stream_features, complete_tvl_sources)
    second = predict_from_features(complete_stream_features, complete_tvl_sources)
    assert first == second


def test_tvl_completeness_reduces_quality(complete_tvl_sources):
    reduced = {name: values.copy() for name, values in complete_tvl_sources.items()}
    reduced["watch"]["completeness"] = 0.5
    result = compute_tvl(reduced)
    assert result["families"]["watch"]["gamma_quality"] < 1


def test_tvl_values_are_clipped_to_valid_range(complete_tvl_sources):
    invalid = {name: values.copy() for name, values in complete_tvl_sources.items()}
    invalid["watch"]["coverage"] = 2.0
    invalid["watch"]["completeness"] = -1.0
    result = compute_tvl(invalid)
    assert 0 <= result["families"]["watch"]["coverage"] <= 1
    assert 0 <= result["families"]["watch"]["completeness"] <= 1


def test_empty_feature_payload_returns_controlled_prediction(complete_tvl_sources):
    result = predict_from_features({}, complete_tvl_sources)
    assert 0 <= result["final_risk_probability"] <= 1
    assert result["input_warnings"]


def test_static_source_is_fresh_by_default(complete_tvl_sources):
    result = compute_tvl(complete_tvl_sources)
    assert result["families"]["static"]["stale"] == 0
    assert result["families"]["static"]["gamma"] > 0

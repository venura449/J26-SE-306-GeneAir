import time

from src.risk_model.predictor import predict_from_features


def test_prediction_latency_is_recorded(complete_stream_features, complete_tvl_sources):
    start = time.perf_counter()
    predict_from_features(complete_stream_features, complete_tvl_sources)
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 5_000

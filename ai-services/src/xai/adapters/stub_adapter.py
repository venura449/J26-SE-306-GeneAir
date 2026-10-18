from __future__ import annotations
from typing import Any, Dict, List, Mapping, Tuple
import numpy as np
import pandas as pd
from adapters.model_adapter import ModelAdapter, Record
from stub_pipeline.schema import STREAM_FEATURES, CATEGORICAL_FEATURES, ACTIVITY_CODES
from stub_pipeline.train_stub_models import StubPipeline

EXPLAINER_KEYS = {
    "IoT": "SubXAI01_IoT",
    "Clinical": "SubXAI02_Clinical",
    "Medication": "SubXAI03_Medication",
    "Static": "SubXAI04_Static",
}

CATEGORY_CODES: Dict[str, Dict[str, int]] = {
    "iot_watch_activity_type": ACTIVITY_CODES,
}

class StubModelAdapter(ModelAdapter):
 
    def __init__(self, pipeline: StubPipeline, reference_frame: pd.DataFrame):
        self.pipeline = pipeline
        self.reference_frame = reference_frame
        self._explainer_by_stream = {
            stream: pipeline.explainers[key] for stream, key in EXPLAINER_KEYS.items()
        }
        self._warm_up_explainers()
 
    def _warm_up_explainers(self) -> None:
        # A freshly loaded TreeExplainer reports a stale expected_value until
        # shap_values has been called once, so run one reference row through
        # each explainer before anything reads the base value.
        first_row = self.reference_frame.iloc[0].to_dict()
        encoded = {name: float(value) for name, value in first_row.items()}
        for stream, explainer in self._explainer_by_stream.items():
            explainer.shap_values(self._stream_row(encoded, stream))
 
    def stream_feature_map(self) -> Dict[str, List[str]]:
        return {stream: list(cols) for stream, cols in STREAM_FEATURES.items()}
 
    def categorical_features(self) -> List[str]:
        return list(CATEGORICAL_FEATURES)
 
    def feature_ranges(self) -> Dict[str, Tuple[float, float]]:
        ranges: Dict[str, Tuple[float, float]] = {}
        for cols in STREAM_FEATURES.values():
            for name in cols:
                if name in CATEGORICAL_FEATURES:
                    continue
                column = self.reference_frame[name]
                ranges[name] = (float(column.min()), float(column.max()))
        return ranges
 
    def categories(self) -> Dict[str, List[Any]]:
        return {name: list(CATEGORY_CODES[name]) for name in CATEGORICAL_FEATURES}
 
    # ---------- model internals ----------
    def explainers(self) -> Dict[str, Any]:
        return dict(self._explainer_by_stream)
 
    def platt_params(self) -> Tuple[float, float]:
        calibrator = self.pipeline.calibrator
        return float(calibrator.coef_[0][0]), float(calibrator.intercept_[0])
 
    def encode_record(self, record: Record) -> Dict[str, float]:
        if hasattr(record, "to_dict"):
            record = record.to_dict()
        encoded: Dict[str, float] = {}
        for name, value in record.items():
            if value is None:
                encoded[name] = np.nan
            elif name in CATEGORY_CODES and isinstance(value, str):
                if value not in CATEGORY_CODES[name]:
                    raise ValueError(
                        f"{name}: unknown category {value!r}, "
                        f"expected one of {list(CATEGORY_CODES[name])}")
                encoded[name] = float(CATEGORY_CODES[name][value])
            else:
                encoded[name] = float(value)
        return encoded
 
    # ---------- per-record outputs ----------
    def stream_base_values(self) -> Dict[str, float]:
        return {
            stream: float(np.ravel(explainer.expected_value)[-1])
            for stream, explainer in self._explainer_by_stream.items()
        }
 
    def _stream_row(self, encoded: Mapping[str, float], stream: str) -> pd.DataFrame:
        cols = STREAM_FEATURES[stream]
        # XGBoost works in float32 internally, so build the row in float32 too;
        # prediction and SHAP then see exactly the same numbers.
        return pd.DataFrame([[encoded.get(name, np.nan) for name in cols]],
                            columns=cols, dtype=np.float32)
 
    def stream_margins(self, record: Record) -> Dict[str, float]:
        encoded = self.encode_record(record)
        margins: Dict[str, float] = {}
        for stream in STREAM_FEATURES:
            row = self._stream_row(encoded, stream)
            model = self.pipeline.stream_models[stream]
            margins[stream] = float(model.predict(row, output_margin=True)[0])
        return margins
 
    def stream_shap(self, record: Record) -> Dict[str, Dict[str, float]]:
        encoded = self.encode_record(record)
        out: Dict[str, Dict[str, float]] = {}
        for stream, cols in STREAM_FEATURES.items():
            row = self._stream_row(encoded, stream)
            values = self._explainer_by_stream[stream].shap_values(row)
            if isinstance(values, list):
                values = values[-1]
            values = np.asarray(values, dtype=float)
            if values.ndim == 3:
                values = values[:, :, -1]
            out[stream] = dict(zip(cols, values[0].tolist()))
        return out
 
 
if __name__ == "__main__":
    # Self-checks. Run from the repo root:  python -m stub_pipeline.stub_adapter
    from stub_pipeline.generate_synthetic_data import generate
    from stub_pipeline.train_stub_models import train_all
    from algorithms.math_utils import sigmoid
 
    train_all()
    pipeline = StubPipeline()
    frame = generate(n_rows=2000, seed=42)
    feature_cols = [c for cols in STREAM_FEATURES.values() for c in cols]
    adapter = StubModelAdapter(pipeline, frame[feature_cols])
 
    code_to_name = {code: name for name, code in ACTIVITY_CODES.items()}
    sample_row = frame[feature_cols].iloc[5]
    record = sample_row.to_dict()
    record["iot_watch_activity_type"] = code_to_name[int(record["iot_watch_activity_type"])]
 
    # Check 1: base value + sum of SHAP reproduces each stream probability
    base = adapter.stream_base_values()
    shap_by_stream = adapter.stream_shap(record)
    probs = adapter.stream_probabilities(record)
    for stream in STREAM_FEATURES:
        rebuilt = float(sigmoid(base[stream] + sum(shap_by_stream[stream].values())))
        assert abs(rebuilt - probs[stream]) < 1e-4, (stream, rebuilt, probs[stream])
    print("check 1 passed: additivity in margin space")
 
    # Check 2: final risk matches the pipeline's own answer
    reference = pipeline.explain(sample_row)["final_risk_probability"]
    mine = adapter.final_risk(record)
    assert abs(reference - mine) < 1e-4, (reference, mine)
    print(f"check 2 passed: final risk {mine:.4f} == pipeline {reference:.4f}")
 
    # Check 3: key order of the input dict does not matter
    shuffled = dict(reversed(list(record.items())))
    assert abs(adapter.final_risk(shuffled) - mine) < 1e-12
    assert adapter.flat_shap(shuffled) == adapter.flat_shap(record)
    print("check 3 passed: key order invariant")
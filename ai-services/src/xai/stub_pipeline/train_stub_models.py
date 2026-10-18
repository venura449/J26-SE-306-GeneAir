from __future__ import annotations

import math

import joblib
import numpy as np
import pandas as pd
import shap
import os
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from stub_pipeline.schema import STREAM_FEATURES, STREAMS, TVL_REGISTRY
from stub_pipeline.generate_synthetic_data import generate

ARTIFACT_DIR = "artifacts"

os.makedirs(ARTIFACT_DIR, exist_ok=True)

def _train_stream_model(X: pd.DataFrame, y: pd.Series) -> xgb.XGBClassifier:
    model = xgb.XGBClassifier(
        n_estimators=100, max_depth=3, learning_rate=0.1,
        eval_metric="logloss", random_state=42,
    )
    model.fit(X, y)
    return model


def _logit(p):
    p = np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def _fit_platt(raw_probs: np.ndarray, y: pd.Series) -> LogisticRegression:
    m = LogisticRegression(solver="lbfgs")
    m.fit(_logit(raw_probs).reshape(-1, 1), y.to_numpy())
    return m


def train_all(n_rows: int = 2000, seed: int = 42) -> dict:
    df = generate(n_rows=n_rows, seed=seed)
    y = df["at_risk"]

    train_idx, test_idx = train_test_split(
        df.index, test_size=0.2, random_state=seed, stratify=y
    )
    train_df, test_df = df.loc[train_idx], df.loc[test_idx]

    stream_models, train_probs, test_probs = {}, {}, {}
    for stream in STREAMS:  # now 4 streams, Static included
        cols = STREAM_FEATURES[stream]
        model = _train_stream_model(train_df[cols], train_df["at_risk"])
        stream_models[stream] = model
        train_probs[stream] = model.predict_proba(train_df[cols])[:, 1]
        test_probs[stream] = model.predict_proba(test_df[cols])[:, 1]

    # Fusion is NOT a trained model: equal mean, then Platt scaling.
    # No combo_model, no combo_train_X — that step never existed in C1.
    raw_train = np.mean([train_probs[s] for s in STREAMS], axis=0)
    raw_test = np.mean([test_probs[s] for s in STREAMS], axis=0)
    calibrator = _fit_platt(raw_train, train_df["at_risk"])

    final_test = calibrator.predict_proba(_logit(raw_test).reshape(-1, 1))[:, 1]
    test_acc = ((final_test >= 0.5).astype(int) == test_df["at_risk"]).mean()
    print(f"Stub fusion held-out accuracy: {test_acc:.3f} "
          f"(meaningless on synthetic data — sanity check only)")

    explainers = {
        "SubXAI01_IoT": shap.TreeExplainer(stream_models["IoT"]),
        "SubXAI02_Clinical": shap.TreeExplainer(stream_models["Clinical"]),
        "SubXAI03_Medication": shap.TreeExplainer(stream_models["Medication"]),
        "SubXAI04_Static": shap.TreeExplainer(stream_models["Static"]),
        # No MainXAI_Combination — fusion is analytic (equal mean + Platt),
        # not a tree, so there's nothing for a 5th TreeExplainer to attach to.
        # Cross-Level Reconciliation consumes the 4 SubXAI outputs plus
        # fusion_weights/calibrator directly.
    }

    artifacts = {
        "stream_models": stream_models,
        "explainers": explainers,
        "stream_feature_map": STREAM_FEATURES,
        "calibrator": calibrator,
        "fusion_weights": {s: 1 / len(STREAMS) for s in STREAMS},
    }
    joblib.dump(artifacts, f"{ARTIFACT_DIR}/stub_pipeline.joblib")
    print(f"Saved {ARTIFACT_DIR}/stub_pipeline.joblib")
    return artifacts


def compute_tvl(source_status: dict) -> dict:
    """Mirrors C1's compute_tvl exactly — 0-1 gamma, parallel metadata only."""
    fam = {}
    for name, cfg in TVL_REGISTRY.items():
        x = (source_status or {}).get(name, {}) or {}
        age = float(x.get("age_days", 0.0 if name == "static" else 1e9))
        coverage = float(np.clip(x.get("coverage", 1.0 if name == "static" else 0.0), 0, 1))
        completeness = float(np.clip(x.get("completeness", 1.0 if name == "static" else 0.0), 0, 1))
        H, V, r = cfg["half_life"], cfg["valid_age"], cfg["source_reliability"]
        gamma_time = 0.0 if (not np.isfinite(age) or age > V) else float(2 ** (-max(age, 0.0) / H))
        gamma_quality = float(math.sqrt(max(coverage * completeness * r, 0.0)))
        fam[name] = {
            "age_days": age, "coverage": coverage, "completeness": completeness,
            "gamma_time": gamma_time, "gamma_quality": gamma_quality,
            "gamma": gamma_time * gamma_quality,
            "stale": int((not np.isfinite(age)) or age > V),
        }
    return fam


class StubPipeline:
    """Load-once, explain-many wrapper. This is the interface every
    algorithm in algorithms/ should import and call — not the training
    internals above."""

    def __init__(self, artifact_path: str = f"{ARTIFACT_DIR}/stub_pipeline.joblib"):
        artifacts = joblib.load(artifact_path)
        self.stream_models = artifacts["stream_models"]
        self.explainers = artifacts["explainers"]
        self.stream_feature_map = artifacts["stream_feature_map"]
        self.calibrator = artifacts["calibrator"]
        self.fusion_weights = artifacts["fusion_weights"]

    def explain(self, record: pd.Series, tvl_sources: dict | None = None) -> dict:
        """record: one row with all raw stream feature columns (same shape
        as generate_synthetic_data.generate() output, minus the TVL context
        columns and record_id/at_risk).

        Returns SHAP values from the 4 SubXAI explainers, fusion weights,
        and calibrated probability. Combining stream-level SHAP with the
        analytic fusion+Platt step is Cross-Level Reconciliation's job, not
        this pipeline's — there's no MainXAI SHAP to hand back anymore.
        """
        result = {"stream_shap": {}, "stream_risks": {}}
        explainer_key = {
            "IoT": "SubXAI01_IoT", "Clinical": "SubXAI02_Clinical",
            "Medication": "SubXAI03_Medication", "Static": "SubXAI04_Static",
        }

        for stream, cols in self.stream_feature_map.items():
            X = record[cols].to_frame().T
            key = explainer_key[stream]
            shap_vals = self.explainers[key].shap_values(X)
            result["stream_shap"][key] = dict(zip(cols, np.ravel(shap_vals)))
            result["stream_risks"][stream] = float(self.stream_models[stream].predict_proba(X)[:, 1][0])

        raw = float(np.mean(list(result["stream_risks"].values())))
        final = float(self.calibrator.predict_proba(_logit([raw]).reshape(-1, 1))[:, 1][0])

        result["fusion_weights"] = self.fusion_weights
        result["raw_late_fusion_probability"] = raw
        result["final_risk_probability"] = final
        result["tvl"] = compute_tvl(tvl_sources or {})
        return result


if __name__ == "__main__":
    artifacts = train_all()

    pipeline = StubPipeline()
    df = generate(n_rows=1, seed=99)
    sample = df.iloc[0].drop(["record_id", "at_risk"])
    tvl_cols = [c for c in sample.index if c.endswith(("_age_days", "_coverage", "_completeness"))]
    feature_row = sample.drop(tvl_cols)

    explanation = pipeline.explain(feature_row)

    print("\nExplanation keys:", list(explanation.keys()))
    print("Final risk probability:", explanation["final_risk_probability"])
    print("SubXAI01_IoT SHAP (first 5):",
          dict(list(explanation["stream_shap"]["SubXAI01_IoT"].items())[:5]))
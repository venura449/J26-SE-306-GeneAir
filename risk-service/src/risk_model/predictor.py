from __future__ import annotations
import math
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

ROOT = Path(__file__).resolve().parents[2]

with warnings.catch_warnings():
    warnings.filterwarnings(
        "ignore",
        message=r".*If you are loading a serialized model.*",
        category=UserWarning,
    )
    BUNDLE = joblib.load(ROOT / "models" / "geneair_risk_model_bundle.joblib")


def _calibrate(raw_probability):
    # Platt-style calibration: P = 1 / (1 + e^-(b0 + b1 * logit(R_raw)))
    calibrator = BUNDLE["calibrator"]
    x = float(_logit([raw_probability])[0])
    score = float(calibrator.intercept_[0]) + float(calibrator.coef_[0][0]) * x
    return float(1.0 / (1.0 + math.exp(-score)))


def _logit(p):
    # Logit transformation: logit(p) = ln(p / (1 - p))
    p = np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


def compute_tvl(source_status: dict):
    reg = BUNDLE["tvl_registry"]
    fam = {}

    for name, cfg in reg.items():
        x = (source_status or {}).get(name, {}) or {}

        # Observation age: Age_i(t) = max(0, t - t_latest,i)
        age = float(x.get("age_days", 0.0 if name == "static" else 1e9))

        # Coverage_i = min(N_observed,i / N_expected,i, 1)
        coverage = float(
            np.clip(x.get("coverage", 1.0 if name == "static" else 0.0), 0, 1)
        )

        # Completeness_i = N_valid_fields,i / N_required_fields,i
        completeness = float(
            np.clip(x.get("completeness", 1.0 if name == "static" else 0.0), 0, 1)
        )

        H = float(cfg["half_life"])
        V = float(cfg["valid_age"])
        r = float(cfg["source_reliability"])

        # Temporal decay: gamma_time,i = 2^(-Age_i / H_i) if Age_i <= V_i, else 0
        gamma_time = (
            0.0
            if (not np.isfinite(age) or age > V)
            else float(2 ** (-max(age, 0.0) / H))
        )

        # Quality reliability: gamma_quality,i = sqrt(Coverage_i * Completeness_i * r_i)
        gamma_quality = float(math.sqrt(max(coverage * completeness * r, 0.0)))

        # Feature reliability: gamma_feature,i = gamma_time,i * gamma_quality,i
        gamma = gamma_time * gamma_quality

        # Stale indicator: Stale_i = 1 if Age_i > V_i, else 0
        stale = int((not np.isfinite(age)) or age > V)

        fam[name] = {
            "age_days": None if not np.isfinite(age) else age,
            "coverage": coverage,
            "completeness": completeness,
            "gamma_time": gamma_time,
            "gamma_quality": gamma_quality,
            "gamma": gamma,
            "stale": stale,
        }

    streams = {}

    for stream in BUNDLE["streams"]:
        fs = [f for f, c in reg.items() if c["stream"] == stream]

        # Normalized criticality: w_i' = w_i / sum(w_i)
        ws = np.asarray([reg[f]["criticality"] for f in fs], float)
        ws = ws / ws.sum()

        d = {}

        # Stream aggregation: gamma_s = sum(w_i * gamma_feature,i) / sum(w_i)
        for k in ["coverage", "completeness", "gamma_time", "gamma_quality", "gamma"]:
            d[k] = float(sum(fam[f][k] * w for f, w in zip(fs, ws)))

        # Stream stale flag: Stale_s = 1 if all registered families are stale
        d["stale"] = int(all(fam[f]["stale"] == 1 for f in fs))

        streams[stream] = d

    return {"version": BUNDLE["tvl_version"], "streams": streams, "families": fam}


def predict_from_features(stream_features: dict, tvl_sources: dict | None = None):
    stream_features = stream_features or {}
    risks = {}
    missing = {}

    for stream in BUNDLE["streams"]:
        features = BUNDLE["stream_features"][stream]
        incoming = stream_features.get(stream, {}) or {}
        row = {f: incoming.get(f, np.nan) for f in features}

        missing[stream] = [
            f
            for f, v in row.items()
            if (v is None or (isinstance(v, float) and np.isnan(v)))
        ]

        X = pd.DataFrame([row], columns=features)

        # Stream risk: Risk_s = P(Y = 1 | X_s)
        risks[stream] = float(BUNDLE["stream_models"][stream].predict_proba(X)[:, 1][0])

    # Simple mean late fusion: R_raw = (1 / S) * sum(Risk_s)
    raw = float(np.mean([risks[s] for s in BUNDLE["streams"]]))

    # Calibrated risk: P_final = sigmoid(b0 + b1 * logit(R_raw))
    final = _calibrate(raw)

    # TVL reliability: gamma_s = sum(w_i * gamma_feature,i) / sum(w_i)
    tvl = compute_tvl(tvl_sources or {})

    warnings = []
    for s, miss in missing.items():
        if miss:
            warnings.append(
                f'{s}: {len(miss)}/{len(BUNDLE["stream_features"][s])} expected features missing; model imputation was used.'
            )

    return {
        "final_risk_probability": final,
        "raw_late_fusion_probability": raw,
        # Risk state: elevated if P_final >= threshold, else lower
        "risk_state_demo": "elevated" if final >= BUNDLE["threshold"] else "lower",
        "threshold_demo": float(BUNDLE["threshold"]),
        "stream_risks": risks,
        "tvl": tvl,
        "component2_payload": {
            "stream_risks": risks,
            "final_risk_probability": final,
            "tvl": tvl,
        },
        "input_warnings": warnings,
        "model_version": BUNDLE["model_version"],
    }

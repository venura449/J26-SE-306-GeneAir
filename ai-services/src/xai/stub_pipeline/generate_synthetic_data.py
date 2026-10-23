from __future__ import annotations

import numpy as np
import pandas as pd

from stub_pipeline.schema import (
    IOT_FEATURES, CLINICAL_FEATURES, MEDICATION_FEATURES, STATIC_FEATURES,
    TVL_REGISTRY, ACTIVITY_CODES,
)

# Plausible raw ranges per feature. Not clinically calibrated — placeholder
# distributions only, matching the *raw current-value* contract (no means/
# stds/sums). Replace with real AAMOS-00 marginal distributions once available.
IOT_RANGES = {
    "iot_watch_hr": (50, 160), "iot_watch_steps": (0, 15000),
    "iot_watch_intensity": (0, 10), "iot_watch_activity_type": None,  # categorical
    "iot_env_temperature": (10, 40), "iot_env_temperature_min": (5, 30),
    "iot_env_temperature_max": (15, 45), "iot_env_pressure": (990, 1030),
    "iot_env_humidity": (20, 100), "iot_env_wind_speed": (0, 15), "iot_env_wind_deg": (0, 360),
    "iot_env_aqi": (1, 5), "iot_env_co": (0, 2), "iot_env_no": (0, 50), "iot_env_no2": (0, 80),
    "iot_env_o3": (0, 100), "iot_env_so2": (0, 40), "iot_env_pm2_5": (0, 120),
    "iot_env_pm10": (0, 180), "iot_env_nh3": (0, 30),
    "iot_env_grass_pollen": (0, 5), "iot_env_tree_pollen": (0, 5), "iot_env_weed_pollen": (0, 5),
}

CLINICAL_RANGES = {
    "clinical_pef_max": (150, 650), "clinical_pef_morning": (0, 1),
    "clinical_pef_expected_ratio": (0.4, 1.1), "clinical_pef_best_ratio": (0.4, 1.1),
    "clinical_night_symp": (0, 3), "clinical_day_symp": (0, 3),
    "clinical_limit_activity": (0, 3), "clinical_trigger_count": (0, 6),
}

MEDICATION_RANGES = {
    "med_prev_inhaler": (0, 1), "med_relief_inhaler": (0, 1),
    "med_inhaler_events": (0, 6), "med_inhaler_types": (0, 3), "med_n_inhalers": (1, 3),
}



def _random_uniform_block(rng: np.random.Generator, n_rows: int, ranges: dict) -> pd.DataFrame:
    cols = {}
    for feat, bounds in ranges.items():
        if feat == "iot_watch_activity_type":
            cols[feat] = rng.choice(list(ACTIVITY_CODES.values()), size=n_rows)
        else:
            lo, hi = bounds
            cols[feat] = rng.uniform(lo, hi, n_rows)
    return pd.DataFrame(cols)


def _random_static_features(rng: np.random.Generator, n_rows: int) -> pd.DataFrame:
    return pd.DataFrame({
        "static_bmi_range": rng.integers(1, 5, n_rows),
        "static_age_diagnosed_range": rng.integers(1, 6, n_rows),
        "static_max_pef_expected": rng.uniform(300, 650, n_rows),
        "static_pack_years": rng.uniform(0, 40, n_rows),
        "static_severity": rng.integers(1, 6, n_rows),
        "static_pef_best": rng.uniform(250, 600, n_rows),
    })


def _random_tvl_context(rng: np.random.Generator, n_rows: int) -> pd.DataFrame:
    """Per-SOURCE (not per-feature) TVL inputs: age_days/coverage/completeness.
    Separate metadata for Bootstrap UQ / reconciliation — never a model input."""
    cols = {}
    for source, cfg in TVL_REGISTRY.items():
        if source == "static":
            cols[f"{source}_age_days"] = np.zeros(n_rows)
            cols[f"{source}_coverage"] = np.ones(n_rows)
            cols[f"{source}_completeness"] = np.ones(n_rows)
        else:
            cols[f"{source}_age_days"] = rng.uniform(0, cfg["valid_age"] * 1.5, n_rows)
            cols[f"{source}_coverage"] = rng.uniform(0.3, 1.0, n_rows)
            cols[f"{source}_completeness"] = rng.uniform(0.3, 1.0, n_rows)
    return pd.DataFrame(cols)


def _synthetic_label(df: pd.DataFrame, rng: np.random.Generator) -> np.ndarray:
    """Weighted-noise binary label, NOT a clinical model — keyed off raw
    feature values now, not _tvl columns (those no longer exist as model inputs)."""
    score = (
        0.35 * (1 - df["clinical_pef_expected_ratio"])
        + 0.25 * (df["clinical_day_symp"] / 3.0)
        + 0.20 * (df["med_relief_inhaler"])
        + 0.10 * (df["iot_env_pm2_5"] / 120.0)
        + 0.10 * (df["static_severity"] / 5.0)
    )
    score += rng.normal(0, 0.05, size=len(df))
    threshold = np.quantile(score, 0.7)  # ~30% positive rate, roughly GINA-plausible
    return (score >= threshold).astype(int)


def generate(n_rows: int = 2000, seed: int = 42) -> pd.DataFrame:
    """Returns one synthetic patient-day DataFrame with:
      - raw stream feature columns (IoT/Clinical/Medication/Static) — these
        ARE the model inputs, matching schema.py exactly, no _tvl suffix
      - <source>_age_days / _coverage / _completeness per TVL_REGISTRY source
        — separate metadata, never fed to the models
      - an `at_risk` binary label column
    """
    rng = np.random.default_rng(seed)

    iot_df = _random_uniform_block(rng, n_rows, IOT_RANGES)
    clinical_df = _random_uniform_block(rng, n_rows, CLINICAL_RANGES)
    med_df = _random_uniform_block(rng, n_rows, MEDICATION_RANGES)
    static_df = _random_static_features(rng, n_rows)
    tvl_df = _random_tvl_context(rng, n_rows)

    out = pd.concat([iot_df, clinical_df, med_df, static_df, tvl_df], axis=1)
    out["at_risk"] = _synthetic_label(out, rng)
    out.insert(0, "record_id", np.arange(n_rows))
    return out


if __name__ == "__main__":
    df = generate()
    print(df.shape)
    print(df["at_risk"].value_counts(normalize=True))
    df.to_csv("artifacts/synthetic_patient_days.csv", index=False)
    print("Saved artifacts/synthetic_patient_days.csv")
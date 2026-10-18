STREAMS = ["IoT", "Clinical", "Medication", "Static"]

# Dynamic features per family, grouped by stream
IOT_FEATURES = [
    # watch family
    "iot_watch_hr", "iot_watch_steps", "iot_watch_intensity", "iot_watch_activity_type",
    # environment family
   "iot_env_temperature", "iot_env_temperature_min", "iot_env_temperature_max",
    "iot_env_pressure", "iot_env_humidity", "iot_env_wind_speed", "iot_env_wind_deg",
    "iot_env_aqi", "iot_env_co", "iot_env_no", "iot_env_no2", "iot_env_o3", "iot_env_so2",
    "iot_env_pm2_5", "iot_env_pm10", "iot_env_nh3",
    "iot_env_grass_pollen", "iot_env_tree_pollen", "iot_env_weed_pollen",
]

CLINICAL_FEATURES = [
    # peakflow family
    "clinical_pef_max", "clinical_pef_morning",
    "clinical_pef_expected_ratio", "clinical_pef_best_ratio",
    # symptoms family
    "clinical_night_symp", "clinical_day_symp", "clinical_limit_activity",
    "clinical_trigger_count",
]

MEDICATION_FEATURES = [
    # med_daily family
    "med_prev_inhaler", "med_relief_inhaler",
    # smart_inhaler family
    "med_inhaler_events", "med_inhaler_types",
    "med_n_inhalers",
]

STATIC_FEATURES = [
    "static_bmi_range", "static_age_diagnosed_range", "static_max_pef_expected",
    "static_pack_years", "static_severity", "static_pef_best",
]

STREAM_FEATURES = {
    "IoT": IOT_FEATURES,
    "Clinical": CLINICAL_FEATURES,
    "Medication": MEDICATION_FEATURES,
    "Static":STATIC_FEATURES
}

CATEGORICAL_FEATURES = ["iot_watch_activity_type"]

ACTIVITY_CODES = {"rest": 0, "walk": 1, "run": 2, "sleep": 3, "other": 4}

# --- Fusion is deterministic, NOT a trained model ---
FUSION_CONFIG = {
    "type": "equal_mean",
    "formula": "raw_late_fusion = mean(Risk_IoT, Risk_Clinical, Risk_Medication, Risk_Static)",
    "calibration": "platt_scaling_on_logit_of_raw_mean",  # sklearn LogisticRegression, not a tree
}

# TVL Score
TVL_REGISTRY = {
    "watch":         {"stream": "IoT",        "half_life": 1.0,   "valid_age": 3.0,    "source_reliability": 1.0, "criticality": 1.0},
    "environment":   {"stream": "IoT",        "half_life": 1.0,   "valid_age": 3.0,    "source_reliability": 1.0, "criticality": 1.0},
    "peakflow":      {"stream": "Clinical",   "half_life": 3.0,   "valid_age": 7.0,    "source_reliability": 1.0, "criticality": 1.0},
    "symptoms":      {"stream": "Clinical",   "half_life": 2.0,   "valid_age": 7.0,    "source_reliability": 1.0, "criticality": 1.0},
    "med_daily":     {"stream": "Medication", "half_life": 2.0,   "valid_age": 7.0,    "source_reliability": 1.0, "criticality": 1.0},
    "smart_inhaler": {"stream": "Medication", "half_life": 2.0,   "valid_age": 7.0,    "source_reliability": 1.0, "criticality": 1.0},
    "static":        {"stream": "Static",     "half_life": 365.0, "valid_age": 9999.0, "source_reliability": 1.0, "criticality": 1.0},
}

# Reconcillation 
RECONCILIATION_CONFIG = {
    "eps_abs": 1e-6,
    "rel_floor": 0.02,
    "cap_K": 5,
    "tol": 1e-6,
}

MODEL_VERSION_CONTRACT = "geneair_c01_raw_only_v1.0"
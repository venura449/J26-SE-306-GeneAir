"""
Tier classification for domain-aware counterfactual and explanation algorithm

  LOCKED       -> excluded from the search space entirely (cost = infinity).
                  Covers three distinct reasons, tracked separately so the
                  dissertation can justify each: immutable, exogenous
                  or outcome-reflective (see `reason` field).
  CLINICIAN    -> patient-mediated only through a clinician decision.
                  cost = survey-derived weight x GINA step-ladder multiplier.
  PATIENT      -> directly patient-actionable within hours.
                  cost = survey-derived weight (lowest baseline band).

Feature names match schema.py exactly (raw/current-value C1 contract,
model_version geneair_c01_raw_only_v1.0) — no aggregate/rolling variants.
"""

from dataclasses import dataclass
from enum import Enum

class Tier(Enum):
  LOCKED = "locked"          # exclude, cost = infinity
  CLINICIAN = "clinician"    # clinician mediated
  PATIENT = "patient"        # patient actionable


class Stream(Enum):
  IOT = "IoT"
  CLINICAL = "Clinical"
  MEDICATION = "Medication"
  STATIC = "Static"

@dataclass(frozen=True)
class FeatureTier:
  name: str
  stream: Stream
  tier: Tier
  reason: str
  cost_band: float | None = None
  excluded: bool = False

FEATURE_TIERS: dict[str, FeatureTier] = {

  #-------------------------Static----------------------------------------
  "static_age_diagnosed_range": FeatureTier(
    "static_age_diagnosed_range", Stream.STATIC, Tier.LOCKED,
    reason="immutable — historical fact", excluded=True
  ),
  "static_pack_years": FeatureTier(
    "static_pack_years", Stream.STATIC, Tier.LOCKED,
    reason="immutable — cumulative historical exposure", excluded=True
  ),
  "static_max_pef_expected": FeatureTier(
    "static_max_pef_expected", Stream.STATIC, Tier.LOCKED,
    reason="immutable — predicted reference constant, not a lever", excluded=True
  ),
  "static_pef_best": FeatureTier(
    "static_pef_best", Stream.STATIC, Tier.LOCKED,
    reason="immutable — personal-best reference value", excluded=True
  ),
  "static_bmi_range": FeatureTier(
    "static_bmi_range", Stream.STATIC, Tier.LOCKED,
    reason="not modifiable within 3-day prediction horizon", excluded=True
  ),
  "static_severity": FeatureTier(
    "static_severity", Stream.STATIC, Tier.CLINICIAN,
    reason="GINA severity/step classification - clinician assigned", cost_band=0.8
  ),

  #-------------------------IoT: smartwatch----------------------------------------------
  "iot_watch_steps": FeatureTier(
    "iot_watch_steps", Stream.IOT, Tier.PATIENT,
    reason="activity level, directly controllable", cost_band=0.2
  ),
  "iot_watch_intensity": FeatureTier(
    "iot_watch_intensity", Stream.IOT, Tier.PATIENT,
    reason="activity intensity, directly controllable", cost_band=0.25
  ),
  "iot_watch_activity_type": FeatureTier(
    "iot_watch_activity_type", Stream.IOT, Tier.PATIENT,
    reason="categorical activity choice (rest/walk/run/sleep/other), directly "
            "controllable — counterfactual search needs categorical-swap "
            "handling, not a continuous cost band", cost_band=0.3
  ),
  "iot_watch_hr": FeatureTier(
    "iot_watch_hr", Stream.IOT, Tier.LOCKED,
    reason="outcome-reflective - physiological response, not a lever", excluded=True
  ),

  #-------------------------IoT: environment (weather subgroup, exogenous)----------------------------------
  "iot_env_temperature": FeatureTier(
    "iot_env_temperature", Stream.IOT, Tier.LOCKED,
    reason="exogenous - no avoidance behavior available", excluded=True
  ),
  "iot_env_temperature_min": FeatureTier(
    "iot_env_temperature_min", Stream.IOT, Tier.LOCKED,
    reason="exogenous - no avoidance behavior available", excluded=True
  ),
  "iot_env_temperature_max": FeatureTier(
    "iot_env_temperature_max", Stream.IOT, Tier.LOCKED,
    reason="exogenous - no avoidance behavior available", excluded=True
  ),
  "iot_env_pressure": FeatureTier(
    "iot_env_pressure", Stream.IOT, Tier.LOCKED,
    reason="exogenous - no avoidance behavior available", excluded=True
  ),
  "iot_env_humidity": FeatureTier(
    "iot_env_humidity", Stream.IOT, Tier.LOCKED,
    reason="exogenous - no avoidance behavior available", excluded=True
  ),
  "iot_env_wind_speed": FeatureTier(
    "iot_env_wind_speed", Stream.IOT, Tier.LOCKED,
    reason="exogenous - no avoidance behavior available", excluded=True
  ),
  "iot_env_wind_deg": FeatureTier(
    "iot_env_wind_deg", Stream.IOT, Tier.LOCKED,
    reason="exogenous - no avoidance behavior available", excluded=True
  ),

  #-------------------------IoT: environment (exposure avoidance)----------------------------------
  "iot_env_aqi": FeatureTier(
    "iot_env_aqi", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing; needs narration translation", cost_band=0.6
  ),
  "iot_env_co": FeatureTier(
    "iot_env_co", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing; needs narration translation", cost_band=0.6
  ),
  "iot_env_no": FeatureTier(
    "iot_env_no", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing; needs narration translation", cost_band=0.6
  ),
  "iot_env_no2": FeatureTier(
    "iot_env_no2", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing; needs narration translation", cost_band=0.6
  ),
  "iot_env_o3": FeatureTier(
    "iot_env_o3", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing; needs narration translation", cost_band=0.6
  ),
  "iot_env_so2": FeatureTier(
    "iot_env_so2", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing; needs narration translation", cost_band=0.6
  ),
  "iot_env_pm2_5": FeatureTier(
    "iot_env_pm2_5", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing; needs narration translation", cost_band=0.6
  ),
  "iot_env_pm10": FeatureTier(
    "iot_env_pm10", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing; needs narration translation", cost_band=0.6
  ),
  "iot_env_nh3": FeatureTier(
    "iot_env_nh3", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing; needs narration translation", cost_band=0.6
  ),

  #-------------------------IoT: environment (weaker exposure-avoidance lever)----------------------------------
  "iot_env_grass_pollen": FeatureTier(
    "iot_env_grass_pollen", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing, weaker lever than pollutants (harder to fully avoid); needs narration translation", cost_band=0.75
  ),
  "iot_env_weed_pollen": FeatureTier(
    "iot_env_weed_pollen", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing, weaker lever than pollutants (harder to fully avoid); needs narration translation", cost_band=0.75
  ),
  "iot_env_tree_pollen": FeatureTier(
    "iot_env_tree_pollen", Stream.IOT, Tier.PATIENT,
    reason="exposure-avoidance framing, weaker lever than pollutants (harder to fully avoid); needs narration translation", cost_band=0.75
  ),

  #-------------------------Clinical----------------------------------------------------------------
  "clinical_pef_max": FeatureTier(
    "clinical_pef_max", Stream.CLINICAL, Tier.LOCKED,
    reason="outcome measurement, not a lever", excluded=True
  ),
  "clinical_pef_expected_ratio": FeatureTier(
    "clinical_pef_expected_ratio", Stream.CLINICAL, Tier.LOCKED,
    reason="outcome measurement, not a lever", excluded=True
  ),
  "clinical_pef_best_ratio": FeatureTier(
    "clinical_pef_best_ratio", Stream.CLINICAL, Tier.LOCKED,
    reason="outcome measurement, not a lever", excluded=True
  ),
  "clinical_pef_morning": FeatureTier(
    "clinical_pef_morning", Stream.CLINICAL, Tier.LOCKED,
    reason="measurement metadata - flags which reading was taken, not a "
            "modifiable patient behavior", excluded=True
  ),
  "clinical_night_symp": FeatureTier(
    "clinical_night_symp", Stream.CLINICAL, Tier.LOCKED,
    reason="symptom manifestation, not a lever", excluded=True
  ),
  "clinical_day_symp": FeatureTier(
    "clinical_day_symp", Stream.CLINICAL, Tier.LOCKED,
    reason="symptom manifestation, not a lever", excluded=True
  ),
  "clinical_limit_activity": FeatureTier(
    "clinical_limit_activity", Stream.CLINICAL, Tier.LOCKED,
    reason="symptom manifestation, not a lever", excluded=True
  ),
  "clinical_trigger_count": FeatureTier(
    "clinical_trigger_count", Stream.CLINICAL, Tier.LOCKED,
    reason="symptom manifestation, not a lever - revisit if this field "
            "turns out to mean reported avoidable triggers rather than "
            "trigger exposure count", excluded=True
  ),

  #-------------------------Medication------------------------------------------------------------
  "med_prev_inhaler": FeatureTier(
    "med_prev_inhaler", Stream.MEDICATION, Tier.CLINICIAN,
    reason="preventer adherence to a clinician-set regimen", cost_band=0.65
  ),
  "med_relief_inhaler": FeatureTier(
    "med_relief_inhaler", Stream.MEDICATION, Tier.CLINICIAN,
    reason="reliever use — high use is itself a risk signal, must route "
            "through clinician-mediated cost, not a direct patient dial", cost_band=0.85
  ),
  "med_inhaler_events": FeatureTier(
    "med_inhaler_events", Stream.MEDICATION, Tier.CLINICIAN,
    reason="smart inhaler telemetry, regimen-driven", cost_band=0.7
  ),
  "med_inhaler_types": FeatureTier(
    "med_inhaler_types", Stream.MEDICATION, Tier.CLINICIAN,
    reason="smart inhaler telemetry (distinct device count), regimen-driven", cost_band=0.7
  ),
  "med_n_inhalers": FeatureTier(
    "med_n_inhalers", Stream.MEDICATION, Tier.CLINICIAN,
    reason="reflects prescribed regimen count", cost_band=0.7
  ),

}

def get_cost_weight(feature_name: str) -> float:
    ft = FEATURE_TIERS[feature_name]
    if ft.excluded or ft.cost_band is None:
        raise ValueError(f"{feature_name} is not a valid search target (Tier LOCKED)")
    return ft.cost_band
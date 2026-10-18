"""
Shared risk thresholds for Component 2 (single source of truth).

All values apply to the calibrated FINAL risk probability (the Platt-scaled
output), never to a stream probability or a raw SHAP value.

    0%  - 60%   safe
    60% - 70%   moderate
    70% - 100%  high

Every lower bound is inclusive, so exactly 0.60 is "moderate" and exactly
0.70 is "high". The top band includes 1.0.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True)
class RiskBand:
    name: str
    lower: float   # inclusive
    upper: float   # exclusive (the top band also contains 1.0)


RISK_BANDS: Tuple[RiskBand, ...] = (
    RiskBand("safe", 0.00, 0.60),
    RiskBand("moderate", 0.60, 0.70),
    RiskBand("high", 0.70, 1.00),
)

# A patient-day is "at risk" (an alert is raised) once it leaves the safe band.
AT_RISK_CUTOFF: float = RISK_BANDS[1].lower          # 0.60

# The counterfactual search must bring the risk back below this value,
# i.e. back into the safe band. Kept as its own name so the two roles
# can be separated later without touching the callers.
COUNTERFACTUAL_CUTOFF: float = AT_RISK_CUTOFF


def validate_bands(bands: Tuple[RiskBand, ...]) -> None:
    if bands[0].lower != 0.0 or bands[-1].upper != 1.0:
        raise ValueError("risk bands must cover exactly 0.0 to 1.0")
    for band in bands:
        if not band.lower < band.upper:
            raise ValueError(f"band {band.name!r}: lower must be below upper")
    for lower_band, upper_band in zip(bands, bands[1:]):
        if lower_band.upper != upper_band.lower:
            raise ValueError(
                f"bands {lower_band.name!r} and {upper_band.name!r} are not contiguous")


validate_bands(RISK_BANDS)   # fail at import time if the table is edited badly


def risk_band(final_risk: float) -> str:
    """Name of the band a final risk probability falls in."""
    if math.isnan(final_risk) or not 0.0 <= final_risk <= 1.0:
        raise ValueError(f"final risk must be a probability in [0, 1], got {final_risk!r}")
    for band in RISK_BANDS[:-1]:
        if band.lower <= final_risk < band.upper:
            return band.name
    return RISK_BANDS[-1].name


def is_at_risk(final_risk: float) -> bool:
    """True when the risk is at or above the alert threshold."""
    return final_risk >= AT_RISK_CUTOFF
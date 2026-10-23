from __future__ import annotations

from stub_pipeline.schema import STREAM_FEATURES, TVL_REGISTRY
import numpy as np
from dataclasses import field, dataclass
from typing import Dict, List, Optional, Sequence

# Reverse check: feature name -> stream name
FEATURES_TO_STREAM: Dict[str, str]= {
    feat: stream for stream, feats in STREAM_FEATURES.items() for feat in feats
}

@dataclass(frozen=True)
class RecurringCauseConfig:
    top_k: int = 3
    min_alerts: int = 10
    half_life_days: Optional[float] = 30.0
    n_bootstrap: int = 500
    ci_level: float = 0.90
    min_recurrence: int = 0.5
    min_share_of_alerts: float = 0.05
    max_reported: int = 5
    seed: int = 42

@dataclass
class RecurringCause:
    feature: str
    stream: Optional[str]
    alerts_present: int
    alerts_leading: int
    alerts_total: int
    weighted_recurrence: float
    recurrence_ci: tuple
    mean_share__when_present: float
    score: float
    statement: str

@dataclass
class RecurringCauseResult:
    causes: List[RecurringCause] = field(default_factory=list)
    n_alerts_used: int = 0
    gates_passed: bool = False
    reason: str = ""

def recency_weights(timestamps_days: Optional[Sequence[float]], n_alerts: int, half_life_days: Optional[float]) -> np.ndarray:
    """Compute recency weights for a sequence of timestamps in days."""
    if half_life_days is None or timestamps_days is None:
        return np.ones(n_alerts)
    ages = np.asarray(timestamps_days, dtype=float)
    ages = ages - ages.min()          # measure age relative to the newest alert
    return 0.5 ** (ages / half_life_days)

def build_feature_universe(alerts: Sequence[Dict[str, float]]) -> List[str]:
    """Every feature name seen in any alert, in a stable (sorted) order."""
    names = set()
    for one_alert in alerts:
        names.update(one_alert.keys())
    return sorted(names)

def alert_tables(alerts: Sequence[Dict[str, float]], features: List[str], top_k: int, min_share: float):
    """Build a table of alert counts and shares for each feature."""
    n, m = len(alerts), len(features)
    col = {name: j for j, name in enumerate(features)}
    present = np.zeros((n,m), dtype=bool)
    leader = np.zeros((n,m), dtype=bool)
    share = np.zeros((n,m), dtype=float)

    for i, one_alert in enumerate(alerts):
        possitives = {f: v for f, v in one_alert.items() if v > 0}
        total_push = sum(possitives.values())
        if total_push <= 0:
            continue
        ranked = sorted(possitives.items(), key=lambda x: x[1], reverse=True)
        for rank, (f,v) in enumerate(ranked):
            share[i, col[f]] = v / total_push
            if rank == 0:
                leader[i, col[f]] = True
            if rank < top_k and (v / total_push) >= min_share:
                present[i, col[f]] = True
        
    return present, leader, share

def bootstrap_recurrence(present: np.ndarray, weights: np.ndarray, n_bootstrap: int, ci_level: float, rng: np.random.Generator):
    """Bootstrap the recurrence rate for each feature."""
    n = present.shape[0]
    draw_counts = rng.multinomial(n, np.full(n, 1.0/n), size=n_bootstrap)
    weighted_counts = draw_counts * weights
    denom = weighted_counts.sum(axis=1, keepdims=True)
    rates = (weighted_counts @ present.astype(float)) / denom                  # (B, m)
    tail = (1.0 - ci_level) / 2.0
    return np.quantile(rates, tail, axis=0), np.quantile(rates, 1.0 - tail, axis=0)
 
 
def statement(feature: str, present: int, leading: int, total: int) -> str:
    text = f"{feature} was among the leading contributors in {present} of {total} recent alerts"
    if leading > 0:
        text += f" and the single leading contributor in {leading} of them"
    return text + "."

def identify_recurring_causes( alerts: Sequence[Dict[str, float]], alert_age_days: Optional[Sequence[float]] = None, feature_to_stream: Optional[Dict[str, str]] = None,
     config: RecurringCauseConfig = RecurringCauseConfig(),) -> RecurringCauseResult:
    stream_lookup = FEATURES_TO_STREAM if feature_to_stream is None else feature_to_stream
    n_alerts = len(alerts)
    result = RecurringCauseResult(n_alerts_used=n_alerts)

    if n_alerts < config.min_alerts:
        result.reason = (f"Only {n_alerts} past alerts; at least {config.min_alerts} "
                         f"are needed before a recurring pattern is reported.")
        return result

    if alert_age_days is not None and len(alert_age_days) != n_alerts:
        raise ValueError("alert_age_days must have one entry per alert")

    features = build_feature_universe(alerts)
    present, leader, share = alert_tables(alerts, features, config.top_k, config.min_share_of_alerts)
    weights = recency_weights(alert_age_days, n_alerts, config.half_life_days)
    rng = np.random.default_rng(config.seed)

    weighted_rate = (weights @ present.astype(float)) / weights.sum()
    ci_lower, ci_upper = bootstrap_recurrence(present, weights, config.n_bootstrap, config.ci_level, rng)

    candidates: List[RecurringCause] = []
    for j, f in enumerate(features):
        if ci_lower[j] < config.min_recurrence:
            continue
        count_present = int(present[:, j].sum())
        mean_share = float(share[present[:, j], j].mean()) if count_present > 0 else 0.0
        count_leading = int(leader[:, j].sum())
        candidates.append(RecurringCause(
            feature=f,
            stream=stream_lookup.get(f),
            alerts_present=count_present,
            alerts_leading=count_leading,
            alerts_total=n_alerts,
            weighted_recurrence=float(weighted_rate[j]),
            recurrence_ci=(float(ci_lower[j]), float(ci_upper[j])),
            mean_share__when_present=mean_share,
            score=float(weighted_rate[j] * mean_share),
            statement=statement(f, count_present, count_leading, n_alerts),
        ))

    candidates.sort(key=lambda c: c.score, reverse=True)
    result.causes = candidates[:config.max_reported]
    result.gates_passed = len(result.causes) > 0

    if not result.gates_passed:
        result.reason = (f"No recurring causes met the minimum recurrence threshold of "
                         f"{config.min_recurrence:.2%} in the past {n_alerts} alerts.")
    
    return result

if __name__ == "__main__":
    rng = np.random.default_rng(0)
    names = ["iot_env_pm2_5", "clinical_night_symp", "med_relief_inhaler", "iot_watch_hr", "iot_env_humidity"]
 
    def fake_alert():
        # pm2_5 and night symptoms are made to recur; the rest are noise
        base = {n: rng.normal(0.0, 0.15) for n in names}
        base["iot_env_pm2_5"] += rng.uniform(0.5, 0.9)
        if rng.random() < 0.7:
            base["clinical_night_symp"] += rng.uniform(0.3, 0.6)
        return base
 
    history = [fake_alert() for _ in range(10)]
    ages = [3, 6, 10, 14, 20, 28, 35, 50, 65, 80]
 
    out = identify_recurring_causes(history, ages)
    print("gate passed:", out.gates_passed)
    for c in out.causes:
        print(f"- {c.statement}  rate={c.weighted_recurrence:.2f} ci=({c.recurrence_ci[0]:.2f},{c.recurrence_ci[1]:.2f}) stream={c.stream}")
 
    short = identify_recurring_causes(history[:3])
    print("short history ->", short.reason)
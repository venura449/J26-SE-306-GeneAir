import math
from dataclasses import dataclass, field
from tiers.feature_tiers import FEATURE_TIERS, get_cost_weight
from algorithms.math_utils import sigmoid, logit

GRID_STEPS = 20  # candidate values per continuous feature

@dataclass
class Change:
    feature: str
    old_value: object
    new_value: object
    cost: float


@dataclass
class CounterfactualResult:
    changes: list[Change] = field(default_factory=list)
    new_risk: float | None = None
    found: bool = False

    @property
    def total_cost(self) -> float:
        return sum(c.cost for c in self.changes)

# Positive SHAP (pushes risk up) and not LOCKED/excluded
def actionable_features(shap_by_feature: dict[str, float]) -> list[str]:
    return [
        f for f, phi in shap_by_feature.items()
        if phi > 0 and f in FEATURE_TIERS and not FEATURE_TIERS[f].excluded
    ]

# Approximate final risk if this feature's SHAP contribution vanished
def screen_final_risk(feature, shap_by_feature, stream_margins, stream_probs, platt_a, platt_b) -> float:
    stream = FEATURE_TIERS[feature].stream.value
    new_margin = stream_margins[stream] - shap_by_feature[feature]
    probs = dict(stream_probs)
    probs[stream] = sigmoid(new_margin)
    mean_p = sum(probs.values()) / len(probs)
    return sigmoid(platt_a * logit(mean_p) + platt_b)

# Approximate final risk if this feature's RECONCILED contribution vanished.
# Reconciled values live on the final log-odds scale, so no stream arithmetic is needed.
def screen_reconciled_risk(feature, reconciled_by_feature, current_risk) -> float:
    return sigmoid(logit(current_risk) - reconciled_by_feature[feature])

def rank_candidates(candidates, shap_by_feature, current_risk, stream_margins,
                    stream_probs, platt_a, platt_b, mode="effectiveness", ranking_shap=None):
    def score(f):
        cost = get_cost_weight(f)
        if mode == "cost":
            return -cost                                   # cheapest first
        if ranking_shap is not None:                       # rank with reconciled values
            if mode == "shap_per_cost":
                return ranking_shap[f] / cost
            drop = current_risk - screen_reconciled_risk(f, ranking_shap, current_risk)
            return drop / cost
        if mode == "shap_per_cost":
            return shap_by_feature[f] / cost
        drop = current_risk - screen_final_risk(
            f, shap_by_feature, stream_margins, stream_probs, platt_a, platt_b)
        return drop / cost

    return sorted(candidates, key=score, reverse=True)

def candidate_values(feature, instance, feature_ranges, categories):
    current = instance[feature]
    if feature in categories:                              # categorical swap
        return [(v, 1.0) for v in categories[feature] if v != current]

    lo, hi = feature_ranges[feature]
    span = (hi - lo) or 1.0
    step = span / GRID_STEPS
    values = [lo + i * step for i in range(GRID_STEPS + 1)]
    pairs = [(v, abs(v - current) / span) for v in values if v != current]
    return sorted(pairs, key=lambda p: p[1])               # normalised distance

def out_of_risk(feature, instance, predict_risk, cutoff, feature_ranges, categories):
    for value, dist in candidate_values(feature, instance, feature_ranges, categories):
        risk = predict_risk({**instance, feature: value}) 
        if risk < cutoff:
            cost = get_cost_weight(feature) * dist
            return Change(feature, instance[feature], value, cost), risk
    return None

def feature_selection(instance, shap_by_feature, predict_risk, cutoff, current_risk, stream_margins, stream_probs,
                      platt_a, platt_b, feature_ranges, categories, mode="effectiveness", ranking_shap=None):
    source = ranking_shap if ranking_shap is not None else shap_by_feature
    candidates = rank_candidates(
        actionable_features(source), shap_by_feature, current_risk,
        stream_margins, stream_probs, platt_a, platt_b, mode, ranking_shap)

    for f in candidates:
        hit = out_of_risk(f, instance, predict_risk, cutoff, feature_ranges, categories)
        if hit is not None:
            change, risk = hit
            return CounterfactualResult([change], risk, True), candidates
    return None, candidates

def multi_feature_search(instance, candidates, predict_risk, cutoff, feature_ranges, categories):
    working = dict(instance)
    changes: list[Change] = []
    risk = predict_risk(working)

    for f in candidates:
        options = candidate_values(f, working, feature_ranges, categories)
        if not options:
            continue
        # pick the value giving the lowest risk for this feature
        best_val, best_dist = min(
            options, key=lambda p: predict_risk({**working, f: p[0]}))
        new_risk = predict_risk({**working, f: best_val})
        if new_risk >= risk:
            continue                                       # no improvement
        changes.append(Change(f, working[f], best_val,
                              get_cost_weight(f) * best_dist))
        working[f], risk = best_val, new_risk
        if risk < cutoff:
            break

    if risk >= cutoff:
        return CounterfactualResult([], risk, False)

    # prune redundant changes (most expensive first)
    for ch in sorted(changes, key=lambda c: c.cost, reverse=True):
        trial = {**working, ch.feature: ch.old_value}
        if predict_risk(trial) < cutoff:
            working, changes = trial, [c for c in changes if c is not ch]

    return CounterfactualResult(changes, predict_risk(working), True)

def generate_counterfactual(instance, shap_by_feature, predict_risk, cutoff, current_risk, stream_margins, stream_probs,
                            platt_a, platt_b, feature_ranges, categories, mode="effectiveness",
                            ranking_shap=None) -> CounterfactualResult:
    if current_risk < cutoff:
        return CounterfactualResult([], current_risk, True)   # already safe

    result, candidates = feature_selection( instance, shap_by_feature, predict_risk, cutoff, current_risk,
        stream_margins, stream_probs, platt_a, platt_b, feature_ranges, categories, mode, ranking_shap)
    if result is not None:
        return result
    return multi_feature_search(instance, candidates, predict_risk, cutoff, feature_ranges, categories)
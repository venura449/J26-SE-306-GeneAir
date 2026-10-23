"""
Builds the three inputs Cross-Level Reconciliation needs, from a model adapter.

  phi_i : the stream's own SHAP values (log-odds of that stream's model)
  S_i   : sum of phi_i
  u_i   : the stream's exact Shapley share of the final log-odds movement.
          The four stream probabilities are the players, each stream's base
          value (as a probability) is the baseline, and the value function is
          the fusion (equal mean -> logit -> Platt slope/intercept).
          The four u_i always add up to  final_margin - baseline_margin.
"""
from __future__ import annotations

from itertools import combinations
from math import factorial
from typing import Any, Dict, List, Mapping, Tuple

import numpy as np

from adapters.model_adapter import PLATT_LOGIT_EPS, ModelAdapter
from algorithms.math_utils import logit, sigmoid
from stub_pipeline.schema import STREAMS


def fusion_margin(adapter: ModelAdapter, stream_probs: Mapping[str, float]) -> float:
    slope, intercept = adapter.platt_params()
    mean_prob = float(np.mean([stream_probs[s] for s in STREAMS]))
    return float(slope * logit(mean_prob, eps=PLATT_LOGIT_EPS) + intercept)


def stream_targets(adapter: ModelAdapter, record: Mapping[str, Any]) -> Tuple[Dict[str, float], float]:
    base_probs = {s: float(sigmoid(b)) for s, b in adapter.stream_base_values().items()}
    actual_probs = adapter.stream_probabilities(record)

    def value(coalition):
        mixed = {s: (actual_probs[s] if s in coalition else base_probs[s]) for s in STREAMS}
        return fusion_margin(adapter, mixed)

    n = len(STREAMS)
    targets: Dict[str, float] = {}
    for stream in STREAMS:
        others = [s for s in STREAMS if s != stream]
        share = 0.0
        for size in range(n):
            weight = factorial(size) * factorial(n - size - 1) / factorial(n)
            for subset in combinations(others, size):
                share += weight * (value(set(subset) | {stream}) - value(set(subset)))
        targets[stream] = share
    total_movement = value(set(STREAMS)) - value(set())
    return targets, total_movement


def build_reconciliation_inputs(adapter: ModelAdapter, record: Mapping[str, Any]):
    """Returns (phi, u, S, total_movement), each keyed by stream name."""
    shap_by_stream = adapter.stream_shap(record)
    feature_names = adapter.stream_feature_map()
    phi = {s: np.array([shap_by_stream[s][f] for f in feature_names[s]]) for s in STREAMS}
    S = {s: float(phi[s].sum()) for s in STREAMS}
    u, total_movement = stream_targets(adapter, record)
    return phi, u, S, total_movement


def flatten_by_feature(stream_features: Mapping[str, List[str]],
                       values_by_stream: Mapping[str, Any]) -> Dict[str, float]:
    """{stream: array of values in feature order} -> one {feature: value} dict."""
    flat: Dict[str, float] = {}
    for stream, names in stream_features.items():
        for name, value in zip(names, values_by_stream[stream]):
            flat[name] = float(value)
    return flat
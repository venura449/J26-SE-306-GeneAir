from __future__ import annotations
 
import csv
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Dict, FrozenSet, Iterable, List, Mapping, Optional, Sequence
import numpy as np
from algorithms.math_utils import sigmoid, logit


VALID_BOUND_TYPES = {"absolute", "relative"}
VALID_DISTRIBUTIONS = {"uniform", "truncated_normal"}
EPS = 1e-12
 
def opt_float(x: Any) -> Optional[float]:
    if x is None or x == "":
        return None
    s = str(x).strip()
    return None if s == "" or s.lower() in ("none", "nan") else float(s)

@dataclass(frozen=True)
class NoiseBound:
    feature: str
    stream: str
    bound_type: str
    value: float
    citation: str = ""
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None

    def __post_init__(self) -> None:
        if self.bound_type not in VALID_BOUND_TYPES:
            raise ValueError(f"{self.feature}: bound_type must be one of {VALID_BOUND_TYPES}, "
                f"got {self.bound_type!r}")
        
        if self.value < 0:
            raise ValueError(f"{self.feature}: value must be non-negative, got {self.value!r}")
        
    def half_width(self, x: float) -> float:
        if self.bound_type == "absolute":
            return self.value
        else:
            return abs(x) * self.value
    
class NoiseBoundTable:
    def __init__(self, bounds: Iterable[NoiseBound]):
        self.bounds_by_feature: Dict[str, NoiseBound] = {}
        for b in bounds:
            if b.feature in self.bounds_by_feature:
                raise ValueError(f"Duplicate noise bound for feature {b.feature!r}")
            self.bounds_by_feature[b.feature] = b
    
    @classmethod
    def from_csv(cls, path: str) -> NoiseBoundTable:
        bounds : List[NoiseBound] = []
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                bound = NoiseBound(
                    feature=row["feature"].strip(),
                    stream=row["stream"].strip(),
                    bound_type=row["bound_type"].strip().lower(),
                    value=float(row["bound_value"]),
                    citation=(row.get("citation") or "").strip(),
                    lower_bound=opt_float(row.get("lower_bound")),
                    upper_bound=opt_float(row.get("upper_bound")),
                )
                bounds.append(bound)
        return cls(bounds)

    def get(self, feature: str, stream: Optional[str] = None) -> Optional[NoiseBound]:
        b = self.bounds_by_feature.get(feature)
        if b is None:
            return None
        if b is not None and stream is not None and b.stream != stream:
            raise ValueError(f"Noise bound for feature {feature!r} is in stream {b.stream!r}, not {stream!r}")
        return b
    
    def __contains__(self, feature: str) -> bool:
        return feature in self.bounds_by_feature

    def __len__(self) -> int:
        return len(self.bounds_by_feature)

@dataclass(frozen=True)
class BootstrapConfig:
    n_samples: int = 200
    distribution: str = "uniform"  
    ci_level: float = 0.95
    top_k: int = 3
    sign_stability_threshold: float = 0.9
    seed: Optional[int] = None
    categorical_features: FrozenSet[str] = frozenset()

    def __post_init__(self) -> None:
        if self.n_samples < 2:
            raise ValueError(f"n_samples must be >= 2, got {self.n_samples!r}")
        if self.distribution not in VALID_DISTRIBUTIONS:
            raise ValueError(f"distribution must be in {VALID_DISTRIBUTIONS}, got {self.distribution!r}")
        if not (0 < self.ci_level < 1):
            raise ValueError(f"ci_level must be in (0, 1), got {self.ci_level!r}")
        if self.top_k < 1:
            raise ValueError(f"top_k must be positive, got {self.top_k!r}")

@dataclass
class FeatureUQ:
    feature: str
    value: float
    perturbed: bool
    shap_point: float
    shap_mean: float
    shap_std: float
    ci_lower: float
    ci_upper: float
    sign_stability: float
    topk_frequency: float
    is_stable: bool

@dataclass
class StreamUQ:
    stream: str
    expected_value: float
    prob_point: float
    prob_mean: float
    prob_std: float
    prob_ci_lower: float
    prob_ci_upper: float
    features: List[FeatureUQ] 
    unperturbed_features: List[str] 
    missing_features: List[str]

    def top_features(self, k: int = 5) -> List[FeatureUQ]:
        return sorted(self.features, key=lambda f: abs(f.shap_point), reverse=True)[:k]
    
@dataclass
class BootstrapUQResult:
    streams: Dict[str, StreamUQ]
    n_bootstrap: int
    ci_level: float
    distribution: str
    seed: Optional[int]
    elapsed_ms: float
    final_prob_point: Optional[float] = None
    final_prob_mean: Optional[float] = None
    final_prob_std: Optional[float] = None
    final_prob_ci_lower: Optional[float] = None
    final_prob_ci_upper: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self) # return a dictionary representation of the StreamUQ, including nested FeatureUQ objects

def make_platt_fusion(platt_a: float, platt_b: float,
        streams: Optional[Sequence[str]] = None ) -> Callable[[Mapping[str, np.ndarray]], np.ndarray]:
    """
    Platt fusion function that combines the probabilities of multiple streams.
    """
    def fuse(stream_probs: Mapping[str, np.ndarray]) -> np.ndarray:
        names = list(streams) if streams is not None else list(stream_probs)
        mean_p = np.mean([np.asarray(stream_probs[s], dtype=float) for s in names], axis=0)
        return sigmoid(platt_a * logit(mean_p) + platt_b)

    return fuse

def truncated_normal(rng: np.random.Generator, half_width: float, size: int) -> np.ndarray:
    """
    Sample from a truncated normal distribution with mean 0 and standard deviation 1,
    truncated to the range [-half_width, half_width].
    """
    sigma = half_width / 2.0
    out = rng.normal(loc=0.0, scale=sigma, size=size)
    for i in range(20):
        bad = np.abs(out) > half_width
        if not bad.any():
            return out
        out[bad] = rng.normal(loc=0.0, scale=sigma, size=bad.sum())
    return np.clip(out, -half_width, half_width)

def to_vector(reading: Any, names: Sequence[str]) -> tuple[np.ndarray, List[str]]:
    """
    Convert a reading to a vector of values corresponding to the given names.
    Missing values are filled with np.nan.
    """
    if hasattr(reading, "to_dict"):
        reading = reading.to_dict()
    vals, missing = [], []
    for name in names:
        v = reading.get(name, None) if isinstance(reading, Mapping) else None
        if v is None:
            vals.append(np.nan)
            missing.append(name)
        else:
            vals.append(float(v))
    return np.asarray(vals, dtype=float), missing

def perturb(x: np.ndarray, names: Sequence[str], stream: str, table: NoiseBoundTable,
     cfg: BootstrapConfig, rng: np.random.Generator) -> tuple[np.ndarray, List[str]]:
    """Perturb the input data by adding noise to each feature."""
    B = cfg.n_samples
    X = np.tile(x, (B, 1))
    fixed: List[str] = []
    for j, name in enumerate(names):
        nb = None if name in cfg.categorical_features else table.get(name, stream)
        if nb is None or np.isnan(x[j]):
            fixed.append(name)
            continue
        hw = nb.half_width(x[j])
        if hw <= 0.0:
            fixed.append(name)
            continue
        if cfg.distribution == "uniform":
            noise = rng.uniform(-hw, hw, size=B)
        else:
            noise = truncated_normal(rng, hw, size=B)
        v = x[j] + noise
        if nb.lower_bound is not None or nb.upper_bound is not None:
            v = np.clip(v, nb.lower_bound, nb.upper_bound)
        X[:, j] = v
    return X, fixed

def explain(explainer: Any, X: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Explain the predictions of a model using SHAP values.
    Returns the SHAP values and the expected value of the model.
    """
    shap_values = explainer.shap_values(X)
    if isinstance(shap_values, list):
        shap_values = shap_values[-1]  # take the last class for binary classification
    shap_values = np.asarray(shap_values, dtype=float)
    if shap_values.ndim == 3:
        shap_values = shap_values[:, :, -1]
    base = float(np.ravel(explainer.expected_value)[-1])
    return shap_values, base

def bootstrap_uq(readings: Mapping[str, Any], explainers: Mapping[str, Any], stream_features: Mapping[str, Sequence[str]],
     noise_table: NoiseBoundTable, cfg: BootstrapConfig = BootstrapConfig(), fusion_fn: Optional[Callable[[Mapping[str, np.ndarray]], np.ndarray]] = None) -> BootstrapUQResult:
    """
    Perform bootstrap uncertainty quantification on the given readings using the provided explainers and noise bounds.
    """
    t0 = time.perf_counter()
    rng = np.random.default_rng(cfg.seed)
    alpha = (1.0 - cfg.ci_level) / 2.0
    q_lower, q_upper = 100.0 * alpha, 100.0 * (1.0 - alpha)
    stream_out: Dict[str, StreamUQ] = {}
    prob_draws: DIct[str, np.ndarray] = {}
    prob_point: Dict[str, float] = {}

    for stream, reading in readings.items():
        if stream not in explainers:
            raise KeyError(f"No explainer provided for stream {stream!r}")
        if stream not in stream_features:
            raise KeyError(f"No features provided for stream {stream!r}")
        names = list(stream_features[stream])
        x, missing = to_vector(reading, names)
        X_b, fixed = perturb(x, names, stream, noise_table, cfg, rng)

        shap_values, base = explain(explainers[stream], np.vstack([x[None, :], X_b]))
        shap_pt, shap_b = shap_values[0], shap_values[1:]
        p_pt = float(sigmoid(base + shap_pt.sum()))
        p_b = sigmoid(base + shap_b.sum(axis=1))
        prob_point[stream], prob_draws[stream] = p_pt, p_b

        # Check sign stability
        sign_pt = np.sign(shap_pt)
        match = np.sign(shap_b) == sign_pt[None, :]
        zero_pt = np.abs(shap_pt) < EPS
        stab = np.where(zero_pt, (np.abs(shap_b) <= EPS).mean(axis=0), match.mean(axis=0))

        # Top-k frequency
        k = min(cfg.top_k, len(names))
        order = np.argsort(-np.abs(shap_b), axis=1)[:, :k]
        topk_freq = np.bincount(order.ravel(), minlength=len(names)) / cfg.n_samples
        ci_lower = np.percentile(shap_b, q_lower, axis=0)
        ci_upper = np.percentile(shap_b, q_upper, axis=0)
        fixed_set = set(fixed)
        feats = [
            FeatureUQ(
                feature=name,
                value=float(x[j]),
                perturbed=(name not in fixed_set),
                shap_point=float(shap_pt[j]),
                shap_mean=float(shap_b[:, j].mean()),
                shap_std=float(shap_b[:, j].std(ddof=1)),
                ci_lower=float(ci_lower[j]),
                ci_upper=float(ci_upper[j]),
                sign_stability=float(stab[j]),
                topk_frequency=float(topk_freq[j]),
                is_stable=bool(stab[j] >= cfg.sign_stability_threshold),
            )
            for j, name in enumerate(names)
        ]
        stream_out[stream] = StreamUQ(
            stream=stream,
            expected_value=base,
            prob_point=p_pt,
            prob_mean=float(p_b.mean()),
            prob_std=float(p_b.std(ddof=1)),
            prob_ci_lower=float(np.percentile(p_b, q_lower)),
            prob_ci_upper=float(np.percentile(p_b, q_upper)),
            features=feats,
            unperturbed_features=fixed,
            missing_features=missing,
        )

    result = BootstrapUQResult(
        streams=stream_out,
        n_bootstrap=cfg.n_samples,
        ci_level=cfg.ci_level,
        distribution=cfg.distribution,
        seed=cfg.seed,
        elapsed_ms=0.0,
    )

    if fusion_fn is not None:
        final_b = np.asarray(fusion_fn(prob_draws), dtype=float)
        final_pt = float(np.asarray(fusion_fn({s: np.array([p]) 
            for s, p in prob_point.items()}))[0])
        result.final_prob_point = final_pt
        result.final_prob_mean = float(final_b.mean())
        result.final_prob_std = float(final_b.std(ddof=1))
        result.final_prob_ci_lower = float(np.percentile(final_b, q_lower))
        result.final_prob_ci_upper = float(np.percentile(final_b, q_upper))

    result.elapsed_ms = (time.perf_counter() - t0) * 1000.0
    return result
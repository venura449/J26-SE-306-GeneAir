from __future__ import annotations
import os
import json
import warnings
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
import shap

from adapters.model_adapter import ModelAdapter, Record

BUNDLE_ENV = "GENEAIR_BUNDLE_PATH"
XAI_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BUNDLE = (
    Path(__file__).resolve().parents[4]
    / "risk-service" / "models" / "geneair_risk_model_bundle.joblib"
)
RANGES_FILE = XAI_ROOT / "config" / "feature_ranges.json"


def flatten_stream_features(stream_features: Mapping[str, Mapping[str, Any]]) -> Dict[str, Any]:
    """C1 sends {stream: {feature: value}}. Feature names are unique across streams
    (watch__, env__, peak__, sym__, med__, inh__, static__), so one flat dict is safe."""
    flat: Dict[str, Any] = {}
    for per_stream in (stream_features or {}).values():
        flat.update(per_stream or {})
    return flat


def _origin_of(out_name: str, originals: List[str]) -> Optional[str]:
    """Map a preprocessed column name back to the original C1 feature it came from."""
    strong = [o for o in originals if out_name == o or out_name.endswith("__" + o)]
    if strong:
        return max(strong, key=len)
    weak = [o for o in originals if out_name.startswith(o + "_") or ("__" + o + "_") in out_name]
    return max(weak, key=len) if weak else None


def _column_transformers(obj) -> list:
    if hasattr(obj, "transformers_"):
        return [obj]
    found = []
    for _, step in getattr(obj, "steps", []):
        found.extend(_column_transformers(step))
    return found


def _leaf_estimators(obj) -> list:
    if hasattr(obj, "steps"):
        return [step for _, step in obj.steps]
    return [obj]


class BundleModelAdapter(ModelAdapter):
    def __init__(self, bundle_path=None,
                 reference_frame: Optional[pd.DataFrame] = None,
                 feature_ranges: Optional[Dict[str, Tuple[float, float]]] = None):
        path = Path(bundle_path or os.environ.get(BUNDLE_ENV) or DEFAULT_BUNDLE)
        if not path.is_file():
            raise FileNotFoundError(f"C1 bundle not found at {path}. Set {BUNDLE_ENV}.")
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message=r".*If you are loading a serialized model.*")
            bundle = joblib.load(path)

        self.bundle_path = path
        self.streams: List[str] = list(bundle["streams"])
        self.threshold = float(bundle["threshold"])
        self.model_version = bundle.get("model_version")
        self._calibrator = bundle["calibrator"]
        self._features = {s: list(bundle["stream_features"][s]) for s in self.streams}
        self._reference = reference_frame
        self._ranges = feature_ranges

        self._pre: Dict[str, Any] = {}
        self._tree: Dict[str, Any] = {}
        self._out_names: Dict[str, List[str]] = {}
        self._origin: Dict[str, Dict[str, str]] = {}
        for s in self.streams:
            self._prepare_stream(s, bundle["stream_models"][s])

        self._explainer_by_stream = {s: shap.TreeExplainer(self._tree[s]) for s in self.streams}
        self._warm_up_explainers()

    # ---------- setup ----------
    def _prepare_stream(self, stream: str, model) -> None:
        steps = getattr(model, "steps", None)
        if steps and len(steps) > 1:
            pre, tree = model[:-1], steps[-1][1]
        elif steps:
            pre, tree = None, steps[-1][1]
        else:
            pre, tree = None, model
        self._pre[stream], self._tree[stream] = pre, tree

        originals = self._features[stream]
        names = None
        if pre is not None:
            try:
                names = [str(n) for n in pre.get_feature_names_out()]
            except Exception:
                names = None
        if names is None:
            names = list(originals)
        self._out_names[stream] = names

        mapping = {}
        for n in names:
            o = _origin_of(n, originals)
            if o is None:
                raise ValueError(f"{stream}: cannot match processed column '{n}' "
                                 f"to any input feature; map it manually.")
            mapping[n] = o
        self._origin[stream] = mapping

    def _warm_up_explainers(self) -> None:
        # Same reason as the stub: a fresh TreeExplainer can report a stale
        # expected_value until shap_values has run once.
        try:
            self.stream_shap({})
        except Exception as e:
            warnings.warn(f"explainer warm-up failed: {e}")

    # ---------- schema information ----------
    def stream_feature_map(self) -> Dict[str, List[str]]:
        return {s: list(f) for s, f in self._features.items()}

    def _encoder_categories(self) -> Dict[str, List[Any]]:
        found: Dict[str, List[Any]] = {}
        for s in self.streams:
            pre = self._pre[s]
            if pre is None:
                continue
            for ct in _column_transformers(pre):
                for _, trans, cols in ct.transformers_:
                    if not isinstance(cols, (list, tuple, np.ndarray, pd.Index)):
                        continue
                    for enc in _leaf_estimators(trans):
                        cats = getattr(enc, "categories_", None)
                        if cats is not None and len(cats) == len(cols):
                            for c, cat in zip(cols, cats):
                                found[str(c)] = [x.item() if hasattr(x, "item") else x for x in cat]
        return found

    def categorical_features(self) -> List[str]:
        return list(self._encoder_categories())

    def categories(self) -> Dict[str, List[Any]]:
        return self._encoder_categories()

    def feature_ranges(self) -> Dict[str, Tuple[float, float]]:
        cats = set(self.categorical_features())
        if self._ranges is not None:
            return dict(self._ranges)
        if self._reference is not None:
            out = {}
            for s in self.streams:
                for f in self._features[s]:
                    if f not in cats and f in self._reference:
                        out[f] = (float(self._reference[f].min()), float(self._reference[f].max()))
            return out
        if RANGES_FILE.is_file():
            raw = json.loads(RANGES_FILE.read_text())
            return {k: (float(v[0]), float(v[1])) for k, v in raw.items()}
        raise RuntimeError(
            f"No feature ranges available. Pass reference_frame or create {RANGES_FILE} "
            f"as {{'feature': [min, max], ...}} using the real C1 feature names.")

    # ---------- model internals ----------
    def explainers(self) -> Dict[str, Any]:
        return dict(self._explainer_by_stream)

    def platt_params(self) -> Tuple[float, float]:
        return float(self._calibrator.coef_[0][0]), float(self._calibrator.intercept_[0])

    def encode_record(self, record: Record) -> Dict[str, Any]:
        if hasattr(record, "to_dict"):
            record = record.to_dict()
        out: Dict[str, Any] = {}
        for name, value in record.items():
            if value is None:
                out[name] = np.nan
            elif isinstance(value, str):
                try:
                    out[name] = float(value)
                except ValueError:
                    out[name] = value
            elif isinstance(value, (int, float, np.number)):
                out[name] = float(value)
            else:
                out[name] = value
        return out

    # ---------- per-record helpers ----------
    def _frame(self, encoded: Mapping[str, Any], stream: str) -> pd.DataFrame:
        cols = self._features[stream]
        return pd.DataFrame([[encoded.get(f, np.nan) for f in cols]], columns=cols)

    def _tree_input(self, stream: str, frame: pd.DataFrame) -> pd.DataFrame:
        pre = self._pre[stream]
        if pre is None:
            return frame.astype(np.float32)
        arr = pre.transform(frame)
        if hasattr(arr, "toarray"):
            arr = arr.toarray()
        arr = np.asarray(arr, dtype=np.float32)
        return pd.DataFrame(arr, columns=self._out_names[stream])

    # ---------- per-record outputs ----------
    def stream_base_values(self) -> Dict[str, float]:
        return {s: float(np.ravel(e.expected_value)[-1])
                for s, e in self._explainer_by_stream.items()}

    def stream_margins(self, record: Record) -> Dict[str, float]:
        encoded = self.encode_record(record)
        out = {}
        for s in self.streams:
            X = self._tree_input(s, self._frame(encoded, s))
            out[s] = float(self._tree[s].predict(X, output_margin=True)[0])
        return out

    def stream_shap(self, record: Record) -> Dict[str, Dict[str, float]]:
        encoded = self.encode_record(record)
        out: Dict[str, Dict[str, float]] = {}
        for s in self.streams:
            X = self._tree_input(s, self._frame(encoded, s))
            values = self._explainer_by_stream[s].shap_values(X)
            if isinstance(values, list):
                values = values[-1]
            values = np.asarray(values, dtype=float)
            if values.ndim == 3:
                values = values[:, :, -1]
            per_feature = {f: 0.0 for f in self._features[s]}
            for name, v in zip(self._out_names[s], values[0]):
                per_feature[self._origin[s][name]] += float(v)
            out[s] = per_feature
        return out

    # ---------- check against C1 ----------
    def check_against_c1(self, record: Record, c1_stream_risks: Mapping[str, float],
                         tolerance: float = 1e-4) -> Dict[str, Dict[str, Any]]:
        base = self.stream_base_values()
        shap_by_stream = self.stream_shap(record)
        mine = self.stream_probabilities(record)
        report = {}
        for s in self.streams:
            rebuilt = float(1 / (1 + np.exp(-(base[s] + sum(shap_by_stream[s].values())))))
            report[s] = {
                "shap_additive": abs(rebuilt - mine[s]) <= tolerance,
                "matches_c1": abs(mine[s] - float(c1_stream_risks[s])) <= tolerance,
                "mine": mine[s], "c1": float(c1_stream_risks[s]), "from_shap": rebuilt,
            }
        return report
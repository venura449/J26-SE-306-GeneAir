"""
Component 2 orchestrator: one call turns a patient-day record into the
structured JSON the narrator consumes.

Order of work
  1. reconcile stream SHAP onto the final log-odds scale (done once, reused)
  2. Bootstrap UQ on the raw stream SHAP, intervals then scaled to the
     reconciled scale (simple k-scaled approximation)
  3. constrained counterfactual, only when the risk is at/above the cutoff
  4. recurring causes from the supplied alert history (reconciled values)
  5. TVL is passed through untouched (metadata only, never changes the risk)
"""
from __future__ import annotations

import dataclasses
import math
from typing import Any, Dict, List, Mapping, Optional, Sequence

import numpy as np

from adapters.model_adapter import ModelAdapter
from algorithms.bootstrap_uq import (BootstrapConfig, NoiseBoundTable, bootstrap_uq,
                                     make_platt_fusion)
from algorithms.counterfactual import generate_counterfactual
from algorithms.cross_level_reconciliation import reconcile_streams
from algorithms.recurring_cause import RecurringCauseConfig, identify_recurring_causes
from algorithms.stream_attribution import build_reconciliation_inputs, flatten_by_feature
from config.risk_thresholds import COUNTERFACTUAL_CUTOFF, risk_band
from stub_pipeline.schema import MODEL_VERSION_CONTRACT, RECONCILIATION_CONFIG

TINY = 1e-12
RANKING_SOURCES = ("raw", "reconciled")


def to_jsonable(obj: Any) -> Any:
    """Plain Python types only: numpy -> python, NaN/inf -> None, dataclass -> dict."""
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        obj = dataclasses.asdict(obj)
    if isinstance(obj, dict):
        return {str(k): to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set, frozenset)):
        return [to_jsonable(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return to_jsonable(obj.tolist())
    if isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        value = float(obj)
        return value if math.isfinite(value) else None
    return obj


class XAIOrchestrator:

    def __init__(self, adapter: ModelAdapter, noise_table: NoiseBoundTable,
                 bootstrap_config: Optional[BootstrapConfig] = None,
                 recurring_config: Optional[RecurringCauseConfig] = None,
                 cutoff: float = COUNTERFACTUAL_CUTOFF,
                 counterfactual_mode: str = "effectiveness",
                 counterfactual_ranking: str = "raw",
                 model_version: str = MODEL_VERSION_CONTRACT):
        if counterfactual_ranking not in RANKING_SOURCES:
            raise ValueError(f"counterfactual_ranking must be one of {RANKING_SOURCES}")
        self.adapter = adapter
        self.noise_table = noise_table
        self.bootstrap_config = bootstrap_config or BootstrapConfig(
            n_samples=200, seed=42,
            categorical_features=frozenset(adapter.categorical_features()))
        self.recurring_config = recurring_config or RecurringCauseConfig()
        self.cutoff = cutoff
        self.counterfactual_mode = counterfactual_mode
        self.counterfactual_ranking = counterfactual_ranking
        self.model_version = model_version

    def reconcile(self, record: Mapping[str, Any]) -> Dict[str, Any]:
        """Reconciliation for one record; reused by explain() and by history builders."""
        phi, u, S, total_movement = build_reconciliation_inputs(self.adapter, record)
        results = reconcile_streams(phi, u, S)
        stream_features = self.adapter.stream_feature_map()
        return {
            "phi": phi, "u": u, "S": S, "total_movement": total_movement,
            "results": results,
            "raw_flat": flatten_by_feature(stream_features, phi),
            "reconciled_flat": flatten_by_feature(
                stream_features, {s: results[s]["r_i"] for s in results}),
        }

    def explain(self, record: Mapping[str, Any],
                alert_history: Optional[Sequence[Mapping[str, float]]] = None,
                alert_ages: Optional[Sequence[float]] = None,
                tvl: Optional[Mapping[str, Any]] = None) -> Dict[str, Any]:
        adapter = self.adapter
        stream_features = adapter.stream_feature_map()
        final_risk = adapter.final_risk(record)
        stream_probs = adapter.stream_probabilities(record)

        recon = self.reconcile(record)
        uq = self._run_uq(record, stream_features)

        feature_rows, stream_rows = self._assemble_features(
            record, stream_features, stream_probs, recon, uq)

        reconciled_total = float(sum(recon["reconciled_flat"].values()))
        output = {
            "model_version": self.model_version,
            "risk": {
                "final": final_risk,
                "band": risk_band(final_risk),
                "at_risk": final_risk >= self.cutoff,
                "cutoff": self.cutoff,
                "interval": [uq.final_prob_ci_lower, uq.final_prob_ci_upper],
                "std": uq.final_prob_std,
                "ci_level": uq.ci_level,
                "n_bootstrap": uq.n_bootstrap,
            },
            "streams": stream_rows,
            "features": feature_rows,
            "reconciliation": {
                "total_log_odds_movement": recon["total_movement"],
                "sum_of_reconciled_values": reconciled_total,
                "decomposition_valid": abs(reconciled_total - recon["total_movement"]) < 1e-6,
            },
            "counterfactual": self._run_counterfactual(record, final_risk, stream_probs, recon),
            "recurring_causes": self._run_recurring(alert_history, alert_ages),
            "tvl": tvl,
        }
        return to_jsonable(output)

    # ------------------------------------------------------------------
    def _run_uq(self, record, stream_features):
        encoded = self.adapter.encode_record(record)
        readings = {s: {n: encoded[n] for n in names} for s, names in stream_features.items()}
        slope, intercept = self.adapter.platt_params()
        return bootstrap_uq(
            readings=readings,
            explainers=self.adapter.explainers(),
            stream_features=stream_features,
            noise_table=self.noise_table,
            cfg=self.bootstrap_config,
            fusion_fn=make_platt_fusion(slope, intercept),
        )

    def _assemble_features(self, record, stream_features, stream_probs, recon, uq):
        cap = RECONCILIATION_CONFIG["cap_K"]
        feature_rows: List[Dict[str, Any]] = []
        stream_rows: Dict[str, Any] = {}

        for stream, names in stream_features.items():
            S, u = recon["S"][stream], recon["u"][stream]
            stream_scale = min(abs(u / S), cap) if abs(S) > TINY else cap
            diag = recon["results"][stream]["diagnostics"]
            stream_uq = uq.streams[stream]
            stream_rows[stream] = {
                "probability": stream_probs[stream],
                "interval": [stream_uq.prob_ci_lower, stream_uq.prob_ci_upper],
                "raw_shap_sum": S,
                "target_share": u,
                "scale_factor": stream_scale,
                "diagnostics": {
                    "all_zero": bool(diag.get("all_zero", False)),
                    "near_zero": bool(diag.get("near_zero", False)),
                    "capped": bool(diag.get("capped", False)),
                    "sign_mismatch": bool(diag.get("sign_mismatch", False)),
                    "residual_before_redistribution": diag.get("residual_before_redistribution", 0.0),
                    "n_sign_flipped": int(np.sum(diag.get("sign_flipped", 0))),
                    "unallocated": diag.get("unallocated", 0.0),
                },
            }
            uq_by_name = {f.feature: f for f in stream_uq.features}
            for index, name in enumerate(names):
                raw = float(recon["phi"][stream][index])
                reconciled = recon["reconciled_flat"][name]
                ratio = reconciled / raw if abs(raw) > TINY else stream_scale
                f = uq_by_name[name]
                low, high = sorted((f.ci_lower * ratio, f.ci_upper * ratio))
                feature_rows.append({
                    "feature": name,
                    "stream": stream,
                    "value": record[name],
                    "raw_shap": raw,
                    "reconciled": reconciled,
                    "reconciled_interval": [low, high],
                    "sign_stability": f.sign_stability,
                    "topk_frequency": f.topk_frequency,
                    "is_stable": f.is_stable,
                    "perturbed": f.perturbed,
                })
        feature_rows.sort(key=lambda row: abs(row["reconciled"]), reverse=True)
        return feature_rows, stream_rows

    def _run_counterfactual(self, record, final_risk, stream_probs, recon):
        base = {"cutoff": self.cutoff, "mode": self.counterfactual_mode,
                "ranking": self.counterfactual_ranking}
        if final_risk < self.cutoff:
            return {**base, "needed": False, "found": True, "changes": [],
                    "new_risk": final_risk, "total_cost": 0.0}
        adapter = self.adapter
        slope, intercept = adapter.platt_params()
        result = generate_counterfactual(
            instance=dict(record),
            shap_by_feature=recon["raw_flat"],
            predict_risk=adapter.final_risk,
            cutoff=self.cutoff,
            current_risk=final_risk,
            stream_margins=adapter.stream_margins(record),
            stream_probs=stream_probs,
            platt_a=slope,
            platt_b=intercept,
            feature_ranges=adapter.feature_ranges(),
            categories=adapter.categories(),
            mode=self.counterfactual_mode,
            ranking_shap=recon["reconciled_flat"] if self.counterfactual_ranking == "reconciled" else None,
        )
        return {**base, "needed": True, "found": result.found,
                "changes": result.changes, "new_risk": result.new_risk,
                "total_cost": result.total_cost}

    def _run_recurring(self, alert_history, alert_ages):
        if alert_history is None:
            return {"status": "not_run", "reason": "no alert history supplied",
                    "gates_passed": False, "causes": []}
        result = identify_recurring_causes(alert_history, alert_ages, config=self.recurring_config)
        return {"status": "run", "gates_passed": result.gates_passed, "reason": result.reason,
                "n_alerts_used": result.n_alerts_used, "causes": result.causes}
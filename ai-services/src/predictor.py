import json, math
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

ROOT=Path(__file__).resolve().parents[1]
BUNDLE=joblib.load(ROOT/'model'/'GeneAir_Component01_Render_Bundle.joblib')

def _logit(p):
    p=np.clip(np.asarray(p,dtype=float),1e-6,1-1e-6)
    return np.log(p/(1-p))

def predict_from_features(stream_features: dict, tvl_sources: dict|None=None):
    risks={}
    for stream in BUNDLE['streams']:
        features=BUNDLE['stream_features'][stream]
        incoming=(stream_features or {}).get(stream,{}) or {}
        row={f:incoming.get(f,np.nan) for f in features}
        X=pd.DataFrame([row],columns=features)
        risks[stream]=float(BUNDLE['stream_models'][stream].predict_proba(X)[:,1][0])
    raw=float(np.mean([risks[s] for s in BUNDLE['streams']]))
    final=float(BUNDLE['calibrator'].predict_proba(_logit([raw]).reshape(-1,1))[:,1][0])
    tvl=compute_tvl(tvl_sources or {})
    
    return {
      'final_risk_probability':final,
      'raw_late_fusion_probability':raw,
      'risk_state_demo':'elevated' if final>=BUNDLE['threshold'] else 'lower',
      'threshold_demo':float(BUNDLE['threshold']),
      'stream_risks':risks,
      'tvl':tvl,
      'component2_payload':{'stream_risks':risks,'final_risk_probability':final,'tvl':tvl},
      'model_version':BUNDLE['model_version']
    }

def compute_tvl(source_status: dict):
    registry = BUNDLE['tvl_registry']
    families = {}

    for name, config in registry.items():
        source = source_status.get(name, {}) or {}
        default_age = 0.0 if name == 'static' else 1e9
        default_coverage = 1.0 if name == 'static' else 0.0
        default_completeness = 1.0 if name == 'static' else 0.0

        age = float(source.get('age_days', default_age))
        coverage = float(
            np.clip(source.get('coverage', default_coverage), 0, 1)
        )
        completeness = float(
            np.clip(source.get('completeness', default_completeness), 0, 1)
        )

        half_life = float(config['half_life'])
        valid_age = float(config['valid_age'])
        source_reliability = float(config['source_reliability'])

        gamma_time = (
            0.0
            if not np.isfinite(age) or age > valid_age
            else float(2 ** (-max(age, 0.0) / half_life))
        )
        gamma_quality = float(
            math.sqrt(max(coverage * completeness * source_reliability, 0.0))
        )
        gamma = gamma_time * gamma_quality
        stale = int(not np.isfinite(age) or age > valid_age)

        families[name] = {
            'age_days': None if not np.isfinite(age) else age,
            'coverage': coverage,
            'completeness': completeness,
            'gamma_time': gamma_time,
            'gamma_quality': gamma_quality,
            'gamma': gamma,
            'stale': stale,
        }

    streams = {}

    for stream in BUNDLE['streams']:
        stream_families = [
            family
            for family, config in registry.items()
            if config['stream'] == stream
        ]
        weights = np.array(
            [registry[family]['criticality'] for family in stream_families],
            dtype=float,
        )
        weights = weights / weights.sum()

        streams[stream] = {
            metric: float(
                sum(
                    families[family][metric] * weight
                    for family, weight in zip(stream_families, weights)
                )
            )
            for metric in [
                'coverage',
                'completeness',
                'gamma_time',
                'gamma_quality',
                'gamma',
            ]
        }
        streams[stream]['stale'] = int(
            all(families[family]['stale'] == 1 for family in stream_families)
        )

    return {
        'version': BUNDLE['tvl_version'],
        'streams': streams,
        'families': families,
    }

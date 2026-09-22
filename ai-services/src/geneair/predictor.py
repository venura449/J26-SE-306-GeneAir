from __future__ import annotations
import math
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

ROOT=Path(__file__).resolve().parents[2]
BUNDLE=joblib.load(ROOT/'model'/'GeneAir_Component01_RawOnly_Bundle.joblib')

def _logit(p):
    p=np.clip(np.asarray(p,dtype=float),1e-6,1-1e-6)
    return np.log(p/(1-p))

def compute_tvl(source_status: dict):
    reg=BUNDLE['tvl_registry']; fam={}
    for name,cfg in reg.items():
        x=(source_status or {}).get(name,{}) or {}
        age=float(x.get('age_days',0.0 if name=='static' else 1e9))
        coverage=float(np.clip(x.get('coverage',1.0 if name=='static' else 0.0),0,1))
        completeness=float(np.clip(x.get('completeness',1.0 if name=='static' else 0.0),0,1))
        H=float(cfg['half_life']); V=float(cfg['valid_age']); r=float(cfg['source_reliability'])
        gamma_time=0.0 if (not np.isfinite(age) or age>V) else float(2**(-max(age,0.0)/H))
        gamma_quality=float(math.sqrt(max(coverage*completeness*r,0.0)))
        gamma=gamma_time*gamma_quality
        stale=int((not np.isfinite(age)) or age>V)
        fam[name]={'age_days':None if not np.isfinite(age) else age,'coverage':coverage,'completeness':completeness,'gamma_time':gamma_time,'gamma_quality':gamma_quality,'gamma':gamma,'stale':stale}
    streams={}
    for stream in BUNDLE['streams']:
        fs=[f for f,c in reg.items() if c['stream']==stream]
        ws=np.asarray([reg[f]['criticality'] for f in fs],float); ws=ws/ws.sum()
        d={}
        for k in ['coverage','completeness','gamma_time','gamma_quality','gamma']:
            d[k]=float(sum(fam[f][k]*w for f,w in zip(fs,ws)))
        d['stale']=int(all(fam[f]['stale']==1 for f in fs))
        streams[stream]=d
    return {'version':BUNDLE['tvl_version'],'streams':streams,'families':fam}

def predict_from_features(stream_features: dict, tvl_sources: dict|None=None):
    stream_features=stream_features or {}
    risks={}; missing={}
    for stream in BUNDLE['streams']:
        features=BUNDLE['stream_features'][stream]
        incoming=stream_features.get(stream,{}) or {}
        row={f:incoming.get(f,np.nan) for f in features}
        missing[stream]=[f for f,v in row.items() if (v is None or (isinstance(v,float) and np.isnan(v)))]
        X=pd.DataFrame([row],columns=features)
        risks[stream]=float(BUNDLE['stream_models'][stream].predict_proba(X)[:,1][0])
    raw=float(np.mean([risks[s] for s in BUNDLE['streams']]))
    final=float(BUNDLE['calibrator'].predict_proba(_logit([raw]).reshape(-1,1))[:,1][0])
    tvl=compute_tvl(tvl_sources or {})
    warnings=[]
    for s,miss in missing.items():
        if miss: warnings.append(f'{s}: {len(miss)}/{len(BUNDLE["stream_features"][s])} expected features missing; model imputation was used.')
    return {
        'final_risk_probability':final,
        'raw_late_fusion_probability':raw,
        'risk_state_demo':'elevated' if final>=BUNDLE['threshold'] else 'lower',
        'threshold_demo':float(BUNDLE['threshold']),
        'stream_risks':risks,
        'tvl':tvl,
        'component2_payload':{'stream_risks':risks,'final_risk_probability':final,'tvl':tvl},
        'input_warnings':warnings,
        'model_version':BUNDLE['model_version'],
    }

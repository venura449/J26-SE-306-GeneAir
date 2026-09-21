import numpy as np
import pandas as pd

POLLEN={'low':0.0,'moderate':1.0,'high':2.0,'very high':3.0}
IOT_SENSOR_MAP={
 'hr':'watch__hr_value','steps':'watch__steps_value','intensity':'watch__intensity_value',
 'temperature':'env__temperature','pressure':'env__pressure','humidity':'env__humidity','wind_speed':'env__wind_speed','aqi':'env__aqi','co':'env__co','no':'env__no','no2':'env__no2','o3':'env__o3','so2':'env__so2','pm2_5':'env__pm2_5','pm10':'env__pm10','nh3':'env__nh3','grass_pollen':'env__grass_pollen_ord','tree_pollen':'env__tree_pollen_ord','weed_pollen':'env__weed_pollen_ord'
}

def trend_sign_to_num(v):
    if isinstance(v,str):
        z=v.strip().lower()
        if z in {'up','rising','increase','increasing'}: return 1.0
        if z in {'down','falling','decrease','decreasing'}: return -1.0
        if z in {'flat','stable','same'}: return 0.0
    try:return float(np.sign(float(v)))
    except:return 0.0

def _num(v):
    if isinstance(v,str) and v.strip().lower() in POLLEN:return POLLEN[v.strip().lower()]
    try:return float(v)
    except:return np.nan

def summarize(values, days=None, explicit_trend=None):
    y=np.asarray([_num(v) for v in values],float); m=np.isfinite(y); y=y[m]
    if days is None: x=np.arange(len(values),dtype=float)[m]
    else: x=np.asarray(days,float)[m]
    if len(y)==0:return {'last':np.nan,'mean':np.nan,'slope':np.nan,'delta':np.nan,'trend_sign':trend_sign_to_num(explicit_trend)}
    last=float(y[-1]); mean=float(np.mean(y))
    if len(y)>=2 and not np.allclose(x,x[0]):
        slope=float(np.polyfit(x,y,1)[0]); delta=float(y[-1]-y[0]); sign=float(np.sign(slope))
    else:slope=np.nan; delta=np.nan; sign=0.0
    if explicit_trend is not None:sign=trend_sign_to_num(explicit_trend)
    return {'last':last,'mean':mean,'slope':slope,'delta':delta,'trend_sign':sign}

def build_iot_features(iot_history, iot_current=None):
    # iot_history: list of daily dictionaries ordered oldest->newest, each may include day and supported sensor keys.
    iot_history=iot_history or []; iot_current=iot_current or {}
    days=[r.get('day',i) for i,r in enumerate(iot_history)]
    out={}
    for external,base in IOT_SENSOR_MAP.items():
        vals=[r.get(external,np.nan) for r in iot_history]
        current=iot_current.get(external,{})
        explicit=None
        if isinstance(current,dict):
            if 'raw' in current: vals=(vals+[current['raw']])[-7:]; days=list(range(len(vals)))
            explicit=current.get('trend')
        s=summarize(vals,days[-len(vals):] if vals else [],explicit)
        for k,v in s.items():out[f'{base}_{k}']=v
    return out

def build_dynamic_features(history, prefix_map):
    history=history or []; days=[r.get('day',i) for i,r in enumerate(history)]; out={}
    for external,base in prefix_map.items():
        s=summarize([r.get(external,np.nan) for r in history],days)
        for k,v in s.items():out[f'{base}_{k}']=v
    return out

CLINICAL_MAP={'pef_max_mean':'peak__pef_max_mean','pef_max_min':'peak__pef_max_min','pef_max_max':'peak__pef_max_max','pefs_mean':'peak__pefs_mean','peakflow_sessions':'peak__peakflow_sessions','pef_expected_ratio':'peak__pef_expected_ratio','pef_best_ratio':'peak__pef_best_ratio','night_symptom':'sym__daily_night_symp','day_symptom':'sym__daily_day_symp','activity_limitation':'sym__daily_limit_activity','symptom_score':'sym__daily_symptom_score','trigger_count':'sym__daily_trigger_count'}
MEDICATION_MAP={'previous_inhaler':'med__daily_prev_inhaler','relief_inhaler':'med__daily_relief_inhaler','inhaler_events':'inh__inhaler_events','inhaler_types':'inh__inhaler_types'}

def build_stream_features(payload):
    iot=build_iot_features(payload.get('iot_history',[]),payload.get('iot_current',{}))
    clinical=build_dynamic_features(payload.get('clinical_history',[]),CLINICAL_MAP)
    medication=build_dynamic_features(payload.get('medication_history',[]),MEDICATION_MAP)
    if 'n_inhalers' in payload.get('static',{}):medication['med__n_inhalers']=payload['static']['n_inhalers']
    static={f'static__{k}':v for k,v in (payload.get('static',{}) or {}).items() if k in {'bmi_range','age_diagnosed_range','max_pef_expected','pack_years','severity','pef_best'}}
    return {'IoT':iot,'Clinical':clinical,'Medication':medication,'Static':static}

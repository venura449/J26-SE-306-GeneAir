from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from src.feature_engineering import build_stream_features
from src.predictor import predict_from_features

app=FastAPI(title='GeneAir Component 01',version='2.0')

class PredictionRequest(BaseModel):
    iot_history: List[Dict[str,Any]]=[]
    iot_current: Dict[str,Any]={}
    clinical_history: List[Dict[str,Any]]=[]
    medication_history: List[Dict[str,Any]]=[]
    static: Dict[str,Any]={}
    tvl_sources: Dict[str,Dict[str,Any]]={}

class FeatureRequest(BaseModel):
    stream_features: Dict[str,Dict[str,Any]]
    tvl_sources: Dict[str,Dict[str,Any]]={}
    
@app.get('/health')
def health(): return {'status':'ok','component':'GeneAir C01','architecture':'Traditional late fusion + parallel TVL'}

@app.post('/predict')
def predict(req:PredictionRequest):
    try:return predict_from_features(build_stream_features(req.model_dump()),req.tvl_sources)
    except Exception as e: raise HTTPException(status_code=400,detail=str(e))

@app.post('/predict-features')
def predict_features(req:FeatureRequest):
    try:return predict_from_features(req.stream_features,req.tvl_sources)
    except Exception as e: raise HTTPException(status_code=400,detail=str(e))

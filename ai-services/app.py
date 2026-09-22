from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
from src.geneair.predictor import predict_from_features, BUNDLE

app=FastAPI(title='GeneAir Component 01 — Raw-Only Risk API',version=BUNDLE['model_version'])

class PredictRequest(BaseModel):
    stream_features: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    tvl_sources: Optional[Dict[str, Dict[str, Any]]] = None

@app.get('/')
def root():
    return {'service':'GeneAir Component 01','model_version':BUNDLE['model_version'],'architecture':BUNDLE['architecture']}

@app.get('/health')
def health():
    return {'status':'ok','model_version':BUNDLE['model_version']}

@app.get('/model-info')
def model_info():
    return {'model_version':BUNDLE['model_version'],'architecture':BUNDLE['architecture'],'iot_contract':BUNDLE['iot_contract'],'stream_features':BUNDLE['stream_features'],'threshold_demo':BUNDLE['threshold']}

@app.post('/predict')
def predict(req: PredictRequest):
    return predict_from_features(req.stream_features,req.tvl_sources)

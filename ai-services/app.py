from fastapi import FastAPI, HTTPException
from src.risk_model.feature_engineering import build_stream_features
from src.risk_model.predictor import predict_from_features
from src.schemas import FeatureRequest, PredictionRequest

app=FastAPI(title='GeneAir Engine',version='2.0')

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

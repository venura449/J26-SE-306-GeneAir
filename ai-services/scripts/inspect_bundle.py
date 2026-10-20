import sys, joblib
from pathlib import Path

path = Path(sys.argv[1]) if len(sys.argv) > 1 else (
    Path(__file__).resolve().parents[2] / "risk-service" / "models"
    / "geneair_risk_model_bundle.joblib")
B = joblib.load(path)

for k in ["model_version", "architecture", "fusion_config",
          "iot_contract", "unsupported_training_sensor_note", "threshold"]:
    print(f"{k}: {B[k]}")

for s in B["streams"]:
    m = B["stream_models"][s]
    feats = B["stream_features"][s]
    print(f"\n[{s}] {len(feats)} input features")
    for name, step in m.steps:
        print("   step:", name, "->", type(step).__name__)
    if len(m.steps) > 1:
        pre = m[:-1]
        try:
            out = list(pre.get_feature_names_out())
            print("   preprocessed columns:", len(out))
            print("   first 5:", out[:5])
        except Exception as e:
            print("   output names unavailable:", e)
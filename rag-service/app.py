from fastapi import FastAPI, HTTPException
from src.schemas import AskRequest
from src.rag_service import answer_question

app = FastAPI(title="GeneAir Context-Aware RAG", version="1.0")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "component": "GeneAir Context-Aware RAG",
        "architecture": "hybrid retrieval + corrective retrieval + safety routing",
    }


@app.post("/ask")
def ask(request: AskRequest):
    try:
        return answer_question(request)
    except Exception as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

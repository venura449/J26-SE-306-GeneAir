from pathlib import Path
import json
import os
import re
from urllib.request import Request, urlopen

import numpy as np
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE_DIR = ROOT / "knowledge"
LLAMA_URL = os.getenv("LLAMA_CPP_URL", "http://127.0.0.1:8080/v1/chat/completions")
LLAMA_MODEL = os.getenv("LLAMA_CPP_MODEL", "local-model")


def _chunks(text, size=900, overlap=120):
    words = text.split()
    return [" ".join(words[i:i + size]) for i in range(0, len(words), size - overlap)]


def load_documents():
    records = []
    for path in sorted(KNOWLEDGE_DIR.glob("**/*")):
        if path.suffix.lower() not in {".txt", ".md", ".pdf"}:
            continue
        if path.suffix.lower() == ".pdf":
            reader = PdfReader(str(path))
            text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        else:
            text = path.read_text(encoding="utf-8").strip()
        for index, chunk in enumerate(_chunks(text)):
            if chunk:
                records.append({"source": path.name, "chunk_id": f"{path.stem}-{index + 1}", "text": chunk})
    return records


def retrieve(question, limit=4):
    records = load_documents()
    if not records:
        return []
    matrix = TfidfVectorizer(stop_words="english").fit_transform([question] + [r["text"] for r in records])
    scores = (matrix[1:] @ matrix[0].T).toarray().ravel()
    order = np.argsort(scores)[::-1][:limit]
    return [{**records[i], "score": round(float(scores[i]), 4)} for i in order if scores[i] > 0]


def ask(question, limit=4):
    evidence = retrieve(question, limit)
    if not evidence:
        return {"answer": "I could not find supporting information in the local asthma knowledge base.", "grounded": False, "sources": []}
    context = "\n\n".join(f"[{item['chunk_id']}] {item['text']}" for item in evidence)
    prompt = f"Use only the evidence below. If it does not answer the question, say that evidence is insufficient. Do not diagnose or prescribe. Cite supporting chunk IDs.\n\nEvidence:\n{context}\n\nQuestion: {question}"
    payload = json.dumps({"model": LLAMA_MODEL, "messages": [{"role": "user", "content": prompt}], "temperature": 0.1, "max_tokens": 500}).encode()
    try:
        request = Request(LLAMA_URL, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=90) as response:
            result = json.loads(response.read().decode("utf-8"))
        answer = result["choices"][0]["message"]["content"]
    except Exception as error:
        raise RuntimeError(f"Unable to reach llama.cpp at {LLAMA_URL}: {error}") from error
    return {"answer": answer, "grounded": True, "sources": [{k: item[k] for k in ("source", "chunk_id", "score")} for item in evidence]}

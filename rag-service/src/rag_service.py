from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import re
from urllib.request import Request, urlopen

import chromadb
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import torch

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE_DIR = Path(os.getenv("KNOWLEDGE_DIR", str(ROOT / "knowledge")))
CHROMA_DIR = Path(os.getenv("CHROMA_DIR", str(ROOT / "chroma_db")))
MANIFEST_PATH = CHROMA_DIR / "index_manifest.json"
COLLECTION = "geneair_evidence"
CORPUS_VERSION = os.getenv("CORPUS_VERSION", "geneair-evidence-v1")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
RAG_DEVICE = os.getenv("RAG_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
LLAMA_URL = os.getenv("LLAMA_CPP_URL", "http://127.0.0.1:8080/v1/chat/completions")
LLAMA_MODEL = os.getenv("LLAMA_CPP_MODEL", "local-model")
AUTHORITY = {
    "guideline": 1.0,
    "curated_pg": 0.95,
    "systematic_review": 0.8,
    "primary_study": 0.6,
    "unknown": 0.2,
}
GENE_TOKENS = {
    "ormdl3",
    "17q21",
    "rs7216389",
    "il13",
    "rs20541",
    "adam33",
    "rs2280091",
    "adrb2",
    "rs1042713",
}
EMERGENCY = re.compile(
    r"\b(can't breathe|cannot breathe|blue lips|severe breathing|emergency|life[- ]threatening|chest pain)\b",
    re.I,
)
MED_CHANGE = re.compile(
    r"\b(change|increase|decrease|stop|start|dose|dosage|prescribe)\b.*\b(inhaler|medication|drug|medicine)\b",
    re.I,
)
_embedder = None
_collection = None


def _chunks(text, size=500, overlap=80):
    words = text.split()
    step = max(1, size - overlap)
    return [
        " ".join(words[i : i + size])
        for i in range(0, len(words), step)
        if words[i : i + size]
    ]


def _file_records(path, file_hash):
    records = []
    text = (
        "\n".join(p.extract_text() or "" for p in PdfReader(str(path)).pages)
        if path.suffix.lower() == ".pdf"
        else path.read_text(encoding="utf-8")
    )
    relative = path.relative_to(KNOWLEDGE_DIR).as_posix()
    lower_path = relative.lower()
    evidence_type = (
        "guideline"
        if "gina" in lower_path or "safety" in lower_path
        else (
            "systematic_review"
            if "review" in lower_path or "association" in lower_path
            else (
                "curated_pg"
                if "pharmacogen" in lower_path
                or "clinpgx" in lower_path
                or "cpic" in lower_path
                else "unknown"
            )
        )
    )
    for index, chunk in enumerate(_chunks(text.strip())):
        records.append(
            {
                "id": f"{hashlib.sha1(relative.encode()).hexdigest()[:12]}-{index + 1}",
                "file": relative,
                "file_hash": file_hash,
                "source": path.name,
                "text": chunk,
                "evidence_type": evidence_type,
                "actionability": "non_actionable",
            }
        )
    return records


def _load_file_records():
    files = {}
    for path in sorted(KNOWLEDGE_DIR.glob("**/*")) if KNOWLEDGE_DIR.exists() else []:
        if path.is_file() and path.suffix.lower() in {".txt", ".md", ".pdf"}:
            file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            relative = path.relative_to(KNOWLEDGE_DIR).as_posix()
            files[relative] = {
                "hash": file_hash,
                "records": _file_records(path, file_hash),
            }
    return files


def _collection_ready():
    global _collection, _embedder
    if _collection is not None:
        return _collection
    _embedder = _embedder or SentenceTransformer(EMBEDDING_MODEL, device=RAG_DEVICE)
    _collection = chromadb.PersistentClient(
        path=str(CHROMA_DIR)
    ).get_or_create_collection(
        COLLECTION, metadata={"hnsw:space": "cosine", "corpus_version": CORPUS_VERSION}
    )
    files = _load_file_records()
    old_manifest = (
        json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        if MANIFEST_PATH.exists()
        else {}
    )
    changed = {
        name for name, item in files.items() if old_manifest.get(name) != item["hash"]
    }
    removed = set(old_manifest) - set(files)
    for name in changed | removed:
        _collection.delete(where={"file": name})
    changed_records = [record for name in changed for record in files[name]["records"]]
    if changed_records:
        _collection.add(
            ids=[r["id"] for r in changed_records],
            documents=[r["text"] for r in changed_records],
            embeddings=_embedder.encode(
                [r["text"] for r in changed_records],
                normalize_embeddings=True,
                batch_size=32,
                show_progress_bar=True,
            ).tolist(),
            metadatas=[
                {
                    k: r[k]
                    for k in (
                        "id",
                        "file",
                        "source",
                        "file_hash",
                        "evidence_type",
                        "actionability",
                    )
                }
                | {"indexed": True}
                for r in changed_records
            ],
        )
    if changed or removed or not MANIFEST_PATH.exists():
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        MANIFEST_PATH.write_text(
            json.dumps({name: item["hash"] for name, item in files.items()}, indent=2),
            encoding="utf-8",
        )
        _collection.modify(
            metadata={"corpus_version": CORPUS_VERSION, "index_mode": "incremental"}
        )
    return _collection


def _context_terms(context):
    terms = []
    for variant in context.genetics:
        terms += [variant.gene, variant.rsid, variant.genotype, variant.evidence_role]
    terms += [
        str(v)
        for v in [
            context.age_group,
            context.severity,
            *context.clinical.keys(),
            *context.medication.keys(),
        ]
    ]
    return [x.lower() for x in terms if x]


def _retrieve(question, context, limit):
    global _embedder
    collection = _collection_ready()
    if not collection.count():
        return []
    query = question + " " + " ".join(_context_terms(context))
    semantic = collection.query(
        query_embeddings=_embedder.encode(
            [query], normalize_embeddings=True, batch_size=1
        ).tolist(),
        n_results=min(limit * 3, 20),
        include=["documents", "metadatas", "distances"],
    )
    exact = set(re.findall(r"[a-z0-9_]+", query.lower()))
    candidates = []
    for text, meta, distance in zip(
        semantic["documents"][0], semantic["metadatas"][0], semantic["distances"][0]
    ):
        lexical = sum(
            1 for token in exact if len(token) > 2 and token in text.lower()
        ) / max(len(exact), 1)
        score = (
            0.65 * (1 - float(distance))
            + 0.2 * lexical
            + 0.15 * AUTHORITY.get(meta.get("evidence_type", "unknown"), 0.2)
        )
        candidates.append(
            {
                "chunk_id": meta.get("id") or "",
                "source": meta.get("source", ""),
                "text": text,
                "evidence_type": meta.get("evidence_type", "unknown"),
                "actionability": meta.get("actionability", "non_actionable"),
                "score": round(score, 4),
            }
        )
    return sorted(candidates, key=lambda x: x["score"], reverse=True)[:limit]


def _safety(question):
    if EMERGENCY.search(question):
        return {
            "state": "urgent",
            "message": "This may be an emergency. Seek urgent medical help now or contact local emergency services.",
        }
    if MED_CHANGE.search(question):
        return {
            "state": "clinician_review",
            "message": "Do not change or stop asthma medicine based only on this answer. Discuss medication changes with a qualified clinician.",
        }
    return {"state": "normal", "message": ""}


def _generate(question, context, evidence, safety):
    prompt = {
        "question": question,
        "patient_context": context.model_dump(exclude_none=True),
        "evidence": [
            {"id": e["chunk_id"], "text": e["text"], "type": e["evidence_type"]}
            for e in evidence
        ],
        "rules": [
            "Use only supplied evidence.",
            "Cite chunk IDs next to claims.",
            "Separate susceptibility research from actionable prescribing guidance.",
            "Say evidence is insufficient when unsupported.",
            "Do not diagnose or prescribe.",
        ],
    }
    body = json.dumps(
        {
            "model": LLAMA_MODEL,
            "messages": [{"role": "user", "content": json.dumps(prompt)}],
            "temperature": 0.1,
            "max_tokens": 900,
        }
    ).encode()
    request = Request(
        LLAMA_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=90) as response:
        payload = json.loads(response.read().decode())

    choice = (payload.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    answer = message.get("content") or choice.get("text") or ""
    if not isinstance(answer, str):
        answer = str(answer)

    # Only remove reasoning when Gemma provides a separate final channel.
    original = answer.strip()
    channel_pattern = r"<\|channel(?:\|)?\s*>"
    final_match = re.search(channel_pattern + r"\s*final\b", original, flags=re.I)
    if final_match:
        answer = original[final_match.end() :]
    else:
        answer = re.sub(
            channel_pattern + r"\s*(?:thought|analysis)\b\s*",
            "",
            original,
            count=1,
            flags=re.I,
        )
        answer = re.sub(r"<\|(?:end|eot|eom)\|>", "", answer, flags=re.I)

    answer = answer.strip()
    if not answer:
        return "The model did not return a final answer. Please retry the question."
    return answer


def _evidence_matches_context(question, context, evidence):
    query = question.lower()
    genetic_query = any(token in query for token in GENE_TOKENS) or bool(
        context.genetics
    )
    if not genetic_query:
        return True
    evidence_text = " ".join(item["text"].lower() for item in evidence)
    query_tokens = {
        token.lower() for token in re.findall(r"\b(?:rs\d+|[a-z0-9]+)\b", query)
    }
    context_tokens = {
        v.lower()
        for variant in context.genetics
        for v in (variant.gene, variant.rsid)
        if v
    }
    target_tokens = query_tokens | context_tokens
    rsids = {
        token for token in target_tokens if token.startswith("rs") and token[2:].isdigit()
    }
    if rsids:
        return any(token in evidence_text for token in rsids)
    return any(token in evidence_text for token in target_tokens if len(token) > 2)


def answer_question(request):
    safety = _safety(request.question)
    if safety["state"] == "urgent":
        return {
            "answer": safety["message"],
            "citations": [],
            "safety": safety,
            "evidence_state": "abstained",
        }
    evidence = _retrieve(request.question, request.context, request.top_k)
    correction = {"attempted": False, "reason": None}
    if (
        not evidence
        or evidence[0]["score"] < 0.35
        or not _evidence_matches_context(request.question, request.context, evidence)
    ):
        correction = {
            "attempted": True,
            "reason": "Initial evidence was weak; trusted-corpus corrective retrieval was attempted.",
        }
        evidence = _retrieve(
            request.question + " asthma guideline evidence",
            request.context,
            request.top_k,
        )
    if (
        not evidence
        or evidence[0]["score"] < 0.35
        or not _evidence_matches_context(request.question, request.context, evidence)
    ):
        return {
            "answer": "Evidence is insufficient in the approved GeneAir knowledge base.",
            "citations": [],
            "safety": safety,
            "evidence_state": "insufficient",
            "correction": correction,
        }
    answer = _generate(request.question, request.context, evidence, safety)
    return {
        "answer": answer,
        "citations": [
            {
                "chunk_id": e["chunk_id"],
                "source": e["source"],
                "evidence_type": e["evidence_type"],
                "score": e["score"],
            }
            for e in evidence
        ],
        "safety": safety,
        "evidence_state": (
            "sufficient"
            if evidence[0]["score"] >= 0.35
            and _evidence_matches_context(request.question, request.context, evidence)
            else "weak"
        ),
        "correction": correction,
        "context_fields_used": _context_terms(request.context),
        "corpus_version": CORPUS_VERSION,
        "model": LLAMA_MODEL,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

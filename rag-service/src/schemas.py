from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class GeneticVariant(BaseModel):
    gene: str = ""
    rsid: str = ""
    genotype: str = ""
    evidence_role: str = "unknown"
    evidence_tier: Optional[int] = None
    population: str = ""

class PatientContext(BaseModel):
    genetics: List[GeneticVariant] = Field(default_factory=list)
    clinical: Dict[str, Any] = Field(default_factory=dict)
    medication: Dict[str, Any] = Field(default_factory=dict)
    age_group: str = ""
    severity: str = ""

class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    context: PatientContext = Field(default_factory=PatientContext)
    top_k: int = Field(default=5, ge=1, le=10)

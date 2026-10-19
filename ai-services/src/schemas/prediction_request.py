from typing import Any

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    iot_history: list[dict[str, Any]] = Field(default_factory=list)
    iot_current: dict[str, Any] = Field(default_factory=dict)
    clinical_history: list[dict[str, Any]] = Field(default_factory=list)
    medication_history: list[dict[str, Any]] = Field(default_factory=list)
    static: dict[str, Any] = Field(default_factory=dict)
    tvl_sources: dict[str, dict[str, Any]] = Field(default_factory=dict)

from typing import Any

from pydantic import BaseModel, Field


class FeatureRequest(BaseModel):
    stream_features: dict[str, dict[str, Any]]
    tvl_sources: dict[str, dict[str, Any]] = Field(default_factory=dict)

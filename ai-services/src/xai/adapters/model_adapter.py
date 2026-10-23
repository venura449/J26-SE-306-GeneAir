from __future__ import annotations
from typing import Any, Dict, List, Mapping,Tuple
from abc import ABC, abstractmethod
from algorithms.math_utils import sigmoid, logit
import numpy as np

Record = Mapping[str, Any]

PLATT_LOGIT_EPS = 1e-6

class ModelAdapter(ABC):
    """
    Abstract base class for model adapters.
    """

    @abstractmethod
    def stream_feature_map(self) -> Dict[str, List[str]]:
        """
        Returns a mapping of stream names to their corresponding feature names.
        """
    
    @abstractmethod
    def categorical_features(self) -> List[str]:
        """
        Returns a list of categorical feature names.
        """
    
    @abstractmethod
    def feature_ranges(self) -> Dict[str, Tuple[float, float]]:
        """
        Returns a mapping of feature names to their corresponding (min, max) ranges.
        """
    
    @abstractmethod
    def categories(self) -> Dict[str, List[Any]]:
        """
        Returns a mapping of categorical feature names to their corresponding categories.
        """
    
    @abstractmethod
    def explainers(self) -> Dict[str, Any]:
        """
        Returns a mapping of stream names to their corresponding explainer objects.
        """
    
    @abstractmethod
    def platt_params(self) -> Tuple[float, float]:
        """
        Returns the parameters (a, b) for Platt scaling.
        """
    
    @abstractmethod
    def encode_record(self, record: Record) -> Dict[str, float]:
        """
        Encodes a record into a dictionary of feature values.
        """
    
    @abstractmethod
    def stream_base_values(self) -> Dict[str, float]:
        """
        Returns a mapping of stream names to their corresponding base values.
        """
    
    @abstractmethod
    def stream_margins(self, record: Record) -> Dict[str, float]:
        """
        Returns a mapping of stream names to their corresponding risk values for a given record.
        """

    @abstractmethod
    def stream_shap(self, record: Record) -> Dict[str, Dict[str, float]]:
        """
        Returns a mapping of stream names to their corresponding SHAP values for a given record.
        """
    
    def stream_probabilities(self, record: Record) -> Dict[str, float]:
        margins = self.stream_margins(record)
        return {stream: float(sigmoid(m)) for stream, m in margins.items()}

    def flat_shap(self, record: Record) -> Dict[str, float]:
        flat: Dict[str, float] = {}
        for per_stream in self.stream_shap(record).values():
            flat.update(per_stream)
        return flat
    
    def final_risk(self, record: Record) -> float:
        probs = self.stream_probabilities(record)
        mean_prob = float(np.mean(list(probs.values())))
        slope,intercept = self.platt_params()
        return float(sigmoid(slope * logit(mean_prob, eps=PLATT_LOGIT_EPS) + intercept))
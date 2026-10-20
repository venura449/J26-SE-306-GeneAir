import numpy as np
from typing import Union

Number = Union[float, np.ndarray]

def sigmoid(x: Number) -> Number:
    return 1.0 / (1.0 + np.exp(-x))

def logit(p: Number, eps: float = 1e-6) -> Number:
    p = np.clip(p, eps, 1.0 - eps)
    return np.log(p / (1.0 - p))


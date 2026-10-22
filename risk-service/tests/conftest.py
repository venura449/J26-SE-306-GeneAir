import sys
import logging
from pathlib import Path

import pytest


LOGGER = logging.getLogger("geneair.component01.tests")


@pytest.fixture(autouse=True)
def log_each_test(request):
    LOGGER.info("START %s", request.node.nodeid)
    yield
    LOGGER.info("END %s status=completed", request.node.nodeid)


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))


@pytest.fixture
def complete_tvl_sources():
    return {
        "watch": {"age_days": 0, "coverage": 1.0, "completeness": 1.0},
        "environment": {"age_days": 0, "coverage": 1.0, "completeness": 1.0},
        "peakflow": {"age_days": 0, "coverage": 1.0, "completeness": 1.0},
        "symptoms": {"age_days": 0, "coverage": 1.0, "completeness": 1.0},
        "med_daily": {"age_days": 0, "coverage": 1.0, "completeness": 1.0},
        "smart_inhaler": {"age_days": 0, "coverage": 1.0, "completeness": 1.0},
        "static": {"age_days": 0, "coverage": 1.0, "completeness": 1.0},
    }


@pytest.fixture
def complete_stream_features():
    return {"IoT": {}, "Clinical": {}, "Medication": {}, "Static": {}}

from pydantic import BaseModel
from typing import List

class Finding(BaseModel):
    label: str
    probability: float

class ReportResponse(BaseModel):
    findings: str
    impression: str
    full_report: str
    findings_tags: List[Finding]
    latency_ms: float
    model_version: str
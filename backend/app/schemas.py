from pydantic import BaseModel
from typing import List, Optional

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
    heatmap: Optional[str] = None       # ← NEW
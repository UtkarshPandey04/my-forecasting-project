"""Operational response action queue for advisories and mitigation workflows."""

from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/response", tags=["response"])
_action_queue: List[Dict] = []


class ResponseActionRequest(BaseModel):
    action_type: str = Field(min_length=2, max_length=80)
    stakeholder: str = Field(min_length=2, max_length=80)
    station_id: str = "anand_vihar"
    severity: str = "high"
    message: str = Field(min_length=2, max_length=500)
    source: str = "AeroSense"


@router.post("/actions")
def queue_response_action(request: ResponseActionRequest):
    action = {
        "id": f"ACT-{uuid4().hex[:8].upper()}",
        "status": "QUEUED",
        "created_at": datetime.now(timezone.utc).isoformat(),
        **request.model_dump(),
    }
    _action_queue.insert(0, action)
    del _action_queue[50:]
    return action


@router.get("/actions")
def get_response_actions():
    return {"actions": _action_queue, "count": len(_action_queue)}

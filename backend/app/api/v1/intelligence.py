"""FastAPI routes for AeroSense Intelligence, LLM Reasoning, and Confidence Estimation."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, get_app_settings
from app.core.config import Settings
from app.schemas.intelligence import (
    AtmosphericQueryRequest,
    AtmosphericQueryResponse,
    AvailableModelsResponse,
)
from app.services.intelligence import IntelligenceService

router = APIRouter()


@router.post("/ask", response_model=AtmosphericQueryResponse)
async def ask_intelligence(
    req: AtmosphericQueryRequest,
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
):
    """Answers any atmospheric forecast question with coupled physical reasoning and dynamic confidence."""
    service = IntelligenceService(db, settings)
    try:
        return await service.answer_query(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intelligence inference error: {str(e)}")


@router.get("/models", response_model=AvailableModelsResponse)
def get_available_ai_models(
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
):
    """Returns all available AI forecasting models and current active status."""
    service = IntelligenceService(db, settings)
    return service.get_available_models()

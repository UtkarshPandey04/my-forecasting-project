from fastapi import APIRouter
from app.api.v1.stations import router as stations_router
from app.api.v1.observations import router as observations_router
from app.api.v1.forecast import router as forecast_router
from app.api.v1.health import router as health_router
from app.api.v1.atmospheric import router as atmospheric_router
from app.api.v1.evaluation import router as evaluation_router
from app.api.v1.wrfchem import router as wrfchem_router
from app.api.v1.scenarios import router as scenarios_router
from app.api.v1.response import router as response_router
from app.api.v1.mitigation import router as mitigation_router
from app.api.v1.disaster import router as disaster_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.circular import router as circular_router
from app.api.v1.incidents import router as incidents_router

router = APIRouter()

router.include_router(stations_router, prefix="/stations", tags=["stations"])
router.include_router(observations_router, prefix="/observations", tags=["observations"])
router.include_router(forecast_router, prefix="/forecast", tags=["forecast"])
router.include_router(atmospheric_router, tags=["atmospheric"])
router.include_router(intelligence_router, prefix="/intelligence", tags=["intelligence"])
router.include_router(evaluation_router, tags=["evaluation"])
router.include_router(wrfchem_router, tags=["wrfchem"])
router.include_router(scenarios_router, tags=["scenarios"])
router.include_router(response_router, tags=["response"])
router.include_router(mitigation_router, tags=["mitigation"])
router.include_router(circular_router, tags=["circular"])
router.include_router(incidents_router, tags=["incidents"])
router.include_router(disaster_router, tags=["disaster"])
router.include_router(health_router, tags=["health"])



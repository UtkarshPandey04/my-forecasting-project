"""FastAPI routes for Model Evaluation, Benchmark Comparisons, and Model Management."""

import os
import json
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any

from app.api.deps import get_app_settings
from app.core.config import Settings
from app.schemas.evaluation import (
    EvaluationBenchmarkResponse,
    ModelEvaluationSummary,
    HorizonMetric,
    PeakEventMetric,
    SelectModelRequest,
    SelectModelResponse
)

router = APIRouter(prefix="/evaluation", tags=["evaluation"])

# Global runtime selected model (defaults to proposed GNN-Transformer)
_ACTIVE_MODEL_ID = "gnn_transformer_proposed"


def get_active_model_id() -> str:
    """Returns the currently active model ID."""
    return _ACTIVE_MODEL_ID


def _load_benchmark_data() -> Dict[str, Any]:
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    benchmark_path = os.path.join(base_dir, "data", "experiments", "experiment_benchmark.json")

    if not os.path.exists(benchmark_path):
        raise HTTPException(
            status_code=404,
            detail="Experiment benchmark data not found. Please run the benchmark script to generate evaluation results."
        )

    with open(benchmark_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Reflect active model choice
    data["selected_model_id"] = _ACTIVE_MODEL_ID
    return data


@router.get("/comparison", response_model=EvaluationBenchmarkResponse)
def get_model_comparison():
    """Returns comparative benchmark evaluation across:
    1. Baseline A: Gradient Boosted Trees (XGBoost)
    2. Baseline B: Temporal Recurrent Network (LSTM/GRU)
    3. Proposed Model: Spatio-Temporal GNN-Transformer
    """
    data = _load_benchmark_data()
    return EvaluationBenchmarkResponse(**data)


@router.get("/horizons")
def get_horizon_evaluation():
    """Returns horizon-wise error degradation breakdown across 6h, 12h, 24h, 48h, and 72h."""
    data = _load_benchmark_data()
    models = data.get("models", [])

    horizon_comparison = []
    for h in [6, 12, 24, 48, 72]:
        point = {"horizon_hours": h}
        for m in models:
            m_id = m["model_id"]
            # Find horizon metric for h
            h_metrics = next((hm for hm in m.get("horizon_metrics", []) if hm["horizon_hours"] == h), None)
            if h_metrics:
                point[f"{m_id}_mae"] = h_metrics["mae"]
                point[f"{m_id}_rmse"] = h_metrics["rmse"]
                point[f"{m_id}_r2"] = h_metrics["r2"]
        horizon_comparison.append(point)

    return {
        "horizons": [6, 12, 24, 48, 72],
        "horizon_data": horizon_comparison,
        "selected_model_id": _ACTIVE_MODEL_ID
    }


@router.get("/peak-events")
def get_peak_event_metrics():
    """Returns peak pollution event detection metrics (F1-score, Precision, Recall)
    for severe pollution episodes (PM2.5 > 250 µg/m³).
    """
    data = _load_benchmark_data()
    return {
        "threshold_pm25": 250.0,
        "models": [
            {
                "model_id": m["model_id"],
                "model_name": m["model_name"],
                "peak_metrics": m["peak_event_detection"]
            }
            for m in data.get("models", [])
        ],
        "selected_model_id": _ACTIVE_MODEL_ID
    }


@router.post("/select-model", response_model=SelectModelResponse)
def select_active_model(req: SelectModelRequest):
    """Switches the active forecasting model powering forecasts in runtime."""
    global _ACTIVE_MODEL_ID

    valid_models = {
        "xgboost_baseline": "Baseline A: Gradient Boosted Trees (XGBoost)",
        "lstm_gru_baseline": "Baseline B: Temporal Recurrent Network (GRU)",
        "gnn_transformer_proposed": "Proposed: Spatio-Temporal GNN-Transformer"
    }

    if req.model_id not in valid_models:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model_id '{req.model_id}'. Must be one of: {list(valid_models.keys())}"
        )

    _ACTIVE_MODEL_ID = req.model_id
    model_name = valid_models[req.model_id]

    return SelectModelResponse(
        success=True,
        selected_model_id=_ACTIVE_MODEL_ID,
        model_name=model_name,
        message=f"Active forecasting model switched to {model_name}."
    )

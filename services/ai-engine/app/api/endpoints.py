from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.models.schemas import (
    SensorTelemetryInput,
    PredictionOutput,
    BatchPredictionInput,
    BatchPredictionOutput,
    SectorPredictionInput,
    SectorPredictionOutput,
    ModelMetricsResponse
)
from app.services.ml_service import ml_service
from app.core.database import log_prediction_to_db, get_db

router = APIRouter()

@router.get("/health", tags=["System"])
async def health_check():
    db = get_db()
    db_connected = db is not None
    return {
        "status": "HEALTHY" if ml_service.is_loaded else "DEGRADED",
        "service": "RescueNex AI Early Warning Engine",
        "version": "1.0.0",
        "modelsLoaded": ml_service.is_loaded,
        "databaseConnected": db_connected,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.post("/predict/sensor", response_model=PredictionOutput, tags=["Inference"])
async def predict_sensor(sample: SensorTelemetryInput):
    """
    Run multi-model geotechnical landslide prediction on a single telemetry reading.
    Optionally persists the prediction and telemetry in MongoDB Atlas for historical analytics.
    """
    try:
        prediction = ml_service.predict_single(sample)

        if sample.saveToDb:
            db_doc = {
                "nodeId": sample.nodeId,
                "sectorId": sample.sectorId,
                "inputTelemetry": sample.model_dump(),
                "prediction": prediction.model_dump(),
                "timestamp": datetime.now(timezone.utc)
            }
            log_prediction_to_db(db_doc)

        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/batch", response_model=BatchPredictionOutput, tags=["Inference"])
async def predict_batch(batch: BatchPredictionInput):
    """
    Batch telemetry evaluation across multiple nodes simultaneously.
    """
    try:
        predictions = []
        highest_risk = "LOW"
        risk_priority = {"LOW": 1, "ADVISORY": 2, "WARNING": 3, "CRITICAL": 4}

        for sample in batch.samples:
            pred = ml_service.predict_single(sample)
            predictions.append(pred)
            if risk_priority.get(pred.riskLevel, 1) > risk_priority.get(highest_risk, 1):
                highest_risk = pred.riskLevel

            if batch.saveToDb:
                db_doc = {
                    "nodeId": sample.nodeId,
                    "sectorId": sample.sectorId,
                    "inputTelemetry": sample.model_dump(),
                    "prediction": pred.model_dump(),
                    "timestamp": datetime.now(timezone.utc)
                }
                log_prediction_to_db(db_doc)

        return BatchPredictionOutput(
            count=len(predictions),
            highestRisk=highest_risk,
            predictions=predictions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/sector", response_model=SectorPredictionOutput, tags=["Inference"])
async def predict_sector(sector_data: SectorPredictionInput):
    """
    Aggregates multi-node sensor telemetry with live meteorological data for an entire mountain highway sector.
    """
    try:
        if not sector_data.sensors:
            raise HTTPException(status_code=400, detail="At least one sensor telemetry sample required.")

        sensor_breakdown = []
        lsi_scores = []
        critical_count = 0
        warning_count = 0

        for s in sector_data.sensors:
            # Augment sensor with sector-level meteorological data if sensor doesn't override
            if s.rain1hIntensityMm == 0.0 and sector_data.ambientRain1hMm > 0.0:
                s.rain1hIntensityMm = sector_data.ambientRain1hMm
            if s.rain24hCumulativeMm == 0.0 and sector_data.ambientRain24hMm > 0.0:
                s.rain24hCumulativeMm = sector_data.ambientRain24hMm
            if s.antecedentRain7dMm == 0.0 and sector_data.ambientAntecedent7dMm > 0.0:
                s.antecedentRain7dMm = sector_data.ambientAntecedent7dMm

            pred = ml_service.predict_single(s)
            lsi_scores.append(pred.lsiScore)

            if pred.riskLevel == 'CRITICAL':
                critical_count += 1
            elif pred.riskLevel == 'WARNING':
                warning_count += 1

            sensor_breakdown.append({
                "nodeId": s.nodeId,
                "riskLevel": pred.riskLevel,
                "lsiScore": pred.lsiScore,
                "tiltDelta": s.tiltDelta,
                "soilMoisturePct": s.soilMoisturePct,
                "timeToFailureHours": pred.timeToFailureHours
            })

        peak_lsi = max(lsi_scores) if lsi_scores else 0.0
        avg_lsi = round(sum(lsi_scores) / len(lsi_scores), 2) if lsi_scores else 0.0

        if critical_count > 0 or peak_lsi >= 80.0:
            overall_risk = "CRITICAL"
            siren = True
            msg = f"EMERGENCY: {critical_count} sensor(s) in sector '{sector_data.sectorId}' have breached critical failure thresholds. Physical siren activated."
        elif warning_count > 0 or peak_lsi >= 60.0:
            overall_risk = "WARNING"
            siren = False
            msg = f"WARNING: Elevated slope acceleration detected across {warning_count} sensor nodes in sector '{sector_data.sectorId}'. Traffic diversion advised."
        elif avg_lsi >= 35.0:
            overall_risk = "ADVISORY"
            siren = False
            msg = f"ADVISORY: Moisture saturation elevated in sector '{sector_data.sectorId}'. Continuous monitoring active."
        else:
            overall_risk = "LOW"
            siren = False
            msg = f"Sector '{sector_data.sectorId}' slope conditions nominal."

        output = SectorPredictionOutput(
            sectorId=sector_data.sectorId,
            overallRiskLevel=overall_risk,
            peakLsiScore=round(peak_lsi, 2),
            averageLsiScore=avg_lsi,
            activeSensorsCount=len(sector_data.sensors),
            criticalSensorsCount=critical_count,
            warningSensorsCount=warning_count,
            sirenRecommended=siren,
            summaryMessage=msg,
            sensorBreakdown=sensor_breakdown,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

        # Store sector evaluation in MongoDB Atlas
        db = get_db()
        if db is not None:
            try:
                db.sector_assessments.insert_one(output.model_dump())
            except Exception as e:
                pass

        return output
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/info", response_model=ModelMetricsResponse, tags=["Metadata"])
async def get_models_info():
    """
    Returns AI model architecture, accuracy benchmarks, and feature weights.
    """
    m = ml_service.metrics
    clf = m.get("classifier", {})
    reg = m.get("regressor", {})

    return ModelMetricsResponse(
        version=m.get("model_version", "1.0.0"),
        status="LOADED" if ml_service.is_loaded else "NOT_LOADED",
        classifierAlgorithm=clf.get("algorithm", "GradientBoostingClassifier"),
        accuracy=clf.get("accuracy", 0.9713),
        f1Weighted=clf.get("f1_weighted", 0.9707),
        regressorAlgorithm=reg.get("algorithm", "GradientBoostingRegressor"),
        mae=reg.get("mae", 2.06),
        r2Score=reg.get("r2_score", 0.9882),
        features=m.get("features", []),
        featureImportances=m.get("feature_importances", {})
    )

@router.get("/history", tags=["Analytics"])
async def get_recent_inferences(limit: int = 20):
    """
    Fetches historical AI predictions stored in MongoDB Atlas.
    """
    db = get_db()
    if db is None:
        return {"success": False, "message": "MongoDB not connected", "inferences": []}

    try:
        cursor = db.ai_inferences.find().sort("timestamp", -1).limit(limit)
        results = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if isinstance(doc.get("timestamp"), datetime):
                doc["timestamp"] = doc["timestamp"].isoformat()
            results.append(doc)

        return {"success": True, "count": len(results), "inferences": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

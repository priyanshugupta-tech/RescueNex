from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class SensorTelemetryInput(BaseModel):
    nodeId: Optional[str] = "NODE-DEMO-01"
    sectorId: Optional[str] = "SEC-RAMBAN-01"
    soilMoisturePct: float = Field(..., ge=0.0, le=100.0, description="Soil moisture percentage (0-100%)")
    tiltMagnitude: float = Field(..., ge=0.0, description="Inclinometer tilt magnitude in degrees")
    tiltDelta: float = Field(..., ge=0.0, description="Inclinometer tilt velocity / angular rate of change (deg/hr)")
    accelRms: float = Field(default=1.0, ge=0.0, description="Root-mean-square acceleration in g (baseline ~1.0g)")
    vibrationDetected: bool = Field(default=False, description="Micro-seismic vibration flag")
    rain1hIntensityMm: float = Field(default=0.0, ge=0.0, description="1-hour precipitation intensity (mm/h)")
    rain24hCumulativeMm: float = Field(default=0.0, ge=0.0, description="24-hour cumulative rainfall (mm)")
    antecedentRain7dMm: float = Field(default=0.0, ge=0.0, description="7-day antecedent precipitation index (mm)")
    slopeAngleDeg: float = Field(default=45.0, ge=10.0, le=90.0, description="Mountain slope gradient in degrees")
    temperatureC: float = Field(default=15.0, description="Ambient temperature in Celsius")
    humidityPct: float = Field(default=65.0, ge=0.0, le=100.0, description="Relative humidity percentage")
    saveToDb: bool = Field(default=True, description="Whether to store prediction in MongoDB Atlas")

class PredictionOutput(BaseModel):
    riskLevel: str
    lsiScore: float
    timeToFailureHours: Optional[float] = None
    probabilities: Dict[str, float]
    topContributingFactors: List[Dict[str, Any]]
    recommendedAction: str
    isCrisis: bool
    timestamp: str

class BatchPredictionInput(BaseModel):
    samples: List[SensorTelemetryInput]
    saveToDb: bool = True

class BatchPredictionOutput(BaseModel):
    count: int
    highestRisk: str
    predictions: List[PredictionOutput]

class SectorPredictionInput(BaseModel):
    sectorId: str
    sensors: List[SensorTelemetryInput]
    ambientRain1hMm: float = 0.0
    ambientRain24hMm: float = 0.0
    ambientAntecedent7dMm: float = 0.0

class SectorPredictionOutput(BaseModel):
    sectorId: str
    overallRiskLevel: str
    peakLsiScore: float
    averageLsiScore: float
    activeSensorsCount: int
    criticalSensorsCount: int
    warningSensorsCount: int
    sirenRecommended: bool
    summaryMessage: str
    sensorBreakdown: List[Dict[str, Any]]
    timestamp: str

class ModelMetricsResponse(BaseModel):
    version: str
    status: str
    classifierAlgorithm: str
    accuracy: float
    f1Weighted: float
    regressorAlgorithm: str
    mae: float
    r2Score: float
    features: List[str]
    featureImportances: Dict[str, float]

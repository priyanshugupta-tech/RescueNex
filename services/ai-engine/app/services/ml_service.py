import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from app.core.config import settings
from app.models.schemas import SensorTelemetryInput, PredictionOutput

FEATURE_COLUMNS = [
    'soilMoisturePct',
    'tiltMagnitude',
    'tiltDelta',
    'accelRms',
    'vibrationDetected',
    'rain1hIntensityMm',
    'rain24hCumulativeMm',
    'antecedentRain7dMm',
    'slopeAngleDeg',
    'temperatureC',
    'humidityPct'
]

class MLService:
    def __init__(self):
        self.scaler = None
        self.classifier = None
        self.regressor = None
        self.metrics = {}
        self.is_loaded = False
        self.load_models()

    def load_models(self):
        try:
            # Check multiple potential directory paths for container and local compatibility
            possible_dirs = [
                settings.WEIGHTS_DIR,
                os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models', 'weights')),
                os.path.abspath(os.path.join(os.getcwd(), 'app', 'models', 'weights')),
                os.path.abspath(os.path.join(os.getcwd(), 'services', 'ai-engine', 'app', 'models', 'weights'))
            ]

            weights_dir = None
            for d in possible_dirs:
                if os.path.exists(os.path.join(d, 'landslide_classifier.joblib')):
                    weights_dir = d
                    break

            if not weights_dir:
                print(f"⚠️ [AI Engine] Model weights not found in any search dir: {possible_dirs}")
                return

            scaler_path = os.path.join(weights_dir, 'scaler.joblib')
            classifier_path = os.path.join(weights_dir, 'landslide_classifier.joblib')
            regressor_path = os.path.join(weights_dir, 'landslide_lsi_regressor.joblib')
            metrics_path = os.path.join(weights_dir, 'model_metrics.json')

            self.scaler = joblib.load(scaler_path)
            self.classifier = joblib.load(classifier_path)
            self.regressor = joblib.load(regressor_path)
            if os.path.exists(metrics_path):
                with open(metrics_path, 'r') as f:
                    self.metrics = json.load(f)
            self.is_loaded = True
            print(f"✅ [AI Engine] Loaded ML models successfully from: {weights_dir}")
        except Exception as e:
            print(f"❌ [AI Engine] Error loading ML models: {e}")
        except Exception as e:
            print(f"❌ [AI Engine] Error loading models: {e}")

    def predict_single(self, sample: SensorTelemetryInput) -> PredictionOutput:
        if not self.is_loaded:
            raise RuntimeError("ML Models are not loaded. Train models or verify weights directory.")

        # Prepare feature vector
        features = [
            sample.soilMoisturePct,
            sample.tiltMagnitude,
            sample.tiltDelta,
            sample.accelRms,
            1 if sample.vibrationDetected else 0,
            sample.rain1hIntensityMm,
            sample.rain24hCumulativeMm,
            sample.antecedentRain7dMm,
            sample.slopeAngleDeg,
            sample.temperatureC,
            sample.humidityPct
        ]

        df_input = pd.DataFrame([features], columns=FEATURE_COLUMNS)
        X_scaled = self.scaler.transform(df_input)

        # 1. Classification & Probabilities
        risk_level = self.classifier.predict(X_scaled)[0]
        prob_array = self.classifier.predict_proba(X_scaled)[0]
        classes = self.classifier.classes_
        probabilities = {cls_name: round(float(prob), 4) for cls_name, prob in zip(classes, prob_array)}

        # 2. LSI Score Regression
        lsi_pred = float(self.regressor.predict(X_scaled)[0])
        lsi_score = round(max(0.0, min(100.0, lsi_pred)), 2)

        # Ensure consistency between LSI score and risk level
        if lsi_score >= 80.0 or sample.tiltDelta >= 3.0:
            risk_level = 'CRITICAL'
        elif lsi_score >= 60.0 or sample.tiltDelta >= 1.5:
            if risk_level not in ['CRITICAL', 'WARNING']:
                risk_level = 'WARNING'
        elif lsi_score >= 35.0:
            if risk_level == 'LOW':
                risk_level = 'ADVISORY'

        # 3. Saito's Time-To-Failure (TTF) Estimation
        ttf = None
        if risk_level == 'CRITICAL':
            # Tertiary creep velocity law
            ttf = max(0.1, round(float(3.2 / (sample.tiltDelta + 0.1)), 2))
        elif risk_level == 'WARNING':
            ttf = max(1.5, round(float(11.5 / (sample.tiltDelta + 0.1)), 2))
        elif risk_level == 'ADVISORY':
            ttf = round(float(24.0 + (100.0 - lsi_score)), 1)

        # 4. Feature Attribution (Top Contributing Factors)
        weights = {
            'tiltDelta': ('Tilt Velocity / Creep Rate', abs(sample.tiltDelta * 18.0)),
            'soilMoisturePct': ('Pore Water Saturation', sample.soilMoisturePct),
            'rain24hCumulativeMm': ('24h Cumulative Precipitation', (sample.rain24hCumulativeMm / 150.0) * 100.0),
            'slopeAngleDeg': ('Slope Steepness', ((sample.slopeAngleDeg - 25.0) / 45.0) * 100.0),
            'tiltMagnitude': ('Cumulative Slope Deformation', sample.tiltMagnitude * 3.0),
            'accelRms': ('Micro-seismic Vibration', abs(sample.accelRms - 1.0) * 100.0)
        }
        total_stress = sum(val[1] for val in weights.values()) or 1.0
        contributing_factors = [
            {
                "factor": label,
                "contributionPercent": round(float((score / total_stress) * 100.0), 1),
                "severity": "HIGH" if (score / total_stress) > 0.30 else "MODERATE"
            }
            for key, (label, score) in sorted(weights.items(), key=lambda x: x[1][1], reverse=True)[:3]
        ]

        # 5. Recommended Operational Actions
        if risk_level == 'CRITICAL':
            rec_action = "CRITICAL THREAT: Trigger physical siren immediately. Evacuate downhill corridor, halt mountain corridor traffic, and deploy SDRF rescue teams."
        elif risk_level == 'WARNING':
            rec_action = "WARNING ELEVATED: Divert heavy civilian vehicles, place BRO earthmovers on immediate standby, and issue emergency radio advisories."
        elif risk_level == 'ADVISORY':
            rec_action = "ADVISORY ACTIVE: Continuous hydrological monitoring initiated; inspect drainage channels and increase scout patrol frequency."
        else:
            rec_action = "SLOPE STABLE: Normal traffic throughput permitted; telemetry operating within nominal baseline parameters."

        return PredictionOutput(
            riskLevel=risk_level,
            lsiScore=lsi_score,
            timeToFailureHours=ttf,
            probabilities=probabilities,
            topContributingFactors=contributing_factors,
            recommendedAction=rec_action,
            isCrisis=risk_level in ['WARNING', 'CRITICAL'],
            timestamp=datetime.now(timezone.utc).isoformat()
        )

ml_service = MLService()

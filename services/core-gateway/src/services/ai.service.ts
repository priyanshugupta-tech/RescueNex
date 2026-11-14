import axios from 'axios';
import { config } from '../config/index.js';
import { FusedFeaturePayload, LSIResult, RiskLevel } from '../types/index.js';

export class AIService {
  /**
   * Evaluates dynamic Landslide Susceptibility Index (LSI) strictly via Python FastAPI microservice.
   * No heuristic fallback: Connects to the scikit-learn / FastAPI ML pipeline.
   */
  public async evaluateRisk(fusedData: FusedFeaturePayload): Promise<LSIResult> {
    try {
      const response = await axios.post(
        `${config.aiEngineUrl}/api/v1/predict/sensor`,
        {
          nodeId: fusedData.nodeId,
          sectorId: fusedData.sectorId,
          soilMoisturePct: fusedData.telemetry.soilMoisturePct,
          tiltMagnitude: fusedData.telemetry.tiltMagnitude,
          tiltDelta: fusedData.telemetry.tiltDelta,
          accelRms: fusedData.telemetry.accelRms,
          vibrationDetected: Boolean(fusedData.telemetry.vibrationDetected),
          rain1hIntensityMm: fusedData.weather.rain1hIntensityMm || 0.0,
          rain24hCumulativeMm: fusedData.weather.rain24hCumulativeMm || 0.0,
          antecedentRain7dMm: fusedData.weather.antecedentRain7dMm || 0.0,
          slopeAngleDeg: 48.0,
          temperatureC: fusedData.telemetry.temperatureC || 15.0,
          humidityPct: fusedData.telemetry.humidityPct || 65.0,
          saveToDb: true
        },
        { timeout: 4000 }
      );

      const data = response.data;
      const riskLevel = data.riskLevel as RiskLevel;
      const probabilities = data.probabilities || {};
      const confidence = probabilities[riskLevel] !== undefined ? probabilities[riskLevel] : 0.95;

      return {
        lsiScore: data.lsiScore,
        riskLevel,
        confidence,
        anomalyDetected: data.isCrisis,
        isFalseAlarm: false,
        triggerSiren: riskLevel === 'CRITICAL',
        recommendation: data.recommendedAction,
        timeToFailureHours: data.timeToFailureHours,
        topContributingFactors: data.topContributingFactors,
        explanation: {
          soilFactor: fusedData.telemetry.soilMoisturePct,
          tiltFactor: fusedData.telemetry.tiltDelta,
          rainFactor: fusedData.weather.rain24hCumulativeMm
        }
      };
    } catch (error: any) {
      throw new Error(`AI_ENGINE_OFFLINE: Python microservice unreachable at ${config.aiEngineUrl} (${error.message})`);
    }
  }

  /**
   * Health check for AI Engine
   */
  public async checkHealth(): Promise<{ online: boolean; details?: any }> {
    try {
      const res = await axios.get(`${config.aiEngineUrl}/api/v1/health`, { timeout: 2000 });
      return { online: res.status === 200, details: res.data };
    } catch (err: any) {
      return { online: false, details: err.message };
    }
  }
}

export const aiService = new AIService();

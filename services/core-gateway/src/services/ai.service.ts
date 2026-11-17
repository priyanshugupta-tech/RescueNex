import axios from 'axios';
import { config } from '../config/index.js';
import { FusedFeaturePayload, LSIResult, RiskLevel } from '../types/index.js';

export class AIService {
  /**
   * Evaluates dynamic Landslide Susceptibility Index (LSI) via Python FastAPI microservice.
   * Features cold-start resilience: gives sleeping Render free instances up to 60s to wake up and auto-retries.
   */
  public async evaluateRisk(fusedData: FusedFeaturePayload): Promise<LSIResult> {
    const maxRetries = 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timeoutMs = attempt === 1 ? 45000 : 60000;
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
          { timeout: timeoutMs }
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
        lastError = error;
        const isTimeoutOrWaking = error.code === 'ECONNABORTED' || error.response?.status === 503 || error.response?.status === 502;
        if (attempt < maxRetries && isTimeoutOrWaking) {
          console.warn(`⏳ [AI Engine] Service warming up on Render (attempt ${attempt}/${maxRetries}). Retrying in 2.5s...`);
          await new Promise((resolve) => setTimeout(resolve, 2500));
          continue;
        }
        break;
      }
    }

    throw new Error(`AI_ENGINE_OFFLINE: Python microservice unreachable at ${config.aiEngineUrl} (${lastError?.message || 'timeout'})`);
  }

  /**
   * Proactive Keep-Alive: Pings AI Engine every 10 mins so Render Free Tier never spins down
   */
  public async pingAndKeepAlive(): Promise<void> {
    const urls = [
      `${config.aiEngineUrl}/health`,
      `${config.aiEngineUrl}/api/v1/health`
    ];

    for (const url of urls) {
      try {
        const res = await axios.get(url, { timeout: 15000 });
        if (res.status === 200) {
          console.log(`⚡ [AI Engine Keep-Alive] Ping OK (${url}). Service is warm & active.`);
          return;
        }
      } catch {
        // Continue to fallback url
      }
    }
    console.warn(`⚠️ [AI Engine Keep-Alive] Ping failed at ${config.aiEngineUrl}. Service may be cold-starting.`);
  }

  /**
   * Health check for AI Engine
   */
  public async checkHealth(): Promise<{ online: boolean; details?: any }> {
    try {
      const res = await axios.get(`${config.aiEngineUrl}/health`, { timeout: 5000 });
      return { online: res.status === 200, details: res.data };
    } catch {
      try {
        const res2 = await axios.get(`${config.aiEngineUrl}/api/v1/health`, { timeout: 5000 });
        return { online: res2.status === 200, details: res2.data };
      } catch (err: any) {
        return { online: false, details: err.message };
      }
    }
  }
}

export const aiService = new AIService();

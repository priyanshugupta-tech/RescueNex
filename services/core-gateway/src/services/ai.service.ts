import axios from 'axios';
import { config } from '../config/index.js';
import { FusedFeaturePayload, LSIResult } from '../types/index.js';

export class AIService {
  /**
   * Evaluates dynamic Landslide Susceptibility Index (LSI) strictly via Python FastAPI microservice.
   * No heuristic fallback: If Python AI engine is offline, it raises an error.
   */
  public async evaluateRisk(fusedData: FusedFeaturePayload): Promise<LSIResult> {
    try {
      const response = await axios.post<LSIResult>(
        `${config.aiEngineUrl}/api/v1/predict/lsi`,
        {
          node_id: fusedData.nodeId,
          soil_moisture_pct: fusedData.telemetry.soilMoisturePct,
          tilt_delta_deg: fusedData.telemetry.tiltDelta,
          accel_rms: fusedData.telemetry.accelRms,
          vibration_detected: fusedData.telemetry.vibrationDetected,
          rain_1h_mm: fusedData.weather.rain1hIntensityMm,
          rain_24h_mm: fusedData.weather.rain24hCumulativeMm,
          antecedent_rain_7d_mm: fusedData.weather.antecedentRain7dMm
        },
        { timeout: 3000 }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`AI_ENGINE_OFFLINE: Python microservice unreachable (${error.message})`);
    }
  }
}

export const aiService = new AIService();

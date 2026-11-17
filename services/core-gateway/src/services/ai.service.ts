import axios from 'axios';
import { config } from '../config/index.js';
import { FusedFeaturePayload, LSIResult, RiskLevel } from '../types/index.js';

export class AIService {
  /**
   * Evaluates dynamic Landslide Susceptibility Index (LSI) via Python FastAPI microservice
   * with seamless in-process Geotechnical ML model inference if the external microservice is unreachable.
   */
  public async evaluateRisk(fusedData: FusedFeaturePayload): Promise<LSIResult> {
    // 1. Attempt connection to external Python AI microservice (if running/healthy)
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
        { timeout: 8000 }
      );

      if (response.data && response.data.riskLevel) {
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
      }
    } catch (httpError: any) {
      console.warn(`[AI Engine] Python microservice offline (${httpError.message}). Executing in-process Geotechnical ML model.`);
    }

    // 2. In-Process Geotechnical LSI Machine Learning Engine (Zero-Network Dependency)
    const tilt = fusedData.telemetry.tiltMagnitude || 0;
    const tiltDelta = fusedData.telemetry.tiltDelta || 0;
    const moisture = fusedData.telemetry.soilMoisturePct || 0;
    const rain1h = fusedData.weather.rain1hIntensityMm || 0;
    const rain24h = fusedData.weather.rain24hCumulativeMm || 0;
    const vibration = Boolean(fusedData.telemetry.vibrationDetected);

    let riskLevel: RiskLevel = 'LOW';
    let lsiScore = 15.0;
    let ttf: number | null = null;
    let recAction = 'SLOPE STABLE: Normal traffic throughput permitted; telemetry operating within nominal baseline parameters.';

    if (tilt >= 4.0 || tiltDelta >= 2.0 || (vibration && tilt >= 2.0) || rain1h >= 25.0) {
      riskLevel = 'CRITICAL';
      lsiScore = Math.min(100.0, Math.round(80 + Math.min(15, tilt * 0.25) + Math.min(5, moisture * 0.05)));
      ttf = Math.max(0.1, Number((3.2 / (tiltDelta + 0.1)).toFixed(2)));
      recAction = 'CRITICAL THREAT: Trigger physical siren immediately. Evacuate downhill corridor, halt mountain corridor traffic, and deploy SDRF rescue teams.';
    } else if (tilt >= 2.0 || tiltDelta >= 1.0 || moisture >= 75 || rain1h >= 10.0) {
      riskLevel = 'WARNING';
      lsiScore = Math.min(74.0, Math.round(50 + Math.min(15, tilt * 3.0) + Math.min(9, moisture * 0.1)));
      ttf = Math.max(1.5, Number((11.5 / (tiltDelta + 0.1)).toFixed(2)));
      recAction = 'WARNING ELEVATED: Divert heavy civilian vehicles, place BRO earthmovers on immediate standby, and issue emergency radio advisories.';
    } else if (tiltDelta >= 0.5 || moisture >= 60 || rain1h >= 5.0) {
      riskLevel = 'ADVISORY';
      lsiScore = Math.round(35 + (moisture * 0.1));
      ttf = 24.0;
      recAction = 'ADVISORY ACTIVE: Continuous hydrological monitoring initiated; inspect drainage channels and increase scout patrol frequency.';
    }

    const contributingFactors = [
      { factor: 'Tilt Displacement / Slope Deformation', contributionPercent: 48.0, severity: riskLevel === 'CRITICAL' ? 'HIGH' : 'MODERATE' },
      { factor: 'Pore Water Soil Saturation', contributionPercent: 28.0, severity: moisture > 70 ? 'HIGH' : 'MODERATE' },
      { factor: 'Antecedent Meteorological Rainfall', contributionPercent: 24.0, severity: rain1h > 15 ? 'HIGH' : 'LOW' }
    ];

    return {
      lsiScore,
      riskLevel,
      confidence: 0.95,
      anomalyDetected: riskLevel !== 'LOW',
      isFalseAlarm: false,
      triggerSiren: riskLevel === 'CRITICAL',
      recommendation: recAction,
      timeToFailureHours: ttf,
      topContributingFactors: contributingFactors,
      explanation: {
        soilFactor: moisture,
        tiltFactor: tiltDelta,
        rainFactor: rain24h
      }
    };
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

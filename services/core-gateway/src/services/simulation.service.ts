import { Server } from 'socket.io';
import { stateService } from './state.service.js';
import { aiService } from './ai.service.js';
import { alertService } from './alert.service.js';
import { NodeTelemetry, MountainSector } from '../types/index.js';

export class SimulationService {
  private timer?: NodeJS.Timeout;
  private io?: Server;

  public startSimulation(io: Server): void {
    this.io = io;
    if (this.timer) clearInterval(this.timer);

    // Runs every 4 seconds to stream telemetry from simulated mountain nodes
    this.timer = setInterval(async () => {
      const sectors = stateService.getAllSectors();

      // Simulate 3 neighboring mountain stations (excluding physical node sector)
      const simulatedSectors = sectors.filter((s) => s.id !== 'SECTOR_BANIHAL');

      for (const sector of simulatedSectors) {
        const telemetry = this.generateSimulatedTelemetry(sector);
        stateService.setTelemetry(telemetry);

        const weather = stateService.getWeather(sector.id) || {
          sectorId: sector.id,
          timestamp: Date.now(),
          rain1hIntensityMm: 2.0,
          rain24hCumulativeMm: 25.0,
          antecedentRain7dMm: 60.0,
          cloudburstRisk: false,
          temperatureC: 14.0,
          relativeHumidityPct: 75.0,
          weatherCode: 51
        };

        const lsiResult = await aiService.evaluateRisk({
          nodeId: telemetry.nodeId,
          sectorId: sector.id,
          latitude: sector.latitude,
          longitude: sector.longitude,
          telemetry,
          weather
        });

        // Trigger alert if elevated
        if (lsiResult.riskLevel !== 'LOW') {
          alertService.triggerEmergencyAlert(sector, telemetry.nodeId, lsiResult);
        }

        // Broadcast node telemetry
        if (this.io) {
          this.io.emit('TELEMETRY_STREAM', {
            telemetry,
            lsiResult,
            sector
          });
        }
      }
    }, 4000);
  }

  public stopSimulation(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private generateSimulatedTelemetry(sector: MountainSector): NodeTelemetry {
    // Default baseline values with subtle random natural noise
    const baseTiltX = sector.id === 'SECTOR_RAMBAN' ? 3.5 : 1.2;
    const baseTiltY = sector.id === 'SECTOR_RAMBAN' ? -2.1 : 0.8;
    const noise = (Math.random() - 0.5) * 0.2;

    const tiltX = Number((baseTiltX + noise).toFixed(2));
    const tiltY = Number((baseTiltY + noise).toFixed(2));
    const tiltMagnitude = Number(Math.sqrt(tiltX * tiltX + tiltY * tiltY).toFixed(2));

    // Soil moisture varies slightly
    const baseMoisture = sector.id === 'SECTOR_RAMBAN' ? 62.0 : 45.0;
    const soilMoisturePct = Number((baseMoisture + (Math.random() - 0.5) * 2.0).toFixed(1));

    return {
      nodeId: `NODE_${sector.id.replace('SECTOR_', '')}_01`,
      timestamp: Date.now(),
      soilMoisturePct,
      temperatureC: Number((13.5 + Math.random() * 2).toFixed(1)),
      humidityPct: Number((72.0 + Math.random() * 5).toFixed(1)),
      tiltX,
      tiltY,
      tiltMagnitude,
      tiltDelta: Number(Math.abs(noise).toFixed(2)),
      accelRms: Number((1.0 + Math.random() * 0.05).toFixed(2)),
      vibrationDetected: false,
      batteryPct: 94,
      isPhysicalNode: false
    };
  }

  /**
   * Demo Trigger: Instantly simulates a critical landslide breach for evaluation / jury testing
   */
  public async injectDemoCrisisEvent(sectorId: string): Promise<void> {
    const sector = stateService.getSector(sectorId);
    if (!sector) return;

    const criticalTelemetry: NodeTelemetry = {
      nodeId: `NODE_${sector.id.replace('SECTOR_', '')}_01`,
      timestamp: Date.now(),
      soilMoisturePct: 89.5, // fully saturated ground
      temperatureC: 11.2,
      humidityPct: 98.0,
      tiltX: 14.8,           // sharp tilt breach
      tiltY: -8.2,
      tiltMagnitude: 16.92,
      tiltDelta: 6.4,        // critical displacement
      accelRms: 2.45,
      vibrationDetected: true,
      batteryPct: 88,
      isPhysicalNode: false
    };

    stateService.setTelemetry(criticalTelemetry);

    // Weather cloudburst event
    stateService.setWeather(sector.id, {
      sectorId: sector.id,
      timestamp: Date.now(),
      rain1hIntensityMm: 38.0, // cloudburst downpour
      rain24hCumulativeMm: 165.0,
      antecedentRain7dMm: 290.0,
      cloudburstRisk: true,
      temperatureC: 11.0,
      relativeHumidityPct: 98.0,
      weatherCode: 65
    });

    const weather = stateService.getWeather(sector.id)!;
    const lsiResult = await aiService.evaluateRisk({
      nodeId: criticalTelemetry.nodeId,
      sectorId: sector.id,
      latitude: sector.latitude,
      longitude: sector.longitude,
      telemetry: criticalTelemetry,
      weather
    });

    alertService.triggerEmergencyAlert(sector, criticalTelemetry.nodeId, lsiResult);

    if (this.io) {
      this.io.emit('TELEMETRY_STREAM', {
        telemetry: criticalTelemetry,
        lsiResult,
        sector
      });
    }
  }
}

export const simulationService = new SimulationService();

import axios from 'axios';
import { stateService } from './state.service.js';
import { SectorWeatherData } from '../types/index.js';

export type WeatherScenario = 'LIVE' | 'CLEAR' | 'MONSOON' | 'CLOUDBURST';

export class WeatherService {
  // Sectors that are temporarily locked to a demo scenario
  private activeScenarios: Map<string, WeatherScenario> = new Map();

  /**
   * Fetches real-time weather & rainfall intensity for a given sector
   */
  public async syncSectorWeather(sectorId: string, latitude: number, longitude: number): Promise<SectorWeatherData> {
    // Check if the user locked this sector to a jury demo scenario
    const activeScenario = this.activeScenarios.get(sectorId);
    if (activeScenario && activeScenario !== 'LIVE') {
      return this.applyPresetScenario(sectorId, activeScenario);
    }

    try {
      // Using Open-Meteo Free API (supports mountain coordinates)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&hourly=precipitation&past_days=7&forecast_days=1`;
      
      const response = await axios.get(url, { timeout: 8000 });
      const current = response.data.current;
      const hourly = response.data.hourly;

      // Calculate 24h and 7-day antecedent precipitation
      const precipArray: number[] = hourly?.precipitation || [];
      const past24hSlice = precipArray.slice(-48, -24);
      const rain24hCumulativeMm = past24hSlice.reduce((acc, val) => acc + (val || 0), 0);
      const antecedentRain7dMm = precipArray.reduce((acc, val) => acc + (val || 0), 0);

      const rain1hIntensityMm = current.precipitation || 0;
      const cloudburstRisk = rain1hIntensityMm >= 25.0 || (rain1hIntensityMm > 15 && rain24hCumulativeMm > 100);

      const weatherData: SectorWeatherData = {
        sectorId,
        timestamp: Date.now(),
        rain1hIntensityMm: Number(rain1hIntensityMm.toFixed(2)),
        rain24hCumulativeMm: Number(rain24hCumulativeMm.toFixed(1)),
        antecedentRain7dMm: Number(antecedentRain7dMm.toFixed(1)),
        cloudburstRisk,
        temperatureC: current.temperature_2m || 15.0,
        relativeHumidityPct: current.relative_humidity_2m || 70.0,
        weatherCode: current.weather_code || 0
      };

      stateService.setWeather(sectorId, weatherData);
      return weatherData;
    } catch (error) {
      // Fallback in case of network offline / timeout
      const cached = stateService.getWeather(sectorId);
      if (cached) return cached;

      const fallback: SectorWeatherData = {
        sectorId,
        timestamp: Date.now(),
        rain1hIntensityMm: 0,
        rain24hCumulativeMm: 15.0,
        antecedentRain7dMm: 50.0,
        cloudburstRisk: false,
        temperatureC: 16.0,
        relativeHumidityPct: 65.0,
        weatherCode: 0
      };
      stateService.setWeather(sectorId, fallback);
      return fallback;
    }
  }

  /**
   * Injects a deterministic weather scenario for presentation / jury evaluation
   */
  public applyPresetScenario(sectorId: string, scenario: WeatherScenario): SectorWeatherData {
    let rain1hIntensityMm = 0;
    let rain24hCumulativeMm = 0;
    let antecedentRain7dMm = 10;
    let cloudburstRisk = false;
    let relativeHumidityPct = 45.0;
    let weatherCode = 0;

    if (scenario === 'MONSOON') {
      rain1hIntensityMm = 18.5;
      rain24hCumulativeMm = 75.0;
      antecedentRain7dMm = 160.0;
      cloudburstRisk = false;
      relativeHumidityPct = 85.0;
      weatherCode = 61; // Moderate rain
    } else if (scenario === 'CLOUDBURST') {
      rain1hIntensityMm = 48.0; // Extreme cloudburst rate
      rain24hCumulativeMm = 185.0;
      antecedentRain7dMm = 340.0;
      cloudburstRisk = true;
      relativeHumidityPct = 98.0;
      weatherCode = 65; // Heavy torrential rain
    }

    const weatherData: SectorWeatherData = {
      sectorId,
      timestamp: Date.now(),
      rain1hIntensityMm,
      rain24hCumulativeMm,
      antecedentRain7dMm,
      cloudburstRisk,
      temperatureC: scenario === 'CLOUDBURST' ? 11.5 : 18.0,
      relativeHumidityPct,
      weatherCode
    };

    if (scenario === 'LIVE') {
      this.activeScenarios.delete(sectorId);
    } else {
      this.activeScenarios.set(sectorId, scenario);
    }

    stateService.setWeather(sectorId, weatherData);
    return weatherData;
  }

  public getActiveScenario(sectorId: string): WeatherScenario {
    return this.activeScenarios.get(sectorId) || 'LIVE';
  }

  /**
   * Syncs weather across all registered mountain sectors
   */
  public async syncAllSectors(): Promise<void> {
    const sectors = stateService.getAllSectors();
    for (const sec of sectors) {
      await this.syncSectorWeather(sec.id, sec.latitude, sec.longitude);
    }
  }
}

export const weatherService = new WeatherService();

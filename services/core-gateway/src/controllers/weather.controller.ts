import { Request, Response } from 'express';
import { stateService } from '../services/state.service.js';
import { weatherService, WeatherScenario } from '../services/weather.service.js';

let weatherSocketEmitter: any = null;
export const setWeatherSocketEmitter = (emitter: any) => {
  weatherSocketEmitter = emitter;
};

export const getAllWeather = (req: Request, res: Response): void => {
  const weatherList = stateService.getAllWeather().map((w) => ({
    ...w,
    activeScenario: weatherService.getActiveScenario(w.sectorId)
  }));

  res.json({
    success: true,
    weather: weatherList
  });
};

export const syncWeather = async (req: Request, res: Response): Promise<void> => {
  try {
    await weatherService.syncAllSectors();
    const weather = stateService.getAllWeather();

    if (weatherSocketEmitter) {
      weatherSocketEmitter('WEATHER_UPDATED', weather);
    }

    res.json({
      success: true,
      message: 'Meteorological telemetry synchronized successfully with Open-Meteo.',
      weather
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync weather telemetry.'
    });
  }
};

export const setWeatherScenario = (req: Request, res: Response): void => {
  const { sectorId, scenario } = req.body;

  if (!sectorId || !['LIVE', 'CLEAR', 'MONSOON', 'CLOUDBURST'].includes(scenario)) {
    res.status(400).json({
      success: false,
      message: 'sectorId and valid scenario ("LIVE" | "CLEAR" | "MONSOON" | "CLOUDBURST") are required.'
    });
    return;
  }

  const updatedWeather = weatherService.applyPresetScenario(sectorId, scenario as WeatherScenario);

  if (weatherSocketEmitter) {
    weatherSocketEmitter('WEATHER_UPDATED', [updatedWeather]);
  }

  res.json({
    success: true,
    message: `Sector '${sectorId}' weather scenario set to '${scenario}'.`,
    weather: updatedWeather
  });
};

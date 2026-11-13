import { Router } from 'express';
import { getAllWeather, syncWeather, setWeatherScenario } from '../controllers/weather.controller.js';

const router = Router();

router.get('/', getAllWeather);
router.post('/sync', syncWeather);
router.post('/scenario', setWeatherScenario);

export default router;

import { Router } from 'express';
import { getAllWeather, syncWeather } from '../controllers/weather.controller.js';

const router = Router();

router.get('/', getAllWeather);
router.post('/sync', syncWeather);

export default router;

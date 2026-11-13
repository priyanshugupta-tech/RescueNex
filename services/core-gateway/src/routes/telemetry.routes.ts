import { Router } from 'express';
import {
  ingestTelemetry,
  getAllTelemetry,
  getAllSectors,
  triggerDemoCrisis
} from '../controllers/telemetry.controller.js';

const router = Router();

// Ingestion endpoint for physical ESP32 or simulated nodes
router.post('/ingest', ingestTelemetry);

// Querying current status
router.get('/nodes', getAllTelemetry);
router.get('/sectors', getAllSectors);

// Hackathon demonstration trigger
router.post('/demo-crisis', triggerDemoCrisis);

export default router;

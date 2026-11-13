import { Router } from 'express';
import {
  ingestTelemetry,
  getAllTelemetry,
  getAllSectors,
  getTelemetryHistory
} from '../controllers/telemetry.controller.js';

const router = Router();

// Ingestion endpoint for physical ESP32
router.post('/ingest', ingestTelemetry);

// Querying current status
router.get('/nodes', getAllTelemetry);
router.get('/sectors', getAllSectors);
router.get('/history', getTelemetryHistory);

export default router;

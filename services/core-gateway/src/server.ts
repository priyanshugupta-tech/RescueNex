import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { config } from './config/index.js';

// Route Handlers
import authRoutes from './routes/auth.routes.js';
import telemetryRoutes from './routes/telemetry.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import weatherRoutes from './routes/weather.routes.js';

// Services & Sockets
import { alertService } from './services/alert.service.js';
import { weatherService } from './services/weather.service.js';
import { simulationService } from './services/simulation.service.js';
import { setTelemetrySocketEmitter } from './controllers/telemetry.controller.js';
import { setAlertSocketEmitter } from './controllers/alerts.controller.js';
import { setWeatherSocketEmitter } from './controllers/weather.controller.js';

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Pass socket instance to alert services & controllers
alertService.setSocketServer(io);
const socketBroadcaster = (event: string, payload: any) => {
  io.emit(event, payload);
};
setTelemetrySocketEmitter(socketBroadcaster);
setAlertSocketEmitter(socketBroadcaster);
setWeatherSocketEmitter(socketBroadcaster);

// Express Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/weather', weatherRoutes);

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'RescueNex Core Gateway',
    timestamp: new Date().toISOString(),
    aiEngineUrl: config.aiEngineUrl,
    environment: config.nodeEnv
  });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Initialize Background Operations
const startServer = async () => {
  server.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 RescueNex Core Gateway running on port ${config.port}`);
    console.log(`📡 WebSocket server ready for real-time telemetry stream`);
    console.log(`🌐 Target Region: Jammu & Kashmir (NH-44 & Arterials)`);
    console.log(`=======================================================`);
  });

  // 1. Initial Weather Sync across all J&K mountain sectors
  console.log('[WeatherService] Performing initial meteorological sync...');
  await weatherService.syncAllSectors();
  console.log('[WeatherService] Initial weather synchronization complete.');

  // Set recurring weather polling
  setInterval(() => {
    weatherService.syncAllSectors().catch((err) => {
      console.error('[WeatherService] Periodic sync error:', err.message);
    });
  }, config.weatherPollIntervalMins * 60 * 1000);

  // 2. Start simulation service for neighboring mountain nodes
  if (config.enableNodeSimulation) {
    console.log('[SimulationService] Starting simulated telemetry stream for mountain sectors...');
    simulationService.startSimulation(io);
  }
};

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});

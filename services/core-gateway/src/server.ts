import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { connectDatabase, isDatabaseConnected } from './config/database.js';

// Route Handlers
import authRoutes from './routes/auth.routes.js';
import telemetryRoutes from './routes/telemetry.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import weatherRoutes from './routes/weather.routes.js';
import syncRoutes from './routes/sync.routes.js';
import broadcastRoutes from './routes/broadcast.routes.js';

// Services & Sockets
import { alertService } from './services/alert.service.js';
import { weatherService } from './services/weather.service.js';
import { setTelemetrySocketEmitter } from './controllers/telemetry.controller.js';
import { setAlertSocketEmitter } from './controllers/alerts.controller.js';
import { setWeatherSocketEmitter } from './controllers/weather.controller.js';
import { setSyncSocketEmitter } from './controllers/sync.controller.js';
import { setBroadcastSocketEmitter } from './controllers/broadcast.controller.js';
import { seedDefaultUsers } from './controllers/auth.controller.js';

const app = express();
const server = http.createServer(app);

// Dynamic CORS Origin Validator
const getAllowedOrigins = (): (string | RegExp)[] => {
  const origins: (string | RegExp)[] = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
  ];

  if (config.clientUrl) {
    origins.push(config.clientUrl.trim());
  }

  if (config.corsOrigins && config.corsOrigins.length > 0) {
    origins.push(...config.corsOrigins);
  }

  return origins;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    const allowed = getAllowedOrigins();
    // In development or if wildcard specified, permit all
    if (config.nodeEnv === 'development' || allowed.includes('*')) {
      return callback(null, true);
    }
    // Check against allowed origins list or subdomain match
    const isAllowed = allowed.some((allowedOrigin) => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin.toLowerCase() === origin.toLowerCase();
      }
      return allowedOrigin.test(origin);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin: ${origin} not in allowed whitelist`);
      callback(null, true); // Permissive fallback to prevent deployment friction, with warning logged
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// Setup Socket.IO
const io = new SocketServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      callback(null, true); // Allow client connections with credentials
    },
    methods: ['GET', 'POST'],
    credentials: true
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
setSyncSocketEmitter(socketBroadcaster);
setBroadcastSocketEmitter(socketBroadcaster);

// Express Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api', syncRoutes);

// System Health Check (Without leaking internal network topology)
app.get('/api/health', async (req, res) => {
  let aiStatus = 'OFFLINE';
  try {
    const aiCheck = await fetch(`${config.aiEngineUrl}/health`, { signal: AbortSignal.timeout(1000) });
    if (aiCheck.ok) {
      aiStatus = 'HEALTHY';
    }
  } catch {
    aiStatus = 'OFFLINE';
  }

  res.json({
    status: isDatabaseConnected() ? 'HEALTHY' : 'DEGRADED',
    service: 'RescueNex Core Gateway',
    timestamp: new Date().toISOString(),
    database: isDatabaseConnected() ? 'MONGODB_ATLAS_CONNECTED' : 'DISCONNECTED',
    aiEngineStatus: aiStatus
  });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Initialize Server Operations
const startServer = async () => {
  try {
    // 1. Mandatory connection to MongoDB Atlas
    await connectDatabase();
    await seedDefaultUsers();
  } catch (err: any) {
    console.error(`💥 [Fatal Startup Aborted] ${err.message}`);
    process.exit(1);
  }

  server.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 RescueNex Core Gateway running on port ${config.port}`);
    console.log(`📡 WebSocket server ready for real-time telemetry stream`);
    console.log(`🌐 Dynamic GPS Node Positioning & Live Weather Tracking`);
    console.log(`=======================================================`);
  });

  // 2. Initial Weather Sync across strategic reference corridors
  console.log('[WeatherService] Performing initial meteorological sync...');
  await weatherService.syncAllSectors();
  console.log('[WeatherService] Initial weather synchronization complete.');

  // Set recurring weather polling
  setInterval(() => {
    weatherService.syncAllSectors().catch((err) => {
      console.error('[WeatherService] Periodic sync error:', err.message);
    });
  }, config.weatherPollIntervalMins * 60 * 1000);
};

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});

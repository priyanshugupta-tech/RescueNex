# RescueNex: Real-Time Landslide Risk Analytics & Early Warning Platform

RescueNex is an autonomous, multi-modal mountain hazard and landslide early warning system tailored for high-risk Himalayan corridors (e.g., NH-44, Jammu & Kashmir).

## Architecture Overview

RescueNex is structured as a decoupled monorepo:
1. **`services/core-gateway`**: Node.js + Express/TypeScript API orchestrator.
   - Handles client authentication (JWT/RBAC).
   - Manages real-time WebSockets (Socket.IO) for live sensor telemetry and incident alerts.
   - Ingests IoT telemetry from physical and simulated mountain nodes.
   - Orchestrates automated alerts (NDMA CAP v1.2 compliance, SMS, Siren triggers).
2. **`services/ai-engine`**: Python 3.11 + FastAPI microservice.
   - Independent AI inference and anomaly detection service.
   - Isolation Forest model (filters traffic/construction vibration noise).
   - Ensemble XGBoost classifier for dynamic Landslide Susceptibility Index (LSI) prediction.
3. **`clients/web-dashboard`**: React + Vite + Tailwind CSS + Leaflet GIS Operations Center.
   - Live interactive GIS map with risk-zoned H3 micro-grids.
   - Real-time telemetry monitoring (Tilt angle, Soil moisture, Vibration, Weather).
   - Emergency Operations Command panel for authorities (SDRF, BRO, SDMA).
4. **`hardware/esp32-node`**: ESP32 C++ firmware.
   - Interfaces MPU-6050 (Accelerometer + Gyroscope), Soil Moisture, and DHT sensors.
   - Dispatches telemetry over Wi-Fi / MQTT to the Core Gateway.

## Folder Structure

```text
RescueNex/
├── services/
│   ├── core-gateway/         # Node.js + TypeScript Orchestration Server
│   │   ├── src/
│   │   │   ├── config/       # Environment & server config
│   │   │   ├── controllers/  # Route controllers (Auth, Sensors, Alerts, Nodes)
│   │   │   ├── middleware/   # JWT, RBAC guards, Request validation
│   │   │   ├── models/       # Data structures and DB schemas
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Ingestion, Sockets, AI-client, Weather sync
│   │   │   └── server.ts     # Main application entrypoint
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ai-engine/            # Python FastAPI AI Microservice
│       ├── app/
│       │   ├── api/          # Endpoints (/predict/lsi, /filter/anomaly, /health)
│       │   ├── core/         # Settings, logging configuration
│       │   ├── models/       # Trained model artifacts (.onnx / .joblib)
│       │   ├── services/     # Feature extraction, physics calculations
│       │   └── main.py       # FastAPI application entrypoint
│       ├── training/         # Dataset generation and model training scripts
│       └── requirements.txt
│
├── clients/
│   └── web-dashboard/        # React + Vite GIS Operations Dashboard
│       ├── src/
│       │   ├── assets/       # Icons, logos, and static assets
│       │   ├── components/   # Map, gauges, alert drawers, telemetry charts
│       │   ├── context/      # Auth & WebSocket live contexts
│       │   ├── pages/        # EOC Dashboard, Incident History, Public View
│       │   └── services/     # API and WebSocket client handlers
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── hardware/
│   └── esp32-node/           # Edge node firmware
│       ├── src/
│       │   └── main.cpp      # ESP32 + MPU6050 + Soil + DHT firmware
│       └── README.md
│
├── docker-compose.yml        # Multi-container local orchestration
└── README.md
```

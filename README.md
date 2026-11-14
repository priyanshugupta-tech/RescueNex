<a id="readme-top"></a>

<div align="center">
  <img src="clients/web-dashboard/public/assets/logo/rescuenex_emblem.svg" alt="RescueNex Logo" width="128">

  <h1>RescueNex</h1>

  <p><strong>Real-Time Landslide Risk Analytics & Early Warning Platform</strong></p>
  <p>Autonomous sensor telemetry ingestion, predictive slope stability intelligence, spatial GIS hazard mapping, and automated early warning advisories for mountain transit corridors.</p>

  <p>
    <a href="#about">About</a> ·
    <a href="#features">Features</a> ·
    <a href="#built-with">Built with</a> ·
    <a href="#getting-started">Getting started</a> ·
    <a href="#available-scripts">Available scripts</a> ·
    <a href="#api">API</a> ·
    <a href="#project-assets">Project assets</a>
  </p>
</div>

---

## About

**RescueNex** is an autonomous, real-time landslide risk analytics and early warning platform engineered for critical mountain transit corridors. The system continuously ingests physical telemetry from deployed field sensor nodes (bi-axial inclinometers, soil moisture probes, and acceleration RMS sensors) and synchronizes with live meteorological data.

By matching sensor telemetry with rainfall intensity and slope vulnerability models, RescueNex calculates a dynamic **Landslide Susceptibility Index (LSI)** score, visualizes hazard zones on high-resolution spatial GIS maps, and dispatches automated multilingual emergency broadcasts and acoustic siren warnings to safeguard mountain transit corridors.

---

## Features

- **Dynamic Landslide Susceptibility Index (LSI):** Real-time 0–100 risk scoring computed from multi-sensor telemetry and live precipitation metrics.
- **Multi-Sensor Hardware Telemetry Ingestion:** Continuous tracking of bi-axial tilt angles ($X/Y$ inclinometry), baseline deviation ($\Delta$), volumetric soil moisture percentage, and seismic/vibration acceleration.
- **Meteorological Sync & Simulation:** Live satellite weather integration via Open-Meteo with on-demand simulation drill modes (*Clear Skies*, *Monsoon*, *Cloudburst*).
- **Spatial GIS Corridor Mapping:** Interactive Leaflet-powered GIS map visualizing monitored mountain sectors, color-coded hazard alert states, and hardware GPS coordinates.
- **Automated Multilingual Vernacular Broadcasts:** Generates synchronized regional emergency bulletins across 4 corridor languages: **English**, **हिंदी (Hindi)**, **डोकरी (Dogri)**, and **कॉशुर (Kashmiri)**.
- **Two-Man Integrity Acoustic Siren Override:** Protected protocol requiring safety confirmation keys to actuate physical sector acoustic horns.
- **Secure Email Authentication & OAuth:** Email and password credentials with Resend OTP email verification, Google OAuth (GIS), and rate-limited lockout protection.
- **Chaukor High-Contrast UI:** Modern, sharp 90° square design system built with Tailwind CSS and Framer Motion for tactical clarity in operations rooms.

---

## Built with

<div align="center">
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
  <a href="https://www.framer.com/motion/"><img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion"></a>
  <a href="https://leafletjs.com/"><img src="https://img.shields.io/badge/Leaflet_GIS-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"></a>
  <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"></a>
  <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"></a>
  <a href="https://mongoosejs.com/"><img src="https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white" alt="Mongoose"></a>
  <a href="https://resend.com/"><img src="https://img.shields.io/badge/Resend-000000?style=for-the-badge&logo=resend&logoColor=white" alt="Resend"></a>
</div>

---

## Getting started

### Prerequisites

- **Node.js** (v18.0.0 or higher) and **npm**
- Access to a **MongoDB** database (MongoDB Atlas or local instance)
- A **Resend API Key** for transactional OTP email delivery
- *(Optional)* Google OAuth Client ID for Google Identity Services

---

### Installation

1. **Clone the repository:**

   ```sh
   git clone https://github.com/priyanshugupta-tech/RescueNex.git
   cd RescueNex
   ```

2. **Install Core Gateway backend dependencies:**

   ```sh
   cd services/core-gateway
   npm install
   cd ../..
   ```

3. **Install Web Dashboard frontend dependencies:**

   ```sh
   cd clients/web-dashboard
   npm install
   cd ../..
   ```

4. **Configure environment variables:**

   Create a `.env` file in `services/core-gateway/`:

   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_jwt_random_secret_key
   RESEND_API_KEY=re_your_resend_api_key
   ```

   *(Note: If MongoDB is offline, the gateway automatically falls back to its in-memory operational state service so all features remain functional).*

5. **Start the backend Core Gateway:**

   ```sh
   cd services/core-gateway
   npm run dev
   ```

6. **In a second terminal, start the Web Dashboard frontend:**

   ```sh
   cd clients/web-dashboard
   npm run dev
   ```

   The dashboard will be available at `http://localhost:5173`.

---

## Available scripts

Run these commands from the respective service directories:

| Directory                  | Command           | Description                                                 |
| -------------------------- | ----------------- | ----------------------------------------------------------- |
| `services/core-gateway/`   | `npm run dev`     | Start the backend gateway with hot-reloading (`tsx watch`)  |
| `services/core-gateway/`   | `npm run build`   | Compile TypeScript backend to `dist/`                       |
| `services/core-gateway/`   | `npm start`       | Run compiled backend production server (`node dist/server`) |
| `clients/web-dashboard/`   | `npm run dev`     | Start Vite frontend development server                      |
| `clients/web-dashboard/`   | `npm run build`   | Type-check and build production web assets to `dist/`       |
| `clients/web-dashboard/`   | `npm run preview` | Locally preview the production build                        |

---

## API

The backend Core Gateway runs on port `5000` by default.

### Authentication Endpoints

| Method | Endpoint                    | Purpose                                                         |
| ------ | --------------------------- | --------------------------------------------------------------- |
| `POST` | `/api/auth/signup`          | Register official account and dispatch 6-digit verification OTP |
| `POST` | `/api/auth/verify-otp`      | Verify OTP code and issue access token                          |
| `POST` | `/api/auth/login`           | Sign in using email address and password                        |
| `POST` | `/api/auth/oauth/google`    | Authenticate via Google Identity Services credential            |
| `GET`  | `/api/auth/token`           | Rotate refresh token cookie and issue new access token          |
| `GET`  | `/api/auth/me`              | Fetch profile of the currently authenticated user               |
| `POST` | `/api/auth/logout`          | Revoke active session and clear authentication cookie           |

### Telemetry & Weather Endpoints

| Method | Endpoint                    | Purpose                                                         |
| ------ | --------------------------- | --------------------------------------------------------------- |
| `GET`  | `/api/telemetry/live`       | Fetch latest physical node readings and GPS coordinates         |
| `GET`  | `/api/telemetry/history`    | Fetch historical telemetry logs for analytics and trends        |
| `POST` | `/api/telemetry/ingest`     | Ingest hardware sensor data payload from field nodes            |
| `GET`  | `/api/weather/current`      | Retrieve current meteorological parameters                      |
| `POST` | `/api/weather/sync`         | Force synchronization with live Open-Meteo satellite feed       |
| `POST` | `/api/weather/scenario`     | Switch weather scenario (`LIVE`, `CLEAR`, `MONSOON`, `CLOUDBURST`) |

### Hazard Alerts & Siren Endpoints

| Method | Endpoint                    | Purpose                                                         |
| ------ | --------------------------- | --------------------------------------------------------------- |
| `GET`  | `/api/alerts`               | Retrieve active corridor alerts and sector hazard levels        |
| `POST` | `/api/alerts/siren/activate`| Trigger acoustic sector horn (requires confirmation key)        |
| `POST` | `/api/alerts/siren/deactivate` | Deactivate active sector acoustic siren                      |

---

## Project assets

- **Official Brand Emblem:** [`clients/web-dashboard/public/assets/logo/rescuenex_emblem.svg`](clients/web-dashboard/public/assets/logo/rescuenex_emblem.svg)
- **Favicon & Web App Icon:** [`clients/web-dashboard/index.html`](clients/web-dashboard/index.html)

---

## Current status

Production-ready core system with automated telemetry ingestion, real-time spatial GIS visualization, dynamic LSI risk index calculation, multilingual vernacular advisories, and protected operational controls. Edge ESP32 firmware source code is available in [`hardware/esp32-node/`](hardware/esp32-node/).

<p align="right"><a href="#readme-top">Back to top</a></p>

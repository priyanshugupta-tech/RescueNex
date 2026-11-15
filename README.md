<a id="readme-top"></a>

<div align="center">
  <img src="clients/web-dashboard/public/assets/logo/rescuenex_emblem.svg" alt="RescueNex Logo" width="128">

  <h1>RescueNex</h1>

  <p><strong>Autonomous AI-Powered Real-Time Landslide Risk Analytics & Geofenced Emergency Early Warning System</strong></p>
  <p>Edge IoT sensor telemetry ingestion, predictive slope stability physics modeling, spatial GIS hazard perimeter mapping, and automated dual-channel (SMS & Email) 10 km corridor evacuation broadcasts for critical mountain transit corridors.</p>

  <p>
    <a href="#about">About</a> ·
    <a href="#core-architectural-pillars">Architecture</a> ·
    <a href="#features">Features</a> ·
    <a href="#built-with">Built with</a> ·
    <a href="#getting-started">Getting started</a> ·
    <a href="#api-reference">API Reference</a> ·
    <a href="#legal--compliance-frameworks">Legal & Compliance</a> ·
    <a href="#project-assets">Project assets</a>
  </p>
</div>

---

## About

**RescueNex** is an autonomous, mission-critical landslide early warning and spatial hazard monitoring platform engineered specifically for high-risk mountain transit corridors. The system continuously ingests physical telemetry from edge hardware nodes (bi-axial inclinometers, soil moisture probes, and vibration/acceleration sensors), fuses the readings with real-time meteorological precipitation feeds, and runs multi-sensor stress analytics via an asynchronous AI engine.

By matching real-time slope kinematics with rainfall pore-pressure saturation models, RescueNex calculates a dynamic **Landslide Susceptibility Index (LSI)** score, visualizes hazard zones on high-resolution spatial GIS radar maps, actuates acoustic warning horns, and dispatches targeted **10 km geofenced evacuation broadcasts via SMS and Email** to protect commuter lives and assist disaster response agencies (SDRF, BRO, and District Disaster Management Authorities).

---

## Core Architectural Pillars

```
+-----------------------------------------------------------------------------------+
|                              RESCUENEX ARCHITECTURE                               |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+------------------+             +------------------+             +------------------+
|  Hardware Nodes  |             |   AI Engine      |             |   Core Gateway   |
|  (ESP32 / LoRa)  |             | (FastAPI/Python) |             | (Node.js/Express)|
| - MPU-6050 IMU   | ---HTTP---> | - Physics Stress | <--HTTP---> | - Geofence Radar |
| - Soil Moisture  |             | - Dynamic LSI    |             | - Dual Broadcast |
| - Solar Power    |             | - Risk Severity  |             | - Atlas MongoDB  |
+------------------+             +------------------+             +------------------+
                                                                            |
                                          +---------------------------------+
                                          |
                                          v
                               +--------------------+
                               | Web Dashboard (UI) |
                               |  (React 18 / Vite) |
                               | - Chaukor UI Style |
                               | - Spatial GIS Map  |
                               | - Offline Cache    |
                               +--------------------+
```

1. **Hardware Edge Sensing (`hardware/esp32-node/`):** Autonomous field-deployed ESP32 microcontrollers sampling bi-axial inclination angles ($X/Y$ tilt), baseline deviation ($\Delta$), vibration RMS, and soil capacitive moisture saturation.
2. **AI Predictive Engine (`services/ai-engine/`):** High-throughput asynchronous FastAPI microservice evaluating environmental stress contributions and computing real-time Landslide Susceptibility Index (LSI) scores.
3. **Core Operations Gateway (`services/core-gateway/`):** Mission-critical Node.js / Express backend with WebSocket telemetry streaming, MongoDB Atlas persistence, meteorological synchronization, and dynamic 10 km geofenced emergency broadcasts.
4. **Command & Public Web Dashboard (`clients/web-dashboard/`):** Tactical Chaukor (90° sharp square) dashboard built with React 18, Vite, Tailwind CSS, Framer Motion, and Leaflet GIS mapping with full offline emergency caching.

---

## Features

### 1. 10 km Dynamic Geofenced Evacuation Pipeline
- **Haversine Corridor Radar:** Computes geodesic proximity between registered commuters and active mountain hazard zones in real time.
- **Dual-Channel Evacuation Dispatch:** 
  - **SMS Broadcast:** Commuters with a verified mobile number receive immediate, high-priority evacuation orders delivered via Fast2SMS telecom routes.
  - **Email Fallback:** Commuters without a phone number receive immediate HTML evacuation advisories via Resend.
- **Strict 2-Hour Anti-Spam Deduplication:** When commuters traverse sectors or switch their transit location repeatedly, a 2-hour suppression window guarantees they receive the emergency evacuation notice **strictly once per hazard event**, eliminating repeated SMS spam.

### 2. Post-Signup Mobile Security & Strict Rate Limiting
- **Zero Registration Friction:** Mobile number is never forced at sign-up. Commuters optionally link and verify mobile numbers post-signup via clean Chaukor UI.
- **SMS OTP Rate Limiting:** Enforces a 60-second cooldown between SMS OTP requests and a 5-attempt / 5-minute lockout on failed verifications, backed by MongoDB Atlas.
- **Weekly Update Throttling:** Mobile number changes are strictly limited to **2 updates per week (7 rolling days)** to safeguard against account takeover and SMS route exhaustion.
- **Privacy First (No OTP on Screen):** Verification codes are delivered strictly over telecom SMS; never exposed in API responses or on the user interface.

### 3. Dynamic Landslide Susceptibility Index (LSI)
- **Multi-Sensor Weighting:** Dynamic 0–100 risk score combining bi-axial tilt deviation, ground acceleration, and volumetric soil moisture saturation.
- **Four Risk Tiers:** `LOW` (< 40), `ADVISORY` (40–74), `WARNING` (75–89), and `CRITICAL` (≥ 90).

### 4. Spatial GIS Corridor Mapping & Offline Resilience
- **Interactive Leaflet Radar:** Color-coded threat perimeters, nearest station tracking, and physical sensor telemetry overlays.
- **Offline Emergency Cache:** LocalStorage fallback caching sector topologies, active alerts, and recent sensor telemetry during mountain cellular blackouts.

### 5. Multilingual Vernacular Dispatch & Acoustic Sirens
- **Vernacular Bulletins:** Synchronized disaster alerts across 4 corridor languages: **English**, **हिंदी (Hindi)**, **डोकरी (Dogri)**, and **कॉशुर (Kashmiri)**.
- **Two-Man Integrity Acoustic Siren Override:** Physical horn actuation with confirmation safety keys (`CONFIRM_DISASTER_OVERRIDE`).

---

## Built with

<div align="center">
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"></a>
  <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"></a>
  <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"></a>
  <a href="https://leafletjs.com/"><img src="https://img.shields.io/badge/Leaflet_GIS-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet"></a>
  <a href="https://resend.com/"><img src="https://img.shields.io/badge/Resend-000000?style=for-the-badge&logo=resend&logoColor=white" alt="Resend"></a>
</div>

---

## Getting started

### Prerequisites

- **Node.js** (v18.0.0 or higher) and **npm**
- **Python** (v3.10 or higher) with `pip`
- Access to a **MongoDB Atlas** cluster (or local MongoDB 6+)
- A **Fast2SMS API Key** for Indian telecom SMS dispatch
- A **Resend API Key** for account verification & evacuation emails

---

### Installation

1. **Clone the repository:**

   ```sh
   git clone https://github.com/priyanshugupta-tech/RescueNex.git
   cd RescueNex
   ```

2. **Configure Environment Variables:**

   Create `services/core-gateway/.env`:

   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secure_jwt_random_secret_key
   AI_ENGINE_URL=http://localhost:8000
   WEATHER_POLL_INTERVAL_MINS=15

   # Emergency Broadcast Services
   FAST2SMS_API_KEY=your_fast2sms_api_key
   RESEND_API_KEY=re_your_resend_api_key
   RESEND_FROM_EMAIL=Security Team <noreply@yourdomain.com>
   ```

3. **Install Dependencies:**

   ```sh
   # Install Core Gateway dependencies
   npm --prefix services/core-gateway install

   # Install Web Dashboard dependencies
   npm --prefix clients/web-dashboard install

   # Install AI Engine dependencies
   pip install -r services/ai-engine/requirements.txt
   ```

4. **Run the Services:**

   ```sh
   # Terminal 1: Start AI Predictive Engine
   cd services/ai-engine
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

   # Terminal 2: Start Core Gateway
   cd services/core-gateway
   npm run dev

   # Terminal 3: Start Web Dashboard
   cd clients/web-dashboard
   npm run dev
   ```

   The dashboard will be accessible at `http://localhost:5173`.

---

## API Reference

### 1. Authentication Endpoints

| Method | Endpoint                    | Access  | Purpose                                                        |
| ------ | --------------------------- | ------- | -------------------------------------------------------------- |
| `POST` | `/api/auth/signup`          | Public  | Register account & dispatch 6-digit email verification OTP     |
| `POST` | `/api/auth/verify-otp`      | Public  | Verify email OTP & issue JWT access token                      |
| `POST` | `/api/auth/login`           | Public  | Sign in via email and password (rate limited: 5 attempts/2 min)|
| `POST` | `/api/auth/oauth/google`    | Public  | Sign in via Google Identity Services (GIS)                     |
| `GET`  | `/api/auth/me`              | Auth    | Retrieve profile of currently authenticated user               |
| `POST` | `/api/auth/logout`          | Auth    | Revoke session and clear cookies                               |

### 2. Emergency Broadcast & Phone OTP Endpoints

| Method | Endpoint                          | Access  | Purpose                                                              |
| ------ | --------------------------------- | ------- | -------------------------------------------------------------------- |
| `POST` | `/api/broadcast/phone/send-otp`    | Auth    | Request 6-digit SMS OTP (60s cooldown, max 2 updates/week)            |
| `POST` | `/api/broadcast/phone/verify-otp`  | Auth    | Verify SMS OTP and activate 10 km corridor SMS broadcasts            |
| `POST` | `/api/broadcast/phone/dismiss-prompt` | Auth | Skip adding mobile number (activates email-only disaster fallback)  |
| `POST` | `/api/broadcast/location`         | Auth    | Sync commuter transit coordinates (triggers alert with 2h deduplication)|
| `GET`  | `/api/broadcast/logs`             | Auth    | Retrieve corridor broadcast dispatch audit history                   |
| `POST` | `/api/broadcast/dispatch`         | Operator| Manual corridor evacuation order dispatch                            |

### 3. Telemetry & Weather Endpoints

| Method | Endpoint                 | Access  | Purpose                                                        |
| ------ | ------------------------ | ------- | -------------------------------------------------------------- |
| `GET`  | `/api/telemetry/live`    | Public  | Retrieve latest sensor node readings & GPS fixes               |
| `GET`  | `/api/telemetry/sectors` | Public  | List monitored strategic mountain transit corridor sectors     |
| `POST` | `/api/telemetry/ingest`  | Public  | Ingest physical telemetry packet from field hardware nodes    |
| `GET`  | `/api/weather/current`   | Public  | Retrieve live meteorological metrics                           |
| `POST` | `/api/weather/sync`      | Public  | Trigger instant satellite weather synchronization              |

### 4. Hazard Alerts & Siren Endpoints

| Method | Endpoint                        | Access  | Purpose                                                        |
| ------ | ------------------------------- | ------- | -------------------------------------------------------------- |
| `GET`  | `/api/alerts`                   | Public  | Retrieve active corridor alerts & risk severity levels         |
| `POST` | `/api/alerts/siren/activate`    | Operator| Actuate sector acoustic horn (`CONFIRM_DISASTER_OVERRIDE`)      |
| `POST` | `/api/alerts/siren/deactivate`  | Operator| Deactivate sector acoustic horn                                |

---

## Legal & Compliance Frameworks

- **Digital Personal Data Protection Act (DPDP Act, 2023 - India):**
  - Personal data (email, optional mobile number, transit point) is collected with explicit user consent strictly for life-safety emergency evacuation broadcasts.
  - Zero commercial monetization, profiling, or third-party data selling.
  - Users possess full rights to update their mobile number (max 2 times/week security limit) or request complete account erasure.
- **National Disaster Management Authority (NDMA) & OASIS CAP v1.2:**
  - Automated early warning broadcasts comply with NDMA Common Alerting Protocol standards.
  - Machine learning indices (LSI) serve as rapid decision support; statutory road closures remain under the legal authority of on-ground civil defense officials.
- **Telecom Regulatory Authority of India (TRAI):**
  - All dispatched SMS messages are strictly transactional/critical life-safety notices.
  - Rate limiting (60s cooldown, 5-attempt lockout, 2-hour sector deduplication) guarantees telecommunication route integrity and prevents civilian harassment.
- **Disaster Management Act, 2005:**
  - Malicious or unauthorized siren activation and dissemination of false disaster alarms are strictly prohibited under Section 54 of the Disaster Management Act, 2005.

---

## Project assets

- **Official Brand Emblem:** [`clients/web-dashboard/public/assets/logo/rescuenex_emblem.svg`](clients/web-dashboard/public/assets/logo/rescuenex_emblem.svg)
- **Favicon & Web App Icon:** [`clients/web-dashboard/index.html`](clients/web-dashboard/index.html)

---

## Current Status

Production-grade, end-to-end resilient early warning system featuring real-time edge telemetry, asynchronous AI susceptibility modeling, dual-channel 10 km geofenced broadcasts (Fast2SMS & Resend), strict anti-spam deduplication, and a high-contrast Chaukor dashboard. Edge ESP32 firmware source code is available in [`hardware/esp32-node/`](hardware/esp32-node/).

<p align="right"><a href="#readme-top">Back to top</a></p>

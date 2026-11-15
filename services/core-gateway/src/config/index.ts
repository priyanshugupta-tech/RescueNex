import dotenv from 'dotenv';
import path from 'path';
import { MountainSector } from '../types/index.js';

// Load from current directory, root, or service folder
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'services/core-gateway/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'rescuenex_dev_secret_2026',
  aiEngineUrl: process.env.AI_ENGINE_URL || 'http://localhost:8000',
  weatherPollIntervalMins: parseInt(process.env.WEATHER_POLL_INTERVAL_MINS || '15', 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'Security Team <noreply@deardeveloperr.in>'
};

// Strategic reference zones in J&K for geofencing and alert routing
export const STRATEGIC_SECTORS: MountainSector[] = [
  {
    id: 'SECTOR_BANIHAL',
    name: 'Banihal Pass Tunnel Zone',
    highway: 'Jammu-Srinagar Corridor',
    latitude: 33.4975,
    longitude: 75.2014,
    elevationM: 1730,
    sirenActive: false,
    currentRiskLevel: 'LOW',
    currentLsiScore: 0.15
  },
  {
    id: 'SECTOR_RAMBAN',
    name: 'Ramban Chanderkote Stretch',
    highway: 'Jammu-Srinagar Corridor',
    latitude: 33.2422,
    longitude: 75.2443,
    elevationM: 1156,
    sirenActive: false,
    currentRiskLevel: 'LOW',
    currentLsiScore: 0.22
  },
  {
    id: 'SECTOR_PATNITOP',
    name: 'Patnitop Nashri Tunnel North',
    highway: 'Jammu-Srinagar Corridor',
    latitude: 33.0911,
    longitude: 75.3283,
    elevationM: 2024,
    sirenActive: false,
    currentRiskLevel: 'LOW',
    currentLsiScore: 0.12
  },
  {
    id: 'SECTOR_MUGHAL_ROAD',
    name: 'Pir Ki Gali High Pass',
    highway: 'Mughal Road Corridor',
    latitude: 33.6190,
    longitude: 74.5200,
    elevationM: 3485,
    sirenActive: false,
    currentRiskLevel: 'LOW',
    currentLsiScore: 0.18
  },
  {
    id: 'SECTOR_DODA_KISHTWAR',
    name: 'Batote-Kishtwar Gorge Corridor',
    highway: 'Kishtwar Transit Corridor',
    latitude: 33.3106,
    longitude: 75.7667,
    elevationM: 1638,
    sirenActive: false,
    currentRiskLevel: 'LOW',
    currentLsiScore: 0.25
  }
];

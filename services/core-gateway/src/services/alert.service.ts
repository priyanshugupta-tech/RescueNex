import { Server } from 'socket.io';
import { stateService } from './state.service.js';
import { EmergencyAlert, LSIResult, MountainSector } from '../types/index.js';
import { AlertModel } from '../models/alert.model.js';
import { isDatabaseConnected } from '../config/database.js';

export class AlertService {
  private io?: Server;

  public setSocketServer(io: Server): void {
    this.io = io;
  }

  /**
   * Generates vernacular multilingual alert messages
   */
  public generateMultilingualContent(sector: MountainSector, lsi: LSIResult) {
    if (lsi.riskLevel === 'CRITICAL') {
      return {
        en: `CRITICAL LANDSLIDE RED ALERT: Imminent slope collapse at ${sector.name} (${sector.highway}). Halt all vehicular movement and evacuate immediate valley floor!`,
        hi: `अत्यंत गंभीर भूस्खलन चेतावनी: ${sector.name} (${sector.highway}) पर तत्काल भूस्खलन का खतरा। सभी वाहन तुरंत रोकें और सुरक्षित स्थान पर जाएं!`,
        dogri: `भारी ज़मीन खिसकने दी चेताउनी: ${sector.name} (${sector.highway}) पर ढलान खिसकने दा खतरा। गड्डियां रोको ते सुरक्षित जगह पर जाह्ओ!`,
        kashmiri: `خطرناک لٔند سلایٔڈ چتاونی: ${sector.name} پیٹھ سلایٔڈ یُنک شدید خطرہ۔ گاڈیہ روکو تہ محفوظ جائے کُن تلو!`
      };
    } else if (lsi.riskLevel === 'WARNING') {
      return {
        en: `LANDSLIDE WARNING: High moisture saturation and slope movement detected at ${sector.name}. Pre-staging disaster response teams. Exercise extreme caution.`,
        hi: `भूस्खलन चेतावनी: ${sector.name} पर मिट्टी का अत्यधिक कटाव। आपदा टीमें सतर्क। यात्रा करते समय सावधानी बरतें।`,
        dogri: `ज़मीन खिसकने दी चेतावनी: ${sector.name} पर ख़तरा बढ़दा ऐ। एहतियात बरतौ।`,
        kashmiri: `لٔند سلایٔڈ وارننگ: ${sector.name} کین پہاڑن منز خطرہ۔ ہوشیار روزیو۔`
      };
    }

    return {
      en: `ADVISORY: Moderate moisture and rain alerts in ${sector.name}. Monitoring active.`,
      hi: `सलाह: ${sector.name} क्षेत्र में मध्यम वर्षा और नमी दर्ज। निगरानी जारी।`,
      dogri: `सलाह: ${sector.name} च बारिश कारण चौकसी रखी जा करदी ऐ।`,
      kashmiri: `सलाह: ${sector.name} منز موسم پؠٹھ نزر۔`
    };
  }

  /**
   * Processes risk level change, saves alert in RAM + Atlas, and broadcasts over WebSockets
   */
  public async triggerEmergencyAlert(
    sector: MountainSector,
    nodeId: string,
    lsi: LSIResult
  ): Promise<EmergencyAlert | null> {
    if (lsi.riskLevel === 'LOW' && !lsi.triggerSiren) {
      return null;
    }

    // State Transition Guard / Debounce: Check if an active alert for this sector already exists
    const activeAlerts = stateService.getActiveAlerts();
    const existingSectorAlert = activeAlerts.find((a) => a.sectorId === sector.id);

    // If existing alert is already at this risk level, update LSI without duplicate spam
    if (existingSectorAlert && existingSectorAlert.riskLevel === lsi.riskLevel) {
      existingSectorAlert.lsiScore = lsi.lsiScore;
      return existingSectorAlert;
    }

    const descriptions = this.generateMultilingualContent(sector, lsi);
    const alertId = `ALERT_${sector.id}_${Date.now()}`;
    const alert: EmergencyAlert = {
      id: alertId,
      sectorId: sector.id,
      sectorName: sector.name,
      nodeId,
      timestamp: Date.now(),
      riskLevel: lsi.riskLevel,
      lsiScore: lsi.lsiScore,
      headline: `${lsi.riskLevel} - Landslide Risk at ${sector.name}`,
      descriptions,
      sirenTriggered: lsi.triggerSiren
    };

    // 1. Update in-memory state
    stateService.addAlert(alert);
    stateService.updateSectorRisk(sector.id, lsi.riskLevel, lsi.lsiScore);

    if (lsi.triggerSiren) {
      stateService.setSirenState(sector.id, true);
    }

    // 2. Persist to MongoDB Atlas audit log
    if (isDatabaseConnected()) {
      try {
        await AlertModel.create({
          alertId: alert.id,
          sectorId: alert.sectorId,
          sectorName: alert.sectorName,
          nodeId: alert.nodeId,
          timestamp: new Date(alert.timestamp),
          riskLevel: alert.riskLevel,
          lsiScore: alert.lsiScore,
          headline: alert.headline,
          descriptions: alert.descriptions,
          sirenTriggered: alert.sirenTriggered,
          status: 'ACTIVE'
        });
      } catch (err: any) {
        console.warn('⚠️ [MongoDB] Failed to log alert to Atlas:', err.message);
      }
    }

    // 3. Broadcast in real-time to all connected web dashboards
    if (this.io) {
      this.io.emit('EMERGENCY_ALERT', alert);
      this.io.emit('SECTOR_STATUS_UPDATED', {
        sectorId: sector.id,
        currentRiskLevel: lsi.riskLevel,
        currentLsiScore: lsi.lsiScore,
        sirenActive: lsi.triggerSiren
      });
    }

    return alert;
  }

  /**
   * Generates NDMA Common Alerting Protocol (CAP v1.2) XML payload
   */
  public exportCAP_XML(alert: EmergencyAlert): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${alert.id}</identifier>
  <sender>rescuenex-gateway@sdma.jk.gov.in</sender>
  <sent>${new Date(alert.timestamp).toISOString()}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <category>Geo</category>
    <event>Landslide Early Warning</event>
    <urgency>${alert.riskLevel === 'CRITICAL' ? 'Immediate' : 'Expected'}</urgency>
    <severity>${alert.riskLevel === 'CRITICAL' ? 'Extreme' : 'Severe'}</severity>
    <certainty>Observed</certainty>
    <headline>${alert.headline}</headline>
    <description>${alert.descriptions.en}</description>
    <area>
      <areaDesc>${alert.sectorName}</areaDesc>
    </area>
  </info>
</alert>`;
  }
}

export const alertService = new AlertService();

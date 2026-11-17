import axios from 'axios';
import { UserModel } from '../models/user.model.js';
import { BroadcastLogModel } from '../models/broadcastLog.model.js';
import { isDatabaseConnected } from '../config/database.js';
import { emailService } from './email.service.js';
import { EmergencyAlert, MountainSector, BroadcastRecipient, BroadcastLog } from '../types/index.js';

// Calculate geodesic distance using Haversine formula (km)
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export class BroadcastService {
  private inMemoryLogs: BroadcastLog[] = [];

  /**
   * Deduplication Guard: Checks if a commuter has already received an alert for this sector in the last 2 hours
   */
  public async hasUserReceivedRecentAlert(
    userId: string,
    sectorId: string,
    windowMs: number = 2 * 60 * 60 * 1000
  ): Promise<boolean> {
    const cutoffDate = new Date(Date.now() - windowMs);

    // 1. Check persistent MongoDB Atlas broadcast logs
    if (isDatabaseConnected()) {
      try {
        const existing = await BroadcastLogModel.findOne({
          sectorId,
          dispatchedAt: { $gte: cutoffDate },
          'recipients': {
            $elemMatch: {
              userId,
              status: 'SENT'
            }
          }
        }).lean();

        if (existing) {
          return true;
        }
      } catch (err: any) {
        console.warn('⚠️ [MongoDB] Error checking broadcast deduplication:', err.message);
      }
    }

    // 2. Check in-memory logs (for fast lookup and offline mode)
    const recentInMemory = this.inMemoryLogs.some((log) => {
      if (log.sectorId !== sectorId) return false;
      const logTime = typeof log.dispatchedAt === 'number' ? log.dispatchedAt : new Date(log.dispatchedAt).getTime();
      if (Date.now() - logTime > windowMs) return false;
      return log.recipients.some((r) => r.userId === userId && r.status === 'SENT');
    });

    return recentInMemory;
  }

  /**
   * Dispatches a single targeted alert to a commuter who just selected/entered an active hazard zone,
   * strictly guarded by 2-hour deduplication to prevent repeated SMS spam on city switches.
   */
  public async dispatchAlertToUserIfDeduplicated(
    u: any,
    alert: EmergencyAlert,
    sector: MountainSector,
    distanceKm: number
  ): Promise<{ dispatched: boolean; recipients?: BroadcastRecipient[] }> {
    const userIdStr = (u._id || u.id || '').toString();
    const alreadySent = await this.hasUserReceivedRecentAlert(userIdStr, sector.id);

    if (alreadySent) {
      console.log(
        `ℹ️ [Broadcast Deduplication] Commuter ${u.email || userIdStr} already received evacuation alert for ${sector.name} within last 2 hours. Repeated alert suppressed.`
      );
      return { dispatched: false };
    }

    const preferredLang = u.preferredLanguage || 'hi';
    const englishMsg = `RESCUENEX EMERGENCY ALERT: ${alert.riskLevel} Landslide detected at ${sector.name} (${distanceKm} km from your transit point). Halt vehicle immediately and take shelter!`;
    const hindiMsg = `RESCUENEX CHEETAVNI: ${sector.name} par ${alert.riskLevel} bhooskhalan khatra (aapse ${distanceKm} km door). Kripya gaadi safe jagah rokein!`;
    const messageToSend = preferredLang === 'en' ? englishMsg : hindiMsg;

    const fast2SmsKey = process.env.FAST2SMS_API_KEY;
    const hasVerifiedPhone = Boolean(u.phoneNumber && u.isPhoneVerified && u.smsAlertsEnabled !== false);
    const userRecipients: BroadcastRecipient[] = [];

    // 1. Dispatch SMS if mobile phone number is registered & verified
    if (hasVerifiedPhone && fast2SmsKey) {
      const smsResult = await this.sendSms(u.phoneNumber, messageToSend, fast2SmsKey);
      userRecipients.push({
        userId: userIdStr,
        phoneNumber: u.phoneNumber,
        channel: 'SMS',
        status: smsResult.status,
        messageId: smsResult.messageId,
        errorMessage: smsResult.error,
        distanceKm
      });
    }

    // 2. Dispatch Email (always send email if user has registered email)
    if (u.email) {
      const emailRes = await emailService.sendEvacuationAlertEmail(u.email, alert, sector, distanceKm);
      userRecipients.push({
        userId: userIdStr,
        email: u.email,
        channel: 'EMAIL',
        status: emailRes.success ? 'SENT' : 'FAILED',
        messageId: `EMAIL_${Date.now()}`,
        errorMessage: emailRes.error ? String(emailRes.error) : undefined,
        distanceKm
      });
    }

    if (userRecipients.length === 0) {
      return { dispatched: false };
    }

    // Record in database and in-memory log so subsequent switches within 2 hours are suppressed
    const broadcastId = `BC_LOC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const hasSms = userRecipients.some((r) => r.channel === 'SMS');
    const hasEmail = userRecipients.some((r) => r.channel === 'EMAIL');
    const channelType = hasSms && hasEmail ? ('ALL' as const) : hasSms ? ('SMS' as const) : ('EMAIL' as const);

    const logData = {
      broadcastId,
      alertId: alert.id,
      sectorId: sector.id,
      sectorName: sector.name,
      riskLevel: alert.riskLevel,
      channel: channelType,
      recipientCount: userRecipients.length,
      recipients: userRecipients,
      message: { en: englishMsg, hi: hindiMsg },
      dispatchedAt: new Date(),
      provider: hasSms ? ('FAST2SMS' as const) : ('RESEND' as const)
    };

    if (isDatabaseConnected()) {
      try {
        await BroadcastLogModel.create(logData);
      } catch (err: any) {
        console.warn('⚠️ [MongoDB] Failed to log single-user broadcast:', err.message);
      }
    }

    this.inMemoryLogs.unshift({
      id: broadcastId,
      broadcastId,
      alertId: alert.id,
      sectorId: sector.id,
      sectorName: sector.name,
      riskLevel: alert.riskLevel,
      channel: channelType,
      recipientCount: userRecipients.length,
      recipients: userRecipients,
      message: { en: englishMsg, hi: hindiMsg },
      dispatchedAt: Date.now(),
      provider: hasSms ? 'FAST2SMS' : 'RESEND'
    });

    const anySent = userRecipients.some((r) => r.status === 'SENT');
    return { dispatched: anySent, recipients: userRecipients };
  }

  /**
   * Dispatches targeted evacuation alerts strictly to registered users within 10 km of the hazard sector
   */
  public async dispatchCorridorEvacuationAlert(
    alert: EmergencyAlert,
    sector: MountainSector
  ): Promise<{ success: boolean; recipientCount: number; broadcastId: string; provider: string }> {
    const broadcastId = `BC_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const recipients: BroadcastRecipient[] = [];

    // 1. Query registered commuters from MongoDB Atlas
    let candidateUsers: any[] = [];
    if (isDatabaseConnected()) {
      candidateUsers = await UserModel.find({}).lean();
    }

    // 2. Filter users whose lastKnownLocation is strictly within 10 km of the hazard sector
    const nearbyUsers: Array<{ user: any; distanceKm: number }> = [];
    for (const u of candidateUsers) {
      if (u.lastKnownLocation && typeof u.lastKnownLocation.latitude === 'number' && typeof u.lastKnownLocation.longitude === 'number') {
        const dist = calculateHaversineDistanceKm(
          u.lastKnownLocation.latitude,
          u.lastKnownLocation.longitude,
          sector.latitude,
          sector.longitude
        );
        if (dist <= 10.0) {
          nearbyUsers.push({ user: u, distanceKm: dist });
        }
      }
    }

    // Determine configured external provider for SMS
    const fast2SmsKey = process.env.FAST2SMS_API_KEY;
    const smsProvider: 'FAST2SMS' | 'NONE_CONFIGURED' = fast2SmsKey ? 'FAST2SMS' : 'NONE_CONFIGURED';

    console.log(
      `📢 [Corridor Broadcast] Alert for ${sector.name} (${alert.riskLevel}). Found ${nearbyUsers.length} commuters within 10 km.`
    );

    // 3. Dispatch: Users with mobile numbers receive SMS and Email; users without phone numbers receive Email
    for (const { user: u, distanceKm } of nearbyUsers) {
      const userIdStr = (u._id || u.id || '').toString();

      // DEDUPLICATION: Suppress if this user already received an evacuation alert for this sector within 2 hours
      const alreadySent = await this.hasUserReceivedRecentAlert(userIdStr, sector.id);
      if (alreadySent) {
        console.log(`ℹ️ [Broadcast Deduplication] Commuter ${u.email} already received alert for ${sector.name} in last 2h. Suppressing.`);
        continue;
      }

      const preferredLang = u.preferredLanguage || 'hi';
      const englishMsg = `RESCUENEX EMERGENCY ALERT: ${alert.riskLevel} Landslide detected at ${sector.name} (${distanceKm} km from your transit point). Halt vehicle immediately and take shelter!`;
      const hindiMsg = `RESCUENEX CHEETAVNI: ${sector.name} par ${alert.riskLevel} bhooskhalan khatra (aapse ${distanceKm} km door). Kripya gaadi safe jagah rokein!`;
      const messageToSend = preferredLang === 'en' ? englishMsg : hindiMsg;

      const hasVerifiedPhone = Boolean(u.phoneNumber && u.isPhoneVerified && u.smsAlertsEnabled !== false);

      // 3a. Dispatch SMS if commuter has a verified mobile number
      if (hasVerifiedPhone && smsProvider === 'FAST2SMS') {
        const smsResult = await this.sendSms(u.phoneNumber, messageToSend, fast2SmsKey);
        recipients.push({
          userId: userIdStr,
          phoneNumber: u.phoneNumber,
          channel: 'SMS',
          status: smsResult.status,
          messageId: smsResult.messageId,
          errorMessage: smsResult.error,
          distanceKm
        });
      }

      // 3b. Always dispatch Emergency Evacuation Email to registered email address
      if (u.email) {
        const emailRes = await emailService.sendEvacuationAlertEmail(u.email, alert, sector, distanceKm);
        recipients.push({
          userId: userIdStr,
          email: u.email,
          channel: 'EMAIL',
          status: emailRes.success ? 'SENT' : 'FAILED',
          messageId: `EMAIL_${Date.now()}`,
          errorMessage: emailRes.error ? String(emailRes.error) : undefined,
          distanceKm
        });
      }
    }

    const enText = `🚨 RESCUENEX ALERT: ${alert.riskLevel} Landslide detected at ${sector.name} within 10 km corridor. Halt vehicle and take shelter.`;
    const hiText = `🚨 RESCUENEX चेतावनी: 10 किमी कॉरिडोर के भीतर ${sector.name} पर भूस्खलन का खतरा। तुरंत सुरक्षित स्थान पर रुकें।`;

    const resolvedProvider: 'FAST2SMS' | 'RESEND' | 'NONE_CONFIGURED' =
      smsProvider === 'FAST2SMS' ? 'FAST2SMS' : 'RESEND';

    // 4. Log broadcast audit record to Atlas
    const logData = {
      broadcastId,
      alertId: alert.id,
      sectorId: sector.id,
      sectorName: sector.name,
      riskLevel: alert.riskLevel,
      channel: 'ALL' as const,
      recipientCount: recipients.length,
      recipients,
      message: { en: enText, hi: hiText },
      dispatchedAt: new Date(),
      provider: resolvedProvider
    };

    if (isDatabaseConnected()) {
      try {
        await BroadcastLogModel.create(logData);
      } catch (err: any) {
        console.warn('⚠️ [MongoDB] Failed to save broadcast audit log:', err.message);
      }
    }

    this.inMemoryLogs.unshift({
      id: broadcastId,
      broadcastId,
      alertId: alert.id,
      sectorId: sector.id,
      sectorName: sector.name,
      riskLevel: alert.riskLevel,
      channel: 'ALL',
      recipientCount: recipients.length,
      recipients,
      message: { en: enText, hi: hiText },
      dispatchedAt: Date.now(),
      provider: resolvedProvider
    });

    if (this.inMemoryLogs.length > 50) this.inMemoryLogs.pop();

    return {
      success: true,
      recipientCount: recipients.length,
      broadcastId,
      provider: resolvedProvider
    };
  }

  /**
   * Low-level SMS transmission via Fast2SMS
   */
  public async sendSms(
    phoneNumber: string,
    message: string,
    fast2SmsKey?: string
  ): Promise<{ status: 'SENT' | 'FAILED'; messageId?: string; error?: string }> {
    const key = fast2SmsKey || process.env.FAST2SMS_API_KEY;
    if (!key) {
      console.warn(`⛔ [SMS Skipped] FAST2SMS_API_KEY missing in .env. Skipping message to ${phoneNumber}.`);
      return { status: 'FAILED', error: 'FAST2SMS_API_KEY_NOT_CONFIGURED_IN_ENV' };
    }

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    const targetNumber = cleanNumber.length > 10 ? cleanNumber.slice(-10) : cleanNumber;

    try {
      const res = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'q',
          message: message.substring(0, 160),
          language: 'english',
          flash: 0,
          numbers: targetNumber
        },
        {
          headers: {
            authorization: key,
            'Content-Type': 'application/json'
          },
          timeout: 25000
        }
      );

      if (res.data?.return) {
        console.log(`✅ [Fast2SMS] Dispatched to ${targetNumber}: RequestID ${res.data?.request_id}`);
        return { status: 'SENT', messageId: res.data?.request_id };
      }
      return { status: 'FAILED', error: res.data?.message || 'Fast2SMS returned error' };
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message;
      console.warn(`❌ [Fast2SMS Error]`, errMsg);
      return { status: 'FAILED', error: errMsg };
    }
  }

  /**
   * Retrieve broadcast audit history
   */
  public async getBroadcastLogs(): Promise<BroadcastLog[]> {
    if (isDatabaseConnected()) {
      const docs = await BroadcastLogModel.find().sort({ dispatchedAt: -1 }).limit(50).lean();
      return docs.map((d: any) => ({
        id: d.broadcastId,
        broadcastId: d.broadcastId,
        alertId: d.alertId,
        sectorId: d.sectorId,
        sectorName: d.sectorName,
        riskLevel: d.riskLevel,
        channel: d.channel,
        recipientCount: d.recipientCount,
        recipients: d.recipients,
        message: d.message,
        dispatchedAt: new Date(d.dispatchedAt).getTime(),
        provider: d.provider
      }));
    }
    return this.inMemoryLogs;
  }
}

export const broadcastService = new BroadcastService();

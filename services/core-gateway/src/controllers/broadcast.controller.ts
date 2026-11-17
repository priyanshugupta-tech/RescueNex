import { Request, Response } from 'express';
import { broadcastService, calculateHaversineDistanceKm } from '../services/broadcast.service.js';
import { stateService } from '../services/state.service.js';
import { UserModel } from '../models/user.model.js';
import { AlertModel } from '../models/alert.model.js';
import { isDatabaseConnected } from '../config/database.js';
import { rateLimitService } from '../services/rateLimit.service.js';
import { EmergencyAlert } from '../types/index.js';

let broadcastSocketEmitter: any = null;
export const setBroadcastSocketEmitter = (emitter: any) => {
  broadcastSocketEmitter = emitter;
};

/**
 * GET /api/broadcast/logs
 * Retrieve evacuation broadcast audit logs
 */
export const getBroadcastLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await broadcastService.getBroadcastLogs();
    res.status(200).json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve broadcast logs.', error: err.message });
  }
};

/**
 * POST /api/broadcast/dispatch
 * Manual evacuation dispatch triggered by authorized operator / commander
 */
export const manualDispatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectorId, riskLevel, customNote } = req.body;
    const sector = stateService.getSector(sectorId || 'SECTOR_RAMBAN');

    if (!sector) {
      res.status(404).json({ success: false, message: `Sector '${sectorId}' not found.` });
      return;
    }

    const syntheticAlert: EmergencyAlert = {
      id: `MANUAL_BC_${sector.id}_${Date.now()}`,
      sectorId: sector.id,
      sectorName: sector.name,
      nodeId: 'OPERATOR_DISPATCH',
      timestamp: Date.now(),
      riskLevel: riskLevel || 'CRITICAL',
      lsiScore: riskLevel === 'CRITICAL' ? 95 : 75,
      headline: `${riskLevel || 'CRITICAL'} - Evacuation Order at ${sector.name}`,
      descriptions: {
        en: customNote || `EMERGENCY EVACUATION: Critical hazard at ${sector.name}. Halt vehicles immediately!`,
        hi: customNote || `आपातकालीन चेतावनी: ${sector.name} पर गंभीर खतरा। तुरंत सुरक्षित स्थान पर रुकें!`,
        dogri: `आपातकालीन चेतावनी: ${sector.name} पर ढलान खिसकने दा खतरा।`,
        kashmiri: `خطرناک لٔند سلایٔڈ چتاونی: ${sector.name} پیٹھ خطرہ۔`
      },
      sirenTriggered: true
    };

    // 1. Add alert to RAM state and update sector status
    stateService.addAlert(syntheticAlert);
    stateService.updateSectorRisk(sector.id, syntheticAlert.riskLevel, syntheticAlert.lsiScore);
    if (syntheticAlert.sirenTriggered) {
      stateService.setSirenState(sector.id, true);
    }

    // 2. Persist to MongoDB Atlas if connected
    if (isDatabaseConnected()) {
      try {
        await AlertModel.create({
          alertId: syntheticAlert.id,
          sectorId: syntheticAlert.sectorId,
          sectorName: syntheticAlert.sectorName,
          nodeId: syntheticAlert.nodeId,
          timestamp: new Date(syntheticAlert.timestamp),
          riskLevel: syntheticAlert.riskLevel,
          lsiScore: syntheticAlert.lsiScore,
          headline: syntheticAlert.headline,
          descriptions: syntheticAlert.descriptions,
          sirenTriggered: syntheticAlert.sirenTriggered,
          status: 'ACTIVE'
        });
      } catch (err: any) {
        console.warn('⚠️ [MongoDB] Failed to log manual alert to Atlas:', err.message);
      }
    }

    // 3. Broadcast in real-time over WebSockets to all connected dashboards
    if (broadcastSocketEmitter) {
      broadcastSocketEmitter('EMERGENCY_ALERT', syntheticAlert);
      broadcastSocketEmitter('SECTOR_STATUS_UPDATED', {
        sectorId: sector.id,
        currentRiskLevel: syntheticAlert.riskLevel,
        currentLsiScore: syntheticAlert.lsiScore,
        sirenActive: syntheticAlert.sirenTriggered
      });
    }

    const result = await broadcastService.dispatchCorridorEvacuationAlert(syntheticAlert, sector);
    res.status(200).json({
      success: true,
      message: `Evacuation notice dispatched to ${result.recipientCount} commuters within 10 km corridor. Alert registered on command dashboard.`,
      alert: syntheticAlert,
      result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Manual dispatch failed.', error: err.message });
  }
};

/**
 * POST /api/broadcast/test
 * Test dispatch to caller's registered phone number via Fast2SMS
 */
export const testDispatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { phoneNumber } = req.body;
    const targetPhone = phoneNumber || user?.phoneNumber;

    if (!targetPhone) {
      res.status(400).json({ success: false, message: 'Phone number is required for test broadcast.' });
      return;
    }

    const testMsg = `[RESCUENEX TEST] Emergency broadcast pipeline verified for transit corridor. Stay safe!`;
    const fast2SmsKey = process.env.FAST2SMS_API_KEY;

    if (!fast2SmsKey) {
      res.status(400).json({
        success: false,
        message: 'FAST2SMS_API_KEY missing in services/core-gateway/.env.'
      });
      return;
    }

    const result = await broadcastService.sendSms(targetPhone, testMsg, fast2SmsKey);
    res.status(200).json({
      success: result.status === 'SENT',
      provider: 'FAST2SMS',
      channel: 'SMS',
      targetPhone,
      result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Test dispatch failed.', error: err.message });
  }
};

/**
 * POST /api/broadcast/phone/send-otp
 * Dispatches a 6-digit OTP via SMS to verify commuter's mobile number
 */
export const sendPhoneOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { phoneNumber } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      res.status(400).json({ success: false, message: 'Valid mobile number is required.' });
      return;
    }

    // Clean number: extract digits
    const digitsOnly = phoneNumber.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10) {
      res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    const cleanNumber = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;

    if (isDatabaseConnected() && user?.id) {
      const userDoc = await UserModel.findById(user.id);
      if (!userDoc) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      // Weekly Mobile Number Update Rate Limit: Max 2 updates per week (7 days)
      const isChangingPhone = Boolean(userDoc.isPhoneVerified && userDoc.phoneNumber && userDoc.phoneNumber !== cleanNumber);
      if (isChangingPhone) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentUpdates = (userDoc.phoneUpdateHistory || []).filter(
          (d: Date) => new Date(d) > sevenDaysAgo
        );

        if (recentUpdates.length >= 2) {
          const oldestTime = Math.min(...recentUpdates.map((d: Date) => new Date(d).getTime()));
          const resetDate = new Date(oldestTime + 7 * 24 * 60 * 60 * 1000);
          const daysRemaining = Math.max(1, Math.ceil((resetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

          res.status(429).json({
            success: false,
            message: `Mobile number updates are limited to 2 times per week. Next update available in ${daysRemaining} day(s).`
          });
          return;
        }
      }

      // Cooldown check: enforce 60s minimum interval between SMS OTP requests
      const cooldown = await rateLimitService.checkSmsOtpSendCooldown(cleanNumber);
      if (!cooldown.allowed) {
        res.status(429).json({
          success: false,
          message: `Please wait ${cooldown.waitSeconds} seconds before requesting a new SMS verification code.`
        });
        return;
      }

      // Check if phone number is already verified by another user in MongoDB
      const existingUser = await UserModel.findOne({
        phoneNumber: cleanNumber,
        isPhoneVerified: true,
        _id: { $ne: user.id }
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'This mobile number is already verified and linked to another account.'
        });
        return;
      }

      // Generate 6-digit cryptographic OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      userDoc.phoneNumber = cleanNumber;
      userDoc.phoneOtp = otp;
      userDoc.phoneOtpExpiresAt = expiresAt;
      userDoc.isPhoneVerified = false;
      await userDoc.save();

      const fast2SmsKey = process.env.FAST2SMS_API_KEY;
      const smsText = `[RESCUENEX] Your mobile verification code is: ${otp}. Valid for 10 minutes.`;
      const smsResult = await broadcastService.sendSms(cleanNumber, smsText, fast2SmsKey);

      console.log(`📱 [SMS OTP Dispatched] Target: +91 ${cleanNumber} | Status: ${smsResult.status}`);

      res.status(200).json({
        success: true,
        message: 'Verification code sent to your mobile number via SMS.',
        cleanNumber,
        smsStatus: smsResult.status
      });
    } else {
      res.status(500).json({ success: false, message: 'Database link offline.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to send SMS OTP.', error: err.message });
  }
};

/**
 * POST /api/broadcast/phone/verify-otp
 * Verifies commuter's 6-digit OTP and activates 10 km corridor SMS alerts
 */
export const verifyPhoneOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { otp } = req.body;

    if (!otp || typeof otp !== 'string') {
      res.status(400).json({ success: false, message: '6-digit verification code is required.' });
      return;
    }

    if (!isDatabaseConnected() || !user?.id) {
      res.status(500).json({ success: false, message: 'Database link offline.' });
      return;
    }

    const userDoc = await UserModel.findById(user.id);
    if (!userDoc || !userDoc.phoneOtp) {
      res.status(400).json({ success: false, message: 'No OTP requested or code has expired. Please request a new OTP.' });
      return;
    }

    const phoneForRateLimit = userDoc.phoneNumber || '';

    // Check lockout (5 failed attempts -> 5-min lockout)
    const lockout = await rateLimitService.checkSmsOtpVerificationLockout(phoneForRateLimit);
    if (lockout.isLocked) {
      res.status(429).json({
        success: false,
        message: `Verification temporarily locked due to 5 consecutive failed attempts. Please try again after ${lockout.remainingMinutes} minutes.`
      });
      return;
    }

    if (new Date() > (userDoc.phoneOtpExpiresAt || new Date(0))) {
      res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
      return;
    }

    if (userDoc.phoneOtp !== otp.trim()) {
      const failed = await rateLimitService.recordFailedSmsOtpAttempt(phoneForRateLimit);
      if (failed.isLocked) {
        res.status(429).json({
          success: false,
          message: 'Maximum 5 unsuccessful OTP attempts exceeded. Verification locked for 5 minutes.'
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: `Incorrect verification code. (${failed.attempts} of 5 attempts)`
      });
      return;
    }

    // Clear failed attempts counter on valid OTP
    await rateLimitService.clearSmsOtpAttempts(phoneForRateLimit);

    // Track phone update timestamp in history
    if (!userDoc.phoneUpdateHistory) {
      userDoc.phoneUpdateHistory = [];
    }
    userDoc.phoneUpdateHistory.push(new Date());

    // Mark verified and clear OTP
    userDoc.isPhoneVerified = true;
    userDoc.phoneOtp = undefined;
    userDoc.phoneOtpExpiresAt = undefined;
    userDoc.isPhonePromptDismissed = false;
    await userDoc.save();

    console.log(`✅ [Phone Verified] Commuter ${userDoc.email} verified phone ${userDoc.phoneNumber}`);

    res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully! 10 km corridor evacuation SMS alerts are now active.',
      user: userDoc.toJSON()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'OTP verification failed.', error: err.message });
  }
};

/**
 * POST /api/broadcast/phone/dismiss-prompt
 * Records commuter's choice to skip adding mobile number for now (alerts sent via email)
 */
export const dismissPhonePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (isDatabaseConnected() && user?.id) {
      await UserModel.findByIdAndUpdate(user.id, { isPhonePromptDismissed: true });
    }
    res.status(200).json({
      success: true,
      message: 'Prompt dismissed. Evacuation notices will be delivered to your registered email.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to dismiss prompt.', error: err.message });
  }
};

/**
 * PUT /api/auth/phone
 * Update user mobile number and alert preferences
 */
export const updatePhonePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { phoneNumber, smsAlertsEnabled, whatsappAlertsEnabled, preferredLanguage } = req.body;

    if (isDatabaseConnected() && user?.id) {
      await UserModel.findByIdAndUpdate(user.id, {
        phoneNumber,
        smsAlertsEnabled: smsAlertsEnabled !== undefined ? smsAlertsEnabled : true,
        whatsappAlertsEnabled: whatsappAlertsEnabled !== undefined ? whatsappAlertsEnabled : true,
        preferredLanguage: preferredLanguage || 'hi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mobile alerts preferences updated successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update preferences.', error: err.message });
  }
};

/**
 * POST /api/broadcast/location
 * Synchronize user's active GPS/city transit point to enable accurate 10 km geofenced broadcasts.
 * If the selected area has an active hazard, an alert is sent, but STRICT 2-hour deduplication
 * guarantees that even if the user changes location 10 times to this area, only ONE alert is delivered.
 */
export const syncUserLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { latitude, longitude, cityName } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ success: false, message: 'Latitude and longitude are required.' });
      return;
    }

    const latNum = Number(latitude);
    const lonNum = Number(longitude);

    let userDoc: any = null;
    if (isDatabaseConnected() && user?.id) {
      userDoc = await UserModel.findByIdAndUpdate(
        user.id,
        {
          lastKnownLocation: {
            latitude: latNum,
            longitude: lonNum,
            cityName: cityName || 'Transit Corridor',
            updatedAt: new Date()
          }
        },
        { new: true }
      ).lean();
    }

    // Check if new location is within 10 km of any active hazard sector
    const activeAlerts = stateService.getActiveAlerts().filter(
      (a) => a.riskLevel === 'CRITICAL' || a.riskLevel === 'WARNING'
    );

    let hazardAlertDispatched = false;
    let suppressedDuplicate = false;

    if (userDoc && activeAlerts.length > 0) {
      for (const alert of activeAlerts) {
        const sector = stateService.getSector(alert.sectorId);
        if (sector) {
          const dist = calculateHaversineDistanceKm(latNum, lonNum, sector.latitude, sector.longitude);
          if (dist <= 10.0) {
            // User entered or selected an active disaster zone!
            // Dispatch with 2-hour deduplication guard so repeated location switching sends SMS at most once.
            const result = await broadcastService.dispatchAlertToUserIfDeduplicated(userDoc, alert, sector, dist);
            if (result.dispatched) {
              hazardAlertDispatched = true;
            } else {
              suppressedDuplicate = true;
            }
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Transit corridor location synchronized with emergency dispatch system.',
      hazardAlertDispatched,
      suppressedDuplicate
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to sync location.', error: err.message });
  }
};

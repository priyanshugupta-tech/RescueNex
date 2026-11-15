import { RateLimitModel } from '../models/rateLimit.model.js';

export class RateLimitService {
  private readonly LOGIN_WINDOW_MS = 2 * 60 * 1000;         // 2 minutes window
  private readonly LOGIN_MAX_ATTEMPTS = 5;                  // 5 attempts allowed in 2 min
  private readonly LOGIN_LOCKOUT_MS = 5 * 60 * 1000;        // 5 minutes cooldown

  private readonly OTP_WINDOW_MS = 2 * 60 * 1000;           // 2 minutes OTP window
  private readonly OTP_MAX_ATTEMPTS = 5;                    // 5 OTP guesses allowed
  private readonly OTP_LOCKOUT_MS = 5 * 60 * 1000;          // 5 minutes OTP cooldown
  private readonly OTP_MIN_INTERVAL_MS = 60 * 1000;         // 60s cooldown between OTP requests

  // ========================================================
  // 1. LOGIN ATTEMPT RATE LIMITER (STRICT MONGODB ATLAS)
  // ========================================================

  /**
   * Checks if an account/IP is currently locked out from logging in
   */
  public async checkLoginLockout(identifier: string): Promise<{ isLocked: boolean; remainingMinutes?: number }> {
    const key = `login:${identifier.toLowerCase().trim()}`;
    const now = Date.now();

    const record = await RateLimitModel.findOne({ key });
    if (record && record.lockUntil && record.lockUntil.getTime() > now) {
      const remainingMinutes = Math.ceil((record.lockUntil.getTime() - now) / 60000);
      return { isLocked: true, remainingMinutes };
    }
    return { isLocked: false };
  }

  /**
   * Records an unsuccessful login attempt in MongoDB Atlas
   */
  public async recordFailedLogin(identifier: string): Promise<{ attempts: number; isLocked: boolean; remainingMinutes?: number }> {
    const key = `login:${identifier.toLowerCase().trim()}`;
    const now = Date.now();

    let record = await RateLimitModel.findOne({ key });

    if (!record) {
      record = await RateLimitModel.create({
        key,
        attempts: 1,
        firstAttemptAt: new Date(now),
        lockUntil: null
      });
      return { attempts: 1, isLocked: false };
    }

    // Check if the 2-minute rolling window has passed
    const windowExpired = (now - record.firstAttemptAt.getTime()) > this.LOGIN_WINDOW_MS;

    if (windowExpired) {
      record.attempts = 1;
      record.firstAttemptAt = new Date(now);
      record.lockUntil = null;
      await record.save();
      return { attempts: 1, isLocked: false };
    }

    record.attempts += 1;

    // Check if threshold reached: 5 attempts within 2 min
    if (record.attempts >= this.LOGIN_MAX_ATTEMPTS) {
      record.lockUntil = new Date(now + this.LOGIN_LOCKOUT_MS);
      await record.save();
      return {
        attempts: record.attempts,
        isLocked: true,
        remainingMinutes: 5
      };
    }

    await record.save();
    return { attempts: record.attempts, isLocked: false };
  }

  /**
   * Resets login counter upon successful authentication
   */
  public async clearLoginAttempts(identifier: string): Promise<void> {
    const key = `login:${identifier.toLowerCase().trim()}`;
    await RateLimitModel.deleteOne({ key });
  }

  // ========================================================
  // 2. OTP RATE LIMITER (STRICT MONGODB ATLAS)
  // ========================================================

  /**
   * Checks if an email is on cooldown for requesting a new OTP (60s minimum interval)
   */
  public async checkOtpSendCooldown(email: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
    const key = `otp_send:${email.toLowerCase().trim()}`;
    const now = Date.now();

    const record = await RateLimitModel.findOne({ key });
    if (record) {
      const timeSinceLast = now - record.updatedAt.getTime();
      if (timeSinceLast < this.OTP_MIN_INTERVAL_MS) {
        const waitSeconds = Math.ceil((this.OTP_MIN_INTERVAL_MS - timeSinceLast) / 1000);
        return { allowed: false, waitSeconds };
      }
    }

    await RateLimitModel.findOneAndUpdate(
      { key },
      { attempts: 1, updatedAt: new Date() },
      { upsert: true }
    );
    return { allowed: true };
  }

  /**
   * Checks if an email is locked out from OTP verification attempts
   */
  public async checkOtpVerificationLockout(email: string): Promise<{ isLocked: boolean; remainingMinutes?: number }> {
    const key = `otp_verify:${email.toLowerCase().trim()}`;
    const now = Date.now();

    const record = await RateLimitModel.findOne({ key });
    if (record && record.lockUntil && record.lockUntil.getTime() > now) {
      const remainingMinutes = Math.ceil((record.lockUntil.getTime() - now) / 60000);
      return { isLocked: true, remainingMinutes };
    }
    return { isLocked: false };
  }

  /**
   * Records a failed OTP verification attempt
   */
  public async recordFailedOtpAttempt(email: string): Promise<{ attempts: number; isLocked: boolean; remainingMinutes?: number }> {
    const key = `otp_verify:${email.toLowerCase().trim()}`;
    const now = Date.now();

    let record = await RateLimitModel.findOne({ key });

    if (!record || (now - record.firstAttemptAt.getTime() > this.OTP_WINDOW_MS)) {
      record = await RateLimitModel.findOneAndUpdate(
        { key },
        { attempts: 1, firstAttemptAt: new Date(now), lockUntil: null },
        { upsert: true, new: true }
      );
      return { attempts: 1, isLocked: false };
    }

    record.attempts += 1;
    if (record.attempts >= this.OTP_MAX_ATTEMPTS) {
      record.lockUntil = new Date(now + this.OTP_LOCKOUT_MS);
      await record.save();
      return { attempts: record.attempts, isLocked: true, remainingMinutes: 5 };
    }

    await record.save();
    return { attempts: record.attempts, isLocked: false };
  }

  /**
   * Clears OTP verification attempts after a successful verification
   */
  public async clearOtpAttempts(email: string): Promise<void> {
    const key = `otp_verify:${email.toLowerCase().trim()}`;
    await RateLimitModel.deleteOne({ key });
  }

  // ========================================================
  // 3. SMS OTP RATE LIMITER (COOLDOWN & ATTEMPTS GUARD)
  // ========================================================

  /**
   * Checks if a mobile number is on cooldown for requesting a new SMS OTP (60s minimum interval)
   */
  public async checkSmsOtpSendCooldown(phoneNumber: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const key = `sms_otp_send:${cleanPhone}`;
    const now = Date.now();

    const record = await RateLimitModel.findOne({ key });
    if (record) {
      const timeSinceLast = now - record.updatedAt.getTime();
      if (timeSinceLast < this.OTP_MIN_INTERVAL_MS) {
        const waitSeconds = Math.ceil((this.OTP_MIN_INTERVAL_MS - timeSinceLast) / 1000);
        return { allowed: false, waitSeconds };
      }
    }

    await RateLimitModel.findOneAndUpdate(
      { key },
      { attempts: 1, updatedAt: new Date() },
      { upsert: true }
    );
    return { allowed: true };
  }

  /**
   * Checks if a phone number is locked out from SMS OTP verification attempts
   */
  public async checkSmsOtpVerificationLockout(phoneNumber: string): Promise<{ isLocked: boolean; remainingMinutes?: number }> {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const key = `sms_otp_verify:${cleanPhone}`;
    const now = Date.now();

    const record = await RateLimitModel.findOne({ key });
    if (record && record.lockUntil && record.lockUntil.getTime() > now) {
      const remainingMinutes = Math.ceil((record.lockUntil.getTime() - now) / 60000);
      return { isLocked: true, remainingMinutes };
    }
    return { isLocked: false };
  }

  /**
   * Records a failed SMS OTP verification attempt
   */
  public async recordFailedSmsOtpAttempt(phoneNumber: string): Promise<{ attempts: number; isLocked: boolean; remainingMinutes?: number }> {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const key = `sms_otp_verify:${cleanPhone}`;
    const now = Date.now();

    let record = await RateLimitModel.findOne({ key });

    if (!record || (now - record.firstAttemptAt.getTime() > this.OTP_WINDOW_MS)) {
      record = await RateLimitModel.findOneAndUpdate(
        { key },
        { attempts: 1, firstAttemptAt: new Date(now), lockUntil: null },
        { upsert: true, new: true }
      );
      return { attempts: 1, isLocked: false };
    }

    record.attempts += 1;
    if (record.attempts >= this.OTP_MAX_ATTEMPTS) {
      record.lockUntil = new Date(now + this.OTP_LOCKOUT_MS);
      await record.save();
      return { attempts: record.attempts, isLocked: true, remainingMinutes: 5 };
    }

    await record.save();
    return { attempts: record.attempts, isLocked: false };
  }

  /**
   * Clears SMS OTP verification attempts after a successful verification
   */
  public async clearSmsOtpAttempts(phoneNumber: string): Promise<void> {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const key = `sms_otp_verify:${cleanPhone}`;
    await RateLimitModel.deleteOne({ key });
  }
}

export const rateLimitService = new RateLimitService();

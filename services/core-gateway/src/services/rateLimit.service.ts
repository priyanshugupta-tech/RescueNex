import { RateLimitModel } from '../models/rateLimit.model.js';
import { isDatabaseConnected } from '../config/database.js';

interface MemoryRateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockUntil: number | null;
}

const memoryRateLimit = new Map<string, MemoryRateLimitRecord>();

export class RateLimitService {
  // Configurable thresholds matching user specification
  private readonly LOGIN_WINDOW_MS = 2 * 60 * 1000;         // 2 minutes window
  private readonly LOGIN_MAX_ATTEMPTS = 5;                  // 5 attempts allowed in 2 min
  private readonly LOGIN_LOCKOUT_MS = 5 * 60 * 1000;        // 5 minutes cooldown

  private readonly OTP_WINDOW_MS = 2 * 60 * 1000;           // 2 minutes OTP window
  private readonly OTP_MAX_ATTEMPTS = 5;                    // 5 OTP guesses allowed
  private readonly OTP_LOCKOUT_MS = 5 * 60 * 1000;          // 5 minutes OTP cooldown
  private readonly OTP_MIN_INTERVAL_MS = 60 * 1000;         // 60s cooldown between OTP requests

  // ========================================================
  // 1. LOGIN ATTEMPT RATE LIMITER
  // ========================================================

  /**
   * Checks if an account/IP is currently locked out from logging in
   */
  public async checkLoginLockout(identifier: string): Promise<{ isLocked: boolean; remainingMinutes?: number }> {
    const key = `login:${identifier.toLowerCase().trim()}`;
    const now = Date.now();

    // Check Atlas
    if (isDatabaseConnected()) {
      const record = await RateLimitModel.findOne({ key });
      if (record && record.lockUntil && record.lockUntil.getTime() > now) {
        const remainingMinutes = Math.ceil((record.lockUntil.getTime() - now) / 60000);
        return { isLocked: true, remainingMinutes };
      }
      return { isLocked: false };
    }

    // In-memory fallback
    const mem = memoryRateLimit.get(key);
    if (mem && mem.lockUntil && mem.lockUntil > now) {
      const remainingMinutes = Math.ceil((mem.lockUntil - now) / 60000);
      return { isLocked: true, remainingMinutes };
    }

    return { isLocked: false };
  }

  /**
   * Records an unsuccessful login attempt
   * If 5 attempts within 2 minutes: sets 30 min cooldown
   * If under 5 and 2 minutes pass: resets back to 0
   */
  public async recordFailedLogin(identifier: string): Promise<{ attempts: number; isLocked: boolean; remainingMinutes?: number }> {
    const key = `login:${identifier.toLowerCase().trim()}`;
    const now = Date.now();

    if (isDatabaseConnected()) {
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
        // Reset window and counter
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

    // In-memory fallback
    let mem = memoryRateLimit.get(key);
    if (!mem || (now - mem.firstAttemptAt > this.LOGIN_WINDOW_MS)) {
      mem = { attempts: 1, firstAttemptAt: now, lockUntil: null };
      memoryRateLimit.set(key, mem);
      return { attempts: 1, isLocked: false };
    }

    mem.attempts += 1;
    if (mem.attempts >= this.LOGIN_MAX_ATTEMPTS) {
      mem.lockUntil = now + this.LOGIN_LOCKOUT_MS;
      return { attempts: mem.attempts, isLocked: true, remainingMinutes: 5 };
    }

    return { attempts: mem.attempts, isLocked: false };
  }

  /**
   * Resets login counter upon successful authentication
   */
  public async clearLoginAttempts(identifier: string): Promise<void> {
    const key = `login:${identifier.toLowerCase().trim()}`;
    if (isDatabaseConnected()) {
      await RateLimitModel.deleteOne({ key });
    }
    memoryRateLimit.delete(key);
  }

  // ========================================================
  // 2. OTP RATE LIMITER (Spam & Brute-Force Prevention)
  // ========================================================

  /**
   * Checks if an email is on cooldown for requesting a new OTP (60s minimum interval)
   */
  public async checkOtpSendCooldown(email: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
    const key = `otp_send:${email.toLowerCase().trim()}`;
    const now = Date.now();

    if (isDatabaseConnected()) {
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

    const mem = memoryRateLimit.get(key);
    if (mem) {
      const timeSinceLast = now - mem.firstAttemptAt;
      if (timeSinceLast < this.OTP_MIN_INTERVAL_MS) {
        const waitSeconds = Math.ceil((this.OTP_MIN_INTERVAL_MS - timeSinceLast) / 1000);
        return { allowed: false, waitSeconds };
      }
    }

    memoryRateLimit.set(key, { attempts: 1, firstAttemptAt: now, lockUntil: null });
    return { allowed: true };
  }

  /**
   * Checks if an email is locked out from OTP verification attempts
   */
  public async checkOtpVerificationLockout(email: string): Promise<{ isLocked: boolean; remainingMinutes?: number }> {
    const key = `otp_verify:${email.toLowerCase().trim()}`;
    const now = Date.now();

    if (isDatabaseConnected()) {
      const record = await RateLimitModel.findOne({ key });
      if (record && record.lockUntil && record.lockUntil.getTime() > now) {
        const remainingMinutes = Math.ceil((record.lockUntil.getTime() - now) / 60000);
        return { isLocked: true, remainingMinutes };
      }
      return { isLocked: false };
    }

    const mem = memoryRateLimit.get(key);
    if (mem && mem.lockUntil && mem.lockUntil > now) {
      const remainingMinutes = Math.ceil((mem.lockUntil - now) / 60000);
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

    if (isDatabaseConnected()) {
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

    let mem = memoryRateLimit.get(key);
    if (!mem || (now - mem.firstAttemptAt > this.OTP_WINDOW_MS)) {
      mem = { attempts: 1, firstAttemptAt: now, lockUntil: null };
      memoryRateLimit.set(key, mem);
      return { attempts: 1, isLocked: false };
    }

    mem.attempts += 1;
    if (mem.attempts >= this.OTP_MAX_ATTEMPTS) {
      mem.lockUntil = now + this.OTP_LOCKOUT_MS;
      return { attempts: mem.attempts, isLocked: true, remainingMinutes: 5 };
    }

    return { attempts: mem.attempts, isLocked: false };
  }

  /**
   * Clears OTP verification attempts after a successful verification
   */
  public async clearOtpAttempts(email: string): Promise<void> {
    const key = `otp_verify:${email.toLowerCase().trim()}`;
    if (isDatabaseConnected()) {
      await RateLimitModel.deleteOne({ key });
    }
    memoryRateLimit.delete(key);
  }
}

export const rateLimitService = new RateLimitService();

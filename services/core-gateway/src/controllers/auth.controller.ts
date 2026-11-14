import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { emailService } from '../services/email.service.js';
import { rateLimitService } from '../services/rateLimit.service.js';
import { generateOtps } from '../utils/generateOtp.js';
import { UserRole } from '../types/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserModel } from '../models/user.model.js';
import { OtpModel } from '../models/otp.model.js';
import { SessionModel } from '../models/session.model.js';

const MAIN_ADMIN_USERNAME = 'lead@rescuenex';
const MAIN_ADMIN_PASSWORD = 'gupta18';
const MAIN_ADMIN_NAME = 'Priyanshu Gupta';

const googleClient = new OAuth2Client(config.googleClientId);

// Seed default main admin directly in MongoDB Atlas
export const seedDefaultUsers = async () => {
  const defaultPasswordHash = await bcrypt.hash(MAIN_ADMIN_PASSWORD, 10);

  try {
    const existing = await UserModel.findOne({
      $or: [{ userName: MAIN_ADMIN_USERNAME }, { email: 'lead@rescuenex.org' }]
    });

    if (!existing) {
      await UserModel.create({
        fullName: MAIN_ADMIN_NAME,
        userName: MAIN_ADMIN_USERNAME,
        email: 'lead@rescuenex.org',
        password: defaultPasswordHash,
        role: 'ADMIN',
        agency: 'SDMA',
        isVerified: true,
        isApproved: true,
        authProvider: 'LOCAL'
      });
      console.log(`[MongoDB] Seeded main admin (${MAIN_ADMIN_USERNAME}) in Atlas.`);
    } else {
      existing.fullName = MAIN_ADMIN_NAME;
      existing.password = defaultPasswordHash;
      existing.isVerified = true;
      existing.isApproved = true;
      await existing.save();
      console.log(`[MongoDB] Verified and updated main admin (${MAIN_ADMIN_USERNAME}) profile.`);
    }
  } catch (e: any) {
    console.error('[MongoDB] User seed check error:', e.message);
  }
};

// Signup handler: creates unverified user and sends OTP via Resend
export const handleSignup = async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, password, confirmPassword, role = 'PUBLIC', agency = 'COMMUTER', userName } = req.body;

  try {
    if (!email || !password || !confirmPassword) {
      res.status(422).json({
        message: 'Email and passwords are required!'
      });
      return;
    }

    if (password !== confirmPassword) {
      res.status(422).json({
        message: 'passwords do not match!'
      });
      return;
    }

    if (password.length < 8) {
      res.status(422).json({
        message: 'length of password is less than 8'
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUserName = (userName || cleanEmail.split('@')[0] || `user_${Date.now()}`).toLowerCase().trim();

    // Check OTP send cooldown (60 seconds)
    const cooldownCheck = await rateLimitService.checkOtpSendCooldown(cleanEmail);
    if (!cooldownCheck.allowed) {
      res.status(429).json({
        message: `Please wait ${cooldownCheck.waitSeconds}s before requesting another verification code.`
      });
      return;
    }

    // Check existing registration by email or userName in MongoDB Atlas
    const existingUser = await UserModel.findOne({
      $or: [{ email: cleanEmail }, { userName: cleanUserName }]
    });

    if (existingUser) {
      if (!existingUser.isVerified) {
        const otp = generateOtps();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        await OtpModel.deleteMany({ email: cleanEmail });
        await OtpModel.create({
          email: cleanEmail,
          user: existingUser._id,
          otpHash
        });

        await UserModel.updateOne(
          { _id: existingUser._id },
          { $set: { verificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000) } }
        );

        await emailService.sendOTP(cleanEmail, otp);
        res.status(201).json({
          message: 'signup successful! Please verify the OTP sent to your email.'
        });
        return;
      } else {
        res.status(409).json({
          message: 'user already exists!'
        });
        return;
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const isApproved = role === 'PUBLIC' || cleanUserName === MAIN_ADMIN_USERNAME;
    const finalFullName = fullName?.trim() || cleanEmail.split('@')[0];

    const newUser = await UserModel.create({
      fullName: finalFullName,
      userName: cleanUserName,
      email: cleanEmail,
      password: hash,
      role: role as UserRole,
      agency,
      isVerified: false,
      isApproved,
      verificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    const otp = generateOtps();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    await OtpModel.create({
      email: cleanEmail,
      user: newUser._id,
      otpHash
    });

    await emailService.sendOTP(cleanEmail, otp);

    res.status(201).json({
      message: 'signup successful! Please verify the OTP sent to your email.'
    });
  } catch (err: any) {
    console.error('[MongoDB] Signup error:', err.message);
    res.status(500).json({ message: 'some internal server error occurred!' });
  }
};

// OTP verification handler: validates SHA-256 OTP and creates active session
export const handleOtp = async (req: Request, res: Response): Promise<void> => {
  const { otp, email } = req.body;

  if (!otp || !email) {
    res.status(400).json({ message: 'OTP or email is missing!' });
    return;
  }

  try {
    const cleanEmail = email.toLowerCase().trim();

    // Check OTP verification lockout (5 attempts in 2 min -> 5 min lock)
    const lockCheck = await rateLimitService.checkOtpVerificationLockout(cleanEmail);
    if (lockCheck.isLocked) {
      res.status(429).json({
        message: `Too many failed OTP verification attempts. Verification locked for ${lockCheck.remainingMinutes} more minutes.`
      });
      return;
    }

    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');

    const otpRecord = await OtpModel.findOneAndDelete({
      otpHash,
      email: cleanEmail,
      createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
    });

    if (!otpRecord) {
      const failedRecord = await rateLimitService.recordFailedOtpAttempt(cleanEmail);
      if (failedRecord.isLocked) {
        res.status(429).json({
          message: 'Maximum 5 OTP attempts exceeded. Verification locked for 5 minutes.'
        });
        return;
      }
      res.status(401).json({
        message: `invalid, expired, or already used OTP! (Attempt ${failedRecord.attempts} of 5)`
      });
      return;
    }

    const user = await UserModel.findOne({ _id: otpRecord.user, email: cleanEmail });

    if (!user) {
      res.status(404).json({ message: 'user not found!' });
      return;
    }

    if (user.isVerified) {
      res.status(409).json({ message: 'account is already verified; please log in with your password.' });
      return;
    }

    user.isVerified = true;
    await user.save();

    // Clear failed attempts counter on valid OTP
    await rateLimitService.clearOtpAttempts(cleanEmail);

    // Check admin approval for non-public roles
    if (user.role !== 'PUBLIC' && !user.isApproved) {
      res.status(201).json({
        message: 'email verified successfully! Your official account is pending approval by Main Admin (Priyanshu Gupta).',
        requiresAdminApproval: true
      });
      return;
    }

    // Single JWT_SECRET used for both refresh and access tokens
    const refreshToken = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' });
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await SessionModel.create({
      user: user._id,
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      refreshToken: hashedRefreshToken,
      revoked: false,
      deletedAt: null
    });

    const finalFullName = user.fullName || user.userName || cleanEmail.split('@')[0];

    const accessToken = jwt.sign(
      {
        id: user._id,
        sid: session._id,
        role: user.role,
        userName: user.userName,
        email: user.email,
        fullName: finalFullName
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    res.status(201).json({
      accessToken,
      message: 'verification successful!',
      user: {
        id: user._id,
        fullName: finalFullName,
        userName: user.userName,
        email: user.email,
        role: user.role,
        agency: user.agency
      }
    });
  } catch (error: any) {
    console.error('[MongoDB] OTP verification error:', error.message);
    res.status(500).json({ message: 'some internal server error occurred!' });
  }
};

// Login handler: verifies credentials and sets refresh token cookie (no OTP needed)
export const handleLogin = async (req: Request, res: Response): Promise<void> => {
  const { email, password, userName } = req.body;

  try {
    const loginIdentifier = (email || userName || '').toLowerCase().trim();
    if (!password || !loginIdentifier) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const lookupKey = loginIdentifier;

    // Check 5-attempt / 2-minute lockout rule
    const lockoutCheck = await rateLimitService.checkLoginLockout(lookupKey);
    if (lockoutCheck.isLocked) {
      res.status(429).json({
        message: `Account temporarily locked due to 5 consecutive failed login attempts. Please try again after ${lockoutCheck.remainingMinutes} minutes.`
      });
      return;
    }

    const userDoc = await UserModel.findOne({
      $or: [
        { email: loginIdentifier },
        { userName: loginIdentifier }
      ]
    });

    if (!userDoc) {
      const failRecord = await rateLimitService.recordFailedLogin(lookupKey);
      if (failRecord.isLocked) {
        res.status(429).json({
          message: 'Maximum 5 unsuccessful login attempts exceeded within 2 minutes. Account is now locked for 5 minutes.'
        });
        return;
      }
      res.status(401).json({
        message: `Invalid email or password. (Attempt ${failRecord.attempts} of 5)`
      });
      return;
    }

    if (!userDoc.isVerified) {
      res.status(403).json({ message: 'Account is not verified. Please complete OTP verification.' });
      return;
    }

    // Check main admin approval for official roles
    if (userDoc.role !== 'PUBLIC' && !userDoc.isApproved) {
      res.status(403).json({ message: 'Account pending official administrator approval.' });
      return;
    }

    if (!userDoc.password) {
      res.status(401).json({
        message: 'This account uses Google Sign-In. Please sign in with Google.'
      });
      return;
    }

    const same = await bcrypt.compare(password, userDoc.password);
    if (!same) {
      const failRecord = await rateLimitService.recordFailedLogin(lookupKey);
      if (failRecord.isLocked) {
        res.status(429).json({
          message: 'Maximum 5 unsuccessful login attempts exceeded within 2 minutes. Account is now locked for 5 minutes.'
        });
        return;
      }
      res.status(401).json({
        message: `Invalid email or password. (Attempt ${failRecord.attempts} of 5)`
      });
      return;
    }

    // Clear failed attempts counter on success
    await rateLimitService.clearLoginAttempts(lookupKey);

    // Single JWT_SECRET used for both refresh and access tokens
    const refreshToken = jwt.sign({ id: userDoc._id }, config.jwtSecret, { expiresIn: '7d' });
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await SessionModel.create({
      user: userDoc._id,
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      refreshToken: hashedRefreshToken,
      userAgent: req.headers['user-agent'] || 'Unknown',
      revoked: false,
      deletedAt: null
    });

    const finalFullName = userDoc.fullName || userDoc.userName || userDoc.email.split('@')[0];

    const accessToken = jwt.sign(
      {
        id: userDoc._id,
        sid: session._id,
        role: userDoc.role,
        userName: userDoc.userName,
        email: userDoc.email,
        fullName: finalFullName
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    res.status(200).json({
      message: 'login successful',
      accessToken,
      user: {
        id: userDoc._id,
        fullName: finalFullName,
        userName: userDoc.userName,
        email: userDoc.email,
        role: userDoc.role,
        agency: userDoc.agency
      }
    });
  } catch (error: any) {
    console.error('[MongoDB] Login error:', error.message);
    res.status(500).json({ message: 'some internal server error occurred!' });
  }
};

// Token refresh handler: rotates session and issues new access token
export const handleTokengen = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: 'refreshToken not found!' });
      return;
    }

    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await SessionModel.findOne({ refreshToken: hashedRefreshToken });
    if (!session || session.revoked) {
      res.status(403).json({ message: 'refreshToken is invalid or revoked!' });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      res.status(404).json({ message: 'user not found!' });
      return;
    }

    const newRefreshToken = jwt.sign(
      { id: user._id, userName: user.userName },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    session.refreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await session.save();

    const finalFullName = user.fullName || user.userName || user.email.split('@')[0];

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        userName: user.userName,
        sid: session._id,
        role: user.role,
        email: user.email,
        fullName: finalFullName
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    res.status(201).json({
      message: 'tokens successfully restored!',
      accessToken: newAccessToken
    });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'token expired, please login again!' });
      return;
    }
    res.status(401).json({ message: 'you are not authenticated!' });
  }
};

// Logout handler for current device session
export const logoutHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(400).json({ message: 'invalid refresh token!' });
      return;
    }

    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await SessionModel.findOne({ refreshToken: hashedRefreshToken });
    if (session && !session.revoked) {
      session.revoked = true;
      session.deletedAt = new Date();
      await session.save();
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: config.nodeEnv === 'production' ? 'none' : 'strict',
      secure: config.nodeEnv === 'production',
      path: '/api/auth'
    });

    res.status(204).end();
  } catch (err: any) {
    console.error('[MongoDB] Logout error:', err.message);
    res.status(500).json({ message: 'internal server error!' });
  }
};

// Logout-all handler: revokes all active sessions for this user across all devices
export const logoutAllHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(400).json({ message: 'invalid refresh token!' });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await SessionModel.findOne({
      user: decoded.id,
      refreshToken: hashedRefreshToken,
      revoked: false
    });

    if (!session) {
      res.status(401).json({ message: 'you are not authenticated to logout!' });
      return;
    }

    await SessionModel.updateMany(
      { user: decoded.id, revoked: false },
      { $set: { revoked: true, deletedAt: new Date() } }
    );

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: config.nodeEnv === 'production' ? 'none' : 'strict',
      secure: config.nodeEnv === 'production',
      path: '/api/auth'
    });

    res.status(204).end();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'token expired, please login again!' });
      return;
    }
    res.status(401).json({ message: 'you are not authenticated to logout!' });
  }
};

// Google OAuth 2.0 login handler for public users
export const googleOAuthLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ success: false, message: 'Google OAuth credential token required.' });
      return;
    }

    let payload: any = null;
    if (config.googleClientId) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId
      });
      payload = ticket.getPayload();
    } else {
      payload = jwt.decode(credential);
    }

    if (!payload || !payload.email) {
      res.status(400).json({ success: false, message: 'Invalid Google OAuth credential.' });
      return;
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || 'Google User';
    const userName = email.split('@')[0] + '_oauth';

    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({
        fullName: name,
        userName,
        email,
        password: 'OAUTH_GOOGLE_ACCOUNT',
        role: 'PUBLIC',
        agency: 'COMMUTER',
        isVerified: true,
        isApproved: true,
        authProvider: 'GOOGLE'
      });
    } else if (name && (!user.fullName || user.fullName !== name)) {
      user.fullName = name;
      await user.save();
    }

    const refreshToken = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '7d' });
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = await SessionModel.create({
      user: user._id,
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      refreshToken: hashedRefreshToken,
      userAgent: req.headers['user-agent'] || 'Unknown',
      revoked: false,
      deletedAt: null
    });

    const finalFullName = user.fullName || name;

    const accessToken = jwt.sign(
      { 
        id: user._id, 
        sid: session._id, 
        role: user.role, 
        userName: user.userName,
        email: user.email,
        fullName: finalFullName
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    res.json({
      message: 'Google OAuth login successful.',
      accessToken,
      user: { 
        id: user._id,
        fullName: finalFullName,
        userName: user.userName, 
        email: user.email, 
        role: user.role,
        agency: user.agency
      }
    });
  } catch (error: any) {
    console.error('[Google OAuth] Verification error:', error.message);
    res.status(400).json({ success: false, message: 'Google authentication failed. Please try again.' });
  }
};

// Main admin approval management
export const getPendingUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pendingDb = await UserModel.find({ isApproved: false, role: { $ne: 'PUBLIC' } }).select('-password');
    res.json({ success: true, pendingUsers: pendingDb });
  } catch (e: any) {
    console.error('[MongoDB] Error fetching pending users:', e.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve pending users.' });
  }
};

export const approveUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const adminName = req.user?.fullName || req.user?.userName || MAIN_ADMIN_NAME;

  try {
    const user = await UserModel.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.isApproved = true;
    user.approvedBy = adminName;
    user.approvedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: `Official user '${user.fullName || user.userName}' approved successfully by ${adminName}. The account is now active.`
    });
  } catch (e: any) {
    console.error('[MongoDB] Error approving user in Atlas:', e.message);
    res.status(500).json({ success: false, message: 'Failed to approve user.' });
  }
};

// Get current authenticated user profile directly from Atlas
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const userDoc = await UserModel.findById(userId).select('-password');
    if (!userDoc) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const finalFullName = userDoc.fullName || userDoc.userName || userDoc.email.split('@')[0];

    res.json({
      success: true,
      user: {
        id: userDoc._id,
        fullName: finalFullName,
        userName: userDoc.userName,
        email: userDoc.email,
        role: userDoc.role,
        agency: userDoc.agency
      }
    });
  } catch (e: any) {
    console.error('[MongoDB] getCurrentUser error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
};

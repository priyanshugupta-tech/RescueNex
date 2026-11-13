import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { stateService } from '../services/state.service.js';
import { emailService } from '../services/email.service.js';
import { generateOtps } from '../utils/generateOtp.js';
import { User, UserRole } from '../types/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserModel } from '../models/user.model.js';
import { OtpModel } from '../models/otp.model.js';
import { SessionModel } from '../models/session.model.js';
import { isDatabaseConnected } from '../config/database.js';

const MAIN_ADMIN_USERNAME = 'lead@rescuenex';
const MAIN_ADMIN_PASSWORD = 'gupta18';
const MAIN_ADMIN_NAME = 'Priyanshu Gupta';

const googleClient = new OAuth2Client(config.googleClientId);

// Seed Main Admin user
export const seedDefaultUsers = async () => {
  const defaultPasswordHash = await bcrypt.hash(MAIN_ADMIN_PASSWORD, 10);

  stateService.users.set(MAIN_ADMIN_USERNAME, {
    id: 'USR_LEAD_01',
    userName: MAIN_ADMIN_USERNAME,
    email: 'lead@rescuenex.org',
    role: 'ADMIN',
    agency: 'SDMA',
    isVerified: true,
    isApproved: true,
    authProvider: 'LOCAL',
    passwordHash: defaultPasswordHash
  } as any);

  if (isDatabaseConnected()) {
    try {
      const existing = await UserModel.findOne({ userName: MAIN_ADMIN_USERNAME });
      if (!existing) {
        await UserModel.create({
          userName: MAIN_ADMIN_USERNAME,
          email: 'lead@rescuenex.org',
          password: defaultPasswordHash,
          role: 'ADMIN',
          agency: 'SDMA',
          isVerified: true,
          isApproved: true,
          authProvider: 'LOCAL'
        });
        console.log(`✅ [MongoDB] Seeded Main Admin (${MAIN_ADMIN_USERNAME}) into Atlas.`);
      } else {
        existing.password = defaultPasswordHash;
        existing.isVerified = true;
        existing.isApproved = true;
        await existing.save();
      }
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] User seed check skipped:', e.message);
    }
  }
};

// ==========================================
// 1. SIGNUP (Creates unverified user + sends OTP)
// ==========================================
export const handleSignup = async (req: Request, res: Response): Promise<void> => {
  const { userName, email, password, confirmPassword, role = 'PUBLIC', agency = 'COMMUTER' } = req.body;

  try {
    if (!userName || !email || !password || !confirmPassword) {
      res.status(422).json({
        message: 'either of the detail is missing or invalidly entered!'
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
    const cleanUserName = userName.toLowerCase().trim();

    // Check if user already registered
    let existingUser: any = null;
    if (isDatabaseConnected()) {
      existingUser = await UserModel.findOne({
        $or: [{ userName: cleanUserName }, { email: cleanEmail }]
      });
    } else {
      for (const [, u] of stateService.users) {
        if (u.userName === cleanUserName || u.email === cleanEmail) {
          existingUser = u;
          break;
        }
      }
    }

    // If registered but not verified, resend OTP
    if (existingUser) {
      if (!existingUser.isVerified) {
        const otp = generateOtps();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        if (isDatabaseConnected()) {
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
        }

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

    // New User: hash password and create unverified record
    const hash = await bcrypt.hash(password, 10);
    const isApproved = role === 'PUBLIC' || cleanUserName === MAIN_ADMIN_USERNAME;

    let newUser: any = null;
    if (isDatabaseConnected()) {
      newUser = await UserModel.create({
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
    } else {
      newUser = {
        _id: `USR_${Date.now()}`,
        userName: cleanUserName,
        email: cleanEmail,
        password: hash,
        role: role as UserRole,
        agency,
        isVerified: false,
        isApproved,
        verificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };
      stateService.users.set(cleanUserName, newUser);

      const otp = generateOtps();
      await emailService.sendOTP(cleanEmail, otp);
    }

    res.status(201).json({
      message: 'signup successful! Please verify the OTP sent to your email.'
    });
  } catch (err: any) {
    res.status(500).json({ message: 'some internal server error occurred!' });
  }
};

// ==========================================
// 2. VERIFY OTP (Activates user & sets session cookie)
// ==========================================
export const handleOtp = async (req: Request, res: Response): Promise<void> => {
  const { otp, email } = req.body;

  if (!otp || !email) {
    res.status(400).json({ message: 'OTP or email is missing!' });
    return;
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');

    let user: any = null;

    if (isDatabaseConnected()) {
      const otpRecord = await OtpModel.findOneAndDelete({
        otpHash,
        email: cleanEmail,
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
      });

      if (!otpRecord) {
        res.status(401).json({ message: 'invalid, expired, or already used OTP!' });
        return;
      }

      user = await UserModel.findOne({ _id: otpRecord.user, email: cleanEmail });

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
    } else {
      // In-memory fallback
      for (const [, u] of stateService.users) {
        if (u.email === cleanEmail) {
          user = u;
          user.isVerified = true;
          break;
        }
      }
    }

    if (!user) {
      res.status(404).json({ message: 'user not found!' });
      return;
    }

    // Check Main Admin approval for non-public roles
    if (user.role !== 'PUBLIC' && !user.isApproved) {
      res.status(201).json({
        message: 'email verified successfully! Your official account is pending approval by Main Admin (Priyanshu Gupta).',
        requiresAdminApproval: true
      });
      return;
    }

    // Create Session and Issue Tokens
    const refreshToken = jwt.sign({ id: user._id || user.id }, config.jwtSecret, { expiresIn: '7d' });
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    let session: any = null;
    if (isDatabaseConnected()) {
      session = await SessionModel.create({
        user: user._id,
        ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Unknown',
        refreshToken: hashedRefreshToken,
        revoked: false,
        deletedAt: null
      });
    }

    const accessToken = jwt.sign(
      { id: user._id || user.id, sid: session ? session._id : 'mem_sid', role: user.role, userName: user.userName },
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
      user: { userName: user.userName, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'some internal server error occurred!' });
  }
};

// ==========================================
// 3. LOGIN (NO OTP! Username + Password)
// ==========================================
export const handleLogin = async (req: Request, res: Response): Promise<void> => {
  const { userName, password, email } = req.body;

  try {
    if (!password || (!userName && !email)) {
      res.status(400).json({ message: 'invalid username or password or email' });
      return;
    }

    const cleanQuery: any = {};
    if (userName) cleanQuery.userName = userName.toLowerCase().trim();
    if (email) cleanQuery.email = email.toLowerCase().trim();

    let user: any = null;

    if (isDatabaseConnected()) {
      user = await UserModel.findOne({
        $or: [
          userName ? { userName: cleanQuery.userName } : null,
          email ? { email: cleanQuery.email } : null
        ].filter(Boolean) as any
      });
    } else {
      for (const [, u] of stateService.users) {
        if (
          (cleanQuery.userName && u.userName === cleanQuery.userName) ||
          (cleanQuery.email && u.email === cleanQuery.email)
        ) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      res.status(401).json({ message: 'user not found!' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ message: 'user is not verified! Please complete OTP verification.' });
      return;
    }

    // Check Main Admin approval for non-public roles
    if (user.role !== 'PUBLIC' && !user.isApproved) {
      res.status(403).json({ message: 'official account pending approval from Main Admin (Priyanshu Gupta).' });
      return;
    }

    const same = await bcrypt.compare(password, user.password || (user as any).passwordHash);
    if (!same) {
      res.status(401).json({ message: 'incorrect password!' });
      return;
    }

    // Create Session
    const refreshToken = jwt.sign({ id: user._id || user.id }, config.jwtSecret, { expiresIn: '7d' });
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    let session: any = null;
    if (isDatabaseConnected()) {
      session = await SessionModel.create({
        user: user._id,
        ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
        refreshToken: hashedRefreshToken,
        userAgent: req.headers['user-agent'] || 'Unknown',
        revoked: false,
        deletedAt: null
      });
    }

    const accessToken = jwt.sign(
      { id: user._id || user.id, sid: session ? session._id : 'mem_sid', role: user.role, userName: user.userName },
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
      user: { userName: user.userName, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'some internal server error occurred!' });
  }
};

// ==========================================
// 4. TOKEN REFRESH (Rotate session & restore tokens)
// ==========================================
export const handleTokengen = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: 'refreshToken not found!' });
      return;
    }

    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    if (isDatabaseConnected()) {
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

      const newAccessToken = jwt.sign(
        { id: user._id, userName: user.userName, sid: session._id, role: user.role },
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
      return;
    }

    // In-memory fallback
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;
    const newAccessToken = jwt.sign(
      { id: decoded.id, userName: decoded.userName },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

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

// ==========================================
// 5. LOGOUT (Revokes single session or all sessions)
// ==========================================
export const logoutHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(400).json({ message: 'invalid refresh token!' });
      return;
    }

    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    if (isDatabaseConnected()) {
      const session = await SessionModel.findOne({ refreshToken: hashedRefreshToken });
      if (session && !session.revoked) {
        session.revoked = true;
        session.deletedAt = new Date();
        await session.save();
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: config.nodeEnv === 'production' ? 'none' : 'strict',
      secure: config.nodeEnv === 'production',
      path: '/api/auth'
    });

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: 'internal server error!' });
  }
};

export const logoutAllHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(400).json({ message: 'invalid refresh token!' });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    if (isDatabaseConnected()) {
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
    }

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

// ==========================================
// 6. GOOGLE OAUTH 2.0 (Public Users)
// ==========================================
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

    let user: any = null;

    if (isDatabaseConnected()) {
      user = await UserModel.findOne({ email });
      if (!user) {
        user = await UserModel.create({
          userName,
          email,
          password: 'OAUTH_GOOGLE_ACCOUNT',
          role: 'PUBLIC',
          agency: 'COMMUTER',
          isVerified: true,
          isApproved: true,
          authProvider: 'GOOGLE'
        });
      }
    } else {
      user = {
        _id: `USR_GOOGLE_${Date.now()}`,
        userName,
        email,
        role: 'PUBLIC',
        agency: 'COMMUTER',
        isVerified: true,
        isApproved: true,
        authProvider: 'GOOGLE'
      };
      stateService.users.set(userName, user);
    }

    const refreshToken = jwt.sign({ id: user._id || user.id }, config.jwtSecret, { expiresIn: '7d' });
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    let session: any = null;
    if (isDatabaseConnected()) {
      session = await SessionModel.create({
        user: user._id,
        ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
        refreshToken: hashedRefreshToken,
        userAgent: req.headers['user-agent'] || 'Unknown',
        revoked: false,
        deletedAt: null
      });
    }

    const accessToken = jwt.sign(
      { id: user._id || user.id, sid: session ? session._id : 'mem_sid', role: user.role, userName: user.userName },
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
      user: { userName: user.userName, email: user.email, role: user.role }
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Google OAuth failed.' });
  }
};

// ==========================================
// 7. MAIN ADMIN APPROVAL MANAGEMENT
// ==========================================
export const getPendingUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (isDatabaseConnected()) {
    try {
      const pendingDb = await UserModel.find({ isApproved: false, role: { $ne: 'PUBLIC' } }).select('-password');
      res.json({ success: true, pendingUsers: pendingDb });
      return;
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] Error fetching pending users:', e.message);
    }
  }

  const pendingMem = Array.from(stateService.users.values())
    .filter((u: any) => !u.isApproved && u.role !== 'PUBLIC')
    .map(({ password, passwordHash, ...user }: any) => user);

  res.json({
    success: true,
    pendingUsers: pendingMem
  });
};

export const approveUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const adminName = req.user?.userName || MAIN_ADMIN_NAME;

  let approved = false;

  if (isDatabaseConnected()) {
    try {
      const user = await UserModel.findById(id);
      if (user) {
        user.isApproved = true;
        user.approvedBy = adminName;
        user.approvedAt = new Date();
        await user.save();
        approved = true;

        const mem: any = stateService.users.get(user.userName);
        if (mem) mem.isApproved = true;
      }
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] Error approving user in Atlas:', e.message);
    }
  }

  if (!approved) {
    for (const [, user] of stateService.users) {
      if ((user as any)._id === id || (user as any).id === id || user.userName === id) {
        user.isApproved = true;
        approved = true;
        break;
      }
    }
  }

  if (!approved) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  res.json({
    success: true,
    message: `Official user '${id}' approved successfully by ${adminName}. The account is now active.`
  });
};

export const getCurrentUser = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    user: req.user
  });
};

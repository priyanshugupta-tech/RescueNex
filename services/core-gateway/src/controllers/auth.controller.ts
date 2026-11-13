import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { stateService } from '../services/state.service.js';
import { emailService } from '../services/email.service.js';
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

// In-memory fallback stores
const memoryOtpStore = new Map<string, { otp: string; expiresAt: number }>();
const memorySessionStore = new Map<string, { userId: string; refreshToken: string; expiresAt: number }>();

// Helper: Generates Access Token + Refresh Token and logs active Session
const generateTokenPairAndSession = async (user: User, req: Request) => {
  const tokenPayload = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    agency: user.agency,
    isApproved: user.isApproved
  };

  const accessToken = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: config.jwtAccessExpiresIn as any });
  const refreshToken = jwt.sign({ id: user.id, username: user.username }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';

  // Persist session to MongoDB Atlas
  if (isDatabaseConnected()) {
    try {
      await SessionModel.create({
        userId: user.id,
        refreshToken,
        userAgent,
        ipAddress,
        isValid: true,
        expiresAt
      });
    } catch (e: any) {
      console.warn('⚠️ [Session] Failed to persist session to Atlas:', e.message);
    }
  }

  // Memory fallback sync
  memorySessionStore.set(refreshToken, { userId: user.id, refreshToken, expiresAt: expiresAt.getTime() });

  return { accessToken, refreshToken, expiresIn: config.jwtAccessExpiresIn };
};

// Seed Main Admin user
export const seedDefaultUsers = async () => {
  const defaultPasswordHash = await bcrypt.hash(MAIN_ADMIN_PASSWORD, 10);

  stateService.users.set(MAIN_ADMIN_USERNAME, {
    id: 'USR_LEAD_01',
    name: MAIN_ADMIN_NAME,
    username: MAIN_ADMIN_USERNAME,
    email: 'lead@rescuenex.org',
    role: 'ADMIN',
    agency: 'SDMA',
    isApproved: true,
    authProvider: 'LOCAL',
    passwordHash: defaultPasswordHash
  });

  if (isDatabaseConnected()) {
    try {
      const existing = await UserModel.findOne({ username: MAIN_ADMIN_USERNAME });
      if (!existing) {
        await UserModel.create({
          name: MAIN_ADMIN_NAME,
          username: MAIN_ADMIN_USERNAME,
          email: 'lead@rescuenex.org',
          passwordHash: defaultPasswordHash,
          role: 'ADMIN',
          agency: 'SDMA',
          isApproved: true,
          authProvider: 'LOCAL',
          phone: '+919999999999'
        });
        console.log(`✅ [MongoDB] Seeded Main Admin (${MAIN_ADMIN_USERNAME}) into Atlas.`);
      } else {
        existing.passwordHash = defaultPasswordHash;
        existing.isApproved = true;
        await existing.save();
      }
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] User seed check skipped:', e.message);
    }
  }
};

// ==========================================
// 1. SIGNUP WITH EMAIL OTP (OTP is ONLY here!)
// ==========================================

const sendSignupOtpSchema = z.object({
  email: z.string().email()
});

export const sendSignupOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = sendSignupOtpSchema.parse(req.body);
    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    if (isDatabaseConnected()) {
      const existing = await UserModel.findOne({ email: cleanEmail });
      if (existing) {
        res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' });
        return;
      }
    } else {
      for (const [, u] of stateService.users) {
        if (u.email === cleanEmail) {
          res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' });
          return;
        }
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    if (isDatabaseConnected()) {
      await OtpModel.deleteMany({ email: cleanEmail });
      await OtpModel.create({ email: cleanEmail, otp, expiresAt });
    }

    memoryOtpStore.set(cleanEmail, { otp, expiresAt: expiresAt.getTime() });

    // Send email via Resend
    await emailService.sendOTP(cleanEmail, otp);

    res.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please enter it to complete signup.`
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Error generating signup OTP.' });
  }
};

const signupSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  otp: z.string().length(6),
  role: z.enum(['ADMIN', 'OPERATOR', 'SCOUT', 'PUBLIC']).default('PUBLIC'),
  agency: z.enum(['SDMA', 'SDRF', 'BRO', 'COMMUTER']).optional(),
  phone: z.string().optional()
});

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, email, password, otp, role, agency, phone } = signupSchema.parse(req.body);
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    // Verify OTP
    let isOtpValid = false;
    if (isDatabaseConnected()) {
      const record = await OtpModel.findOne({ email: cleanEmail, otp });
      if (record && record.expiresAt > new Date()) {
        isOtpValid = true;
        await OtpModel.deleteMany({ email: cleanEmail });
      }
    }

    if (!isOtpValid) {
      const memRecord = memoryOtpStore.get(cleanEmail);
      if (memRecord && memRecord.otp === otp && memRecord.expiresAt > Date.now()) {
        isOtpValid = true;
        memoryOtpStore.delete(cleanEmail);
      }
    }

    if (!isOtpValid) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP verification code.' });
      return;
    }

    // Check username uniqueness
    if (isDatabaseConnected()) {
      const existingUser = await UserModel.findOne({ username: cleanUsername });
      if (existingUser) {
        res.status(409).json({ success: false, message: 'Username is already taken.' });
        return;
      }
    } else if (stateService.users.has(cleanUsername)) {
      res.status(409).json({ success: false, message: 'Username is already taken.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isApproved = role === 'PUBLIC' || cleanUsername === MAIN_ADMIN_USERNAME;
    let userId = `USR_${Date.now()}`;

    if (isDatabaseConnected()) {
      const created = await UserModel.create({
        name,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        role,
        agency: role === 'PUBLIC' ? 'COMMUTER' : agency,
        phone,
        isApproved,
        authProvider: 'LOCAL'
      });
      userId = created._id.toString();
    }

    const newUser: User = {
      id: userId,
      name,
      username: cleanUsername,
      email: cleanEmail,
      role: role as UserRole,
      agency: role === 'PUBLIC' ? 'COMMUTER' : agency,
      isApproved,
      authProvider: 'LOCAL'
    };

    stateService.users.set(cleanUsername, { ...newUser, passwordHash });

    // If PUBLIC role: Auto-approved -> create active session and return token pair
    if (isApproved) {
      const tokens = await generateTokenPairAndSession(newUser, req);
      res.status(201).json({
        success: true,
        message: 'Account registered and verified successfully.',
        user: newUser,
        tokens
      });
      return;
    }

    // Non-public role: Awaits Main Admin approval
    res.status(201).json({
      success: true,
      message: 'Official account registered with verified email. Awaiting approval from Main Admin (Priyanshu Gupta).',
      requiresApproval: true,
      user: newUser
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Signup failed.' });
  }
};

// ==========================================
// 2. STANDARD LOGIN (NO OTP! Username + Password)
// ==========================================

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4)
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const lookupKey = username.toLowerCase().trim();

    let userDoc: any = null;
    let passwordHash: string | null = null;

    if (isDatabaseConnected()) {
      userDoc = await UserModel.findOne({
        $or: [{ username: lookupKey }, { email: lookupKey }]
      });
      if (userDoc) {
        passwordHash = userDoc.passwordHash || null;
      }
    }

    if (!userDoc) {
      const memUser = stateService.users.get(lookupKey);
      if (memUser) {
        userDoc = memUser;
        passwordHash = memUser.passwordHash;
      }
    }

    if (!userDoc || !passwordHash) {
      res.status(401).json({ success: false, message: 'Invalid username or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid username or password.' });
      return;
    }

    // Check approval
    if (userDoc.role !== 'PUBLIC' && !userDoc.isApproved) {
      res.status(403).json({
        success: false,
        message: 'Non-public role requires approval from Main Admin (Priyanshu Gupta).'
      });
      return;
    }

    const user: User = {
      id: userDoc.id || userDoc._id?.toString(),
      name: userDoc.name,
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
      agency: userDoc.agency,
      isApproved: userDoc.isApproved,
      authProvider: userDoc.authProvider
    };

    // Maintain session & generate Access Token + Refresh Token
    const tokens = await generateTokenPairAndSession(user, req);

    res.json({
      success: true,
      message: 'Login successful.',
      user,
      tokens
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Login error.' });
  }
};

// ==========================================
// 3. REFRESH TOKEN & SESSION ROTATION
// ==========================================

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token is required.' });
      return;
    }

    // Verify token signature
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
      return;
    }

    // Verify active session in Database
    let sessionValid = false;
    if (isDatabaseConnected()) {
      const session = await SessionModel.findOne({ refreshToken, isValid: true });
      if (session && session.expiresAt > new Date()) {
        sessionValid = true;
      }
    } else {
      const memSession = memorySessionStore.get(refreshToken);
      if (memSession && memSession.expiresAt > Date.now()) {
        sessionValid = true;
      }
    }

    if (!sessionValid) {
      res.status(401).json({ success: false, message: 'Session expired or revoked. Please log in again.' });
      return;
    }

    // Fetch user details
    let user: any = null;
    if (isDatabaseConnected()) {
      user = await UserModel.findById(decoded.id);
    }
    if (!user) {
      user = stateService.users.get(decoded.username);
    }

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const tokenPayload = {
      id: user.id || user._id?.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      agency: user.agency,
      isApproved: user.isApproved
    };

    // Issue fresh Access Token
    const newAccessToken = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: config.jwtAccessExpiresIn as any });

    res.json({
      success: true,
      accessToken: newAccessToken,
      expiresIn: config.jwtAccessExpiresIn
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Token refresh error.' });
  }
};

// ==========================================
// 4. LOGOUT & SESSION REVOCATION
// ==========================================

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      if (isDatabaseConnected()) {
        await SessionModel.findOneAndUpdate({ refreshToken }, { isValid: false });
      }
      memorySessionStore.delete(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully. Session invalidated.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Logout error.' });
  }
};

// ==========================================
// 5. GOOGLE OAUTH 2.0 (Public Users)
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
    const username = email.split('@')[0] + '_oauth';

    let user: any = null;

    if (isDatabaseConnected()) {
      user = await UserModel.findOne({ email });
      if (!user) {
        user = await UserModel.create({
          name,
          username,
          email,
          role: 'PUBLIC',
          agency: 'COMMUTER',
          isApproved: true,
          authProvider: 'GOOGLE'
        });
      }
    } else {
      user = {
        id: `USR_GOOGLE_${Date.now()}`,
        name,
        username,
        email,
        role: 'PUBLIC',
        agency: 'COMMUTER',
        isApproved: true,
        authProvider: 'GOOGLE'
      };
      stateService.users.set(username, user);
    }

    const tokenPayload: User = {
      id: user.id || user._id?.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      role: 'PUBLIC',
      agency: 'COMMUTER',
      isApproved: true,
      authProvider: 'GOOGLE'
    };

    const tokens = await generateTokenPairAndSession(tokenPayload, req);

    res.json({
      success: true,
      message: 'Google OAuth login successful.',
      user: tokenPayload,
      tokens
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Google OAuth failed.' });
  }
};

// ==========================================
// 👑 MAIN ADMIN APPROVAL MANAGEMENT
// ==========================================

export const getPendingUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (isDatabaseConnected()) {
    try {
      const pendingDb = await UserModel.find({ isApproved: false, role: { $ne: 'PUBLIC' } }).select('-passwordHash');
      res.json({ success: true, pendingUsers: pendingDb });
      return;
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] Error fetching pending users:', e.message);
    }
  }

  const pendingMem = Array.from(stateService.users.values())
    .filter((u) => !u.isApproved && u.role !== 'PUBLIC')
    .map(({ passwordHash, ...user }) => user);

  res.json({
    success: true,
    pendingUsers: pendingMem
  });
};

export const approveUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const adminName = req.user?.name || MAIN_ADMIN_NAME;

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

        const mem = stateService.users.get(user.username);
        if (mem) mem.isApproved = true;
      }
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] Error approving user in Atlas:', e.message);
    }
  }

  if (!approved) {
    for (const [, user] of stateService.users) {
      if (user.id === id || user.username === id) {
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

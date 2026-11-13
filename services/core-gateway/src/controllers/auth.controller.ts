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
import { isDatabaseConnected } from '../config/database.js';

const MAIN_ADMIN_USERNAME = 'lead@rescuenex';
const MAIN_ADMIN_PASSWORD = 'gupta18';
const MAIN_ADMIN_NAME = 'Priyanshu Gupta';

const googleClient = new OAuth2Client(config.googleClientId);

// In-memory OTP store for offline/local development fallback
const memoryOtpStore = new Map<string, { otp: string; expiresAt: number }>();

// Seed Main Admin user
export const seedDefaultUsers = async () => {
  const defaultPasswordHash = await bcrypt.hash(MAIN_ADMIN_PASSWORD, 10);

  // In-memory seed
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

  // Atlas seed if connected
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

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4)
});

const registerSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'OPERATOR', 'SCOUT', 'PUBLIC']).default('PUBLIC'),
  agency: z.enum(['SDMA', 'SDRF', 'BRO', 'COMMUTER']).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional()
});

const sendOtpSchema = z.object({
  email: z.string().email()
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  name: z.string().optional()
});

// ==========================================
// 📧 RESEND EMAIL OTP AUTHENTICATION (PUBLIC)
// ==========================================

export const sendEmailOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = sendOtpSchema.parse(req.body);
    const cleanEmail = email.toLowerCase().trim();

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save in Atlas
    if (isDatabaseConnected()) {
      await OtpModel.deleteMany({ email: cleanEmail }); // Delete old OTPs
      await OtpModel.create({
        email: cleanEmail,
        otp,
        expiresAt
      });
    }

    // Save in Memory
    memoryOtpStore.set(cleanEmail, { otp, expiresAt: expiresAt.getTime() });

    // Send email via Resend
    await emailService.sendOTP(cleanEmail, otp);

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Error generating OTP.' });
  }
};

export const verifyEmailOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, name } = verifyOtpSchema.parse(req.body);
    const cleanEmail = email.toLowerCase().trim();

    let isValid = false;

    // Check Atlas
    if (isDatabaseConnected()) {
      const record = await OtpModel.findOne({ email: cleanEmail, otp });
      if (record && record.expiresAt > new Date()) {
        isValid = true;
        await OtpModel.deleteMany({ email: cleanEmail }); // Invalidate used OTP
      }
    }

    // Fallback to Memory Store
    if (!isValid) {
      const memRecord = memoryOtpStore.get(cleanEmail);
      if (memRecord && memRecord.otp === otp && memRecord.expiresAt > Date.now()) {
        isValid = true;
        memoryOtpStore.delete(cleanEmail);
      }
    }

    if (!isValid) {
      res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
      return;
    }

    // OTP Verified! Find existing or auto-create Public User
    let user: any = null;

    if (isDatabaseConnected()) {
      user = await UserModel.findOne({ email: cleanEmail });
      if (!user) {
        const username = cleanEmail.split('@')[0] + '_' + Math.floor(100 + Math.random() * 900);
        user = await UserModel.create({
          name: name || cleanEmail.split('@')[0],
          username,
          email: cleanEmail,
          role: 'PUBLIC',
          agency: 'COMMUTER',
          isApproved: true, // Public users are instantly active
          authProvider: 'LOCAL'
        });
      }
    } else {
      user = stateService.users.get(cleanEmail);
      if (!user) {
        const username = cleanEmail.split('@')[0];
        user = {
          id: `USR_${Date.now()}`,
          name: name || username,
          username,
          email: cleanEmail,
          role: 'PUBLIC',
          agency: 'COMMUTER',
          isApproved: true,
          authProvider: 'LOCAL'
        };
        stateService.users.set(username, user);
      }
    }

    const tokenPayload: User = {
      id: user.id || user._id?.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      agency: user.agency,
      isApproved: true,
      authProvider: user.authProvider
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '1d' });

    res.json({
      success: true,
      message: 'Email verified successfully. Logged in.',
      token,
      user: tokenPayload
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'OTP verification error.' });
  }
};

// ==========================================
// 🔑 OFFICIAL / STANDARD USERNAME LOGIN
// ==========================================

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const lookupKey = username.toLowerCase().trim();

    let user: any = null;
    let passwordHash: string | null = null;

    // Check MongoDB Atlas first
    if (isDatabaseConnected()) {
      const dbUser = await UserModel.findOne({
        $or: [{ username: lookupKey }, { email: lookupKey }]
      });
      if (dbUser) {
        user = dbUser;
        passwordHash = dbUser.passwordHash || null;
      }
    }

    // Fallback to in-memory state
    if (!user) {
      const memUser = stateService.users.get(lookupKey);
      if (memUser) {
        user = memUser;
        passwordHash = memUser.passwordHash;
      }
    }

    if (!user || !passwordHash) {
      res.status(401).json({ success: false, message: 'Invalid username or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid username or password.' });
      return;
    }

    // NON-PUBLIC ROLES REQUIRE MAIN ADMIN APPROVAL
    if (user.role !== 'PUBLIC' && !user.isApproved) {
      res.status(403).json({
        success: false,
        message: 'Non-public role requires approval from Main Admin (Priyanshu Gupta).'
      });
      return;
    }

    const tokenPayload: User = {
      id: user.id || user._id?.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      agency: user.agency,
      isApproved: user.isApproved,
      authProvider: user.authProvider
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '1d' });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: tokenPayload
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Validation error.' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, password, role, agency, email, phone } = registerSchema.parse(req.body);
    const cleanUsername = username.toLowerCase().trim();

    // Check uniqueness
    if (isDatabaseConnected()) {
      const existing = await UserModel.findOne({ username: cleanUsername });
      if (existing) {
        res.status(409).json({ success: false, message: 'Username is already taken.' });
        return;
      }
    } else if (stateService.users.has(cleanUsername)) {
      res.status(409).json({ success: false, message: 'Username is already taken.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let userId = `USR_${Date.now()}`;

    // RULE: PUBLIC role is AUTO-APPROVED. Non-public roles REQUIRE Main Admin approval!
    const isApproved = role === 'PUBLIC' || cleanUsername === MAIN_ADMIN_USERNAME;

    if (isDatabaseConnected()) {
      const created = await UserModel.create({
        name,
        username: cleanUsername,
        email,
        passwordHash,
        role,
        agency: role === 'PUBLIC' ? 'COMMUTER' : agency,
        phone,
        isApproved,
        authProvider: 'LOCAL'
      });
      userId = created._id.toString();
    }

    stateService.users.set(cleanUsername, {
      id: userId,
      name,
      username: cleanUsername,
      email,
      role: role as UserRole,
      agency: role === 'PUBLIC' ? 'COMMUTER' : agency,
      isApproved,
      authProvider: 'LOCAL',
      passwordHash
    });

    res.status(201).json({
      success: true,
      message: isApproved
        ? 'Account registered successfully. You can now log in.'
        : 'Official registration submitted. Non-public role requires approval from Main Admin (Priyanshu Gupta).',
      requiresApproval: !isApproved,
      role
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Validation error.' });
  }
};

// ==========================================
// 🌐 OAUTH 2.0 (Google Login for Public Users)
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

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '1d' });

    res.json({
      success: true,
      message: 'Google OAuth login successful.',
      token,
      user: tokenPayload
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

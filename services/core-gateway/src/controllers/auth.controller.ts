import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { stateService } from '../services/state.service.js';
import { User, UserRole } from '../types/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserModel } from '../models/user.model.js';
import { isDatabaseConnected } from '../config/database.js';

const MAIN_ADMIN_USERNAME = 'lead@rescuenex';
const MAIN_ADMIN_PASSWORD = 'gupta18';
const MAIN_ADMIN_NAME = 'Priyanshu Gupta';

const googleClient = new OAuth2Client(config.googleClientId);

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
    twoFactorEnabled: false,
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
          twoFactorEnabled: false,
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
  password: z.string().min(4),
  totpCode: z.string().optional() // Required if user has 2FA enabled
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

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, totpCode } = loginSchema.parse(req.body);
    const lookupKey = username.toLowerCase().trim();

    let user: any = null;
    let passwordHash: string | null = null;
    let twoFactorSecret: string | undefined = undefined;

    // Check MongoDB Atlas first
    if (isDatabaseConnected()) {
      const dbUser = await UserModel.findOne({
        $or: [{ username: lookupKey }, { email: lookupKey }]
      });
      if (dbUser) {
        user = dbUser;
        passwordHash = dbUser.passwordHash || null;
        twoFactorSecret = dbUser.twoFactorSecret;
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

    // 1. NON-PUBLIC ROLES REQUIRE MAIN ADMIN APPROVAL
    if (user.role !== 'PUBLIC' && !user.isApproved) {
      res.status(403).json({
        success: false,
        message: 'Non-public role requires approval from Main Admin (Priyanshu Gupta).'
      });
      return;
    }

    // 2. 2FA ENFORCEMENT (If enabled)
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        res.status(403).json({
          success: false,
          requires2FA: true,
          message: 'Two-Factor Authentication code required.'
        });
        return;
      }

      const verified = speakeasy.totp.verify({
        secret: twoFactorSecret || '',
        encoding: 'base32',
        token: totpCode,
        window: 1
      });

      if (!verified) {
        res.status(401).json({ success: false, message: 'Invalid 2FA authentication code.' });
        return;
      }
    }

    const tokenPayload: User = {
      id: user.id || user._id?.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      agency: user.agency,
      isApproved: user.isApproved,
      twoFactorEnabled: user.twoFactorEnabled,
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
        twoFactorEnabled: false,
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
      twoFactorEnabled: false,
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
    const { credential } = req.body; // Google ID Token from Google Identity Services

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
      // In local dev without Google Client ID, decode safe claims
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
          isApproved: true, // Public is always auto-approved
          authProvider: 'GOOGLE',
          twoFactorEnabled: false
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
        authProvider: 'GOOGLE',
        twoFactorEnabled: false
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
// 🛡️ TWO-FACTOR AUTHENTICATION (2FA - TOTP)
// ==========================================
export const setup2FA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const username = req.user?.username;
    if (!username) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    const secret = speakeasy.generateSecret({
      name: `RescueNex (${username})`,
      issuer: 'RescueNex National Alert'
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Temporarily save secret
    if (isDatabaseConnected()) {
      await UserModel.findOneAndUpdate(
        { username },
        { twoFactorSecret: secret.base32 }
      );
    }

    res.json({
      success: true,
      message: 'Scan the QR code in Google Authenticator or Authy to configure 2FA.',
      secret: secret.base32,
      qrCodeDataUrl
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '2FA setup error.' });
  }
};

export const verifyAndEnable2FA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const username = req.user?.username;
    const { token } = req.body;

    if (!username || !token) {
      res.status(400).json({ success: false, message: '6-digit 2FA token required.' });
      return;
    }

    let secret = '';
    if (isDatabaseConnected()) {
      const user = await UserModel.findOne({ username });
      secret = user?.twoFactorSecret || '';
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      res.status(400).json({ success: false, message: 'Invalid 2FA code. Please try again.' });
      return;
    }

    if (isDatabaseConnected()) {
      await UserModel.findOneAndUpdate(
        { username },
        { twoFactorEnabled: true }
      );
    }

    res.json({
      success: true,
      message: 'Two-Factor Authentication (2FA) is now ACTIVE on your account.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '2FA verification error.' });
  }
};

// ==========================================
// 👑 MAIN ADMIN APPROVAL MANAGEMENT
// ==========================================
export const getPendingUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (isDatabaseConnected()) {
    try {
      // Exclude public users; return pending official roles
      const pendingDb = await UserModel.find({ isApproved: false, role: { $ne: 'PUBLIC' } }).select('-passwordHash -twoFactorSecret');
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

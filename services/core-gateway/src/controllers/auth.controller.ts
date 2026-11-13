import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { stateService } from '../services/state.service.js';
import { User, UserRole } from '../types/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserModel } from '../models/user.model.js';
import { isDatabaseConnected } from '../config/database.js';

const MAIN_ADMIN_USERNAME = 'lead@rescuenex';
const MAIN_ADMIN_PASSWORD = 'gupta18';
const MAIN_ADMIN_NAME = 'Priyanshu Gupta';

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
          phone: '+919999999999'
        });
        console.log(`✅ [MongoDB] Seeded Main Admin (${MAIN_ADMIN_USERNAME}) into Atlas.`);
      } else {
        // Ensure credentials and approval match requested configuration
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
  role: z.enum(['ADMIN', 'OPERATOR', 'SCOUT', 'PUBLIC']).default('OPERATOR'),
  agency: z.enum(['SDMA', 'SDRF', 'BRO', 'COMMUTER']).optional(),
  phone: z.string().optional()
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const lookupKey = username.toLowerCase().trim();

    let user: User | null = null;
    let passwordHash: string | null = null;

    // Check MongoDB Atlas first if connected
    if (isDatabaseConnected()) {
      const dbUser = await UserModel.findOne({
        $or: [{ username: lookupKey }, { email: lookupKey }]
      });
      if (dbUser) {
        user = {
          id: dbUser._id.toString(),
          name: dbUser.name,
          username: dbUser.username,
          email: dbUser.email,
          role: dbUser.role,
          agency: dbUser.agency,
          isApproved: dbUser.isApproved
        };
        passwordHash = dbUser.passwordHash;
      }
    }

    // Fallback to in-memory state
    if (!user) {
      const memUser = stateService.users.get(lookupKey);
      if (memUser) {
        user = {
          id: memUser.id,
          name: memUser.name,
          username: memUser.username,
          email: memUser.email,
          role: memUser.role,
          agency: memUser.agency,
          isApproved: memUser.isApproved
        };
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

    // Admin Approval Check: Non-approved users cannot log in
    if (!user.isApproved) {
      res.status(403).json({
        success: false,
        message: 'Account pending approval from Main Admin (Priyanshu Gupta).'
      });
      return;
    }

    const token = jwt.sign(user, config.jwtSecret, { expiresIn: '1d' });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Validation error.' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, password, role, agency, phone } = registerSchema.parse(req.body);
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

    // All registered accounts (except Main Admin) require Admin Approval
    const isApproved = cleanUsername === MAIN_ADMIN_USERNAME;

    // Save to Atlas if connected
    if (isDatabaseConnected()) {
      const created = await UserModel.create({
        name,
        username: cleanUsername,
        passwordHash,
        role,
        agency,
        phone,
        isApproved
      });
      userId = created._id.toString();
    }

    // Keep in-memory sync
    stateService.users.set(cleanUsername, {
      id: userId,
      name,
      username: cleanUsername,
      role: role as UserRole,
      agency: agency as any,
      isApproved,
      passwordHash
    });

    res.status(201).json({
      success: true,
      message: isApproved
        ? 'Main Admin account created and active.'
        : 'Registration submitted successfully. Account is pending approval by Main Admin (Priyanshu Gupta).',
      requiresApproval: !isApproved
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Validation error.' });
  }
};

export const getPendingUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (isDatabaseConnected()) {
    try {
      const pendingDb = await UserModel.find({ isApproved: false }).select('-passwordHash');
      res.json({ success: true, pendingUsers: pendingDb });
      return;
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] Error fetching pending users:', e.message);
    }
  }

  const pendingMem = Array.from(stateService.users.values())
    .filter((u) => !u.isApproved)
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

        // Sync in memory
        const mem = stateService.users.get(user.username);
        if (mem) mem.isApproved = true;
      }
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] Error approving user in Atlas:', e.message);
    }
  }

  if (!approved) {
    // Check in-memory by ID or username
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
    message: `User '${id}' approved successfully by ${adminName}. The user can now log in.`
  });
};

export const getCurrentUser = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    user: req.user
  });
};

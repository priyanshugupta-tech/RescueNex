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

// Seed default users into in-memory or Atlas
export const seedDefaultUsers = async () => {
  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  const operatorPasswordHash = await bcrypt.hash('bro123', 10);

  // In-memory seed
  if (stateService.users.size === 0) {
    stateService.users.set('admin@sdma.gov.in', {
      id: 'USR_ADMIN_01',
      name: 'Priyanshu Gupta (SDMA Officer)',
      email: 'admin@sdma.gov.in',
      role: 'ADMIN',
      agency: 'SDMA',
      passwordHash: defaultPasswordHash
    });

    stateService.users.set('operator@bro.gov.in', {
      id: 'USR_BRO_01',
      name: 'BRO Field Commander (NH-44)',
      email: 'operator@bro.gov.in',
      role: 'OPERATOR',
      agency: 'BRO',
      passwordHash: operatorPasswordHash
    });
  }

  // Atlas seed if connected
  if (isDatabaseConnected()) {
    try {
      const existingAdmin = await UserModel.findOne({ email: 'admin@sdma.gov.in' });
      if (!existingAdmin) {
        await UserModel.create({
          name: 'Priyanshu Gupta (SDMA Officer)',
          email: 'admin@sdma.gov.in',
          passwordHash: defaultPasswordHash,
          role: 'ADMIN',
          agency: 'SDMA',
          phone: '+919999999999'
        });
        console.log('✅ [MongoDB] Seeded default SDMA Admin user into Atlas.');
      }
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] User seed check skipped:', e.message);
    }
  }
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'OPERATOR', 'SCOUT', 'PUBLIC']).default('PUBLIC'),
  agency: z.enum(['SDMA', 'SDRF', 'BRO', 'COMMUTER']).optional(),
  phone: z.string().optional()
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    let user: User | null = null;
    let passwordHash: string | null = null;

    // Check MongoDB Atlas first if connected
    if (isDatabaseConnected()) {
      const dbUser = await UserModel.findOne({ email });
      if (dbUser) {
        user = {
          id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          agency: dbUser.agency
        };
        passwordHash = dbUser.passwordHash;
      }
    }

    // Fallback to in-memory state
    if (!user) {
      const memUser = stateService.users.get(email);
      if (memUser) {
        user = {
          id: memUser.id,
          name: memUser.name,
          email: memUser.email,
          role: memUser.role,
          agency: memUser.agency
        };
        passwordHash = memUser.passwordHash;
      }
    }

    if (!user || !passwordHash) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
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
    const { name, email, password, role, agency, phone } = registerSchema.parse(req.body);

    // Check uniqueness
    if (isDatabaseConnected()) {
      const existing = await UserModel.findOne({ email });
      if (existing) {
        res.status(409).json({ success: false, message: 'User with this email already exists.' });
        return;
      }
    } else if (stateService.users.has(email)) {
      res.status(409).json({ success: false, message: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let userId = `USR_${Date.now()}`;

    // Save to Atlas if connected
    if (isDatabaseConnected()) {
      const created = await UserModel.create({
        name,
        email,
        passwordHash,
        role,
        agency,
        phone
      });
      userId = created._id.toString();
    }

    // Always keep in-memory sync for sub-millisecond route checks
    stateService.users.set(email, {
      id: userId,
      name,
      email,
      role: role as UserRole,
      agency: agency as any,
      passwordHash
    });

    const user: User = {
      id: userId,
      name,
      email,
      role: role as UserRole,
      agency: agency as any
    };

    const token = jwt.sign(user, config.jwtSecret, { expiresIn: '1d' });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Validation error.' });
  }
};

export const getCurrentUser = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    user: req.user
  });
};

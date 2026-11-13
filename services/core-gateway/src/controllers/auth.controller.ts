import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { stateService } from '../services/state.service.js';
import { User, UserRole } from '../types/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

// Seed default users for rapid testing
const seedDefaultUsers = async () => {
  if (stateService.users.size === 0) {
    const defaultPasswordHash = await bcrypt.hash('admin123', 10);
    stateService.users.set('admin@sdma.gov.in', {
      id: 'USR_ADMIN_01',
      name: 'Priyanshu Gupta (SDMA Officer)',
      email: 'admin@sdma.gov.in',
      role: 'ADMIN',
      agency: 'SDMA',
      passwordHash: defaultPasswordHash
    });

    const operatorPasswordHash = await bcrypt.hash('bro123', 10);
    stateService.users.set('operator@bro.gov.in', {
      id: 'USR_BRO_01',
      name: 'BRO Field Commander (NH-44)',
      email: 'operator@bro.gov.in',
      role: 'OPERATOR',
      agency: 'BRO',
      passwordHash: operatorPasswordHash
    });
  }
};
seedDefaultUsers();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'OPERATOR', 'SCOUT', 'PUBLIC']).default('PUBLIC'),
  agency: z.enum(['SDMA', 'SDRF', 'BRO', 'COMMUTER']).optional()
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const userWithHash = stateService.users.get(email);

    if (!userWithHash) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, userWithHash.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const user: User = {
      id: userWithHash.id,
      name: userWithHash.name,
      email: userWithHash.email,
      role: userWithHash.role,
      agency: userWithHash.agency
    };

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
    const { name, email, password, role, agency } = registerSchema.parse(req.body);

    if (stateService.users.has(email)) {
      res.status(409).json({ success: false, message: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User & { passwordHash: string } = {
      id: `USR_${Date.now()}`,
      name,
      email,
      role: role as UserRole,
      agency: agency as any,
      passwordHash
    };

    stateService.users.set(email, newUser);

    const user: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      agency: newUser.agency
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

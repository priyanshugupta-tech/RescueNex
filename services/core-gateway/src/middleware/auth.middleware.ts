import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User, UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication token required.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as User;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized. Login required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' lacks sufficient privileges for this operation.`
      });
      return;
    }

    next();
  };
};

// Emergency action confirmation guard (e.g. triggering physical sirens manually)
export const requireEmergencyConfirmation = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const confirmationCode = req.headers['x-emergency-confirm'];
  if (confirmationCode !== 'CONFIRM_DISASTER_OVERRIDE') {
    res.status(400).json({
      success: false,
      message: 'Safety Guard: Manual siren activation requires header "x-emergency-confirm: CONFIRM_DISASTER_OVERRIDE".'
    });
    return;
  }
  next();
};

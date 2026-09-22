import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { runWithTenantContext } from './tenantContext.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gk_default_secret_key_2026';

export interface AuthUserPayload {
  userId: string;
  tenantId?: string;
  role: 'OWNER' | 'CASHIER' | 'SUPER_ADMIN';
  mobile: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

// 1. Rate Limiter (Protects against brute force login & sync burst crashes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 minutes
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
});

// 2. JWT Verification & Tenant Context Injection
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication token missing' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;

    // Run downstream request within the isolated tenant context
    runWithTenantContext(
      {
        tenantId: decoded.tenantId,
        userId: decoded.userId,
        role: decoded.role,
      },
      () => next()
    );
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token' });
  }
}

// 3. Role-Based Access Guard (e.g. requireRole('OWNER') or requireRole('SUPER_ADMIN'))
export function requireRole(allowedRole: 'OWNER' | 'CASHIER' | 'SUPER_ADMIN') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (allowedRole === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access forbidden: Super Admin privileges required' });
    }

    if (allowedRole === 'OWNER' && req.user.role !== 'OWNER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access forbidden: Owner role required' });
    }

    next();
  };
}

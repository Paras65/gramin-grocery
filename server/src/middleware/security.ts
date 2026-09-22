import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { runWithTenantContext } from './tenantContext.js';

const isProd = process.env.NODE_ENV === 'production';
const rawJwtSecret = process.env.JWT_SECRET;

// Fail-Closed Security Policy (SOC 2 CC6.6 / ISO 27001 A.8.24)
if (isProd && (!rawJwtSecret || rawJwtSecret === 'gk_default_secret_key_2026' || rawJwtSecret.length < 32)) {
  console.error('[CRITICAL SECURITY ERROR] Production JWT_SECRET is unset or insecure! Refusing to start.');
  process.exit(1);
}

const JWT_SECRET = rawJwtSecret || 'gk_default_secret_key_2026';

export interface AuthUserPayload {
  userId: string;
  tenantId?: string;
  role: 'OWNER' | 'CASHIER' | 'SUPER_ADMIN';
  mobile?: string;
  name?: string;
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
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 minutes
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
});

export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Strict: 5 attempts per 15 minutes for Super Admin
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'सुरक्षा अलर्ट: बहुत सारे गलत प्रयास। कृपया 15 मिनट बाद पुनः प्रयास करें (Too many admin attempts. Locked for 15 minutes).' },
});

// 2. JWT Verification & Tenant Context Injection
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication token missing' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthUserPayload;
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
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid or expired session token' });
  }
}

// 3. Role-Based Access Guard (e.g. requireRole('OWNER') or requireRole('SUPER_ADMIN'))
export function requireRole(allowedRole: 'OWNER' | 'CASHIER' | 'SUPER_ADMIN') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const { role } = req.user;

    // Super Admin inherits all operational privileges
    if (role === 'SUPER_ADMIN') {
      return next();
    }

    if (allowedRole === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access forbidden: Super Admin privileges required' });
    }

    if (allowedRole === 'OWNER' && role !== 'OWNER') {
      return res.status(403).json({ error: 'Access forbidden: Store Owner privileges required' });
    }

    if (allowedRole === 'CASHIER' && role !== 'CASHIER' && role !== 'OWNER') {
      return res.status(403).json({ error: 'Access forbidden: Cashier or Store Owner privileges required' });
    }

    next();
  };
}

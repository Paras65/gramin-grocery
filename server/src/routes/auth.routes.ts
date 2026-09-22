import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { authLimiter, requireAuth, requireRole } from '../middleware/security.js';
import { getTenantId } from '../middleware/tenantContext.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gk_default_secret_key_2026';

// Zod Validation Schemas
const RegisterStoreSchema = z.object({
  storeName: z.string().min(2),
  ownerName: z.string().min(2),
  phone: z.string().min(10).max(12),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  village: z.string().min(2),
  block: z.string().min(2),
  district: z.string().min(2),
  mohalla: z.string().optional(),
});

const LoginSchema = z.object({
  mobile: z.string().min(10),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

const CreateStaffSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10).max(12),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  role: z.enum(['OWNER', 'CASHIER']),
});

// 1. Onboard a new Village Kirana Store (Creates Tenant + Owner User)
router.post('/register-store', authLimiter, async (req: Request, res: Response) => {
  try {
    const data = RegisterStoreSchema.parse(req.body);

    // Check if phone is already registered as an owner
    const existingUser = await User.findOne({ mobile: data.phone });
    if (existingUser) {
      return res.status(400).json({ error: 'Mobile number already registered' });
    }

    // Hash 4-digit PIN
    const pinHash = await bcrypt.hash(data.pin, 10);

    // Create Store Tenant
    const tenant = await Tenant.create({
      storeName: data.storeName,
      ownerName: data.ownerName,
      phone: data.phone,
      address: {
        village: data.village,
        mohalla: data.mohalla,
        block: data.block,
        district: data.district,
        state: 'Chhattisgarh',
      },
    });

    // Create Owner User
    const user = await User.create({
      tenantId: tenant._id,
      name: data.ownerName,
      mobile: data.phone,
      pinHash,
      role: 'OWNER',
    });

    // Generate JWT token containing tenantId and role
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        tenantId: tenant._id.toString(),
        role: user.role,
        mobile: user.mobile,
      },
      JWT_SECRET,
      { expiresIn: '90d' } // Long-lived session for rural grocery counters
    );

    res.status(201).json({
      message: 'Store registered successfully',
      token,
      tenant: {
        id: tenant._id,
        storeName: tenant.storeName,
        ownerName: tenant.ownerName,
        village: tenant.address.village,
        district: tenant.address.district,
      },
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        mobile: user.mobile,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 2. Login with Mobile + 4-digit PIN
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { mobile, pin } = LoginSchema.parse(req.body);

    const user = await User.findOne({ mobile, isActive: true });
    if (!user) {
      return res.status(401).json({ error: 'Invalid mobile number or PIN' });
    }

    const isValid = await user.comparePin(pin);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid mobile number or PIN' });
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Store not found' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        tenantId: tenant._id.toString(),
        role: user.role,
        mobile: user.mobile,
      },
      JWT_SECRET,
      { expiresIn: '90d' }
    );

    res.json({
      message: 'Login successful',
      token,
      tenant: {
        id: tenant._id,
        storeName: tenant.storeName,
        ownerName: tenant.ownerName,
        village: tenant.address.village,
        district: tenant.address.district,
      },
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        mobile: user.mobile,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 3. Create Cashier/Munim Account (Owner-only)
router.post('/create-staff', requireAuth, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const data = CreateStaffSchema.parse(req.body);
    const tenantId = getTenantId();

    const existing = await User.findOne({ mobile: data.mobile });
    if (existing) {
      return res.status(400).json({ error: 'Mobile number already in use' });
    }

    const pinHash = await bcrypt.hash(data.pin, 10);
    const staff = await User.create({
      tenantId,
      name: data.name,
      mobile: data.mobile,
      pinHash,
      role: data.role,
    });

    res.status(201).json({
      message: 'Staff member added successfully',
      staff: {
        id: staff._id,
        name: staff.name,
        mobile: staff.mobile,
        role: staff.role,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;


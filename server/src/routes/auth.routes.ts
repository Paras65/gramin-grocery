import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { SecurityAuditLog } from '../models/SecurityAuditLog.js';
import { authLimiter, requireAuth, requireRole } from '../middleware/security.js';
import { getTenantId } from '../middleware/tenantContext.js';
import { extractClientIp, detectProxyHeaders, calculateRiskScore, isPrivateOrLoopbackIp } from '../utils/fraudDetection.js';

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
  referralCode: z.string().optional(),
});

const generateReferralCode = (): string => {
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `REF-${hex}`;
};

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

    // Initial 14-Day Complimentary Pro Trial
    const now = new Date();
    const trialDays = 14;
    let initialProDays = trialDays;
    let referredByCode: string | undefined = undefined;

    // Check optional referral code
    let referrerTenant: any = null;
    if (data.referralCode && data.referralCode.trim()) {
      const cleanRef = data.referralCode.trim().toUpperCase();
      referrerTenant = await Tenant.findOne({ 'referral.code': cleanRef });
      if (!referrerTenant) {
        return res.status(400).json({
          error: 'अमान्य रेफरल कोड! कृपया सही कोड जांचें या यह बॉक्स खाली छोड़ दें।',
        });
      }
      if (referrerTenant.phone === data.phone) {
        return res.status(400).json({
          error: 'आप स्वयं का रेफरल कोड उपयोग नहीं कर सकते।',
        });
      }
      referredByCode = referrerTenant.referral.code;
      initialProDays += 15; // Bonus +15 days for new store (Total 29 days!)
    }

    const planExpiryDate = new Date(now.getTime() + initialProDays * 24 * 60 * 60 * 1000);

    // Generate unique referral code for this store
    let myReferralCode = generateReferralCode();
    let collision = await Tenant.findOne({ 'referral.code': myReferralCode });
    while (collision) {
      myReferralCode = generateReferralCode();
      collision = await Tenant.findOne({ 'referral.code': myReferralCode });
    }

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
      subscription: {
        plan: 'PRO',
        status: 'ACTIVE',
        startDate: now,
        planExpiryDate,
        isTrial: true,
      },
      referral: {
        code: myReferralCode,
        referredBy: referredByCode,
        referralCount: 0,
        bonusDaysEarned: referredByCode ? 15 : 0,
      },
    });

    // If referred, credit referrer store with +15 days
    if (referrerTenant && referredByCode) {
      const bonusMs = 15 * 24 * 60 * 60 * 1000;
      const refExpiry = referrerTenant.subscription?.planExpiryDate ? new Date(referrerTenant.subscription.planExpiryDate).getTime() : 0;
      if (referrerTenant.subscription?.plan === 'PRO' && refExpiry > now.getTime()) {
        referrerTenant.subscription.planExpiryDate = new Date(refExpiry + bonusMs);
      } else {
        referrerTenant.subscription = {
          ...referrerTenant.subscription,
          plan: 'PRO',
          status: 'ACTIVE',
          startDate: now,
          planExpiryDate: new Date(now.getTime() + bonusMs),
        };
      }
      if (!referrerTenant.referral) {
        referrerTenant.referral = {
          code: generateReferralCode(),
          referralCount: 1,
          bonusDaysEarned: 15,
        };
      } else {
        referrerTenant.referral.referralCount = (referrerTenant.referral.referralCount || 0) + 1;
        referrerTenant.referral.bonusDaysEarned = (referrerTenant.referral.bonusDaysEarned || 0) + 15;
      }
      await referrerTenant.save();
    }

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
      { expiresIn: '14d' } // Bounded enterprise session window (SOC 2 / ISO 27001)
    );

    // Extract real client IP and detect proxy/bot telemetry (Edge Cases 1, 2, 4)
    const clientIp = extractClientIp(req);
    const proxyInfo = detectProxyHeaders(req);
    const isLocal = isPrivateOrLoopbackIp(clientIp);

    const ipCollisionCount = isLocal
      ? 0
      : await SecurityAuditLog.countDocuments({
          ipAddress: clientIp,
          eventType: 'STORE_REGISTRATION',
        });

    const recentRegistrations = isLocal
      ? 0
      : await SecurityAuditLog.countDocuments({
          ipAddress: clientIp,
          eventType: 'STORE_REGISTRATION',
          createdAt: { $gte: new Date(now.getTime() - 15 * 60 * 1000) },
        });

    const riskEval = calculateRiskScore({
      isProxy: proxyInfo.isProxy,
      isDatacenter: proxyInfo.isDatacenter,
      isVpnOrTor: proxyInfo.isVpnOrTor,
      ipCollisionCount,
      isRapidRegistration: recentRegistrations > 0,
    });

    // Record audit event asynchronously
    SecurityAuditLog.create({
      tenantId: tenant._id,
      storeName: tenant.storeName,
      ownerPhone: tenant.phone,
      eventType: 'STORE_REGISTRATION',
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'] || '',
      isProxy: proxyInfo.isProxy,
      proxyDetails: {
        headersDetected: proxyInfo.detectedHeaders,
        isDatacenter: proxyInfo.isDatacenter,
        isVpnOrTor: proxyInfo.isVpnOrTor,
      },
      riskScore: riskEval.riskScore,
      riskLevel: riskEval.riskLevel,
      riskReasons: riskEval.riskReasons,
      actionTaken: riskEval.riskLevel === 'FRAUD' ? 'FLAGGED' : 'NONE',
      metadata: {
        district: tenant.address.district,
        referredBy: referredByCode,
        isTrial: true,
      },
    }).catch((err) => console.error('[AUDIT ERROR] Store registration log failed:', err));

    res.status(201).json({
      message: 'Store registered successfully',
      token,
      tenant: {
        id: tenant._id,
        storeName: tenant.storeName,
        ownerName: tenant.ownerName,
        village: tenant.address.village,
        district: tenant.address.district,
        plan: tenant.subscription?.plan || 'PRO',
        planExpiryDate: tenant.subscription?.planExpiryDate,
        isTrial: tenant.subscription?.isTrial || true,
        referralCode: tenant.referral?.code,
        referralCount: tenant.referral?.referralCount || 0,
        bonusDaysEarned: tenant.referral?.bonusDaysEarned || 0,
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
      const clientIp = extractClientIp(req);
      const proxyInfo = detectProxyHeaders(req);
      SecurityAuditLog.create({
        ownerPhone: mobile,
        eventType: 'FAILED_LOGIN',
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'] || '',
        isProxy: proxyInfo.isProxy,
        proxyDetails: {
          headersDetected: proxyInfo.detectedHeaders,
          isDatacenter: proxyInfo.isDatacenter,
          isVpnOrTor: proxyInfo.isVpnOrTor,
        },
        riskScore: 25,
        riskLevel: 'SUSPICIOUS',
        riskReasons: ['पंजीकृत नहीं किए गए मोबाइल नंबर से लॉगिन का प्रयास (Unregistered Mobile Login Attempt)'],
        actionTaken: 'NONE',
      }).catch(() => {});
      return res.status(401).json({ error: 'Invalid mobile number or PIN' });
    }

    const isValid = await user.comparePin(pin);
    if (!isValid) {
      const clientIp = extractClientIp(req);
      const proxyInfo = detectProxyHeaders(req);
      const recentFailed = await SecurityAuditLog.countDocuments({
        ipAddress: clientIp,
        eventType: 'FAILED_LOGIN',
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
      });
      const riskEval = calculateRiskScore({
        isProxy: proxyInfo.isProxy,
        isDatacenter: proxyInfo.isDatacenter,
        failedLoginCount: recentFailed + 1,
      });
      SecurityAuditLog.create({
        tenantId: user.tenantId,
        ownerPhone: mobile,
        eventType: 'FAILED_LOGIN',
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'] || '',
        isProxy: proxyInfo.isProxy,
        proxyDetails: {
          headersDetected: proxyInfo.detectedHeaders,
          isDatacenter: proxyInfo.isDatacenter,
          isVpnOrTor: proxyInfo.isVpnOrTor,
        },
        riskScore: riskEval.riskScore,
        riskLevel: riskEval.riskLevel,
        riskReasons: riskEval.riskReasons,
        actionTaken: 'NONE',
      }).catch(() => {});
      return res.status(401).json({ error: 'Invalid mobile number or PIN' });
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Fail-Closed Account Suspension Guard (Edge Case 7 & 8)
    if (tenant.subscription?.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'सुरक्षा अलर्ट: यह दुकान खाता संदिग्ध गतिविधि के कारण निलंबित (Suspended) है। कृपया सहायता से संपर्क करें।',
        code: 'STORE_SUSPENDED',
      });
    }

    // Extract telemetry for successful login
    const clientIp = extractClientIp(req);
    const proxyInfo = detectProxyHeaders(req);
    const isLocal = isPrivateOrLoopbackIp(clientIp);
    const ipCollisionCount = isLocal
      ? 0
      : await SecurityAuditLog.countDocuments({
          ipAddress: clientIp,
          eventType: 'STORE_REGISTRATION',
          tenantId: { $ne: tenant._id },
        });

    const riskEval = calculateRiskScore({
      isProxy: proxyInfo.isProxy,
      isDatacenter: proxyInfo.isDatacenter,
      isVpnOrTor: proxyInfo.isVpnOrTor,
      ipCollisionCount,
    });

    SecurityAuditLog.create({
      tenantId: tenant._id,
      storeName: tenant.storeName,
      ownerPhone: user.mobile,
      eventType: 'LOGIN',
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'] || '',
      isProxy: proxyInfo.isProxy,
      proxyDetails: {
        headersDetected: proxyInfo.detectedHeaders,
        isDatacenter: proxyInfo.isDatacenter,
        isVpnOrTor: proxyInfo.isVpnOrTor,
      },
      riskScore: riskEval.riskScore,
      riskLevel: riskEval.riskLevel,
      riskReasons: riskEval.riskReasons,
      actionTaken: riskEval.riskLevel === 'FRAUD' ? 'FLAGGED' : 'NONE',
    }).catch(() => {});

    // Auto-generate referral code for existing tenants if not present
    if (!tenant.referral?.code) {
      tenant.referral = {
        code: generateReferralCode(),
        referralCount: tenant.referral?.referralCount || 0,
        bonusDaysEarned: tenant.referral?.bonusDaysEarned || 0,
      };
      await tenant.save();
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
      { expiresIn: '14d' } // Bounded enterprise session window (SOC 2 / ISO 27001)
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
        plan: tenant.subscription?.plan || 'FREE',
        planExpiryDate: tenant.subscription?.planExpiryDate,
        isTrial: tenant.subscription?.isTrial || false,
        referralCode: tenant.referral?.code,
        referralCount: tenant.referral?.referralCount || 0,
        bonusDaysEarned: tenant.referral?.bonusDaysEarned || 0,
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


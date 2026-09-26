import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole } from '../middleware/security.js';
import { getTenantId } from '../middleware/tenantContext.js';
import { Tenant } from '../models/Tenant.js';
import { Customer } from '../models/Customer.js';
import { Sale } from '../models/Sale.js';
import { Announcement } from '../models/Announcement.js';
import { PaymentClaim } from '../models/PaymentClaim.js';
import { Voucher } from '../models/Voucher.js';
import { SecurityAuditLog } from '../models/SecurityAuditLog.js';
import { extractClientIp, detectProxyHeaders, calculateRiskScore } from '../utils/fraudDetection.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gk_default_secret_key_2026';

// 1. Get Store Profile & Configuration
router.get('/profile', requireAuth, async (_req: Request, res: Response) => {
  try {
    const tenantId = getTenantId();
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      id: tenant._id,
      storeName: tenant.storeName,
      ownerName: tenant.ownerName,
      phone: tenant.phone,
      address: tenant.address,
      settings: tenant.settings,
      subscription: tenant.subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. High-Speed Store Metrics & Regional Debt Summary
router.get('/stats', requireAuth, async (_req: Request, res: Response) => {
  try {
    const tenantId = getTenantId();

    const customers = await Customer.find({ tenantId, isDeleted: false }).lean();
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);
    const kharifDhanDebt = customers
      .filter((c) => c.dueReason === 'KHARIF_DHAN')
      .reduce((sum, c) => sum + (c.balanceDue || 0), 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySales = await Sale.find({
      tenantId,
      timestamp: { $gte: startOfToday },
    }).lean();

    const todaySalesTotal = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    res.json({
      totalCustomers: customers.length,
      totalOutstanding,
      kharifDhanDebt,
      todaySalesCount: todaySales.length,
      todaySalesTotal,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Settings (Owner-only)
router.put('/settings', requireAuth, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId();
    const { storeName, language, harvestCycles, lowStockThresholdDefault } = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      {
        $set: {
          ...(storeName && { storeName }),
          ...(language && { 'settings.language': language }),
          ...(harvestCycles && { 'settings.harvestCycles': harvestCycles }),
          ...(lowStockThresholdDefault && { 'settings.lowStockThresholdDefault': lowStockThresholdDefault }),
        },
      },
      { new: true }
    );

    res.json({ message: 'Settings updated', settings: tenant?.settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3B. Get Store Referral Information and Stats
router.get('/referral-stats', requireAuth, async (_req: Request, res: Response) => {
  try {
    const tenantId = getTenantId();
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Auto-generate referral code if not present
    if (!tenant.referral?.code) {
      const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
      tenant.referral = {
        code: `REF-${hex}`,
        referralCount: 0,
        bonusDaysEarned: 0,
      };
      await tenant.save();
    }

    res.json({
      referralCode: tenant.referral.code,
      referralCount: tenant.referral.referralCount || 0,
      bonusDaysEarned: tenant.referral.bonusDaysEarned || 0,
      isTrial: tenant.subscription?.isTrial || false,
      plan: tenant.subscription?.plan || 'FREE',
      planExpiryDate: tenant.subscription?.planExpiryDate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 4. Get Active Announcement for Current Store (All or Targeted)
router.get('/announcement/active', async (req: Request, res: Response) => {
  try {
    let tenantId: string | null = null;
    let storeDistrict: string = 'ALL';
    let storePlan: string = 'FREE';

    // If request has auth token, resolve tenant context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded?.tenantId) {
          tenantId = decoded.tenantId;
          const store = await Tenant.findById(tenantId).select('address.district subscription.plan').lean();
          if (store) {
            storeDistrict = store.address?.district || 'ALL';
            storePlan = store.subscription?.plan || 'FREE';
          }
        }
      } catch (_) {
        // Fall back gracefully to public broadcast if invalid token
      }
    }

    const now = new Date();

    // Query active, non-expired announcements
    const query: any = {
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    };

    if (tenantId) {
      // Store is logged in: can receive universal announcements OR targeted selected announcements
      query.$and = [
        {
          $or: [
            { targetMode: 'ALL' },
            { targetMode: 'SELECTED', targetStoreIds: tenantId },
          ],
        },
        {
          $or: [
            { targetPlan: 'ALL' },
            { targetPlan: storePlan },
          ],
        },
        {
          $or: [
            { targetDistrict: 'ALL' },
            { targetDistrict: storeDistrict },
          ],
        },
      ];
    } else {
      // Unauthenticated store/demo: only universal ALL broadcasts
      query.targetMode = 'ALL';
      query.targetPlan = 'ALL';
      query.targetDistrict = 'ALL';
    }

    const announcement = await Announcement.findOne(query)
      .sort({ createdAt: -1 })
      .select('title message type targetMode createdAt expiresAt')
      .lean();

    res.json({ announcement: announcement || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Submit UPI Payment UTR Claim for Pro Upgrade
router.post('/subscription/claim', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId();
    if (!tenantId) {
      return res.status(401).json({ error: 'अनधिकृत सत्र (Unauthorized store session)' });
    }

    const { utrNumber, amount, planDurationMonths = 1 } = req.body;
    const cleanUtr = (utrNumber || '').toString().trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();

    if (!cleanUtr || cleanUtr.length < 10 || cleanUtr.length > 18) {
      return res.status(400).json({
        error: 'अमान्य UTR नंबर: कृपया बैंक SMS या UPI ऐप से 12-अंकों का सही UTR/रेफरेंस नंबर दर्ज करें।',
      });
    }

    // Edge Case 1: Strict Plan Duration & Amount Matrix Validation
    const duration = Number(planDurationMonths);
    const VALID_TIERS: Record<number, number> = {
      1: 99,
      3: 269,
      12: 999,
    };

    if (!VALID_TIERS[duration]) {
      return res.status(400).json({
        error: 'अमान्य योजना अवधि: केवल 1 महीना, 3 महीने या 1 वर्ष का चुनाव मान्य है।',
      });
    }

    const expectedAmount = VALID_TIERS[duration];
    if (Number(amount) !== expectedAmount) {
      return res.status(400).json({
        error: `अमान्य भुगतान राशि: ${duration} माह के लिए निर्धारित शुल्क ₹${expectedAmount} है।`,
      });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found)' });
    }

    // Check if this UTR is already approved for any store
    const alreadyApproved = await PaymentClaim.findOne({ utrNumber: cleanUtr, status: 'APPROVED' });
    if (alreadyApproved) {
      const clientIp = extractClientIp(req);
      const proxyInfo = detectProxyHeaders(req);
      SecurityAuditLog.create({
        tenantId: tenant._id,
        storeName: tenant.storeName,
        ownerPhone: tenant.phone,
        eventType: 'PAYMENT_CLAIM',
        ipAddress: clientIp,
        userAgent: req.headers['user-agent'] || '',
        isProxy: proxyInfo.isProxy,
        proxyDetails: {
          headersDetected: proxyInfo.detectedHeaders,
          isDatacenter: proxyInfo.isDatacenter,
          isVpnOrTor: proxyInfo.isVpnOrTor,
        },
        riskScore: 90,
        riskLevel: 'FRAUD',
        riskReasons: [`स्वीकृत UTR (${cleanUtr}) को पुनः सबमिट करने का प्रयास (Attempted Claim on Already Approved UTR)`],
        actionTaken: 'FLAGGED',
        metadata: { utrNumber: cleanUtr, amount: expectedAmount },
      }).catch(() => {});

      return res.status(400).json({
        error: 'यह UTR नंबर पहले से ही सत्यापित और स्वीकृत हो चुका है।',
      });
    }

    // Edge Case 2: Cross-Store Collision Guard on Pending Claims (Edge Case 5)
    const existingPending = await PaymentClaim.findOne({ utrNumber: cleanUtr, status: 'PENDING' });
    if (existingPending) {
      if (existingPending.tenantId.toString() === tenantId.toString()) {
        return res.json({
          message: 'इस UTR के लिए क्लेम पहले से सबमिट है और समीक्षाधीन है।',
          claim: existingPending,
        });
      } else {
        const clientIp = extractClientIp(req);
        const proxyInfo = detectProxyHeaders(req);
        SecurityAuditLog.create({
          tenantId: tenant._id,
          storeName: tenant.storeName,
          ownerPhone: tenant.phone,
          eventType: 'PAYMENT_CLAIM',
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] || '',
          isProxy: proxyInfo.isProxy,
          proxyDetails: {
            headersDetected: proxyInfo.detectedHeaders,
            isDatacenter: proxyInfo.isDatacenter,
            isVpnOrTor: proxyInfo.isVpnOrTor,
          },
          riskScore: 95,
          riskLevel: 'FRAUD',
          riskReasons: [`अन्य स्टोर का समीक्षाधीन UTR (${cleanUtr}) सबमिट करने का प्रयास (Cross-Store Duplicate UTR Theft)`],
          actionTaken: 'FLAGGED',
          metadata: { utrNumber: cleanUtr, originalStoreId: existingPending.tenantId.toString() },
        }).catch(() => {});

        return res.status(400).json({
          error: 'यह UTR नंबर पहले से किसी अन्य अनुरोध में समीक्षाधीन है। यदि यह आपका वैध UTR है तो कृपया हेल्पलाइन से संपर्क करें।',
        });
      }
    }

    // Edge Case 3: Re-submission after previous rejection
    let claim = await PaymentClaim.findOne({ tenantId, utrNumber: cleanUtr, status: 'REJECTED' });
    if (claim) {
      claim.amount = expectedAmount;
      claim.planDurationMonths = duration;
      claim.status = 'PENDING';
      claim.rejectionReason = undefined;
      await claim.save();

      return res.status(200).json({
        message: 'संशोधित भुगतान क्लेम पुनः समीक्षा हेतु सफलतापूर्वक सबमिट हो गया है।',
        claim,
      });
    }

    // Create fresh claim
    claim = await PaymentClaim.create({
      tenantId: tenant._id,
      storeName: tenant.storeName,
      ownerName: tenant.ownerName,
      phone: tenant.phone,
      amount: expectedAmount,
      planDurationMonths: duration,
      utrNumber: cleanUtr,
      status: 'PENDING',
    });

    // Record audit telemetry
    const clientIp = extractClientIp(req);
    const proxyInfo = detectProxyHeaders(req);
    const riskEval = calculateRiskScore({
      isProxy: proxyInfo.isProxy,
      isDatacenter: proxyInfo.isDatacenter,
      isVpnOrTor: proxyInfo.isVpnOrTor,
    });
    SecurityAuditLog.create({
      tenantId: tenant._id,
      storeName: tenant.storeName,
      ownerPhone: tenant.phone,
      eventType: 'PAYMENT_CLAIM',
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
      metadata: { utrNumber: cleanUtr, amount: expectedAmount, planDurationMonths: duration },
    }).catch(() => {});

    res.status(201).json({
      message: 'भुगतान UTR सफलतापूर्वक दर्ज किया गया। सत्यापन होते ही प्रो प्लान स्वतः सक्रिय हो जाएगा।',
      claim,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get Current Store Payment Claim Status
router.get('/subscription/claim', requireAuth, async (_req: Request, res: Response) => {
  try {
    const tenantId = getTenantId();
    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const claim = await PaymentClaim.findOne({ tenantId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ claim: claim || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get Platform UPI Gateway Public Configuration (Safe, Server-Enforced)
router.get('/subscription/config', async (_req: Request, res: Response) => {
  try {
    const rawUpiId = (process.env.PLATFORM_UPI_ID || '').trim();
    const upiName = (process.env.PLATFORM_UPI_NAME || 'Gramin Kirana').trim();

    // Valid VPA check: non-empty, standard format, not dummy/placeholder
    const isValidFormat = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(rawUpiId);
    const isDummyPlaceholder = ['graminkirana@upi', 'yourname@okaxis', 'test@upi', 'admin@upi'].includes(rawUpiId.toLowerCase());
    const isConfigured = Boolean(rawUpiId && isValidFormat && !isDummyPlaceholder);

    const rawWhatsApp = (process.env.PLATFORM_SUPPORT_WHATSAPP || '').replace(/[^0-9]/g, '');
    const supportWhatsApp = rawWhatsApp.length === 10 ? `91${rawWhatsApp}` : (rawWhatsApp.length > 10 ? rawWhatsApp : null);

    res.json({
      isConfigured,
      upiId: isConfigured ? rawUpiId : null,
      upiName: isConfigured ? upiName : null,
      supportWhatsApp,
      pricing: {
        1: { months: 1, price: 99, label: '1 महीना', rate: '₹99/माह' },
        3: { months: 3, price: 269, label: '3 महीने', rate: '₹89/माह', discount: '10% बचत' },
        12: { months: 12, price: 999, label: '1 वर्ष (12 माह)', rate: '₹83/माह', discount: '16% भारी छूट' },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Redeem Single-Use Voucher Code for Pro Activation
router.post('/subscription/voucher/redeem', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId();
    if (!tenantId) {
      return res.status(401).json({ error: 'अनधिकृत सत्र (Unauthorized store session)' });
    }

    const { code } = req.body;
    const cleanCode = (code || '').toString().trim().toUpperCase().replace(/\s+/g, '');

    if (!cleanCode || cleanCode.length < 6) {
      return res.status(400).json({
        error: 'अमान्य कूपन कोड: कृपया सही 6 या 8 अंकों का वाउचर कोड दर्ज करें।',
      });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found)' });
    }

    // Atomic find and update to prevent race conditions / duplicate redemption
    const voucher = await Voucher.findOneAndUpdate(
      { code: cleanCode, isRedeemed: false },
      {
        $set: {
          isRedeemed: true,
          redeemedByTenantId: tenant._id,
          redeemedByStoreName: tenant.storeName,
          redeemedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!voucher) {
      // Check if it was already redeemed
      const existingRedeemed = await Voucher.findOne({ code: cleanCode });
      if (existingRedeemed) {
        const storeLabel = existingRedeemed.redeemedByStoreName ? ` (${existingRedeemed.redeemedByStoreName})` : '';
        return res.status(400).json({
          error: `यह कूपन कोड पहले ही इस्तेमाल किया जा चुका है${storeLabel}। एक कूपन केवल एक बार ही मान्य होता है।`,
        });
      }
      return res.status(400).json({
        error: 'अमान्य कूपन कोड! यह कोड मान्य नहीं है। कृपया सुपर एडमिन या WhatsApp सहायता से प्राप्त आधिकारिक वाउचर कोड ही दर्ज करें।',
      });
    }

    // Check expiration if any
    if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        error: 'यह कूपन कोड समाप्त (Expired) हो चुका है।',
      });
    }

    const months = voucher.durationMonths || 1;
    const durationMs = months * 30 * 86400000;
    const now = Date.now();

    // Safe Plan Stacking: if already active Pro, stack days onto existing expiry
    const currentExpiryTime = tenant.subscription?.planExpiryDate
      ? new Date(tenant.subscription.planExpiryDate).getTime()
      : 0;

    let newExpiryDate: Date;
    if (
      tenant.subscription?.plan === 'PRO' &&
      !isNaN(currentExpiryTime) &&
      currentExpiryTime > now
    ) {
      newExpiryDate = new Date(currentExpiryTime + durationMs);
    } else {
      newExpiryDate = new Date(now + durationMs);
    }

    tenant.subscription = {
      plan: 'PRO',
      status: 'ACTIVE',
      planExpiryDate: newExpiryDate,
      startDate: tenant.subscription?.startDate || new Date(),
    };
    await tenant.save();

    res.json({
      success: true,
      message: `बधाई! वाउचर कोड सत्यापित हो गया। '${tenant.storeName}' के लिए ग्रामिन प्रो (${months * 30} दिन) सक्रिय हो गया है।`,
      subscription: tenant.subscription,
      days: months * 30,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { Transaction } from '../models/Transaction.js';
import { SpoilageLog } from '../models/SpoilageLog.js';
import { Announcement } from '../models/Announcement.js';
import { PaymentClaim } from '../models/PaymentClaim.js';
import { Voucher } from '../models/Voucher.js';
import { SecurityAuditLog } from '../models/SecurityAuditLog.js';
import { adminAuthLimiter, requireAuth, requireRole, markTenantSuspended, markTenantUnsuspended } from '../middleware/security.js';
import { runWithTenantContext } from '../middleware/tenantContext.js';
import { isPrivateOrLoopbackIp } from '../utils/fraudDetection.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gk_default_secret_key_2026';

const AdminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// 1. Super Admin Login with Strict Hardening
router.post('/login', adminAuthLimiter, async (req: Request, res: Response) => {
  try {
    const { password } = AdminLoginSchema.parse(req.body);

    const isProd = process.env.NODE_ENV === 'production';
    const rawEnvPassword = process.env.ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;

    // Hardening 1: Fail-closed production enforcement
    if (isProd && (!rawEnvPassword || rawEnvPassword.trim() === 'gramin_admin_2026' || rawEnvPassword.trim().length < 8)) {
      console.error('[SECURITY WARNING] Production ADMIN_PASSWORD is missing or using insecure default.');
      return res.status(503).json({
        error: 'सर्वर सुरक्षा अलर्ट: उत्पादन परिवेश में एडमिन पासवर्ड सुरक्षित रूप से कॉन्फ़िगर नहीं है (Production admin password missing/insecure).'
      });
    }

    const configuredPassword = (rawEnvPassword || 'gramin_admin_2026').trim();

    // Hardening 2: Timing-Safe Constant-Time comparison via SHA-256 digest
    const inputHash = crypto.createHash('sha256').update(password.trim()).digest();
    const expectedHash = crypto.createHash('sha256').update(configuredPassword).digest();

    if (!crypto.timingSafeEqual(inputHash, expectedHash)) {
      return res.status(401).json({ error: 'अमान्य एडमिन सुरक्षा पासवर्ड (Invalid Admin Password)' });
    }

    const adminUserId = 'super_admin_master';
    const adminName = 'Platform Super Admin';

    // Hardening 3: Short 8-hour session lifetime
    const token = jwt.sign(
      {
        userId: adminUserId,
        role: 'SUPER_ADMIN',
        name: adminName,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Super Admin authentication successful',
      token,
      user: {
        id: adminUserId,
        role: 'SUPER_ADMIN',
        name: adminName,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'कृपया सुरक्षा पासवर्ड दर्ज करें।' });
    }
    res.status(500).json({ error: 'एडमिन लॉगिन में त्रुटि: ' + error.message });
  }
});

// 2. Platform-Wide Key Performance Metrics & Statistics
router.get('/overview', requireAuth, requireRole('SUPER_ADMIN'), async (_req: Request, res: Response) => {
  return runWithTenantContext({ role: 'SUPER_ADMIN' }, async () => {
    try {
      const [
        totalStores,
        proStores,
        freeStores,
        totalCustomers,
        totalProducts,
        salesAgg,
        debtAgg,
        districtBreakdown,
        recentStores
      ] = await Promise.all([
        Tenant.countDocuments(),
        Tenant.countDocuments({ 'subscription.plan': 'PRO', 'subscription.status': 'ACTIVE' }),
        Tenant.countDocuments({ 'subscription.plan': 'FREE' }),
        Customer.countDocuments({ isDeleted: false }).setOptions({ bypassTenantCheck: true }),
        Product.countDocuments({ isDeleted: false }).setOptions({ bypassTenantCheck: true }),
        Sale.aggregate([
          { $group: { _id: null, totalSalesAmount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        Customer.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: null, totalBalanceDue: { $sum: '$balanceDue' } } }
        ]),
        Tenant.aggregate([
          { $group: { _id: '$address.district', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Tenant.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('storeName ownerName phone address subscription createdAt')
          .lean()
      ]);

      const totalGMV = salesAgg[0]?.totalSalesAmount || 0;
      const totalSalesCount = salesAgg[0]?.count || 0;
      const totalVillageDebt = debtAgg[0]?.totalBalanceDue || 0;

      res.json({
        metrics: {
          totalStores,
          proStores,
          freeStores,
          totalCustomers,
          totalProducts,
          totalGMV: Math.round(totalGMV * 100) / 100,
          totalSalesCount,
          totalVillageDebt: Math.round(totalVillageDebt * 100) / 100,
        },
        districtBreakdown: districtBreakdown.map(d => ({
          district: d._id || 'अन्य (Other)',
          storesCount: d.count,
        })),
        recentStores,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// 3. Searchable Stores Registry with Per-Store Summaries
router.get('/stores', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  return runWithTenantContext({ role: 'SUPER_ADMIN' }, async () => {
    try {
      const { search = '', plan = 'ALL', district = 'ALL' } = req.query;

      const filter: any = {};

      if (search) {
        const q = String(search).trim();
        filter.$or = [
          { storeName: { $regex: q, $options: 'i' } },
          { ownerName: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
          { 'address.village': { $regex: q, $options: 'i' } },
          { 'address.district': { $regex: q, $options: 'i' } },
        ];
      }

      if (plan !== 'ALL' && (plan === 'FREE' || plan === 'PRO')) {
        filter['subscription.plan'] = plan;
      }

      if (district !== 'ALL') {
        filter['address.district'] = String(district);
      }

      const tenants = await Tenant.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      if (!tenants || tenants.length === 0) {
        return res.json({ stores: [] });
      }

      const tenantIds = tenants.map((t) => t._id);

      // Batch aggregations to eliminate N+1 database queries (Scalability & High Load Guard)
      const [customersAgg, productsAgg, salesAgg, spoilageAgg, ownerUsers, latestClaims] = await Promise.all([
        Customer.aggregate([
          { $match: { tenantId: { $in: tenantIds }, isDeleted: false } },
          { $group: { _id: '$tenantId', customerCount: { $sum: 1 }, totalDebt: { $sum: '$balanceDue' } } }
        ]),
        Product.aggregate([
          { $match: { tenantId: { $in: tenantIds }, isDeleted: false } },
          { $group: { _id: '$tenantId', productCount: { $sum: 1 } } }
        ]),
        Sale.aggregate([
          { $match: { tenantId: { $in: tenantIds } } },
          { $group: { _id: '$tenantId', salesCount: { $sum: 1 } } }
        ]),
        SpoilageLog.aggregate([
          { $match: { tenantId: { $in: tenantIds } } },
          { $group: { _id: '$tenantId', spoilageCount: { $sum: 1 } } }
        ]),
        User.find({ tenantId: { $in: tenantIds }, role: 'OWNER' })
          .select('tenantId isActive lastLoginAt')
          .lean(),
        PaymentClaim.aggregate([
          { $match: { tenantId: { $in: tenantIds } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$tenantId',
              utrNumber: { $first: '$utrNumber' },
              amount: { $first: '$amount' },
              status: { $first: '$status' },
              planDurationMonths: { $first: '$planDurationMonths' },
              createdAt: { $first: '$createdAt' },
              rejectionReason: { $first: '$rejectionReason' },
            }
          }
        ])
      ]);

      const customerMap = new Map(customersAgg.map((c) => [String(c._id), c]));
      const productMap = new Map(productsAgg.map((p) => [String(p._id), p]));
      const salesMap = new Map(salesAgg.map((s) => [String(s._id), s]));
      const spoilageMap = new Map(spoilageAgg.map((sp) => [String(sp._id), sp]));
      const userMap = new Map(ownerUsers.map((u) => [String(u.tenantId), u]));
      const claimMap = new Map(latestClaims.map((cl) => [String(cl._id), cl]));

      const now = Date.now();

      // Synchronous O(1) enrichment across all matching stores
      const enrichedStores = tenants.map((t) => {
        const tid = String(t._id);
        const cData = customerMap.get(tid);
        const pData = productMap.get(tid);
        const sData = salesMap.get(tid);
        const spData = spoilageMap.get(tid);
        const uData = userMap.get(tid);
        const latestClaim = claimMap.get(tid);

        const customerCount = cData?.customerCount || 0;
        const productCount = pData?.productCount || 0;
        const salesCount = sData?.salesCount || 0;
        const spoilageCount = spData?.spoilageCount || 0;
        const totalDebt = cData?.totalDebt || 0;

        const estimatedStorageKb = Math.round(
          productCount * 0.8 +
          customerCount * 0.6 +
          salesCount * 1.5 +
          spoilageCount * 0.5
        );

        let daysRemaining = 0;
        let isExpired = false;

        if (t.subscription?.plan === 'PRO') {
          if (t.subscription?.status === 'PAUSED') {
            daysRemaining = Number(t.subscription.remainingDaysOnPause) || 0;
          } else if (t.subscription?.planExpiryDate) {
            const diffMs = new Date(t.subscription.planExpiryDate).getTime() - now;
            daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));
            isExpired = diffMs <= 0;
          }
        }

        return {
          id: t._id,
          storeName: t.storeName,
          ownerName: t.ownerName,
          phone: t.phone,
          address: t.address,
          subscription: {
            ...t.subscription,
            startDate: t.subscription?.startDate || t.createdAt,
            daysRemaining,
            isExpired,
            isTrial: !!t.subscription?.isTrial,
          },
          referral: t.referral || {
            code: '',
            referralCount: 0,
            bonusDaysEarned: 0,
          },
          latestClaim: latestClaim ? {
            utrNumber: latestClaim.utrNumber,
            amount: latestClaim.amount,
            status: latestClaim.status,
            planDurationMonths: latestClaim.planDurationMonths,
            createdAt: latestClaim.createdAt,
            rejectionReason: latestClaim.rejectionReason,
          } : null,
          customerCount,
          productCount,
          salesCount,
          spoilageCount,
          storageKb: estimatedStorageKb,
          featureOverrides: t.featureOverrides || {},
          quotaOverrides: t.quotaOverrides || {},
          totalDebt,
          isActive: uData ? uData.isActive : true,
          lastLoginAt: uData?.lastLoginAt,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      });

      res.json({ stores: enrichedStores });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// 4. Update Store Subscription Plan & Status (1-Click Pro Upgrade)
router.patch('/stores/:id/subscription', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { plan, status, durationMonths } = req.body;

    if (!['FREE', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan: must be FREE or PRO' });
    }

    let planExpiryDate: Date | undefined;
    const existingTenant = await Tenant.findById(id);
    if (!existingTenant) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const now = Date.now();
    let startDate = existingTenant.subscription?.startDate;

    if (plan === 'PRO') {
      if (!startDate) startDate = new Date();
      const months = Number(durationMonths) || 1;
      const durationMs = months * 30 * 86400000;
      if (
        existingTenant.subscription?.plan === 'PRO' &&
        existingTenant.subscription?.planExpiryDate &&
        new Date(existingTenant.subscription.planExpiryDate).getTime() > now
      ) {
        planExpiryDate = new Date(new Date(existingTenant.subscription.planExpiryDate).getTime() + durationMs);
      } else {
        planExpiryDate = new Date(now + durationMs);
      }
    }

    existingTenant.subscription.plan = plan;
    existingTenant.subscription.status = status || 'ACTIVE';
    if (planExpiryDate) existingTenant.subscription.planExpiryDate = planExpiryDate;
    if (startDate) existingTenant.subscription.startDate = startDate;
    if (plan === 'PRO' && status === 'ACTIVE') {
      existingTenant.subscription.pausedAt = undefined;
      existingTenant.subscription.remainingDaysOnPause = undefined;
    }

    await existingTenant.save();

    res.json({
      message: `Store subscription updated to ${plan} (${existingTenant.subscription.status})`,
      subscription: existingTenant.subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4b. Pause or Resume Store Pro Subscription (Zero-Day-Loss Pro Freeze)
router.patch('/stores/:id/subscription/pause-resume', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, pauseReason } = req.body; // action: 'PAUSE' | 'RESUME'

    if (!['PAUSE', 'RESUME'].includes(action)) {
      return res.status(400).json({ error: 'Action must be PAUSE or RESUME' });
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Store not found' });
    }

    if (tenant.subscription?.plan !== 'PRO') {
      return res.status(400).json({ error: 'केवल प्रो (PRO) स्टोर का सब्सक्रिप्शन रोका या चालू किया जा सकता है।' });
    }

    const now = Date.now();

    if (action === 'PAUSE') {
      if (tenant.subscription.status === 'PAUSED') {
        return res.status(400).json({ error: 'स्टोर का प्रो सब्सक्रिप्शन पहले से ही रुका हुआ है।' });
      }

      // Calculate remaining days
      let remainingDays = 0;
      if (tenant.subscription.planExpiryDate) {
        const diffMs = new Date(tenant.subscription.planExpiryDate).getTime() - now;
        remainingDays = Math.max(0, Math.ceil(diffMs / 86400000));
      }

      tenant.subscription.status = 'PAUSED';
      tenant.subscription.pausedAt = new Date();
      tenant.subscription.remainingDaysOnPause = remainingDays;
      if (pauseReason) tenant.subscription.pauseReason = String(pauseReason).trim();

      await tenant.save();

      return res.json({
        message: `'${tenant.storeName}' का प्रो प्लान रोका गया (${remainingDays} दिन फ्रीज/सुरक्षित)।`,
        subscription: tenant.subscription,
        daysRemaining: remainingDays,
      });
    } else {
      // RESUME
      if (tenant.subscription.status === 'ACTIVE') {
        return res.status(400).json({ error: 'स्टोर का प्रो प्लान पहले से सक्रिय है।' });
      }

      const preservedDays = Number(tenant.subscription.remainingDaysOnPause) || 0;
      if (preservedDays <= 0) {
        tenant.subscription.status = 'EXPIRED';
        tenant.subscription.pausedAt = undefined;
        tenant.subscription.remainingDaysOnPause = 0;
        await tenant.save();
        return res.status(400).json({ error: 'स्टोर के पास कोई शेष प्रो दिन नहीं हैं। कृपया नया प्लान सक्रिय करें।' });
      }

      // Project expiry forward from now
      const newExpiry = new Date(now + preservedDays * 86400000);
      tenant.subscription.status = 'ACTIVE';
      tenant.subscription.planExpiryDate = newExpiry;
      tenant.subscription.pausedAt = undefined;
      tenant.subscription.remainingDaysOnPause = undefined;
      tenant.subscription.pauseReason = undefined;

      await tenant.save();

      return res.json({
        message: `'${tenant.storeName}' का प्रो प्लान पुनः सक्रिय हुआ (वैधता: ${newExpiry.toLocaleDateString('hi-IN')})।`,
        subscription: tenant.subscription,
        daysRemaining: preservedDays,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4c. Bulk Subscription Control (Pause/Resume All Pro Stores)
router.post('/stores/bulk-subscription-control', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { action, pauseReason } = req.body; // 'PAUSE_ALL' | 'RESUME_ALL'

    if (!['PAUSE_ALL', 'RESUME_ALL'].includes(action)) {
      return res.status(400).json({ error: 'Action must be PAUSE_ALL or RESUME_ALL' });
    }

    const now = Date.now();
    let updatedCount = 0;

    if (action === 'PAUSE_ALL') {
      const activeProStores = await Tenant.find({
        'subscription.plan': 'PRO',
        'subscription.status': 'ACTIVE',
      });

      for (const t of activeProStores) {
        let remainingDays = 0;
        if (t.subscription.planExpiryDate) {
          const diffMs = new Date(t.subscription.planExpiryDate).getTime() - now;
          remainingDays = Math.max(0, Math.ceil(diffMs / 86400000));
        }
        t.subscription.status = 'PAUSED';
        t.subscription.pausedAt = new Date();
        t.subscription.remainingDaysOnPause = remainingDays;
        if (pauseReason) t.subscription.pauseReason = String(pauseReason).trim();
        await t.save();
        updatedCount++;
      }

      return res.json({
        message: `सफलतापूर्वक ${updatedCount} प्रो स्टोरों का प्लान रोका गया (दिन सुरक्षित फ्रीज)।`,
        updatedCount,
      });
    } else {
      // RESUME_ALL
      const pausedProStores = await Tenant.find({
        'subscription.plan': 'PRO',
        'subscription.status': 'PAUSED',
      });

      for (const t of pausedProStores) {
        const preservedDays = Number(t.subscription.remainingDaysOnPause) || 0;
        if (preservedDays > 0) {
          t.subscription.status = 'ACTIVE';
          t.subscription.planExpiryDate = new Date(now + preservedDays * 86400000);
          t.subscription.pausedAt = undefined;
          t.subscription.remainingDaysOnPause = undefined;
          t.subscription.pauseReason = undefined;
          await t.save();
          updatedCount++;
        } else {
          t.subscription.status = 'EXPIRED';
          await t.save();
        }
      }

      return res.json({
        message: `सफलतापूर्वक ${updatedCount} प्रो स्टोरों का प्लान पुनः सक्रिय किया गया।`,
        updatedCount,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4d. Bulk Store Status Control (Activate All / Suspend All Stores)
router.post('/stores/bulk-status-control', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { action } = req.body; // 'ACTIVATE_ALL' | 'SUSPEND_ALL'

    if (!['ACTIVATE_ALL', 'SUSPEND_ALL'].includes(action)) {
      return res.status(400).json({ error: 'Action must be ACTIVATE_ALL or SUSPEND_ALL' });
    }

    const isActive = action === 'ACTIVATE_ALL';
    const result = await User.updateMany(
      { role: 'OWNER' },
      { $set: { isActive } }
    );

    return res.json({
      message: isActive
        ? `सभी स्टोर खाते (${result.modifiedCount}) पुनः सक्रिय किए गए।`
        : `सभी स्टोर खाते (${result.modifiedCount}) निलंबित किए गए।`,
      modifiedCount: result.modifiedCount,
      isActive,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Suspend or Re-activate Store Account
router.patch('/stores/:id/status', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found).' });
    }

    if (isActive) {
      tenant.subscription.status = 'ACTIVE';
      markTenantUnsuspended(id);
    } else {
      tenant.subscription.status = 'SUSPENDED';
      markTenantSuspended(id);
    }
    await tenant.save();

    await User.updateMany(
      { tenantId: id },
      { $set: { isActive } }
    );

    // Audit administrative security action
    SecurityAuditLog.create({
      tenantId: tenant._id,
      storeName: tenant.storeName,
      ownerPhone: tenant.phone,
      eventType: 'ADMIN_ACTION',
      ipAddress: '127.0.0.1',
      isProxy: false,
      riskScore: 0,
      riskLevel: 'SAFE',
      riskReasons: [isActive ? 'सुपर एडमिन द्वारा स्टोर पुनः सक्रिय किया गया' : 'सुपर एडमिन द्वारा स्टोर निलंबित किया गया'],
      actionTaken: isActive ? 'NONE' : 'SUSPENDED',
      metadata: { reason: reason || 'Admin status update', performedBy: (req as any).user?.name || 'SUPER_ADMIN' },
    }).catch(() => {});

    res.json({
      message: isActive ? 'दुकान खाता पुनः सक्रिय किया गया (Store re-activated)' : 'दुकान खाता निलंबित किया गया (Store suspended)',
      isActive,
      status: tenant.subscription.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Reset Merchant 4-Digit Secret PIN
router.post('/stores/:id/reset-pin', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPin } = req.body;

    if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin.trim())) {
      return res.status(400).json({ error: 'PIN 4 अंकों की संख्या होनी चाहिए (PIN must be 4 digits).' });
    }

    const pinHash = await bcrypt.hash(newPin.trim(), 10);

    const updatedUser = await User.findOneAndUpdate(
      { tenantId: id, role: 'OWNER' },
      { $set: { pinHash, updatedAt: new Date() } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'दुकानदार खाता नहीं मिला (Store owner not found).' });
    }

    res.json({
      message: 'दुकानदार का PIN सफलतापूर्वक रीसेट कर दिया गया (Store owner PIN reset successfully).',
      storeId: id,
      success: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Safe Store Deletion (Purge Test / Inactive Store Records)
router.delete('/stores/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found).' });
    }

    // Cascade delete tenant records
    await Promise.all([
      Tenant.findByIdAndDelete(id),
      User.deleteMany({ tenantId: id }),
      Customer.deleteMany({ tenantId: id }),
      Sale.deleteMany({ tenantId: id }),
      Product.deleteMany({ tenantId: id }),
      Transaction.deleteMany({ tenantId: id }),
      SpoilageLog.deleteMany({ tenantId: id }),
    ]);

    res.json({
      message: `'${tenant.storeName}' और उसका समस्त डेटा सफलतापूर्वक हटा दिया गया (Store deleted successfully).`,
      deletedStoreId: id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. List All Platform Announcements
router.get('/announcements', requireAuth, requireRole('SUPER_ADMIN'), async (_req: Request, res: Response) => {
  try {
    const announcements = await Announcement.find()
      .populate('targetStoreIds', 'storeName ownerName phone address.district')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ announcements });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Create New Platform Announcement (All or Selected Stores)
router.post('/announcements', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const {
      title,
      message,
      type = 'INFO',
      targetMode = 'ALL',
      targetStoreIds = [],
      targetPlan = 'ALL',
      targetDistrict = 'ALL',
      durationDays = 7,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'शीर्षक और संदेश अनिवार्य हैं (Title and message are required).' });
    }

    let expiresAt: Date | undefined;
    if (durationDays && Number(durationDays) > 0) {
      expiresAt = new Date(Date.now() + Number(durationDays) * 86400000);
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      type,
      targetMode,
      targetStoreIds: targetMode === 'SELECTED' ? targetStoreIds : [],
      targetPlan,
      targetDistrict,
      expiresAt,
      createdBy: (req as any).user?.name || 'SUPER_ADMIN',
    });

    res.status(201).json({
      message: 'घोषणा सफलतापूर्वक प्रसारित की गई (Announcement broadcasted successfully)',
      announcement,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Toggle Announcement Status (Active / Inactive)
router.patch('/announcements/:id/toggle', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ error: 'घोषणा नहीं मिली (Announcement not found)' });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    res.json({
      message: announcement.isActive ? 'घोषणा सक्रिय की गई' : 'घोषणा निष्क्रिय की गई',
      announcement,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Delete Announcement
router.delete('/announcements/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Announcement.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'घोषणा नहीं मिली (Announcement not found)' });
    }

    res.json({ message: 'घोषणा सफलतापूर्वक हटा दी गई (Announcement deleted)' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. List Payment Claims
router.get('/payment-claims', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { status = 'ALL' } = req.query;
    const filter: any = {};
    if (status !== 'ALL') {
      filter.status = status;
    }
    const claims = await PaymentClaim.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ claims });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Approve Payment Claim (with Day Stacking)
router.post('/payment-claims/:id/approve', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approvedBy = (req as any).user?.name || 'SUPER_ADMIN';
    const approvedAt = new Date();

    // Atomic find-and-update guarantees zero race-condition / double-approval
    const claim = await PaymentClaim.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      {
        $set: {
          status: 'APPROVED',
          approvedBy,
          approvedAt,
        },
      },
      { new: true }
    );

    if (!claim) {
      return res.status(400).json({
        error: 'यह क्लेम पहले से ही स्वीकृत है, अस्वीकृत है या नहीं मिला। (Claim already processed or not pending)',
      });
    }

    const tenant = await Tenant.findById(claim.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'संबंधित दुकान नहीं मिली (Store not found)' });
    }

    const months = claim.planDurationMonths || 1;
    const durationMs = months * 30 * 86400000;
    const now = Date.now();

    // Safe Plan Stacking: verify date validity to prevent NaN
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
    };
    await tenant.save();

    res.json({
      message: `भुगतान स्वीकृत! दुकान ${tenant.storeName} के लिए प्रो प्लान ${newExpiryDate.toLocaleDateString('hi-IN')} तक सक्रिय हो गया है।`,
      claim,
      subscription: tenant.subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Reject Payment Claim
router.post('/payment-claims/:id/reject', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason = 'अमान्य UTR या बैंक खाते में भुगतान प्राप्त नहीं हुआ।' } = req.body;
    const claim = await PaymentClaim.findById(id);
    if (!claim) {
      return res.status(404).json({ error: 'भुगतान क्लेम नहीं मिला (Payment claim not found)' });
    }

    claim.status = 'REJECTED';
    claim.rejectionReason = rejectionReason;
    await claim.save();

    res.json({
      message: 'भुगतान क्लेम अस्वीकृत कर दिया गया (Payment claim rejected)',
      claim,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Generate Single-Use Vouchers
router.post('/vouchers/generate', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { durationMonths = 1, note = '', count = 1, campaign = '' } = req.body;
    const months = [1, 3, 12].includes(Number(durationMonths)) ? Number(durationMonths) : 1;
    const generateCount = Math.min(Math.max(1, Number(count) || 1), 20);

    const createdVouchers = [];
    const createdBy = (req as any).user?.name || 'SUPER_ADMIN';

    for (let i = 0; i < generateCount; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const code = `GK-${part1}-${part2}`;

      const voucher = await Voucher.create({
        code,
        durationMonths: months,
        isRedeemed: false,
        createdBy,
        note: note.trim() || undefined,
        campaign: campaign.trim() || undefined,
        expiresAt: new Date(Date.now() + 90 * 86400000),
      });

      createdVouchers.push(voucher);
    }

    res.status(201).json({
      message: `${createdVouchers.length} नया वाउचर कोड सफलतापूर्वक बनाया गया।`,
      vouchers: createdVouchers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. List All Vouchers
router.get('/vouchers', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { status = 'ALL', campaign } = req.query;
    const filter: any = {};
    if (status === 'ACTIVE') {
      filter.isRedeemed = false;
    } else if (status === 'REDEEMED') {
      filter.isRedeemed = true;
    }
    if (campaign && typeof campaign === 'string') {
      filter.campaign = campaign.trim();
    }

    const vouchers = await Voucher.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ vouchers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 17. Revoke/Delete Unredeemed Voucher
router.delete('/vouchers/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ error: 'वाउचर नहीं मिला (Voucher not found)' });
    }

    if (voucher.isRedeemed) {
      return res.status(400).json({ error: 'यह वाउचर पहले ही किसी दुकान द्वारा उपयोग किया जा चुका है और हटाया नहीं जा सकता।' });
    }

    await Voucher.findByIdAndDelete(id);
    res.json({ message: 'वाउचर कोड सफलतापूर्वक निरस्त/हटा दिया गया।' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 18. Multi-Store MongoDB Storage Footprint & Upgrade Lead Pipeline Analytics
router.get('/analytics/storage', requireAuth, requireRole('SUPER_ADMIN'), async (_req: Request, res: Response) => {
  return runWithTenantContext({ role: 'SUPER_ADMIN' }, async () => {
    try {
      // Parallel Aggregations across all main data collections
      const [
        tenants,
        productsAgg,
        customersAgg,
        salesAgg,
        transactionsAgg,
        spoilageAgg,
        ownerUsers
      ] = await Promise.all([
        Tenant.find().select('storeName ownerName phone address subscription referral featureOverrides quotaOverrides createdAt updatedAt').lean(),
        Product.aggregate([
          { $match: { tenantId: { $ne: null, $exists: true } } },
          { $group: { _id: '$tenantId', totalCount: { $sum: 1 }, activeCount: { $sum: { $cond: [{ $eq: ['$isDeleted', false] }, 1, 0] } } } }
        ]),
        Customer.aggregate([
          { $match: { tenantId: { $ne: null, $exists: true } } },
          { $group: { _id: '$tenantId', totalCount: { $sum: 1 }, activeCount: { $sum: { $cond: [{ $eq: ['$isDeleted', false] }, 1, 0] } }, totalDebt: { $sum: '$balanceDue' } } }
        ]),
        Sale.aggregate([
          { $match: { tenantId: { $ne: null, $exists: true } } },
          { $group: { _id: '$tenantId', count: { $sum: 1 }, totalSales: { $sum: '$totalAmount' } } }
        ]),
        Transaction.aggregate([
          { $match: { tenantId: { $ne: null, $exists: true } } },
          { $group: { _id: '$tenantId', count: { $sum: 1 } } }
        ]),
        SpoilageLog.aggregate([
          { $match: { tenantId: { $ne: null, $exists: true } } },
          { $group: { _id: '$tenantId', count: { $sum: 1 } } }
        ]),
        User.find({ role: 'OWNER' }).select('tenantId isActive lastLoginAt').lean()
      ]);

      // Fast O(N) lookup maps
      const productMap = new Map(productsAgg.map(p => [String(p._id), p]));
      const customerMap = new Map(customersAgg.map(c => [String(c._id), c]));
      const salesMap = new Map(salesAgg.map(s => [String(s._id), s]));
      const txMap = new Map(transactionsAgg.map(t => [String(t._id), t]));
      const spoilageMap = new Map(spoilageAgg.map(sp => [String(sp._id), sp]));
      const userMap = new Map(ownerUsers.map(u => [String(u.tenantId), u]));

      let platformTotalStorageKb = 0;
      let platformTotalRecords = 0;
      let prodTotalCount = 0, prodTotalKb = 0;
      let custTotalCount = 0, custTotalKb = 0;
      let salesTotalCount = 0, salesTotalKb = 0;
      let txTotalCount = 0, txTotalKb = 0;
      let spTotalCount = 0, spTotalKb = 0;

      let hotUpgradeCount = 0;
      let nearingQuotaCount = 0;
      let powerMerchantCount = 0;
      let dormantCount = 0;

      const now = Date.now();

      const storeAnalyticsList = tenants.map((t) => {
        const tid = String(t._id);
        const pData = productMap.get(tid);
        const cData = customerMap.get(tid);
        const sData = salesMap.get(tid);
        const txData = txMap.get(tid);
        const spData = spoilageMap.get(tid);
        const uData = userMap.get(tid);

        const products = pData?.totalCount || 0;
        const customers = cData?.totalCount || 0;
        const sales = sData?.count || 0;
        const transactions = txData?.count || 0;
        const spoilage = spData?.count || 0;
        const totalRecords = products + customers + sales + transactions + spoilage;

        // Estimated storage calculation based on document schema weights
        const estimatedStorageKb = Math.round(
          products * 0.8 +
          customers * 0.6 +
          sales * 1.5 +
          transactions * 0.4 +
          spoilage * 0.5
        );

        // Platform sums
        platformTotalStorageKb += estimatedStorageKb;
        platformTotalRecords += totalRecords;
        prodTotalCount += products;
        prodTotalKb += Math.round(products * 0.8);
        custTotalCount += customers;
        custTotalKb += Math.round(customers * 0.6);
        salesTotalCount += sales;
        salesTotalKb += Math.round(sales * 1.5);
        txTotalCount += transactions;
        txTotalKb += Math.round(transactions * 0.4);
        spTotalCount += spoilage;
        spTotalKb += Math.round(spoilage * 0.5);

        // Plan & Quota checks
        const plan = (t.subscription?.plan as 'FREE' | 'PRO') || 'FREE';
        const isTrial = !!t.subscription?.isTrial;
        const defaultMaxProd = plan === 'PRO' ? 2000 : 50;
        const defaultMaxCust = plan === 'PRO' ? 5000 : 100;
        const maxProducts = t.quotaOverrides?.maxProducts || defaultMaxProd;
        const maxCustomers = t.quotaOverrides?.maxCustomers || defaultMaxCust;

        // Quota utilization ratio
        const prodRatio = Math.min(1, maxProducts > 0 ? products / maxProducts : 0);
        const custRatio = Math.min(1, maxCustomers > 0 ? customers / maxCustomers : 0);
        const storageUsedPercent = Math.min(100, Math.round(prodRatio * 50 + custRatio * 50));

        // Pro days remaining
        let daysRemaining = 0;
        if (plan === 'PRO') {
          if (t.subscription?.status === 'PAUSED') {
            daysRemaining = Number(t.subscription.remainingDaysOnPause) || 0;
          } else if (t.subscription?.planExpiryDate) {
            const diffMs = new Date(t.subscription.planExpiryDate).getTime() - now;
            daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));
          }
        }

        // Upgrade readiness scoring & classification
        let upgradeScore = 0;
        let leadCategory: 'HOT_UPGRADE' | 'POWER_MERCHANT' | 'NEARING_QUOTA' | 'STEADY' | 'DORMANT' = 'STEADY';

        const totalDebt = cData?.totalDebt || 0;
        const lastLoginTime = uData?.lastLoginAt ? new Date(uData.lastLoginAt).getTime() : 0;
        const daysSinceLastLogin = lastLoginTime > 0 ? Math.floor((now - lastLoginTime) / 86400000) : 999;

        if (plan === 'PRO' && !isTrial && t.subscription?.status === 'ACTIVE') {
          leadCategory = 'POWER_MERCHANT';
          upgradeScore = 100;
          powerMerchantCount++;
        } else {
          // Free tier or active Trial
          const invScore = prodRatio * 35;
          const custScore = custRatio * 30;
          const salesScore = Math.min(1, sales / 30) * 20;
          const debtScore = Math.min(1, totalDebt / 5000) * 15;
          upgradeScore = Math.round(invScore + custScore + salesScore + debtScore);

          if (daysSinceLastLogin > 14 && sales === 0 && totalRecords < 5) {
            leadCategory = 'DORMANT';
            dormantCount++;
          } else if (isTrial && daysRemaining <= 3 && totalRecords > 10) {
            leadCategory = 'HOT_UPGRADE';
            hotUpgradeCount++;
          } else if (upgradeScore >= 65 || prodRatio >= 0.75 || custRatio >= 0.75) {
            leadCategory = 'HOT_UPGRADE';
            hotUpgradeCount++;
          } else if (prodRatio >= 0.5 || custRatio >= 0.5) {
            leadCategory = 'NEARING_QUOTA';
            nearingQuotaCount++;
          }
        }

        return {
          tenantId: tid,
          storeName: t.storeName,
          ownerName: t.ownerName,
          phone: t.phone,
          village: t.address?.village || '',
          district: t.address?.district || '',
          plan,
          isTrial,
          status: t.subscription?.status || 'ACTIVE',
          daysRemaining,
          counts: {
            products,
            customers,
            sales,
            transactions,
            spoilage,
            totalRecords,
          },
          estimatedStorageKb,
          quotaLimits: {
            maxProducts,
            maxCustomers,
          },
          storageUsedPercent,
          upgradeReadinessScore: upgradeScore,
          leadCategory,
          lastActivityAt: uData?.lastLoginAt ? new Date(uData.lastLoginAt).toISOString() : t.updatedAt ? new Date(t.updatedAt).toISOString() : undefined,
          isActive: uData ? uData.isActive : true,
        };
      });

      // Rank by upgrade readiness desc, then storage desc
      storeAnalyticsList.sort((a, b) => b.upgradeReadinessScore - a.upgradeReadinessScore || b.estimatedStorageKb - a.estimatedStorageKb);

      res.json({
        overview: {
          totalStorageKb: platformTotalStorageKb,
          totalRecords: platformTotalRecords,
          collectionBreakdown: {
            products: { count: prodTotalCount, estimatedKb: prodTotalKb },
            customers: { count: custTotalCount, estimatedKb: custTotalKb },
            sales: { count: salesTotalCount, estimatedKb: salesTotalKb },
            transactions: { count: txTotalCount, estimatedKb: txTotalKb },
            spoilage: { count: spTotalCount, estimatedKb: spTotalKb },
          },
          hotUpgradeCount,
          nearingQuotaCount,
          powerMerchantCount,
          dormantCount,
        },
        stores: storeAnalyticsList,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
});

// 19. Granular Module & Feature Flags Override for a Store
router.patch('/stores/:id/features', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { haatMode, thermalPrinting, voiceBilling, cameraScanner, spoilageGuard, mandiPlanner } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found)' });
    }

    if (!tenant.featureOverrides) {
      tenant.featureOverrides = {};
    }

    if (typeof haatMode === 'boolean') tenant.featureOverrides.haatMode = haatMode;
    if (typeof thermalPrinting === 'boolean') tenant.featureOverrides.thermalPrinting = thermalPrinting;
    if (typeof voiceBilling === 'boolean') tenant.featureOverrides.voiceBilling = voiceBilling;
    if (typeof cameraScanner === 'boolean') tenant.featureOverrides.cameraScanner = cameraScanner;
    if (typeof spoilageGuard === 'boolean') tenant.featureOverrides.spoilageGuard = spoilageGuard;
    if (typeof mandiPlanner === 'boolean') tenant.featureOverrides.mandiPlanner = mandiPlanner;

    await tenant.save();

    res.json({
      message: `'${tenant.storeName}' के फ़ीचर मॉड्यूल सफलतापूर्वक अपडेट किए गए।`,
      featureOverrides: tenant.featureOverrides,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 20. Quota Limit Overrides for High-Capacity Stores
router.patch('/stores/:id/quotas', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { maxProducts, maxCustomers, maxMonthlySales } = req.body;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found)' });
    }

    if (!tenant.quotaOverrides) {
      tenant.quotaOverrides = {};
    }

    if (typeof maxProducts === 'number' && maxProducts > 0) {
      tenant.quotaOverrides.maxProducts = Math.min(100000, Math.floor(maxProducts));
    }
    if (typeof maxCustomers === 'number' && maxCustomers > 0) {
      tenant.quotaOverrides.maxCustomers = Math.min(100000, Math.floor(maxCustomers));
    }
    if (typeof maxMonthlySales === 'number' && maxMonthlySales > 0) {
      tenant.quotaOverrides.maxMonthlySales = Math.min(1000000, Math.floor(maxMonthlySales));
    }

    await tenant.save();

    res.json({
      message: `'${tenant.storeName}' की कोटा सीमाएं अद्यतन की गईं।`,
      quotaOverrides: tenant.quotaOverrides,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 21. Reset Munim Staff 4-Digit Secret PIN
router.post('/stores/:id/reset-munim-pin', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPin } = req.body;

    if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin.trim())) {
      return res.status(400).json({ error: 'मुनीम PIN 4 अंकों की संख्या होनी चाहिए (PIN must be 4 digits).' });
    }

    const pinHash = await bcrypt.hash(newPin.trim(), 10);

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found).' });
    }

    // Update Munim pin hash on tenant and staff user
    await User.updateMany(
      { tenantId: id, role: 'STAFF' },
      { $set: { pinHash, updatedAt: new Date() } }
    );

    res.json({
      message: `'${tenant.storeName}' के मुनीम का PIN सफलतापूर्वक रीसेट कर दिया गया।`,
      storeId: id,
      success: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 22. Fraud Radar Platform Security Aggregations & Metrics
router.get('/security/fraud-radar', requireAuth, requireRole('SUPER_ADMIN'), async (_req: Request, res: Response) => {
  return runWithTenantContext({ role: 'SUPER_ADMIN' }, async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalEvents,
        highRiskCount,
        proxyHitsCount,
        duplicateUtrCount,
        suspendedStoresCount,
      ] = await Promise.all([
        SecurityAuditLog.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        SecurityAuditLog.countDocuments({
          createdAt: { $gte: thirtyDaysAgo },
          riskLevel: { $in: ['HIGH_RISK', 'FRAUD'] },
        }),
        SecurityAuditLog.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, isProxy: true }),
        SecurityAuditLog.countDocuments({
          createdAt: { $gte: thirtyDaysAgo },
          eventType: 'PAYMENT_CLAIM',
          riskLevel: 'FRAUD',
        }),
        Tenant.countDocuments({ 'subscription.status': 'SUSPENDED' }),
      ]);

      // Detect IP Collisions (IPs used across 2+ distinct stores)
      const rawIpGroups = await SecurityAuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            tenantId: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$ipAddress',
            uniqueTenants: { $addToSet: '$tenantId' },
            sampleStores: {
              $addToSet: {
                tenantId: '$tenantId',
                storeName: '$storeName',
                phone: '$ownerPhone',
              },
            },
            isProxy: { $max: '$isProxy' },
          },
        },
        {
          $project: {
            ipAddress: '$_id',
            storeCount: { $size: '$uniqueTenants' },
            sampleStores: 1,
            isProxy: 1,
          },
        },
        { $match: { storeCount: { $gte: 2 } } },
        { $sort: { storeCount: -1 } },
        { $limit: 20 },
      ]);

      // Filter out localhost and private subnets from collision alerts
      const ipCollisions = rawIpGroups
        .filter((g) => !isPrivateOrLoopbackIp(g.ipAddress))
        .map((g) => ({
          ipAddress: g.ipAddress,
          storeCount: g.storeCount,
          isProxy: !!g.isProxy,
          stores: (g.sampleStores || []).slice(0, 5),
        }));

      // Find Stores ranked by Risk Score
      const storeRiskAgg = await SecurityAuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            tenantId: { $exists: true, $ne: null },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$tenantId',
            maxRiskScore: { $max: '$riskScore' },
            latestLog: { $first: '$$ROOT' },
            allReasons: { $push: '$riskReasons' },
          },
        },
        { $sort: { maxRiskScore: -1 } },
        { $limit: 50 },
      ]);

      const tenantIds = storeRiskAgg.map((s) => s._id);
      const tenantsMap = new Map();
      if (tenantIds.length > 0) {
        const foundTenants = await Tenant.find({ _id: { $in: tenantIds } })
          .select('storeName ownerName phone address subscription createdAt')
          .lean();
        foundTenants.forEach((t) => tenantsMap.set(t._id.toString(), t));
      }

      // Also include any currently suspended stores even if no recent log
      const allSuspendedTenants = await Tenant.find({ 'subscription.status': 'SUSPENDED' })
        .select('storeName ownerName phone address subscription createdAt')
        .lean();

      for (const st of allSuspendedTenants) {
        if (!tenantsMap.has(st._id.toString())) {
          tenantsMap.set(st._id.toString(), st);
          storeRiskAgg.push({
            _id: st._id,
            maxRiskScore: 90,
            latestLog: {
              ipAddress: '127.0.0.1',
              isProxy: false,
              riskLevel: 'FRAUD',
              riskReasons: ['प्रशासक द्वारा निलंबित स्टोर खाता (Manually Suspended Store)'],
              createdAt: st.createdAt,
            },
            allReasons: [['खाता निलंबित है']],
          });
        }
      }

      const flaggedStores = storeRiskAgg.map((item) => {
        const tenant = tenantsMap.get(item._id.toString());
        const log = item.latestLog || {};
        const flatReasons = Array.from(new Set((item.allReasons || []).flat())).filter(Boolean);

        return {
          storeId: item._id,
          storeName: tenant?.storeName || log.storeName || 'अज्ञात स्टोर',
          ownerName: tenant?.ownerName || 'दुकानदार',
          phone: tenant?.phone || log.ownerPhone || '—',
          village: tenant?.address?.village || '—',
          district: tenant?.address?.district || '—',
          plan: tenant?.subscription?.plan || 'FREE',
          status: tenant?.subscription?.status || 'ACTIVE',
          riskScore: item.maxRiskScore,
          riskLevel:
            item.maxRiskScore >= 80
              ? 'FRAUD'
              : item.maxRiskScore >= 60
              ? 'HIGH_RISK'
              : item.maxRiskScore >= 25
              ? 'SUSPICIOUS'
              : 'SAFE',
          isProxy: !!log.isProxy,
          isDatacenter: !!log.proxyDetails?.isDatacenter,
          isVpnOrTor: !!log.proxyDetails?.isVpnOrTor,
          lastIp: log.ipAddress || '127.0.0.1',
          riskReasons: flatReasons.length > 0 ? flatReasons.slice(0, 4) : log.riskReasons || [],
          lastEventAt: log.createdAt || tenant?.createdAt,
          isTrial: !!tenant?.subscription?.isTrial,
        };
      });

      // Duplicate UTR Fraud Alerts
      const duplicateUtrLogs = await SecurityAuditLog.find({
        createdAt: { $gte: thirtyDaysAgo },
        eventType: 'PAYMENT_CLAIM',
        riskLevel: 'FRAUD',
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('metadata.utrNumber storeName ownerPhone ipAddress riskScore riskReasons createdAt')
        .lean();

      const duplicateUtrAlerts = duplicateUtrLogs.map((l) => ({
        id: l._id,
        utrNumber: l.metadata?.utrNumber || 'अज्ञात UTR',
        storeName: l.storeName || '—',
        phone: l.ownerPhone || '—',
        ipAddress: l.ipAddress,
        riskScore: l.riskScore,
        reason: l.riskReasons[0] || 'डुप्लीकेट भुगतान क्लेम प्रयास',
        createdAt: l.createdAt,
      }));

      res.json({
        overview: {
          totalEvents,
          highRiskCount,
          proxyHitsCount,
          ipCollisionCount: ipCollisions.length,
          duplicateUtrCount,
          suspendedStoresCount,
        },
        flaggedStores,
        ipCollisions,
        duplicateUtrAlerts,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'फ्रॉड रडार डेटा लोड करने में त्रुटि: ' + err.message });
    }
  });
});

// 23. Paginated Security Audit Logs Feed
router.get('/security/audit-logs', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  return runWithTenantContext({ role: 'SUPER_ADMIN' }, async () => {
    try {
      const {
        riskLevel = 'ALL',
        eventType = 'ALL',
        q = '',
        page = '1',
        limit = '50',
      } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const filter: any = {};

      if (riskLevel !== 'ALL') {
        filter.riskLevel = riskLevel;
      }

      if (eventType !== 'ALL') {
        filter.eventType = eventType;
      }

      if (q && typeof q === 'string' && q.trim()) {
        const cleanQ = q.trim();
        const safeQ = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { storeName: { $regex: safeQ, $options: 'i' } },
          { ownerPhone: { $regex: safeQ, $options: 'i' } },
          { ipAddress: { $regex: safeQ, $options: 'i' } },
        ];
      }

      const [logs, total] = await Promise.all([
        SecurityAuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .select('createdAt eventType storeName ownerPhone ipAddress isProxy riskScore riskLevel riskReasons actionTaken')
          .lean(),
        SecurityAuditLog.countDocuments(filter),
      ]);

      res.json({
        logs,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'सुरक्षा ऑडिट लॉग लोड करने में त्रुटि: ' + err.message });
    }
  });
});

// 24. 1-Click Store Account Suspension (Freeze Store)
router.post('/stores/:id/suspend', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  return runWithTenantContext({ role: 'SUPER_ADMIN' }, async () => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found).' });
      }

      tenant.subscription.status = 'SUSPENDED';
      if (reason) tenant.subscription.pauseReason = String(reason).trim();
      await tenant.save();

      // Deactivate all users under this store
      await User.updateMany({ tenantId: id }, { $set: { isActive: false } });

      // Invalidate active token sessions instantly in memory
      markTenantSuspended(id);

      // Audit log
      await SecurityAuditLog.create({
        tenantId: tenant._id,
        storeName: tenant.storeName,
        ownerPhone: tenant.phone,
        eventType: 'ADMIN_ACTION',
        ipAddress: '127.0.0.1',
        isProxy: false,
        riskScore: 0,
        riskLevel: 'SAFE',
        riskReasons: ['सुपर एडमिन द्वारा स्टोर खाता तत्काल निलंबित (Freeze) किया गया'],
        actionTaken: 'SUSPENDED',
        metadata: {
          reason: reason || 'संदिग्ध गतिविधि / सुरक्षा कारण',
          performedBy: (req as any).user?.name || 'SUPER_ADMIN',
        },
      });

      res.json({
        message: `'${tenant.storeName}' का खाता सफलतापूर्वक निलंबित (Suspended) कर दिया गया है। सभी सक्रिय सत्र समाप्त हो गए हैं।`,
        storeId: id,
        status: 'SUSPENDED',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'खाता निलंबित करने में त्रुटि: ' + err.message });
    }
  });
});

// 25. 1-Click Store Account Unsuspend (Restore Store)
router.post('/stores/:id/unsuspend', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  return runWithTenantContext({ role: 'SUPER_ADMIN' }, async () => {
    try {
      const { id } = req.params;

      const tenant = await Tenant.findById(id);
      if (!tenant) {
        return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found).' });
      }

      tenant.subscription.status = 'ACTIVE';
      tenant.subscription.pauseReason = undefined;
      await tenant.save();

      // Re-activate all users
      await User.updateMany({ tenantId: id }, { $set: { isActive: true } });

      // Unsuspend from memory cache
      markTenantUnsuspended(id);

      // Audit log
      await SecurityAuditLog.create({
        tenantId: tenant._id,
        storeName: tenant.storeName,
        ownerPhone: tenant.phone,
        eventType: 'ADMIN_ACTION',
        ipAddress: '127.0.0.1',
        isProxy: false,
        riskScore: 0,
        riskLevel: 'SAFE',
        riskReasons: ['सुपर एडमिन द्वारा स्टोर खाता पुनः सक्रिय (Unsuspend) किया गया'],
        actionTaken: 'NONE',
        metadata: { performedBy: (req as any).user?.name || 'SUPER_ADMIN' },
      });

      res.json({
        message: `'${tenant.storeName}' का खाता पुनः सक्रिय (Active) कर दिया गया है।`,
        storeId: id,
        status: 'ACTIVE',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'खाता पुनः सक्रिय करने में त्रुटि: ' + err.message });
    }
  });
});

export default router;



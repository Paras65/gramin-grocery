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
import { adminAuthLimiter, requireAuth, requireRole } from '../middleware/security.js';
import { runWithTenantContext } from '../middleware/tenantContext.js';

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

      // Enrich with live customer & sales counts per tenant
      const enrichedStores = await Promise.all(
        tenants.map(async (t) => {
          const [customerCount, debtAgg, ownerUser] = await Promise.all([
            Customer.countDocuments({ tenantId: t._id, isDeleted: false }).setOptions({ bypassTenantCheck: true }),
            Customer.aggregate([
              { $match: { tenantId: t._id, isDeleted: false } },
              { $group: { _id: null, totalDebt: { $sum: '$balanceDue' } } }
            ]),
            User.findOne({ tenantId: t._id, role: 'OWNER' }).select('isActive lastLoginAt').lean()
          ]);

          return {
            id: t._id,
            storeName: t.storeName,
            ownerName: t.ownerName,
            phone: t.phone,
            address: t.address,
            subscription: t.subscription,
            customerCount,
            totalDebt: debtAgg[0]?.totalDebt || 0,
            isActive: ownerUser ? ownerUser.isActive : true,
            lastLoginAt: ownerUser?.lastLoginAt,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          };
        })
      );

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
    if (plan === 'PRO') {
      const months = Number(durationMonths) || 1;
      planExpiryDate = new Date(Date.now() + months * 30 * 86400000);
    }

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      {
        $set: {
          'subscription.plan': plan,
          'subscription.status': status || 'ACTIVE',
          ...(planExpiryDate && { 'subscription.planExpiryDate': planExpiryDate }),
        },
      },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({
      message: `Store subscription updated to ${plan} (${tenant.subscription.status})`,
      subscription: tenant.subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Suspend or Re-activate Store Account
router.patch('/stores/:id/status', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    await User.updateMany(
      { tenantId: id },
      { $set: { isActive } }
    );

    res.json({
      message: isActive ? 'दुकान खाता पुनः सक्रिय किया गया (Store re-activated)' : 'दुकान खाता निलंबित किया गया (Store suspended)',
      isActive,
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
      newPin: newPin.trim(),
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

export default router;


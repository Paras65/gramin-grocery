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
import { MandiRate } from '../models/MandiRate.js';
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

// Default Master Benchmark Rates for Chhattisgarh Mandis
export const DEFAULT_CHHATTISGARH_MANDI_RATES = [
  {
    commodity: 'शक्कर (Sugar M-30)',
    commodityKey: 'sugar',
    category: 'staples',
    unit: 'kg',
    benchmarkRate: 40,
    minRate: 39,
    maxRate: 42,
    trend: 'STABLE',
    advisory: 'स्थानीय मिलों से पर्याप्त आपूर्ति, भाव स्थिर रहने का अनुमान है।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    commodity: 'सोयाबीन रिफाइंड तेल (Soybean Oil)',
    commodityKey: 'soybean_oil',
    category: 'oils',
    unit: 'liter',
    benchmarkRate: 125,
    minRate: 120,
    maxRate: 130,
    trend: 'RISING',
    advisory: 'अंतर्राष्ट्रीय तिलहन आयात शुल्क बदलाव के कारण थोक में ₹2-3 की तेज़ी।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    commodity: 'तुवर दाल फटका (Toor Dal Fatka)',
    commodityKey: 'toor_dal',
    category: 'pulses',
    unit: 'kg',
    benchmarkRate: 145,
    minRate: 140,
    maxRate: 152,
    trend: 'FALLING',
    advisory: 'नई देसी आवक शुरू होने से भाव में नरमी का रुख।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    commodity: 'चना दाल (Chana Dal)',
    commodityKey: 'chana_dal',
    category: 'pulses',
    unit: 'kg',
    benchmarkRate: 78,
    minRate: 75,
    maxRate: 82,
    trend: 'STABLE',
    advisory: 'मंडी में मांग व आपूर्ति संतुलित है।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    commodity: 'गेहूं आटा चक्की (Wheat Flour)',
    commodityKey: 'wheat_flour',
    category: 'grains',
    unit: 'kg',
    benchmarkRate: 28,
    minRate: 26,
    maxRate: 30,
    trend: 'STABLE',
    advisory: 'गोदामों से पर्याप्त गेहूं उपलब्ध, दरें सामान्य हैं।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    commodity: 'चावल मोटा / उसना (Coarse Rice)',
    commodityKey: 'coarse_rice',
    category: 'grains',
    unit: 'kg',
    benchmarkRate: 32,
    minRate: 30,
    maxRate: 34,
    trend: 'STABLE',
    advisory: 'धान खरीदी के बाद मिलों से भरपूर स्टॉक उपलब्ध।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    commodity: 'आलू नया (Fresh Potato)',
    commodityKey: 'potato',
    category: 'vegetables',
    unit: 'kg',
    benchmarkRate: 18,
    minRate: 15,
    maxRate: 22,
    trend: 'FALLING',
    advisory: 'लोकल बाड़ी व यूपी से बंपर आवक होने से भाव नीचे हैं।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    commodity: 'प्याज नासिक (Nashik Onion)',
    commodityKey: 'onion',
    category: 'vegetables',
    unit: 'kg',
    benchmarkRate: 24,
    minRate: 22,
    maxRate: 28,
    trend: 'RISING',
    advisory: 'थोक मंडी में आवक थोड़ी धीमी है, 2-3 दिन बाद खरीदारी उचित।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    commodity: 'सरसों तेल कच्ची घानी (Mustard Oil)',
    commodityKey: 'mustard_oil',
    category: 'oils',
    unit: 'liter',
    benchmarkRate: 140,
    minRate: 135,
    maxRate: 148,
    trend: 'STABLE',
    advisory: 'त्यौहारी मांग स्थिर है।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    commodity: 'लहसुन देसी (Garlic)',
    commodityKey: 'garlic',
    category: 'spices',
    unit: 'kg',
    benchmarkRate: 110,
    minRate: 95,
    maxRate: 130,
    trend: 'RISING',
    advisory: 'माल सीमित आने से थोक भाव में तेज़ी है।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
];

// 12. Get All Mandi Benchmark Rates
router.get('/mandi-rates', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { district = 'ALL', category = 'ALL' } = req.query;

    const filter: any = {};
    if (district !== 'ALL') {
      filter.$or = [{ district: 'ALL' }, { district: String(district) }];
    }
    if (category !== 'ALL') {
      filter.category = String(category);
    }

    let rates = await MandiRate.find(filter).sort({ category: 1, commodity: 1 }).lean();

    // Auto-seed if database is currently empty
    if (rates.length === 0 && (!district || district === 'ALL') && (!category || category === 'ALL')) {
      await MandiRate.insertMany(DEFAULT_CHHATTISGARH_MANDI_RATES);
      rates = await MandiRate.find().sort({ category: 1, commodity: 1 }).lean();
    }

    res.json({ rates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Create Mandi Benchmark Rate
router.post('/mandi-rates', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const {
      commodity,
      category = 'staples',
      unit = 'kg',
      benchmarkRate,
      minRate = 0,
      maxRate = 0,
      trend = 'STABLE',
      advisory = '',
      scope = 'STATE_WIDE',
      district = 'ALL',
    } = req.body;

    if (!commodity || benchmarkRate === undefined) {
      return res.status(400).json({ error: 'कमोडिटी का नाम और संदर्भ दर अनिवार्य हैं।' });
    }

    const commodityKey = String(commodity).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);

    const rate = await MandiRate.create({
      commodity: commodity.trim(),
      commodityKey,
      category,
      unit,
      benchmarkRate: Number(benchmarkRate),
      minRate: Number(minRate || benchmarkRate * 0.95),
      maxRate: Number(maxRate || benchmarkRate * 1.05),
      trend,
      advisory: advisory.trim(),
      scope,
      district: district || 'ALL',
      updatedBy: (req as any).user?.name || 'Super Admin',
    });

    res.status(201).json({
      message: 'मंडी संदर्भ दर सफलतापूर्वक जोड़ी गई',
      rate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. 1-Click Seed Default Chhattisgarh Rates
router.post('/mandi-rates/seed', requireAuth, requireRole('SUPER_ADMIN'), async (_req: Request, res: Response) => {
  try {
    for (const item of DEFAULT_CHHATTISGARH_MANDI_RATES) {
      await MandiRate.findOneAndUpdate(
        { commodityKey: item.commodityKey, district: item.district },
        { ...item, updatedBy: 'Master Seed' },
        { upsert: true, new: true }
      );
    }

    const allRates = await MandiRate.find().sort({ category: 1, commodity: 1 }).lean();
    res.json({
      message: 'छत्तीसगढ़ मास्टर मंडी संदर्भ दरें सफलतापूर्वक रीसेट/सीड की गईं।',
      rates: allRates,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Update Mandi Benchmark Rate
router.put('/mandi-rates/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      commodity,
      category,
      unit,
      benchmarkRate,
      minRate,
      maxRate,
      trend,
      advisory,
      district,
    } = req.body;

    const rate = await MandiRate.findById(id);
    if (!rate) {
      return res.status(404).json({ error: 'मंडी दर रिकॉर्ड नहीं मिला' });
    }

    if (commodity) rate.commodity = commodity.trim();
    if (category) rate.category = category;
    if (unit) rate.unit = unit;
    if (benchmarkRate !== undefined) rate.benchmarkRate = Number(benchmarkRate);
    if (minRate !== undefined) rate.minRate = Number(minRate);
    if (maxRate !== undefined) rate.maxRate = Number(maxRate);
    if (trend) rate.trend = trend;
    if (advisory !== undefined) rate.advisory = advisory.trim();
    if (district !== undefined) rate.district = district;
    rate.updatedBy = (req as any).user?.name || 'Super Admin';

    await rate.save();

    res.json({
      message: 'मंडी संदर्भ दर सफलतापूर्वक अपडेट की गई',
      rate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Delete Mandi Benchmark Rate
router.delete('/mandi-rates/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await MandiRate.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'मंडी दर रिकॉर्ड नहीं मिला' });
    }

    res.json({ message: 'मंडी दर सफलतापूर्वक हटा दी गई' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


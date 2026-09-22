import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { authLimiter, requireAuth, requireRole } from '../middleware/security.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gk_default_secret_key_2026';

const AdminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// 1. Super Admin Login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { password } = AdminLoginSchema.parse(req.body);

    const configuredPassword = (
      process.env.ADMIN_PASSWORD || 
      process.env.SUPER_ADMIN_PASSWORD || 
      'gramin_admin_2026'
    ).trim();

    if (password.trim() !== configuredPassword) {
      return res.status(401).json({ error: 'अमान्य एडमिन सुरक्षा पासवर्ड (Invalid Admin Password)' });
    }

    const adminUserId = 'super_admin_master';
    const adminName = 'Platform Super Admin';

    const token = jwt.sign(
      {
        userId: adminUserId,
        role: 'SUPER_ADMIN',
        name: adminName,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
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
      Customer.countDocuments({ isDeleted: false }),
      Product.countDocuments({ isDeleted: false }),
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

// 3. Searchable Stores Registry with Per-Store Summaries
router.get('/stores', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
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
          Customer.countDocuments({ tenantId: t._id, isDeleted: false }),
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

// 4. Update Store Subscription Plan & Status (1-Click Pro Upgrade)
router.patch('/stores/:id/subscription', requireAuth, requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { plan, status } = req.body;

    if (!['FREE', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan: must be FREE or PRO' });
    }

    const tenant = await Tenant.findByIdAndUpdate(
      id,
      {
        $set: {
          'subscription.plan': plan,
          'subscription.status': status || 'ACTIVE',
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

export default router;


import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole } from '../middleware/security.js';
import { getTenantId } from '../middleware/tenantContext.js';
import { Tenant } from '../models/Tenant.js';
import { Customer } from '../models/Customer.js';
import { Sale } from '../models/Sale.js';
import { Announcement } from '../models/Announcement.js';
import { PaymentClaim } from '../models/PaymentClaim.js';

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

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'दुकान नहीं मिली (Store not found)' });
    }

    // Check if this UTR is already approved for any store
    const alreadyApproved = await PaymentClaim.findOne({ utrNumber: cleanUtr, status: 'APPROVED' });
    if (alreadyApproved) {
      return res.status(400).json({
        error: 'यह UTR नंबर पहले से ही सत्यापित और स्वीकृत हो चुका है।',
      });
    }

    // Check if this store already has this UTR pending
    let claim = await PaymentClaim.findOne({ tenantId, utrNumber: cleanUtr });
    if (claim) {
      return res.json({
        message: 'इस UTR के लिए क्लेम पहले से सबमिट है और समीक्षाधीन है।',
        claim,
      });
    }

    // Create new claim
    claim = await PaymentClaim.create({
      tenantId: tenant._id,
      storeName: tenant.storeName,
      ownerName: tenant.ownerName,
      phone: tenant.phone,
      amount: Number(amount) || 99,
      planDurationMonths: Number(planDurationMonths) || 1,
      utrNumber: cleanUtr,
      status: 'PENDING',
    });

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

export default router;


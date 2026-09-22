import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/security.js';
import { getTenantId } from '../middleware/tenantContext.js';
import { Tenant } from '../models/Tenant.js';
import { Customer } from '../models/Customer.js';
import { Sale } from '../models/Sale.js';

const router = Router();

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

export default router;


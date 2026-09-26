import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/security.js';
import { getTenantId } from '../middleware/tenantContext.js';
import { Customer } from '../models/Customer.js';
import { Transaction } from '../models/Transaction.js';
import { Sale } from '../models/Sale.js';
import { SpoilageLog } from '../models/SpoilageLog.js';
import { Product } from '../models/Product.js';
import { Tenant } from '../models/Tenant.js';

const router = Router();

/**
 * Automatically deduplicate and merge duplicate product records for a tenant in MongoDB.
 * Consolidates duplicate stock into the primary record and deletes duplicates.
 */
async function deduplicateTenantProducts(tenantId: any) {
  try {
    const allProducts = await Product.find({ tenantId, isDeleted: { $ne: true } }).sort({ updatedAt: -1 });
    const seenKeys = new Map<string, any>();
    const idsToDelete: any[] = [];
    const modifiedPrimaries: any[] = [];

    for (const p of allProducts) {
      const bc = (p.barcode || '').trim();
      const normName = (p.name || '').trim().toLowerCase();
      const normHindi = (p.hindiName || '').trim().toLowerCase();
      const unit = (p.unit || '').trim().toLowerCase();

      // Form a consistent identity key
      const key = bc ? `bc_${bc}` : `name_${normName || normHindi}_${unit}`;

      if (seenKeys.has(key)) {
        const primary = seenKeys.get(key);
        // Consolidate stock into primary record
        primary.stockQty = (primary.stockQty || 0) + (p.stockQty || 0);
        if (!modifiedPrimaries.includes(primary)) {
          modifiedPrimaries.push(primary);
        }
        idsToDelete.push(p._id);
      } else {
        seenKeys.set(key, p);
      }
    }

    if (idsToDelete.length > 0) {
      await Product.deleteMany({ _id: { $in: idsToDelete } });
      for (const primary of modifiedPrimaries) {
        await primary.save();
      }
    }
  } catch (err) {
    console.error('deduplicateTenantProducts error:', err);
  }
}

// High-Throughput Idempotent Delta Sync Endpoint
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId();
    const { lastSyncTimestamp, mutations } = req.body;
    const now = new Date();

    // Auto-clean any residual dummy customers from previous test runs on this tenant
    await Customer.deleteMany({
      tenantId,
      $or: [
        { phone: { $regex: /XXXX/i } },
        { name: { $in: ['Ramesh Patel', 'Sushila Bai Sahu', 'Santosh Yadav', 'Dilip Kumar Netam', 'Kanhaiya Verma'] } },
      ],
    });

    // 1. Process Incoming Customer Mutations (Idempotent Upsert)
    if (mutations?.customers && Array.isArray(mutations.customers)) {
      for (const cust of mutations.customers) {
        if (!cust.clientUUID || !cust.name || !cust.phone) continue;
        // Ignore dummy seed customers
        if (
          cust.phone.includes('XXXX') ||
          ['Ramesh Patel', 'Sushila Bai Sahu', 'Santosh Yadav', 'Dilip Kumar Netam', 'Kanhaiya Verma'].includes(cust.name)
        ) {
          continue;
        }

        await Customer.findOneAndUpdate(
          { tenantId, clientUUID: cust.clientUUID },
          {
            $set: {
              name: cust.name,
              phone: cust.phone,
              para: cust.para || 'Basti',
              dueDate: cust.dueDate ? new Date(cust.dueDate) : undefined,
              dueReason: cust.dueReason || 'KHARIF_DHAN',
              notes: cust.notes,
            },
            $setOnInsert: {
              balanceDue: cust.balanceDue || 0,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    // 2. Process Incoming Transactions (Idempotent Append-Only with Atomic Math)
    if (mutations?.transactions && Array.isArray(mutations.transactions)) {
      for (const txn of mutations.transactions) {
        if (!txn.clientTxnId || !txn.customerId || !txn.amount) continue;

        // Check if transaction was already processed (Idempotency shield)
        const existingTxn = await Transaction.findOne({
          tenantId,
          clientTxnId: txn.clientTxnId,
        });

        if (!existingTxn) {
          // Insert immutable transaction record
          await Transaction.create({
            tenantId,
            clientTxnId: txn.clientTxnId,
            customerId: txn.customerId,
            type: txn.type,
            amount: txn.amount,
            timestamp: txn.timestamp ? new Date(txn.timestamp) : now,
            note: txn.note,
            billItemsSummary: txn.billItemsSummary,
            operatorId: req.user?.userId,
          });

          // Atomically adjust customer's balanceDue using $inc (Never overwrite balances)
          const delta = txn.type === 'UDHAAR' ? txn.amount : -txn.amount;
          await Customer.findOneAndUpdate(
            { tenantId, clientUUID: txn.customerId },
            {
              $inc: { balanceDue: delta },
              $set: { updatedAt: now },
            }
          );
        }
      }
    }

    // 3. Process Incoming Sales
    if (mutations?.sales && Array.isArray(mutations.sales)) {
      for (const sale of mutations.sales) {
        if (!sale.clientSaleId || !sale.totalAmount) continue;

        await Sale.findOneAndUpdate(
          { tenantId, clientSaleId: sale.clientSaleId },
          {
            $set: {
              timestamp: sale.timestamp ? new Date(sale.timestamp) : now,
              items: sale.items || [],
              totalAmount: sale.totalAmount,
              paymentMode: sale.paymentMode,
              customerId: sale.customerId,
              customerName: sale.customerName,
            },
          },
          { upsert: true }
        );
      }
    }

    // 4. Process Incoming Spoilage Logs
    if (mutations?.spoilageLogs && Array.isArray(mutations.spoilageLogs)) {
      for (const sp of mutations.spoilageLogs) {
        if (!sp.clientSpoilageId) continue;

        await SpoilageLog.findOneAndUpdate(
          { tenantId, clientSpoilageId: sp.clientSpoilageId },
          {
            $set: {
              productName: sp.productName,
              quantity: sp.quantity,
              unit: sp.unit,
              reason: sp.reason,
              estimatedLoss: sp.estimatedLoss,
              timestamp: sp.timestamp ? new Date(sp.timestamp) : now,
              note: sp.note,
            },
          },
          { upsert: true }
        );
      }
    }

    // Process Incoming Deleted Products (Permanently remove deleted duplicates/items)
    if (mutations?.deletedProductUUIDs && Array.isArray(mutations.deletedProductUUIDs) && mutations.deletedProductUUIDs.length > 0) {
      await Product.deleteMany({
        tenantId,
        clientUUID: { $in: mutations.deletedProductUUIDs },
      });
    }

    // 5. Process Incoming Product Mutations (Idempotent Matching by UUID, Barcode, or Name+Unit)
    if (mutations?.products && Array.isArray(mutations.products)) {
      for (const prod of mutations.products) {
        if (!prod.clientUUID || !prod.name) continue;

        const cleanBarcode = (prod.barcode || '').trim();
        const normName = (prod.name || '').trim();
        const normHindi = (prod.hindiName || '').trim() || normName;
        const unit = prod.unit || 'kg';

        // Check if item already exists by clientUUID, barcode, or name + unit
        const queryOr: any[] = [{ clientUUID: prod.clientUUID }];
        if (cleanBarcode) {
          queryOr.push({ barcode: cleanBarcode });
        }
        queryOr.push({ name: normName, unit });
        queryOr.push({ hindiName: normHindi, unit });

        const existing = await Product.findOne({
          tenantId,
          $or: queryOr,
        });

        if (existing) {
          existing.clientUUID = prod.clientUUID; // keep client-server UUID in sync
          existing.name = normName;
          existing.hindiName = normHindi;
          existing.category = prod.category || existing.category || 'staples';
          existing.purchasePrice = prod.purchasePrice !== undefined ? prod.purchasePrice : existing.purchasePrice;
          existing.sellingPrice = prod.sellingPrice !== undefined ? prod.sellingPrice : existing.sellingPrice;
          existing.stockQty = prod.stockQty !== undefined ? prod.stockQty : existing.stockQty;
          existing.unit = unit;
          existing.minStockThreshold = prod.minStockThreshold || existing.minStockThreshold || 5;
          existing.isLoose = prod.isLoose !== undefined ? prod.isLoose : existing.isLoose;
          if (cleanBarcode) existing.barcode = cleanBarcode;
          if (prod.expiryDate) existing.expiryDate = new Date(prod.expiryDate);
          await existing.save();
        } else {
          await Product.create({
            tenantId,
            clientUUID: prod.clientUUID,
            name: normName,
            hindiName: normHindi,
            category: prod.category || 'staples',
            purchasePrice: prod.purchasePrice || 0,
            sellingPrice: prod.sellingPrice || 0,
            stockQty: prod.stockQty || 0,
            unit,
            minStockThreshold: prod.minStockThreshold || 5,
            isLoose: prod.isLoose || false,
            barcode: cleanBarcode || undefined,
            expiryDate: prod.expiryDate ? new Date(prod.expiryDate) : undefined,
          });
        }
      }
    }

    // Run automated deduplication to ensure zero duplicate products remain for this store in MongoDB
    // Scalability Guard: Only scan products during initial login/full sync or when product mutations/deletions occurred
    if (
      !lastSyncTimestamp ||
      (mutations?.products && mutations.products.length > 0) ||
      (mutations?.deletedProductUUIDs && mutations.deletedProductUUIDs.length > 0)
    ) {
      await deduplicateTenantProducts(tenantId);
    }

    // 6. Query Server Deltas (Fetch records created/updated after client's lastSyncTimestamp)
    const sinceDate = lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0);

    const updatedProducts = await Product.find({
      tenantId,
      isDeleted: { $ne: true },
      updatedAt: { $gt: sinceDate },
    }).lean();

    const updatedCustomers = await Customer.find({
      tenantId,
      updatedAt: { $gt: sinceDate },
    }).lean();

    const updatedTransactions = await Transaction.find({
      tenantId,
      createdAt: { $gt: sinceDate },
    }).lean();

    const tenant = await Tenant.findById(tenantId).select('subscription').lean();

    res.json({
      status: 'SUCCESS',
      serverTimestamp: now.toISOString(),
      subscription: tenant?.subscription || null,
      deltas: {
        products: updatedProducts,
        customers: updatedCustomers,
        transactions: updatedTransactions,
      },
    });
  } catch (err: any) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message || 'Delta sync failed' });
  }
});

export default router;


import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/security.js';
import { getTenantId } from '../middleware/tenantContext.js';
import { Customer } from '../models/Customer.js';
import { Transaction } from '../models/Transaction.js';
import { Sale } from '../models/Sale.js';
import { SpoilageLog } from '../models/SpoilageLog.js';
import { Product } from '../models/Product.js';

const router = Router();

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

    // 5. Process Incoming Product Mutations
    if (mutations?.products && Array.isArray(mutations.products)) {
      for (const prod of mutations.products) {
        if (!prod.clientUUID || !prod.name) continue;

        await Product.findOneAndUpdate(
          { tenantId, clientUUID: prod.clientUUID },
          {
            $set: {
              name: prod.name,
              hindiName: prod.hindiName || prod.name,
              category: prod.category || 'staples',
              purchasePrice: prod.purchasePrice || 0,
              sellingPrice: prod.sellingPrice || 0,
              stockQty: prod.stockQty || 0,
              unit: prod.unit || 'kg',
              minStockThreshold: prod.minStockThreshold || 5,
              isLoose: prod.isLoose || false,
              barcode: prod.barcode,
              expiryDate: prod.expiryDate ? new Date(prod.expiryDate) : undefined,
            },
          },
          { upsert: true }
        );
      }
    }

    // 6. Query Server Deltas (Fetch records created/updated after client's lastSyncTimestamp)
    const sinceDate = lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0);

    const updatedProducts = await Product.find({
      tenantId,
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

    res.json({
      status: 'SUCCESS',
      serverTimestamp: now.toISOString(),
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


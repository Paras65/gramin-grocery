import { Schema } from 'mongoose';
import { getTenantContext } from '../middleware/tenantContext.js';

export function autoTenantPlugin(schema: Schema) {
  // 1. Automatically inject tenantId into schema
  schema.add({
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    }
  });

  // 2. Pre-Query Hook: Force tenantId filter on all queries
  const queryMethods = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
    'countDocuments',
    'estimatedDocumentCount',
    'updateMany',
    'deleteMany'
  ] as const;

  queryMethods.forEach((method) => {
    schema.pre(method, function (this: any) {
      // Allow bypassing only if explicitly specified by system admin operations (e.g. initial setup)
      if (this.getOptions().bypassTenantCheck) {
        return;
      }

      const context = getTenantContext();
      if (!context?.tenantId) {
        throw new Error(`CRITICAL SECURITY FAILURE: Attempted ${method} without active tenant context`);
      }

      this.where({ tenantId: context.tenantId });
    });
  });

  // 3. Pre-Save Hook: Automatically assign tenantId on new document creations
  schema.pre('save', function (next) {
    const context = getTenantContext();
    if (context?.tenantId && !this.get('tenantId')) {
      this.set('tenantId', context.tenantId);
    }

    if (!this.get('tenantId')) {
      return next(new Error('CRITICAL SECURITY FAILURE: Document save attempted without tenantId'));
    }

    next();
  });
}

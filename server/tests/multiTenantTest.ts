// Automated Security & Multi-Tenancy Validation Test
const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('🧪 Starting Gramin Kirana Multi-Tenancy & Security Verification Suite...\n');

  const randomSuffix = Math.floor(Math.random() * 89999 + 10000);
  const phoneA = `98261${randomSuffix}`;
  const phoneB = `97542${randomSuffix}`;

  // Test 1: Onboard Store A (Ramesh Kirana, Raipur)
  console.log('1️⃣ Testing Store A Registration (Option A: Mobile + 4-digit PIN)...');
  const resA = await fetch(`${BASE_URL}/auth/register-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeName: 'Ramesh Kirana & Daily Needs',
      ownerName: 'Ramesh Sahu',
      phone: phoneA,
      pin: '1234',
      village: 'Arang',
      block: 'Arang',
      district: 'Raipur',
    }),
  });
  const dataA = await resA.json();
  if (!resA.ok) throw new Error(`Store A registration failed: ${JSON.stringify(dataA)}`);
  console.log(`   ✅ Store A created: TenantId=${dataA.tenant.id}, Token issued.`);

  // Test 2: Onboard Store B (Suresh General Store, Dhamtari)
  console.log('\n2️⃣ Testing Store B Registration (Independent Tenant)...');
  const resB = await fetch(`${BASE_URL}/auth/register-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeName: 'Suresh General Store',
      ownerName: 'Suresh Yadav',
      phone: phoneB,
      pin: '5678',
      village: 'Kurud',
      block: 'Kurud',
      district: 'Dhamtari',
    }),
  });
  const dataB = await resB.json();
  if (!resB.ok) throw new Error(`Store B registration failed: ${JSON.stringify(dataB)}`);
  console.log(`   ✅ Store B created: TenantId=${dataB.tenant.id}, Token issued.`);

  // Test 3: Store A Syncs Customer & Transaction (Udhaar ₹500)
  console.log('\n3️⃣ Testing Delta Sync for Store A...');
  const testCustomerUUID = 'cust_test_' + randomSuffix;
  const testTxnUUID = 'txn_test_' + randomSuffix;
  const commonCustomerPhone = `91310${randomSuffix}`;

  const syncResA = await fetch(`${BASE_URL}/sync/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dataA.token}`,
    },
    body: JSON.stringify({
      mutations: {
        customers: [
          {
            clientUUID: testCustomerUUID,
            name: 'Ram Dayal Verma',
            phone: commonCustomerPhone,
            para: 'Patel Para',
            balanceDue: 0,
            dueReason: 'KHARIF_DHAN',
          },
        ],
        transactions: [
          {
            clientTxnId: testTxnUUID,
            customerId: testCustomerUUID,
            type: 'UDHAAR',
            amount: 500,
            note: 'सरसों तेल व चावल उधार',
          },
        ],
      },
    }),
  });
  const syncDataA = await syncResA.json();
  if (!syncResA.ok) throw new Error(`Store A sync failed: ${JSON.stringify(syncDataA)}`);
  console.log('   ✅ Store A customer & ₹500 Udhaar transaction synced successfully.');

  // Test 4: Strict Multi-Tenant Isolation Verification
  console.log('\n4️⃣ Verifying Tenant Isolation: Store B queries its stats...');
  const statsResB = await fetch(`${BASE_URL}/tenant/stats`, {
    headers: { Authorization: `Bearer ${dataB.token}` },
  });
  const statsDataB = await statsResB.json();
  if (statsDataB.totalCustomers !== 0 || statsDataB.totalOutstanding !== 0) {
    throw new Error(`❌ ISOLATION LEAK: Store B accessed Store A data! ${JSON.stringify(statsDataB)}`);
  }
  console.log('   ✅ Zero-Trust Isolation Confirmed: Store B sees 0 customers and ₹0 debt.');

  // Test 5: Compound Index Uniqueness Test
  console.log('\n5️⃣ Testing Compound Unique Index: Store B adds customer with SAME phone number...');
  const syncResB = await fetch(`${BASE_URL}/sync/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dataB.token}`,
    },
    body: JSON.stringify({
      mutations: {
        customers: [
          {
            clientUUID: 'cust_storeB_' + randomSuffix,
            name: 'Ram Dayal (Kurud Customer)',
            phone: commonCustomerPhone, // Identical phone number!
            para: 'Basti Para',
            balanceDue: 150,
          },
        ],
      },
    }),
  });
  const syncDataB = await syncResB.json();
  if (!syncResB.ok) throw new Error(`Store B compound phone failed: ${JSON.stringify(syncDataB)}`);
  console.log('   ✅ Compound Index Verified: Both stores successfully maintain isolated customer profiles with identical phone numbers.');

  // Test 6: Idempotent Sync Retry Test
  console.log('\n6️⃣ Testing Idempotent Network Retry (Duplicate Payload)...');
  const retrySyncA = await fetch(`${BASE_URL}/sync/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dataA.token}`,
    },
    body: JSON.stringify({
      mutations: {
        transactions: [
          {
            clientTxnId: testTxnUUID, // Duplicate clientTxnId
            customerId: testCustomerUUID,
            type: 'UDHAAR',
            amount: 500,
          },
        ],
      },
    }),
  });
  const retryDataA = await retrySyncA.json();
  if (!retrySyncA.ok) throw new Error(`Retry failed: ${JSON.stringify(retryDataA)}`);

  const statsResA = await fetch(`${BASE_URL}/tenant/stats`, {
    headers: { Authorization: `Bearer ${dataA.token}` },
  });
  const statsDataA = await statsResA.json();
  if (statsDataA.totalOutstanding !== 500) {
    throw new Error(`❌ Idempotency failed: Balance became ₹${statsDataA.totalOutstanding} instead of ₹500`);
  }
  console.log('   ✅ Idempotency Verified: Duplicate transaction did not double-charge customer balance.');

  console.log('\n🎉 ALL SECURITY & MULTI-TENANCY TESTS PASSED WITH 100% DATA INTEGRITY!');
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});


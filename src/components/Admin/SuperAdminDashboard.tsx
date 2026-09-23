import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, IndianRupee, ShieldAlert, 
  Search, RefreshCw, LogOut, AlertTriangle, 
  Phone, MessageSquare, MapPin, Crown,
  Download, KeyRound, Trash2
} from 'lucide-react';
import { adminService, type PlatformOverviewResponse } from '../../services/adminService';
import type { AdminStoreSummary } from '../../types';
import { formatINR } from '../../utils/formatters';
import { buildWhatsAppUrl } from '../../utils/whatsapp';

interface SuperAdminDashboardProps {
  onExit: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onExit }) => {
  const [overview, setOverview] = useState<PlatformOverviewResponse | null>(null);
  const [stores, setStores] = useState<AdminStoreSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');

  const adminInfo = adminService.getAdminInfo();

  const loadData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const [overviewData, storesData] = await Promise.all([
        adminService.getOverview(),
        adminService.getStores(searchQuery, selectedPlan, selectedDistrict)
      ]);

      setOverview(overviewData);
      setStores(storesData);
    } catch (err: any) {
      setError(err.message || 'डेटा लोड करने में असमर्थ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPlan, selectedDistrict]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(true);
  };

  const handleSubscriptionToggle = async (store: AdminStoreSummary) => {
    const newPlan = store.subscription.plan === 'PRO' ? 'FREE' : 'PRO';
    let durationMonths = 1;

    if (newPlan === 'PRO') {
      const input = window.prompt(
        `'${store.storeName}' के लिए कितने महीने का प्रो प्लान सक्रिय करना है?\n\n1 = 1 महीना (₹99)\n3 = 3 महीने (₹279)\n12 = 1 वर्ष (वार्षिक लाइसेंस ₹999)`,
        '1'
      );
      if (input === null) return;
      durationMonths = Math.max(1, parseInt(input, 10) || 1);
    } else {
      const ok = window.confirm(`क्या आप ${store.storeName} को 'गाँव स्टार्टर' (FREE) प्लान में बदलना चाहते हैं?`);
      if (!ok) return;
    }

    try {
      await adminService.updateStoreSubscription(store.id, newPlan, 'ACTIVE', durationMonths);
      const planExpiryDate = newPlan === 'PRO' ? new Date(Date.now() + durationMonths * 30 * 86400000).toISOString() : undefined;
      setStores(prev => prev.map(s => s.id === store.id ? {
        ...s,
        subscription: { plan: newPlan, status: 'ACTIVE', planExpiryDate }
      } : s));
      // Refresh metrics
      adminService.getOverview().then(setOverview).catch(console.error);
    } catch (err: any) {
      alert(`त्रुटि: ${err.message}`);
    }
  };

  const handleToggleStoreStatus = async (store: AdminStoreSummary) => {
    const nextStatus = !store.isActive;
    const confirmMsg = nextStatus
      ? `क्या आप ${store.storeName} का खाता पुनः सक्रिय करना चाहते हैं?`
      : `⚠️ क्या आप सच में ${store.storeName} का खाता निलंबित (Suspend) करना चाहते हैं? दुकानदार क्लाउड सिंक नहीं कर पाएगा।`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await adminService.toggleStoreStatus(store.id, nextStatus);
      setStores(prev => prev.map(s => s.id === store.id ? { ...s, isActive: nextStatus } : s));
    } catch (err: any) {
      alert(`त्रुटि: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (stores.length === 0) {
      alert('डाउनलोड के लिए कोई स्टोर उपलब्ध नहीं है।');
      return;
    }

    const headers = [
      'Store Name',
      'Owner Name',
      'Phone',
      'Village',
      'District',
      'Plan',
      'Status',
      'Plan Expiry Date',
      'Customers',
      'Total Debt (INR)',
      'Account Status',
      'Created At'
    ];

    const rows = stores.map(s => [
      `"${(s.storeName || '').replace(/"/g, '""')}"`,
      `"${(s.ownerName || '').replace(/"/g, '""')}"`,
      `"${s.phone || ''}"`,
      `"${(s.address?.village || '').replace(/"/g, '""')}"`,
      `"${(s.address?.district || '').replace(/"/g, '""')}"`,
      `"${s.subscription?.plan || 'FREE'}"`,
      `"${s.subscription?.status || 'ACTIVE'}"`,
      `"${s.subscription?.planExpiryDate ? new Date(s.subscription.planExpiryDate).toLocaleDateString('hi-IN') : 'N/A'}"`,
      s.customerCount || 0,
      s.totalDebt || 0,
      s.isActive ? 'Active' : 'Suspended',
      `"${new Date(s.createdAt).toLocaleDateString('hi-IN')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gramin_stores_registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetPin = async (store: AdminStoreSummary) => {
    const defaultPin = Math.floor(1000 + Math.random() * 9000).toString();
    const newPin = window.prompt(
      `'${store.storeName}' (${store.ownerName}) के लिए नया 4-अंकों का गुप्त PIN दर्ज करें:\n\n(सुझाव: ${defaultPin})`,
      defaultPin
    );

    if (!newPin) return;

    if (!/^\d{4}$/.test(newPin.trim())) {
      alert('कृपया ठीक 4 अंकों की संख्या दर्ज करें (उदा. 1234)।');
      return;
    }

    try {
      await adminService.resetStorePin(store.id, newPin.trim());

      const whatsappMsg =
        `नमस्ते ${store.ownerName} जी 🙏\n\n` +
        `🏪 *${store.storeName}* के लिए आपका नया ग्रामिन किराना 4-अंकों का गुप्त PIN सफलतापूर्वक रीसेट कर दिया गया है:\n\n` +
        `📱 मोबाइल: *${store.phone}*\n` +
        `🔑 नया PIN: *${newPin.trim()}*\n\n` +
        `🌐 ऐप में लॉगिन करें: https://gramin-grocery.web.app/\n\n` +
        `सुरक्षा हेतु कृपया यह PIN किसी अनजान व्यक्ति से साझा न करें।\n` +
        `— ग्रामिन किराना सुपर एडमिन सहायता दल 🤝`;

      const sendWhatsApp = window.confirm(
        `PIN सफलतापूर्वक रीसेट हो गया है!\n\nनया PIN: ${newPin.trim()}\n\nक्या आप अभी दुकानदार (${store.phone}) को यह नया PIN व्हाट्सएप पर भेजना चाहते हैं?`
      );

      if (sendWhatsApp) {
        window.open(buildWhatsAppUrl(store.phone, whatsappMsg), '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      alert(`PIN रीसेट विफल: ${err.message}`);
    }
  };

  const handleDeleteStore = async (store: AdminStoreSummary) => {
    const confirmName = window.prompt(
      `⚠️ अति संवेदनशील चेतावनी (Delete Store)!\n\n` +
      `क्या आप सच में '${store.storeName}' (${store.phone}) और उसका संपूर्ण डेटा (खाता, ग्राहक, स्टॉक, बिक्री) स्थायी रूप से हटाना चाहते हैं?\n\n` +
      `पुष्टि करने के लिए नीचे दुकान का नाम टाइप करें:`
    );

    if (confirmName?.trim() !== store.storeName.trim()) {
      if (confirmName !== null) alert('दुकान का नाम मेल नहीं खाया। निरस्त किया गया।');
      return;
    }

    try {
      await adminService.deleteStore(store.id);
      setStores(prev => prev.filter(s => s.id !== store.id));
      alert(`'${store.storeName}' सफलतापूर्वक हटा दी गई।`);
      adminService.getOverview().then(setOverview).catch(console.error);
    } catch (err: any) {
      alert(`दुकान हटाने में विफल: ${err.message}`);
    }
  };

  const handleLogout = () => {
    adminService.logout();
    onExit();
  };

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-stone-900 flex flex-col">
      {/* Super Admin Top Command Bar */}
      <header className="bg-stone-950 text-white sticky top-0 z-40 shadow-md border-b border-amber-600/40 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-black shadow-xs">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-amber-400 m-0 tracking-tight">
                  ग्रामीण किराना — सुपर एडमिन
                </h1>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-md font-bold">
                  MASTER CONTROL
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-medium m-0">
                संचालक: {adminInfo?.name || 'Super Admin'} ({adminInfo?.mobile || 'Root'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer active:scale-95 transition-all"
              title="डेटा रीफ्रेश करें"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer active:scale-95 transition-all"
            >
              दुकान काउंटर मोड
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>लॉगआउट</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadData(true)}
              className="underline text-rose-900 cursor-pointer"
            >
              पुनः प्रयास करें
            </button>
          </div>
        )}

        {/* Platform Overview KPI Cards */}
        {loading && !overview ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-28 bg-white/70 rounded-2xl border border-stone-200" />
            ))}
          </div>
        ) : overview ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Stores */}
            <div className="village-card p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">कुल पंजीकृत दुकानें</span>
                <div className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-950">
                {overview.metrics.totalStores}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold">
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  🚀 {overview.metrics.proStores} प्रो
                </span>
                <span className="text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded-md border border-stone-200">
                  🌾 {overview.metrics.freeStores} स्टार्टर
                </span>
              </div>
            </div>

            {/* Card 2: Platform GMV */}
            <div className="village-card p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">कुल ग्रामीण व्यापार (GMV)</span>
                <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800">
                {formatINR(overview.metrics.totalGMV, { round: true })}
              </div>
              <div className="mt-2 text-[11px] text-stone-500 font-medium">
                कुल बिलिंग संख्या: <b className="text-stone-800">{overview.metrics.totalSalesCount}</b> बिल
              </div>
            </div>

            {/* Card 3: Platform Khata Debt */}
            <div className="village-card p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">कुल दर्ज ग्रामीण उधारी</span>
                <div className="p-1.5 rounded-xl bg-rose-100 text-rose-900">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-700">
                {formatINR(overview.metrics.totalVillageDebt, { round: true })}
              </div>
              <div className="mt-2 text-[11px] text-stone-500 font-medium">
                पंजीकृत ग्राहक: <b className="text-stone-800">{overview.metrics.totalCustomers}</b> परिवार
              </div>
            </div>

            {/* Card 4: Cataloged Products */}
            <div className="village-card p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">प्लेटफ़ॉर्म स्टॉक इन्वेंट्री</span>
                <div className="p-1.5 rounded-xl bg-indigo-100 text-indigo-900">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-900">
                {overview.metrics.totalProducts}
              </div>
              <div className="mt-2 text-[11px] text-stone-500 font-medium">
                सक्रिय किराना, तेल, अनाज व दैनिक उत्पाद
              </div>
            </div>
          </div>
        ) : null}

        {/* District Breakdown Quick Bar */}
        {overview && overview.districtBreakdown.length > 0 && (
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span>छत्तीसगढ़ जिलावार दुकानें (District Distribution):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedDistrict('ALL')}
                className={`text-xs px-3 py-1 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
                  selectedDistrict === 'ALL'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                सभी जिले ({overview.metrics.totalStores})
              </button>
              {overview.districtBreakdown.map(d => (
                <button
                  key={d.district}
                  onClick={() => setSelectedDistrict(d.district)}
                  className={`text-xs px-3 py-1 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
                    selectedDistrict === d.district
                      ? 'bg-amber-700 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  📍 {d.district} ({d.storesCount})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stores Directory & Controls */}
        <div className="village-card p-4 rounded-3xl bg-white border border-amber-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-950 m-0">
                पंजीकृत किराना दुकानें ({stores.length})
              </h2>
              <p className="text-xs text-stone-500 m-0 font-medium">
                दुकान संचालक, प्लान अपग्रेड व रिमोट खाता प्रबंधन
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* CSV Export Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all"
                title="सभी पंजीकृत दुकानों की सूची CSV फॉर्मेट में डाउनलोड करें"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV डाउनलोड</span>
              </button>

              {/* Filter Tabs: All, Pro, Free */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                {[
                  { id: 'ALL', label: 'सभी' },
                  { id: 'PRO', label: '🚀 प्रो प्लान' },
                  { id: 'FREE', label: '🌾 स्टार्टर' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedPlan(tab.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                      selectedPlan === tab.id
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="दुकान का नाम, संचालक, मोबाइल या गाँव से खोजें..."
                className="w-full pl-9 pr-3 py-2 bg-[#faf8f3] border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 font-semibold outline-hidden focus:border-amber-600"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              खोजें
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  loadData(true);
                }}
                className="bg-stone-100 text-stone-700 text-xs px-3 py-2 rounded-xl font-bold cursor-pointer"
              >
                हटाएं
              </button>
            )}
          </form>

          {/* Stores List (Responsive Table on Desktop, Cards on Mobile) */}
          {loading ? (
            <div className="text-center py-12 text-stone-500 text-xs">
              <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              दुकानों की जानकारी लोड हो रही है...
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-12 bg-[#faf8f3] rounded-2xl border border-dashed border-amber-300">
              <p className="text-sm font-bold text-stone-800 m-0">कोई दुकान नहीं मिली</p>
              <p className="text-xs text-stone-500 mt-1">खोज शब्द बदलें या अन्य फ़िल्टर चुनें</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map(store => {
                const isPro = store.subscription.plan === 'PRO';
                return (
                  <div
                    key={store.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      store.isActive
                        ? 'bg-[#faf8f3] border-amber-200/80 hover:border-amber-300'
                        : 'bg-stone-100 border-stone-300 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-stone-950 m-0">
                            {store.storeName}
                          </h3>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isPro
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            {isPro ? '🚀 ग्रामिन प्रो (PRO)' : '🌾 गाँव स्टार्टर (FREE)'}
                          </span>
                          {!store.isActive && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                              ⛔ निलंबित (Suspended)
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs text-stone-600 space-x-2">
                          <span>👤 संचालक: <b>{store.ownerName}</b></span>
                          <span>•</span>
                          <span>📍 {store.address.village}, {store.address.block}, {store.address.district}</span>
                        </div>

                        <div className="mt-1 text-[11px] text-stone-500 flex items-center gap-3 flex-wrap">
                          <span>पंजीकरण: {new Date(store.createdAt).toLocaleDateString('hi-IN')}</span>
                          <span>खातेदार: <b className="text-stone-800">{store.customerCount}</b></span>
                          <span>कुल उधारी: <b className="text-rose-700">{formatINR(store.totalDebt)}</b></span>
                          {isPro && store.subscription.planExpiryDate && (
                            <span className="text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              📅 वैधता: {new Date(store.subscription.planExpiryDate).toLocaleDateString('hi-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contact & Control Actions */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        {/* Direct Phone Call */}
                        {store.phone && (
                          <a
                            href={`tel:${store.phone}`}
                            className="p-2 rounded-xl bg-white border border-stone-200 text-blue-700 hover:bg-blue-50 cursor-pointer active:scale-95 transition-all"
                            title={`कॉल करें (${store.phone})`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}

                        {/* Direct WhatsApp */}
                        {store.phone && (
                          <a
                            href={buildWhatsAppUrl(store.phone, `नमस्ते ${store.ownerName} जी, ग्रामीण किराना सहायता केंद्र से संपर्क किया जा रहा है।`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer active:scale-95 transition-all"
                            title="व्हाट्सएप सहायता भेजें"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        )}

                        {/* Plan Upgrade / Downgrade Button */}
                        <button
                          onClick={() => handleSubscriptionToggle(store)}
                          className={`text-xs font-black px-3 py-2 rounded-xl cursor-pointer active:scale-95 transition-all shadow-2xs ${
                            isPro
                              ? 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                              : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          {isPro ? 'डाउनग्रेड (FREE)' : '1-क्लिक PRO अपग्रेड'}
                        </button>

                        {/* Suspend / Re-activate Button */}
                        <button
                          onClick={() => handleToggleStoreStatus(store)}
                          className={`text-xs font-bold px-2.5 py-2 rounded-xl cursor-pointer active:scale-95 transition-all border ${
                            store.isActive
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title={store.isActive ? 'खाता निलंबित करें' : 'खाता पुनः सक्रिय करें'}
                        >
                          {store.isActive ? 'निलंबित करें' : 'सक्रिय करें'}
                        </button>

                        {/* PIN Reset Helpline Button */}
                        <button
                          onClick={() => handleResetPin(store)}
                          className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 cursor-pointer active:scale-95 transition-all"
                          title="दुकानदार का गुप्त 4-अंकों का PIN रीसेट करें"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {/* Safe Store Delete Button */}
                        <button
                          onClick={() => handleDeleteStore(store)}
                          className="p-2 rounded-xl bg-stone-50 hover:bg-rose-50 text-stone-400 hover:text-rose-700 border border-stone-200 hover:border-rose-300 cursor-pointer active:scale-95 transition-all"
                          title="टेस्ट / निष्क्रिय दुकान हटाएं"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};


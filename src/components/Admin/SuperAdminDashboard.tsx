import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Users, IndianRupee, ShieldAlert, 
  Search, RefreshCw, LogOut, AlertTriangle, 
  Phone, MessageSquare, MapPin, Crown,
  Download, KeyRound, Trash2, Megaphone,
  Eye, Clock, Plus, X, Send, CreditCard,
  CheckCircle2, XCircle, Copy, CheckCheck,
  Pause, Play, Bell, Zap, Sliders, Ticket,
  Database, SlidersHorizontal, Layers, HardDrive,
  Globe, ShieldCheck, AlertOctagon, UserCheck, Ban,
  Filter, FileText
} from 'lucide-react';
import { adminService, type PlatformOverviewResponse } from '../../services/adminService';
import type { 
  AdminStoreSummary, PlatformAnnouncement, AnnouncementType, 
  AnnouncementTargetMode, PaymentClaim, VoucherItem, StoreStorageAnalytics, 
  PlatformStorageOverview, LeadCategory, FraudRadarOverview, 
  SecurityAuditLogItem, FlaggedStoreRisk 
} from '../../types';
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
  const [selectedPlan] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');

  // Tabs: STORES | PAYMENTS | VOUCHERS | BROADCASTS | STORAGE | FRAUD_RADAR
  const [adminTab, setAdminTab] = useState<'STORES' | 'PAYMENTS' | 'VOUCHERS' | 'BROADCASTS' | 'STORAGE' | 'FRAUD_RADAR'>('STORES');

  // Fraud Radar & Threat Intelligence States
  const [fraudData, setFraudData] = useState<FraudRadarOverview | null>(null);
  const [loadingFraud, setLoadingFraud] = useState<boolean>(false);
  const [fraudFilter, setFraudFilter] = useState<'ALL' | 'HIGH_RISK' | 'SUSPICIOUS' | 'SAFE'>('ALL');
  const [fraudSearch, setFraudSearch] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [auditLogPage, setAuditLogPage] = useState<number>(1);
  const [auditLogTotalPages, setAuditLogTotalPages] = useState<number>(1);
  const [activeFraudSubTab, setActiveFraudSubTab] = useState<'THREATS' | 'COLLISIONS' | 'AUDIT_LOGS'>('THREATS');
  const [suspendModal, setSuspendModal] = useState<{
    isOpen: boolean;
    store: FlaggedStoreRisk | null;
    reason: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    store: null,
    reason: 'संदिग्ध गतिविधि / सुरक्षा जांच',
    isProcessing: false,
  });

  // Storage & Upgrade Analytics States
  const [storageData, setStorageData] = useState<{ overview: PlatformStorageOverview; stores: StoreStorageAnalytics[] } | null>(null);
  const [loadingStorage, setLoadingStorage] = useState<boolean>(false);
  const [storageSearchQuery, setStorageSearchQuery] = useState<string>('');
  const [storageCategoryFilter, setStorageCategoryFilter] = useState<'ALL' | LeadCategory>('ALL');

  // Store 360° Inspector State
  const [inspectorStore, setInspectorStore] = useState<AdminStoreSummary | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [editingFeatures, setEditingFeatures] = useState<Record<string, boolean>>({});
  const [editingQuotas, setEditingQuotas] = useState<{ maxProducts: number; maxCustomers: number }>({ maxProducts: 50, maxCustomers: 100 });
  const [savingFeatures, setSavingFeatures] = useState<boolean>(false);
  const [savingQuotas, setSavingQuotas] = useState<boolean>(false);
  const [newMunimPinInput, setNewMunimPinInput] = useState<string>('');
  const [resettingMunimPin, setResettingMunimPin] = useState<boolean>(false);

  // Expiry & Pro Status Filter: 'ALL' | 'PRO' | 'EXPIRING_SOON' | 'PAUSED' | 'FREE' | 'EXPIRED'
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'PRO' | 'EXPIRING_SOON' | 'PAUSED' | 'FREE' | 'EXPIRED'>('ALL');

  // Pause Store Modal State
  const [pauseModal, setPauseModal] = useState<{
    isOpen: boolean;
    store: AdminStoreSummary | null;
    reason: string;
  }>({
    isOpen: false,
    store: null,
    reason: 'दुकानदार का अनुरोध',
  });

  // Bulk Actions Confirmation Modal State
  const [bulkActionModal, setBulkActionModal] = useState<{
    isOpen: boolean;
    action: 'PAUSE_ALL' | 'RESUME_ALL' | 'SUSPEND_ALL' | 'ACTIVATE_ALL' | null;
    title: string;
    desc: string;
    reason: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    action: null,
    title: '',
    desc: '',
    reason: 'प्लेटफ़ॉर्म रखरखाव',
    isProcessing: false,
  });

  // Payment Claims States
  const [paymentClaims, setPaymentClaims] = useState<PaymentClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState<boolean>(false);
  const [claimStatusFilter, setClaimStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [actioningClaimId, setActioningClaimId] = useState<string | null>(null);
  const [rejectModalClaim, setRejectModalClaim] = useState<PaymentClaim | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('बैंक खाते में इस UTR से भुगतान प्राप्त नहीं हुआ।');
  const [copiedUtrId, setCopiedUtrId] = useState<string | null>(null);

  // Broadcast & Announcement States
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState<boolean>(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);

  // New broadcast form states
  const [newTitle, setNewTitle] = useState<string>('');
  const [newMessage, setNewMessage] = useState<string>('');
  const [newType, setNewType] = useState<AnnouncementType>('INFO');
  const [newTargetMode, setNewTargetMode] = useState<AnnouncementTargetMode>('ALL');
  const [newTargetStoreIds, setNewTargetStoreIds] = useState<string[]>([]);
  const [newTargetPlan, setNewTargetPlan] = useState<'ALL' | 'FREE' | 'PRO'>('ALL');
  const [newTargetDistrict, setNewTargetDistrict] = useState<string>('ALL');
  const [newDurationDays, setNewDurationDays] = useState<number>(7);
  const [storeFilterInModal, setStoreFilterInModal] = useState<string>('');
  const [creatingBroadcast, setCreatingBroadcast] = useState<boolean>(false);

  // Single-Use Voucher States
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState<boolean>(false);
  const [voucherFilter, setVoucherFilter] = useState<'ALL' | 'ACTIVE' | 'REDEEMED'>('ALL');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);
  const [newVoucherMonths, setNewVoucherMonths] = useState<1 | 3 | 12>(1);
  const [newVoucherCount, setNewVoucherCount] = useState<number>(1);
  const [newVoucherNote, setNewVoucherNote] = useState<string>('');
  const [newVoucherCampaign, setNewVoucherCampaign] = useState<string>('');
  const [creatingVoucher, setCreatingVoucher] = useState<boolean>(false);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);

  const adminInfo = adminService.getAdminInfo();

  const loadVouchers = async (filter = voucherFilter) => {
    try {
      setLoadingVouchers(true);
      const list = await adminService.getVouchers(filter);
      setVouchers(list);
    } catch (err: any) {
      console.error('Failed to load vouchers:', err);
    } finally {
      setLoadingVouchers(false);
    }
  };

  const loadStorageAnalytics = async () => {
    try {
      setLoadingStorage(true);
      const data = await adminService.getStorageAnalytics();
      setStorageData(data);
    } catch (err: any) {
      console.error('Failed to load storage analytics:', err);
    } finally {
      setLoadingStorage(false);
    }
  };

  const loadFraudRadar = async () => {
    try {
      setLoadingFraud(true);
      const data = await adminService.getFraudRadar();
      setFraudData(data);
    } catch (err: any) {
      console.error('Failed to load fraud radar:', err);
    } finally {
      setLoadingFraud(false);
    }
  };

  const loadSecurityAuditLogs = async (page = 1) => {
    try {
      setLoadingLogs(true);
      const data = await adminService.getSecurityAuditLogs({
        page,
        limit: 25,
        riskLevel: fraudFilter !== 'ALL' ? fraudFilter : undefined,
        q: fraudSearch.trim() || undefined,
      });
      setAuditLogs(data.logs || []);
      setAuditLogPage(data.page || 1);
      setAuditLogTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenSuspendModal = (store: FlaggedStoreRisk) => {
    setSuspendModal({
      isOpen: true,
      store,
      reason: 'संदिग्ध गतिविधि / सुरक्षा जांच',
      isProcessing: false,
    });
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModal.store) return;
    try {
      setSuspendModal(prev => ({ ...prev, isProcessing: true }));
      await adminService.suspendStore(suspendModal.store.storeId, suspendModal.reason);
      alert(`'${suspendModal.store.storeName}' का खाता सफलतापूर्वक निलंबित (Freeze) कर दिया गया है।`);
      setSuspendModal({ isOpen: false, store: null, reason: '', isProcessing: false });
      await loadFraudRadar();
      await loadData(true);
    } catch (err: any) {
      alert(`खाता निलंबित करने में त्रुटि: ${err.message}`);
      setSuspendModal(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleUnsuspendStore = async (store: FlaggedStoreRisk) => {
    if (!window.confirm(`क्या आप '${store.storeName}' का खाता पुनः सक्रिय (Unsuspend) करना चाहते हैं?`)) return;
    try {
      await adminService.unsuspendStore(store.storeId);
      alert(`'${store.storeName}' का खाता पुनः सक्रिय हो गया है।`);
      await loadFraudRadar();
      await loadData(true);
    } catch (err: any) {
      alert(`पुनः सक्रिय करने में त्रुटि: ${err.message}`);
    }
  };

  const handleFraudWhatsAppInquiry = (store: FlaggedStoreRisk) => {
    const cleanPhone = store.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('फोन नंबर उपलब्ध नहीं है');
      return;
    }
    const message = `नमस्ते ${store.ownerName} जी,\n\nग्रामीण किराना सुरक्षा व सपोर्ट टीम की ओर से संदेश।\n\nआपकी दुकान "${store.storeName}" (${store.village}, ${store.district}) के खाते पर सुरक्षा रडार ने एक अलर्ट दर्ज किया है:\n• जोखिम श्रेणी: ${store.riskLevel}\n• मुख्य कारण: ${store.riskReasons.slice(0, 2).join(', ') || 'सत्यापन आवश्यक'}\n\nकृपया अपनी दुकान का सत्यापन पूर्ण करने हेतु अपनी दुकान का बोर्ड या बिल पर्ची की फोटो साझा करें।\n\n— ग्रामीण किराना सुरक्षा दल`;
    const url = buildWhatsAppUrl(cleanPhone, message);
    window.open(url, '_blank');
  };

  const handleOpenInspector = (store: AdminStoreSummary) => {
    setInspectorStore(store);
    setEditingFeatures({
      haatMode: !!store.featureOverrides?.haatMode,
      thermalPrinting: !!store.featureOverrides?.thermalPrinting,
      voiceBilling: !!store.featureOverrides?.voiceBilling,
      cameraScanner: !!store.featureOverrides?.cameraScanner,
      spoilageGuard: !!store.featureOverrides?.spoilageGuard,
      mandiPlanner: !!store.featureOverrides?.mandiPlanner,
    });
    setEditingQuotas({
      maxProducts: store.quotaOverrides?.maxProducts || (store.subscription.plan === 'PRO' ? 2000 : 50),
      maxCustomers: store.quotaOverrides?.maxCustomers || (store.subscription.plan === 'PRO' ? 5000 : 100),
    });
    setNewMunimPinInput('');
    setIsInspectorOpen(true);
  };

  const handleSaveFeatures = async () => {
    if (!inspectorStore) return;
    try {
      setSavingFeatures(true);
      const res = await adminService.updateStoreFeatures(inspectorStore.id, editingFeatures);
      alert(res.message || 'फ़ीचर मॉड्यूल सफलतापूर्वक अपडेट किए गए!');
      setStores(prev => prev.map(s => s.id === inspectorStore.id ? {
        ...s,
        featureOverrides: editingFeatures
      } : s));
      if (storageData) {
        loadStorageAnalytics();
      }
    } catch (err: any) {
      alert(`फ़ीचर अपडेट में त्रुटि: ${err.message}`);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleSaveQuotas = async () => {
    if (!inspectorStore) return;
    try {
      setSavingQuotas(true);
      const res = await adminService.updateStoreQuotas(inspectorStore.id, editingQuotas);
      alert(res.message || 'कोटा सीमाएं सफलतापूर्वक अपडेट की गईं!');
      setStores(prev => prev.map(s => s.id === inspectorStore.id ? {
        ...s,
        quotaOverrides: editingQuotas
      } : s));
      if (storageData) {
        loadStorageAnalytics();
      }
    } catch (err: any) {
      alert(`कोटा अपडेट में त्रुटि: ${err.message}`);
    } finally {
      setSavingQuotas(false);
    }
  };

  const handleResetMunimPinSubmit = async () => {
    if (!inspectorStore) return;
    if (!newMunimPinInput || !/^\d{4}$/.test(newMunimPinInput.trim())) {
      alert('कृपया ठीक 4 अंकों का गुप्त PIN दर्ज करें (जैसे 1234)');
      return;
    }
    try {
      setResettingMunimPin(true);
      const res = await adminService.resetMunimPin(inspectorStore.id, newMunimPinInput);
      alert(`सफलता: ${res.message}\nनया मुनीम PIN: ${newMunimPinInput.trim()}`);
      setNewMunimPinInput('');
    } catch (err: any) {
      alert(`मुनीम PIN रीसेट में विफल: ${err.message}`);
    } finally {
      setResettingMunimPin(false);
    }
  };

  const handleSendUpgradePitch = (s: StoreStorageAnalytics) => {
    const owner = s.ownerName && s.ownerName !== 'दुकानदार' ? s.ownerName : 'दुकानदार महोदय';
    const msg =
      `नमस्ते ${owner} जी 🙏\n\n` +
      `आपकी दुकान *${s.storeName}* (${s.village}) में ग्रामीण किराना ऐप का बेहतरीन उपयोग हो रहा है!\n\n` +
      `📊 *आपकी वर्तमान प्रगति:*\n` +
      `• कुल दर्ज सामान: ${s.counts.products} उत्पाद\n` +
      `• कुल बही-खाता ग्राहक: ${s.counts.customers} ग्राहक\n` +
      `• कुल बिल व लेन-देन: ${s.counts.sales + s.counts.transactions}\n\n` +
      `🚀 आपकी दुकान अब *ग्रामिन प्रो (Gramin Pro)* में अपग्रेड के लिए तैयार है! प्रो प्लान में आपको असीमित सामान, ब्लूटूथ थर्मल प्रिंटिंग, साप्ताहिक हाट-बाज़ार मोड और स्वचालित डिजिटल पासबुक की सुविधा मिलती है।\n\n` +
      `विशेष ग्रामीण ऑफ़र केवल ₹99/माह या ₹899/वर्ष। क्या हम आज आपकी दुकान का प्रो प्लान सक्रिय करें?`;

    const cleanPhone = s.phone.replace(/\D/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleExportStorageCSV = () => {
    if (!storageData || !storageData.stores.length) return;
    const headers = [
      'दुकान का नाम',
      'संचालक',
      'मोबाइल',
      'गाँव',
      'जिला',
      'प्लान',
      'ट्रायल स्थिति',
      'उत्पाद संख्या',
      'ग्राहक संख्या',
      'बिक्री संख्या',
      'उधार-जमा संख्या',
      'खराबी रिकॉर्ड',
      'कुल रिकॉर्ड',
      'अनुमानित डेटा (KB)',
      'स्टोरेज उपयोग %',
      'अपग्रेड स्कोर %',
      'लीड श्रेणी',
      'खाता स्थिति'
    ];

    const rows = storageData.stores.map(s => [
      `"${s.storeName.replace(/"/g, '""')}"`,
      `"${s.ownerName.replace(/"/g, '""')}"`,
      s.phone,
      `"${s.village.replace(/"/g, '""')}"`,
      `"${s.district.replace(/"/g, '""')}"`,
      s.plan,
      s.isTrial ? 'हाँ (TRIAL)' : 'नहीं',
      s.counts.products,
      s.counts.customers,
      s.counts.sales,
      s.counts.transactions,
      s.counts.spoilage,
      s.counts.totalRecords,
      s.estimatedStorageKb,
      `${s.storageUsedPercent}%`,
      `${s.upgradeReadinessScore}%`,
      s.leadCategory,
      s.isActive ? 'सक्रिय' : 'निलंबित'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gramin_kirana_storage_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateVouchers = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingVoucher(true);
      const res = await adminService.generateVouchers(
        newVoucherMonths,
        newVoucherNote.trim() || undefined,
        newVoucherCount,
        newVoucherCampaign.trim().toUpperCase() || undefined
      );
      alert(res.message || `${res.vouchers?.length || newVoucherCount} नए सिंगल-यूज़ वाउचर सफलतापूर्वक बनाए गए!`);
      setIsVoucherModalOpen(false);
      setNewVoucherNote('');
      setNewVoucherCampaign('');
      setNewVoucherCount(1);
      await loadVouchers();
    } catch (err: any) {
      alert(`वाउचर बनाने में विफल: ${err.message}`);
    } finally {
      setCreatingVoucher(false);
    }
  };

  const handleDeleteVoucher = async (voucher: VoucherItem) => {
    const vId = voucher._id || voucher.id;
    if (!vId) return;
    if (voucher.isRedeemed) {
      alert('उपयोग हो चुका वाउचर हटाया नहीं जा सकता।');
      return;
    }
    if (!window.confirm(`क्या आप वाउचर "${voucher.code}" को हटाना चाहते हैं?`)) return;
    try {
      await adminService.deleteVoucher(vId);
      setVouchers(prev => prev.filter(v => (v._id || v.id) !== vId));
    } catch (err: any) {
      alert(`वाउचर हटाने में विफल: ${err.message}`);
    }
  };

  const handleCopyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucherCode(code);
    setTimeout(() => setCopiedVoucherCode(null), 2500);
  };

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const list = await adminService.getAnnouncements();
      setAnnouncements(list);
    } catch (err: any) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleToggleAnnouncement = async (announcement: PlatformAnnouncement) => {
    const id = announcement._id || announcement.id;
    if (!id) return;
    try {
      await adminService.toggleAnnouncement(id);
      setAnnouncements(prev => prev.map(a => (a._id === id || a.id === id) ? { ...a, isActive: !a.isActive } : a));
    } catch (err: any) {
      alert(`स्थिति बदलने में विफल: ${err.message}`);
    }
  };

  const handleDeleteAnnouncement = async (announcement: PlatformAnnouncement) => {
    const id = announcement._id || announcement.id;
    if (!id) return;
    if (!window.confirm(`क्या आप इस घोषणा को हटाना चाहते हैं: "${announcement.title}"?`)) return;

    try {
      await adminService.deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a._id !== id && a.id !== id));
    } catch (err: any) {
      alert(`घोषणा हटाने में विफल: ${err.message}`);
    }
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      alert('कृपया घोषणा का शीर्षक और संदेश दर्ज करें।');
      return;
    }
    if (newTargetMode === 'SELECTED' && newTargetStoreIds.length === 0) {
      alert('कृपया कम से कम एक लक्षित दुकान चुनें।');
      return;
    }

    try {
      setCreatingBroadcast(true);
      const created = await adminService.createAnnouncement({
        title: newTitle.trim(),
        message: newMessage.trim(),
        type: newType,
        targetMode: newTargetMode,
        targetStoreIds: newTargetMode === 'SELECTED' ? newTargetStoreIds : [],
        targetPlan: newTargetPlan,
        targetDistrict: newTargetDistrict,
        durationDays: newDurationDays,
      });

      setAnnouncements(prev => [created, ...prev]);
      setIsBroadcastModalOpen(false);

      // Reset form
      setNewTitle('');
      setNewMessage('');
      setNewType('INFO');
      setNewTargetMode('ALL');
      setNewTargetStoreIds([]);
      setNewTargetPlan('ALL');
      setNewTargetDistrict('ALL');
      setNewDurationDays(7);
      setStoreFilterInModal('');
      alert('🎉 लाइव घोषणा सफलतापूर्वक प्रसारित कर दी गई!');
    } catch (err: any) {
      alert(`घोषणा प्रसारित करने में विफल: ${err.message}`);
    } finally {
      setCreatingBroadcast(false);
    }
  };

  const loadPaymentClaims = async (status = claimStatusFilter) => {
    try {
      setLoadingClaims(true);
      const list = await adminService.getPaymentClaims(status);
      setPaymentClaims(list);
    } catch (err: any) {
      console.error('Failed to load payment claims:', err);
    } finally {
      setLoadingClaims(false);
    }
  };

  const handleApproveClaim = async (claim: PaymentClaim) => {
    const claimId = claim._id || claim.id;
    if (!claimId) return;

    if (!window.confirm(`क्या आप दुकान '${claim.storeName}' के लिए UTR: ${claim.utrNumber} (₹${claim.amount} - ${claim.planDurationMonths} माह) का भुगतान स्वीकृत कर प्रो प्लान सक्रिय करना चाहते हैं?\n\n(यदि दुकान पहले से प्रो है, तो शेष दिनों में यह अवधि जुड़ जाएगी)`)) {
      return;
    }

    try {
      setActioningClaimId(claimId);
      const res = await adminService.approvePaymentClaim(claimId);
      alert(res.message || 'प्रो प्लान सफलतापूर्वक सक्रिय हो गया!');
      await loadData(true);
    } catch (err: any) {
      alert(`स्वीकृति में त्रुटि: ${err.message}`);
    } finally {
      setActioningClaimId(null);
    }
  };

  const handleRejectClaim = async () => {
    if (!rejectModalClaim) return;
    const claimId = rejectModalClaim._id || rejectModalClaim.id;
    if (!claimId) return;

    try {
      setActioningClaimId(claimId);
      await adminService.rejectPaymentClaim(claimId, rejectionReasonInput);
      setRejectModalClaim(null);
      alert('भुगतान क्लेम अस्वीकृत कर दिया गया।');
      await loadData(true);
    } catch (err: any) {
      alert(`अस्वीकृति में त्रुटि: ${err.message}`);
    } finally {
      setActioningClaimId(null);
    }
  };

  const handleCopyUtr = (utr: string, id: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtrId(id);
    setTimeout(() => setCopiedUtrId(null), 2000);
  };

  const isInitialMount = useRef(true);

  // Minimal targeted fetch: Only re-queries stores & overview metrics (Zero Waterfall)
  const loadStoresAndOverview = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      setError('');
      const [overviewData, storesData] = await Promise.all([
        adminService.getOverview(),
        adminService.getStores(searchQuery, selectedPlan, selectedDistrict),
      ]);
      setOverview(overviewData);
      setStores(storesData);
    } catch (err: any) {
      setError(err.message || 'स्टोर डेटा लोड करने में असमर्थ');
    } finally {
      if (isManualRefresh) setRefreshing(false);
    }
  };

  const loadData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const [overviewData, storesData, announcementsData, claimsData, vouchersData] = await Promise.all([
        adminService.getOverview(),
        adminService.getStores(searchQuery, selectedPlan, selectedDistrict),
        adminService.getAnnouncements().catch(() => []),
        adminService.getPaymentClaims(claimStatusFilter).catch(() => []),
        adminService.getVouchers(voucherFilter).catch(() => []),
      ]);

      setOverview(overviewData);
      setStores(storesData);
      setAnnouncements(announcementsData);
      setPaymentClaims(claimsData);
      setVouchers(vouchersData);
    } catch (err: any) {
      setError(err.message || 'डेटा लोड करने में असमर्थ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 1. Initial mount: Load all initial badge counters and primary overview
  // Subsequent store filter changes: Only refresh stores & overview (zero redundant calls)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData();
      return;
    }
    loadStoresAndOverview();
  }, [selectedPlan, selectedDistrict]);

  // 2. Targeted payment claims refetch on claim filter change
  useEffect(() => {
    if (!isInitialMount.current) {
      loadPaymentClaims(claimStatusFilter);
    }
  }, [claimStatusFilter]);

  // 3. Targeted voucher refetch on voucher filter change
  useEffect(() => {
    if (!isInitialMount.current) {
      loadVouchers(voucherFilter);
    }
  }, [voucherFilter]);

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
      alert(`स्थिति बदलने में त्रुटि: ${err.message}`);
    }
  };

  const handleToggleStorePause = (store: AdminStoreSummary) => {
    if (store.subscription.status === 'PAUSED') {
      handleResumeStore(store);
    } else {
      setPauseModal({
        isOpen: true,
        store,
        reason: 'दुकानदार का अनुरोध',
      });
    }
  };

  const handleConfirmPauseStore = async () => {
    if (!pauseModal.store) return;
    try {
      const res = await adminService.toggleStoreSubscriptionPause(
        pauseModal.store.id, 
        'PAUSE', 
        pauseModal.reason
      );
      alert(res.message || 'प्रो प्लान सफलतापूर्वक रोका गया (दिन फ्रीज/सुरक्षित)।');
      setPauseModal({ isOpen: false, store: null, reason: '' });
      await loadData(true);
    } catch (err: any) {
      alert(`रोकने में त्रुटि: ${err.message}`);
    }
  };

  const handleResumeStore = async (store: AdminStoreSummary) => {
    const ok = window.confirm(`क्या आप '${store.storeName}' का प्रो प्लान पुनः सक्रिय करना चाहते हैं? फ्रीज किए गए दिन आज से आगे जुड़ेंगे।`);
    if (!ok) return;

    try {
      const res = await adminService.toggleStoreSubscriptionPause(store.id, 'RESUME');
      alert(res.message || 'प्रो प्लान पुनः चालू कर दिया गया।');
      await loadData(true);
    } catch (err: any) {
      alert(`चालू करने में त्रुटि: ${err.message}`);
    }
  };

  const triggerBulkActionModal = (action: 'PAUSE_ALL' | 'RESUME_ALL' | 'SUSPEND_ALL' | 'ACTIVATE_ALL') => {
    const titleMap = {
      PAUSE_ALL: '⏸️ सभी प्रो स्टोर रोकें (Pause All Pro)',
      RESUME_ALL: '▶️ सभी प्रो स्टोर पुनः चालू करें (Resume All Pro)',
      SUSPEND_ALL: '⛔ सभी स्टोर खाते निलंबित करें (Suspend All Accounts)',
      ACTIVATE_ALL: '✓ सभी स्टोर खाते पुनः सक्रिय करें (Activate All Accounts)',
    };
    const descMap = {
      PAUSE_ALL: 'क्या आप सच में राज्य के सभी सक्रिय प्रो स्टोरों का प्लान रोकना चाहते हैं? सभी प्रो स्टोरों के शेष दिन फ्रीज हो जाएंगे और नुकसान नहीं होगा।',
      RESUME_ALL: 'क्या आप सभी रुके हुए प्रो स्टोरों को पुनः सक्रिय करना चाहते हैं? उनके सुरक्षित शेष दिन आज से आगे बढ़ जाएंगे।',
      SUSPEND_ALL: '⚠️ अत्यंत संवेदनशील: यह क्रिया सभी दुकानदारों के खातों को अस्थायी रूप से निलंबित कर देगी।',
      ACTIVATE_ALL: 'यह क्रिया सभी दुकानदारों के खातों को पुनः सक्रिय कर देगी।',
    };

    setBulkActionModal({
      isOpen: true,
      action,
      title: titleMap[action],
      desc: descMap[action],
      reason: 'प्लेटफ़ॉर्म रखरखाव',
      isProcessing: false,
    });
  };

  const handleExecuteBulkAction = async () => {
    if (!bulkActionModal.action) return;

    try {
      setBulkActionModal(prev => ({ ...prev, isProcessing: true }));
      let resMessage = '';

      if (bulkActionModal.action === 'PAUSE_ALL' || bulkActionModal.action === 'RESUME_ALL') {
        const res = await adminService.bulkSubscriptionControl(bulkActionModal.action, bulkActionModal.reason);
        resMessage = res.message || 'बल्क प्रो नियंत्रण सफल।';
      } else {
        const res = await adminService.bulkStoreStatusControl(bulkActionModal.action);
        resMessage = res.message || 'बल्क खाता नियंत्रण सफल।';
      }

      alert(resMessage);
      setBulkActionModal({
        isOpen: false,
        action: null,
        title: '',
        desc: '',
        reason: '',
        isProcessing: false,
      });
      await loadData(true);
    } catch (err: any) {
      alert(`बल्क एक्शन में त्रुटि: ${err.message}`);
      setBulkActionModal(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleExportCSV = () => {
    if (stores.length === 0) {
      alert('डाउनलोड करने के लिए कोई दुकान उपलब्ध नहीं है।');
      return;
    }

    const headers = [
      'दुकान ID',
      'दुकान का नाम',
      'संचालक (Owner)',
      'मोबाइल नंबर',
      'जिला (District)',
      'राज्य (State)',
      'प्लान (Subscription)',
      'ट्रायल स्थिति (Trial Status)',
      'प्लान स्थिति (Status)',
      'प्रो सक्रिय तारीख',
      'वैधता समाप्ति तारीख',
      'शेष दिन (Days Remaining)',
      'रेफरल कोड (Referral Code)',
      'जुड़े दुकानदार (Referral Count)',
      'बोनस दिन (Bonus Days)',
      'पिछला UTR',
      'पंजीकरण तारीख',
      'कुल ग्राहक',
      'कुल उधारी (₹)',
      'खाता सक्रिय (Active)'
    ];

    const rows = stores.map(store => [
      `"${store.id}"`,
      `"${store.storeName.replace(/"/g, '""')}"`,
      `"${store.ownerName.replace(/"/g, '""')}"`,
      `"${store.phone}"`,
      `"${(store.address?.district || '').replace(/"/g, '""')}"`,
      `"${(store.address?.state || 'Chhattisgarh').replace(/"/g, '""')}"`,
      `"${store.subscription.plan}"`,
      store.subscription.isTrial ? 'हाँ (14-दिन ट्रायल)' : 'नहीं',
      `"${store.subscription.status}"`,
      `"${store.subscription.startDate ? new Date(store.subscription.startDate).toLocaleDateString('hi-IN') : ''}"`,
      `"${store.subscription.planExpiryDate ? new Date(store.subscription.planExpiryDate).toLocaleDateString('hi-IN') : ''}"`,
      store.subscription.daysRemaining ?? '',
      `"${store.referral?.code || ''}"`,
      store.referral?.referralCount ?? 0,
      store.referral?.bonusDaysEarned ?? 0,
      `"${store.latestClaim ? store.latestClaim.utrNumber : ''}"`,
      `"${new Date(store.createdAt).toLocaleDateString('hi-IN')}"`,
      store.customerCount,
      store.totalDebt,
      store.isActive ? 'हाँ' : 'नहीं'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gramin_kirana_stores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetPin = async (store: AdminStoreSummary) => {
    const defaultPin = '1234';
    const input = window.prompt(
      `🔐 हेल्पलाइन PIN रीसेट — '${store.storeName}' (${store.ownerName}, ${store.phone})\n\n` +
      `दुकानदार अपना PIN भूल गया है? नया 4-अंकों का गुप्त PIN दर्ज करें:`,
      defaultPin
    );

    if (input === null) return;
    const pin = input.trim();
    if (!/^\d{4}$/.test(pin)) {
      alert('त्रुटि: PIN ठीक 4 अंकों का होना चाहिए (उदा: 1234 या 5678)');
      return;
    }

    try {
      const msg = await adminService.resetStorePin(store.id, pin);
      alert(`सफलता: ${msg}\n\nनया PIN '${pin}' सेट हो गया है। कृपया दुकानदार को सूचित करें।`);
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
              <div className="text-2xl sm:text-3xl font-black text-emerald-900">
                {formatINR(overview.metrics.totalGMV)}
              </div>
              <div className="mt-2 text-[11px] text-stone-500 font-medium">
                {overview.metrics.totalSalesCount} डिजिटल बिल बनाए गए
              </div>
            </div>

            {/* Card 3: Pro Active Licenses */}
            <div className="village-card p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">प्रो लाइसेंस दर (Adoption)</span>
                <div className="p-1.5 rounded-xl bg-indigo-100 text-indigo-900">
                  <Crown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-indigo-950">
                {overview.metrics.totalStores > 0 
                  ? Math.round((overview.metrics.proStores / overview.metrics.totalStores) * 100) 
                  : 0}%
              </div>
              <div className="mt-2 text-[11px] text-stone-500 font-medium">
                ₹99/माह सदस्यता मॉडल
              </div>
            </div>

            {/* Card 4: Active Products */}
            <div className="village-card p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">सक्रिय किराना उत्पाद</span>
                <div className="p-1.5 rounded-xl bg-orange-100 text-orange-900">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-stone-950">
                {overview.metrics.totalProducts}
              </div>
              <div className="mt-2 text-[11px] text-stone-500 font-medium">
                सक्रिय किराना, तेल, अनाज व दैनिक उत्पाद
              </div>
            </div>
          </div>
        ) : null}

        {/* Mobile Navigation Tabs Grid: Zero Horizontal Scroll */}
        <div className="md:hidden grid grid-cols-2 sm:grid-cols-3 gap-1.5 border-b border-amber-200/80 pb-3">
          <button
            type="button"
            onClick={() => setAdminTab('STORES')}
            className={`flex items-center justify-between p-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              adminTab === 'STORES'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">🏪 दुकानें</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black shrink-0 ${
              adminTab === 'STORES' ? 'bg-amber-700 text-amber-100' : 'bg-stone-100 text-stone-600'
            }`}>
              {stores.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('PAYMENTS');
              loadPaymentClaims();
            }}
            className={`flex items-center justify-between p-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              adminTab === 'PAYMENTS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">💳 UPI क्लेम</span>
            </div>
            {paymentClaims.filter(c => c.status === 'PENDING').length > 0 ? (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-xs animate-pulse">
                {paymentClaims.filter(c => c.status === 'PENDING').length} नए
              </span>
            ) : (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                adminTab === 'PAYMENTS' ? 'bg-amber-700 text-amber-100' : 'bg-stone-100 text-stone-500'
              }`}>
                {paymentClaims.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('VOUCHERS');
              loadVouchers();
            }}
            className={`flex items-center justify-between p-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              adminTab === 'VOUCHERS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Ticket className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">🎟️ प्रो वाउचर</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
              adminTab === 'VOUCHERS' ? 'bg-amber-700 text-amber-100' : 'bg-stone-100 text-stone-500'
            }`}>
              {vouchers.filter(v => !v.isRedeemed).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('BROADCASTS');
              if (announcements.length === 0) loadAnnouncements();
            }}
            className={`flex items-center justify-between p-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              adminTab === 'BROADCASTS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Megaphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">📢 घोषणाएं</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
              adminTab === 'BROADCASTS' ? 'bg-amber-700 text-amber-100' : 'bg-stone-100 text-stone-500'
            }`}>
              {announcements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('STORAGE');
              loadStorageAnalytics();
            }}
            className={`flex items-center justify-between p-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              adminTab === 'STORAGE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">📊 स्टोरेज</span>
            </div>
            {storageData?.overview.hotUpgradeCount ? (
              <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-xs">
                {storageData.overview.hotUpgradeCount} हॉट
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('FRAUD_RADAR');
              loadFraudRadar();
              loadSecurityAuditLogs(1);
            }}
            className={`flex items-center justify-between p-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              adminTab === 'FRAUD_RADAR'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">🛡️ फ्रॉड रडार</span>
            </div>
            {fraudData?.overview.highRiskCount ? (
              <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-xs animate-pulse">
                {fraudData.overview.highRiskCount} अलर्ट
              </span>
            ) : null}
          </button>
        </div>

        {/* Desktop Navigation Tabs: Pill Bar */}
        <div className="hidden md:flex items-center gap-2 border-b border-amber-200/80 pb-2">
          <button
            type="button"
            onClick={() => setAdminTab('STORES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0 ${
              adminTab === 'STORES'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏪 किराना दुकानें ({stores.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('PAYMENTS');
              loadPaymentClaims();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0 ${
              adminTab === 'PAYMENTS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>💳 UPI भुगतान क्लेम</span>
            {paymentClaims.filter(c => c.status === 'PENDING').length > 0 ? (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                {paymentClaims.filter(c => c.status === 'PENDING').length} नए!
              </span>
            ) : (
              <span className="text-[11px] text-stone-400 font-normal">
                ({paymentClaims.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('VOUCHERS');
              loadVouchers();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0 ${
              adminTab === 'VOUCHERS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>🎟️ प्रो वाउचर ({vouchers.filter(v => !v.isRedeemed).length} उपलब्ध)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('BROADCASTS');
              if (announcements.length === 0) loadAnnouncements();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0 ${
              adminTab === 'BROADCASTS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>📢 मंच घोषणाएं ({announcements.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('STORAGE');
              loadStorageAnalytics();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0 ${
              adminTab === 'STORAGE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>📊 स्टोरेज व अपग्रेड एनालिटिक्स</span>
            {storageData?.overview.hotUpgradeCount ? (
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                {storageData.overview.hotUpgradeCount} हॉट!
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminTab('FRAUD_RADAR');
              loadFraudRadar();
              loadSecurityAuditLogs(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0 ${
              adminTab === 'FRAUD_RADAR'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>🛡️ फ्रॉड रडार व सुरक्षा</span>
            {fraudData?.overview.highRiskCount ? (
              <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                {fraudData.overview.highRiskCount} अलर्ट!
              </span>
            ) : null}
          </button>
        </div>

        {adminTab === 'STORES' ? (
          <>
            {/* District Breakdown Quick Bar */}
            {overview && overview.districtBreakdown.length > 0 && (
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-amber-200/80 shadow-2xs">
                <div className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  <span>छत्तीसगढ़ जिलावार दुकानें (District Distribution):</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
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

            {/* Universal Bulk Controls Bar */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 text-white border border-amber-500/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-black shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-stone-100 flex items-center gap-1.5">
                    <span>मास्टर ऑपरेशन्स (Universal Store & Pro Controls)</span>
                  </div>
                  <div className="text-[11px] text-amber-300 font-medium">
                    सभी दुकानों के प्रो प्लान व खाता स्थिति को 1-क्लिक में सुरक्षित रूप से नियंत्रित करें
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => triggerBulkActionModal('PAUSE_ALL')}
                  className="px-3 py-2 sm:py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/50 text-xs font-bold cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5"
                  title="सभी सक्रिय प्रो दुकानों का प्लान रोकें (बचे दिन फ्रीज होंगे)"
                >
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>सभी प्रो रोकें</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerBulkActionModal('RESUME_ALL')}
                  className="px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5 shadow-xs"
                  title="सभी रुके हुए प्रो दुकानों का प्लान पुनः सक्रिय करें"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-300" />
                  <span>सभी प्रो चालू करें</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerBulkActionModal('SUSPEND_ALL')}
                  className="px-3 py-2 sm:py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/80 text-xs font-bold cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5"
                  title="सभी स्टोर खातों को निलंबित करें"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>सभी निलंबित</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerBulkActionModal('ACTIVATE_ALL')}
                  className="px-3 py-2 sm:py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-emerald-600 text-xs font-bold cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5"
                  title="सभी स्टोर खातों को पुनः सक्रिय करें"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>सभी सक्रिय</span>
                </button>
              </div>
            </div>

            {/* Stores Directory & Controls */}
            <div className="village-card p-4 rounded-3xl bg-white border border-amber-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-stone-950 m-0">
                    पंजीकृत किराना दुकानें ({stores.length})
                  </h2>
                  <p className="text-xs text-stone-500 m-0 font-medium">
                    दुकान संचालक, प्रो प्लान उलटी गिनती, UTR व रिमोट खाता प्रबंधन
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

                  {/* Filter Tabs: All, Pro, Expiring Soon, Paused, Expired, Free */}
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl flex-wrap">
                    {[
                      { id: 'ALL', label: `सभी (${stores.length})` },
                      { id: 'PRO', label: `🚀 प्रो (${stores.filter(s => s.subscription.plan === 'PRO').length})` },
                      { 
                        id: 'EXPIRING_SOON', 
                        label: `🔥 7 दिन में समाप्त (${stores.filter(s => s.subscription.plan === 'PRO' && s.subscription.status === 'ACTIVE' && s.subscription.daysRemaining !== undefined && s.subscription.daysRemaining <= 7 && s.subscription.daysRemaining > 0).length})` 
                      },
                      { 
                        id: 'PAUSED', 
                        label: `⏸️ रुके हुए (${stores.filter(s => s.subscription.plan === 'PRO' && s.subscription.status === 'PAUSED').length})` 
                      },
                      { 
                        id: 'EXPIRED', 
                        label: `⌛ समाप्त (${stores.filter(s => s.subscription.plan === 'PRO' && (s.subscription.status === 'EXPIRED' || (s.subscription.daysRemaining !== undefined && s.subscription.daysRemaining <= 0))).length})` 
                      },
                      { id: 'FREE', label: `🌾 स्टार्टर (${stores.filter(s => s.subscription.plan === 'FREE').length})` },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setExpiryFilter(tab.id as any)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                          expiryFilter === tab.id
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
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="दुकान का नाम, संचालक, मोबाइल नंबर या जिला खोजें..."
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-2xs active:scale-95 transition-all"
                >
                  खोजें
                </button>
              </form>

              {/* Stores List */}
              {loading && stores.length === 0 ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="h-24 bg-stone-100 rounded-2xl" />
                  ))}
                </div>
              ) : stores.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold">कोई दुकान नहीं मिली</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stores
                    .filter(store => {
                      if (expiryFilter === 'PRO') return store.subscription.plan === 'PRO';
                      if (expiryFilter === 'EXPIRING_SOON') {
                        return store.subscription.plan === 'PRO' && 
                               store.subscription.status === 'ACTIVE' && 
                               store.subscription.daysRemaining !== undefined && 
                               store.subscription.daysRemaining <= 7 && 
                               store.subscription.daysRemaining > 0;
                      }
                      if (expiryFilter === 'PAUSED') return store.subscription.plan === 'PRO' && store.subscription.status === 'PAUSED';
                      if (expiryFilter === 'EXPIRED') {
                        return store.subscription.plan === 'PRO' && 
                               (store.subscription.status === 'EXPIRED' || (store.subscription.daysRemaining !== undefined && store.subscription.daysRemaining <= 0));
                      }
                      if (expiryFilter === 'FREE') return store.subscription.plan === 'FREE';
                      return true;
                    })
                    .map(store => {
                      const isPro = store.subscription.plan === 'PRO';
                      return (
                        <div
                          key={store.id}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                            store.isActive
                              ? store.subscription.status === 'PAUSED'
                                ? 'bg-blue-50/40 border-blue-200 hover:border-blue-300'
                                : 'bg-[#faf8f3] border-amber-200/80 hover:border-amber-300'
                              : 'bg-stone-100 border-stone-300 opacity-75'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-black text-stone-950 m-0">
                                  {store.storeName}
                                </h3>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  isPro
                                    ? store.subscription.status === 'PAUSED'
                                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                                      : store.subscription.isTrial
                                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}>
                                  {isPro 
                                    ? store.subscription.status === 'PAUSED'
                                      ? '⏸️ प्रो रुका हुआ (PAUSED)'
                                      : store.subscription.isTrial
                                      ? '🎁 14-दिन प्रो ट्रायल (TRIAL)'
                                      : '🚀 ग्रामिन प्रो (PRO)' 
                                    : '🌾 गाँव स्टार्टर (FREE)'
                                  }
                                </span>
                                {store.referral?.code && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1" title="रेफरल कोड व जुड़े दुकानदार">
                                    🎟️ {store.referral.code} ({store.referral.referralCount || 0} रेफर / +{store.referral.bonusDaysEarned || 0} दिन)
                                  </span>
                                )}
                                {!store.isActive && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                                    ⛔ निलंबित (Suspended)
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 font-medium">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-stone-400" />
                                  {store.ownerName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                                  {store.phone}
                                </span>
                                {store.address?.district && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                                    {store.address.district}
                                  </span>
                                )}
                                <span className="text-[11px] text-stone-400">
                                  पंजीकृत: {new Date(store.createdAt).toLocaleDateString('hi-IN')}
                                </span>
                              </div>

                              {/* Pro Subscription Details & Countdown */}
                              {isPro && (
                                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/90 text-xs space-y-1.5">
                                  <div className="flex items-center justify-between gap-2 flex-wrap font-bold">
                                    <div className="flex items-center gap-1.5">
                                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                                      <span className="text-amber-950 font-black">
                                        सक्रिय तारीख: {store.subscription.startDate ? new Date(store.subscription.startDate).toLocaleDateString('hi-IN') : new Date(store.createdAt).toLocaleDateString('hi-IN')}
                                      </span>
                                    </div>

                                    {/* Days Remaining Countdown Badge */}
                                    {store.subscription.status === 'PAUSED' ? (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                                        <Pause className="w-3 h-3 text-blue-700" />
                                        <span>⏸️ प्रो फ्रीज ({store.subscription.daysRemaining || 0} दिन सुरक्षित)</span>
                                      </span>
                                    ) : (store.subscription.daysRemaining !== undefined && store.subscription.daysRemaining <= 0) ? (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                                        ⌛ समाप्त (Expired)
                                      </span>
                                    ) : (store.subscription.daysRemaining !== undefined && store.subscription.daysRemaining <= 7) ? (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-200 text-amber-950 border border-amber-400 animate-pulse">
                                        ⚠️ {store.subscription.daysRemaining === 1 ? 'आज समाप्त हो रहा है' : `${store.subscription.daysRemaining} दिन शेष (नवीनीकरण निकट)`}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                        ✓ {store.subscription.daysRemaining} दिन बाकी
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] text-stone-600 flex-wrap gap-2 pt-1 border-t border-amber-200/60">
                                    <span>
                                      📅 <strong>वैधता समाप्ति:</strong> {store.subscription.planExpiryDate ? new Date(store.subscription.planExpiryDate).toLocaleDateString('hi-IN') : 'असीमित'}
                                    </span>
                                    {store.latestClaim ? (
                                      <span className="text-stone-700 font-mono bg-white px-2 py-0.5 rounded-md border border-stone-200">
                                        UTR: <strong>{store.latestClaim.utrNumber}</strong> (₹{store.latestClaim.amount})
                                      </span>
                                    ) : (
                                      <span className="text-stone-500 italic">
                                        💼 नकद / मैन्युअल सक्रियण
                                      </span>
                                    )}
                                    {store.subscription.pauseReason && (
                                      <span className="text-rose-700 font-medium">
                                        रोकने का कारण: {store.subscription.pauseReason}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Store Business Metrics Preview */}
                              <div className="mt-2 flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
                                <div className="bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                                  <span className="text-stone-500 text-[11px]">ग्राहक: </span>
                                  <span className="font-bold text-stone-900">{store.customerCount}</span>
                                </div>
                                {store.productCount !== undefined && (
                                  <div className="bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                                    <span className="text-stone-500 text-[11px]">सामान: </span>
                                    <span className="font-bold text-stone-900">{store.productCount}</span>
                                  </div>
                                )}
                                {store.salesCount !== undefined && (
                                  <div className="bg-white px-2.5 py-1 rounded-lg border border-stone-200">
                                    <span className="text-stone-500 text-[11px]">बिक्री: </span>
                                    <span className="font-bold text-stone-900">{store.salesCount}</span>
                                  </div>
                                )}
                                {store.storageKb !== undefined && (
                                  <div className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                    <span className="text-blue-700 text-[11px]">डेटा: </span>
                                    <span className="font-bold text-blue-900">{store.storageKb} KB</span>
                                  </div>
                                )}
                                <div className="bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                                  <span className="text-rose-700 text-[11px]">कुल उधारी: </span>
                                  <span className="font-black text-rose-900">{formatINR(store.totalDebt)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Quick Admin Actions */}
                            <div className="w-full sm:w-auto flex items-center gap-1.5 flex-wrap shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                              {/* WhatsApp Direct Contact Button */}
                              <a
                                href={buildWhatsAppUrl(
                                  store.phone, 
                                  `नमस्कार ${store.ownerName} जी, मैं ग्रामीण किराना एडमिन टीम से संपर्क कर रहा हूँ। आपकी दुकान '${store.storeName}' के संदर्भ में सहायता हेतु उपलब्ध हूँ।`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95 transition-all shadow-xs"
                                title="व्हाट्सएप पर सहायता संदेश भेजें"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </a>

                              {/* WhatsApp Renewal Reminder Button (if expiring soon <= 7 days) */}
                              {isPro && store.subscription.daysRemaining !== undefined && store.subscription.daysRemaining <= 7 && store.subscription.status !== 'PAUSED' && (
                                <a
                                  href={buildWhatsAppUrl(
                                    store.phone,
                                    `नमस्कार ${store.ownerName} जी, आपकी दुकान '${store.storeName}' का ग्रामिन प्रो प्लान ${store.subscription.daysRemaining === 1 ? 'आज' : `${store.subscription.daysRemaining} दिनों में`} समाप्त हो रहा है। बिना किसी रुकावट के डिजिटल खाता व बैकअप चालू रखने के लिए कृपया समय रहते प्रो नवीनीकरण करें। सहायता के लिए संपर्क करें।`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-1"
                                  title="दुकानदार को व्हाट्सएप पर नवीनीकरण तगादा भेजें"
                                >
                                  <Bell className="w-3.5 h-3.5" />
                                  <span>तगादा</span>
                                </a>
                              )}

                              {/* Pro Pause / Resume Button */}
                              {isPro && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStorePause(store)}
                                  className={`text-xs font-bold px-2.5 py-2 rounded-xl cursor-pointer active:scale-95 transition-all shadow-xs border flex items-center gap-1 ${
                                    store.subscription.status === 'PAUSED'
                                      ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-700'
                                      : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border-stone-700'
                                  }`}
                                  title={store.subscription.status === 'PAUSED' ? 'प्रो पुनः चालू करें' : 'प्रो अस्थायी रूप से रोकें (दिन फ्रीज होंगे)'}
                                >
                                  {store.subscription.status === 'PAUSED' ? (
                                    <>
                                      <Play className="w-3.5 h-3.5" />
                                      <span>प्रो चालू</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="w-3.5 h-3.5" />
                                      <span>प्रो रोकें</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Plan Upgrade / Downgrade Button */}
                              <button
                                type="button"
                                onClick={() => handleSubscriptionToggle(store)}
                                className={`text-xs font-bold px-3 py-2 rounded-xl cursor-pointer active:scale-95 transition-all shadow-xs border ${
                                  isPro
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700'
                                }`}
                                title={isPro ? 'प्लान डाउनग्रेड या नवीनीकरण करें' : 'प्रो प्लान में अपग्रेड करें'}
                              >
                                {isPro ? 'नवीनीकरण' : 'प्रो अपग्रेड'}
                              </button>

                              {/* Suspend / Re-activate Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleStoreStatus(store)}
                                className={`text-xs font-bold px-2.5 py-2 rounded-xl cursor-pointer active:scale-95 transition-all border ${
                                  store.isActive
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                                title={store.isActive ? 'खाता निलंबित करें' : 'खाता पुनः सक्रिय करें'}
                              >
                                {store.isActive ? 'निलंबित' : 'सक्रिय'}
                              </button>

                              {/* PIN Reset Helpline Button */}
                              <button
                                type="button"
                                onClick={() => handleResetPin(store)}
                                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 cursor-pointer active:scale-95 transition-all"
                                title="दुकानदार का गुप्त 4-अंकों का PIN रीसेट करें"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* 360° Store Inspector & Module Controls */}
                              <button
                                type="button"
                                onClick={() => handleOpenInspector(store)}
                                className="text-xs font-bold px-2.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 cursor-pointer active:scale-95 transition-all flex items-center gap-1 shadow-2xs"
                                title="360° मॉड्यूल नियंत्रण, कोटा व मुनीम PIN"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                                <span>नियंत्रण ⚙️</span>
                              </button>

                              {/* Safe Store Delete Button */}
                              <button
                                type="button"
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
          </>
        ) : adminTab === 'PAYMENTS' ? (
          /* PAYMENT CLAIMS VERIFICATION MANAGER */
          <div className="village-card p-4 sm:p-6 rounded-3xl bg-white border border-amber-200 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
              <div>
                <h2 className="text-base sm:text-lg font-black text-stone-950 m-0 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <span>यूपीआई भुगतान सत्यापन (UPI Payment Claims)</span>
                </h2>
                <p className="text-xs text-stone-500 m-0 font-medium">
                  दुकानदारों द्वारा प्रो अपग्रेड हेतु सबमिट किए गए 12-अंकों के UTR का बैंक खाते से मिलान कर प्रो सक्रिय करें
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(st => {
                  const labelMap = {
                    ALL: `सभी (${paymentClaims.length})`,
                    PENDING: `⏳ लंबित (${paymentClaims.filter(c => c.status === 'PENDING').length})`,
                    APPROVED: `✓ स्वीकृत (${paymentClaims.filter(c => c.status === 'APPROVED').length})`,
                    REJECTED: `✕ अस्वीकृत (${paymentClaims.filter(c => c.status === 'REJECTED').length})`,
                  };
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setClaimStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        claimStatusFilter === st
                          ? 'bg-stone-900 text-amber-400 shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {labelMap[st]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Claims Cards */}
            {loadingClaims ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-28 bg-stone-100 rounded-2xl" />
                ))}
              </div>
            ) : paymentClaims.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl bg-stone-50 border border-dashed border-stone-300">
                <CreditCard className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-stone-700 m-0">
                  {claimStatusFilter === 'ALL'
                    ? 'कोई भुगतान क्लेम दर्ज नहीं है'
                    : `कोई ${claimStatusFilter === 'PENDING' ? 'लंबित' : claimStatusFilter === 'APPROVED' ? 'स्वीकृत' : 'अस्वीकृत'} क्लेम नहीं मिला`}
                </h3>
                <p className="text-xs text-stone-400 mt-1 m-0">
                  दुकानदार जब प्रो अपग्रेड के लिए QR स्कैन कर UTR दर्ज करेंगे, वे यहाँ दिखाई देंगे।
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {paymentClaims.map(claim => {
                  const claimId = claim._id || claim.id || '';
                  const durationLabel = claim.planDurationMonths === 1 ? '1 महीना' : claim.planDurationMonths === 3 ? '3 महीने (10% छूट)' : '1 वर्ष (12 माह)';
                  const isActioning = actioningClaimId === claimId;

                  return (
                    <div
                      key={claimId}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        claim.status === 'PENDING'
                          ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                          : claim.status === 'APPROVED'
                          ? 'bg-emerald-50/20 border-emerald-200'
                          : 'bg-stone-50 border-stone-200 opacity-75'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Store & Claim Info */}
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-stone-950 text-sm sm:text-base">
                              🏪 {claim.storeName}
                            </span>
                            <span className="text-xs text-stone-500 font-medium">
                              (संचालक: {claim.ownerName} • {claim.phone})
                            </span>
                            <a
                              href={buildWhatsAppUrl(claim.phone, `नमस्ते ${claim.ownerName} जी, आपकी दुकान "${claim.storeName}" के ग्रामिन प्रो अपग्रेड (UTR: ${claim.utrNumber}) के संबंध में:`)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg no-underline"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <div className="bg-white px-2.5 py-1 rounded-xl border border-stone-200 font-semibold text-stone-800">
                              योजना: <strong className="text-amber-700 font-bold">{durationLabel}</strong>
                            </div>
                            <div className="bg-white px-2.5 py-1 rounded-xl border border-stone-200 font-semibold text-stone-800">
                              राशि: <strong className="text-emerald-700 font-black text-sm">₹{claim.amount}</strong>
                            </div>
                            <div className="text-stone-500 text-[11px]">
                              सबमिट: {new Date(claim.createdAt).toLocaleString('hi-IN')}
                            </div>
                          </div>

                          {/* UTR Highlight Card */}
                          <div className="flex items-center gap-2 flex-wrap bg-white/90 p-2.5 rounded-xl border border-stone-200 w-fit">
                            <span className="text-xs font-bold text-stone-500">12-अंक UTR:</span>
                            <span className="font-mono font-black text-stone-950 text-sm tracking-wider select-all">
                              {claim.utrNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyUtr(claim.utrNumber, claimId)}
                              className="p-1 rounded-md text-stone-500 hover:text-amber-700 hover:bg-stone-100 transition cursor-pointer"
                              title="UTR कॉपी करें"
                            >
                              {copiedUtrId === claimId ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="text-[10px] text-stone-400">
                              (बैंक ऐप / SMS में यह UTR चेक करें)
                            </span>
                          </div>

                          {claim.rejectionReason && (
                            <div className="text-xs text-rose-700 font-medium">
                              अस्वीकृति कारण: {claim.rejectionReason}
                            </div>
                          )}

                          {claim.approvedAt && (
                            <div className="text-[11px] text-emerald-800 font-medium">
                              स्वीकृत द्वारा: {claim.approvedBy || 'SUPER_ADMIN'} दिनांक {new Date(claim.approvedAt).toLocaleString('hi-IN')}
                            </div>
                          )}
                        </div>

                        {/* Status & Actions Column */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                          {claim.status === 'PENDING' ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleApproveClaim(claim)}
                                disabled={isActioning}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{isActioning ? 'सक्रिय हो रहा है...' : 'प्रो सक्रिय करें (Approve)'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalClaim(claim);
                                  setRejectionReasonInput('बैंक खाते में इस UTR से भुगतान प्राप्त नहीं हुआ।');
                                }}
                                disabled={isActioning}
                                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>अस्वीकृत</span>
                              </button>
                            </div>
                          ) : claim.status === 'APPROVED' ? (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                              <span>स्वीकृत (प्रो एक्टिव)</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 font-black text-xs flex items-center gap-1.5">
                              <XCircle className="w-4 h-4 text-rose-700" />
                              <span>अस्वीकृत</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : adminTab === 'VOUCHERS' ? (
          /* SINGLE-USE VOUCHERS MANAGER */
          <div className="village-card p-4 sm:p-6 rounded-3xl bg-white border border-amber-200 shadow-2xs space-y-5">
            {/* Voucher Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
              <div>
                <h2 className="text-base sm:text-lg font-black text-stone-950 m-0 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-amber-600" />
                  <span>सिंगल-यूज़ प्रो वाउचर (Anti-Bypass Single-Use Vouchers)</span>
                </h2>
                <p className="text-xs text-stone-500 m-0 font-medium">
                  सुरक्षित वन-टाइम प्रो कूपन कोड। एक बार रिडीम होने के बाद कोड तुरंत निष्क्रिय हो जाता है।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl cursor-pointer shadow-sm flex items-center gap-2 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ नया वाउचर कोड बनाएं</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <button
                type="button"
                onClick={() => setVoucherFilter('ALL')}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
                  voucherFilter === 'ALL'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                सभी वाउचर ({vouchers.length})
              </button>
              <button
                type="button"
                onClick={() => setVoucherFilter('ACTIVE')}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
                  voucherFilter === 'ACTIVE'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                ✓ सक्रिय / अप्रयुक्त ({vouchers.filter(v => !v.isRedeemed).length})
              </button>
              <button
                type="button"
                onClick={() => setVoucherFilter('REDEEMED')}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
                  voucherFilter === 'REDEEMED'
                    ? 'bg-stone-800 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                🔒 उपयोग हो चुके ({vouchers.filter(v => v.isRedeemed).length})
              </button>
            </div>

            {/* Vouchers Grid / List */}
            {loadingVouchers ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-20 bg-stone-100 rounded-2xl" />
                ))}
              </div>
            ) : vouchers.length === 0 ? (
              <div className="text-center py-14 bg-stone-50 rounded-2xl border border-dashed border-stone-200 p-6">
                <Ticket className="w-12 h-12 text-stone-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-sm font-bold text-stone-800">कोई वाउचर कोड नहीं मिला</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  दुकानदारों को ऑफलाइन नकद लेकर सक्रिय करने या प्रोमो देने के लिए नया सिंगल-यूज़ वाउचर बनाएं।
                </p>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>पहला वाउचर जनरेट करें</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {vouchers.map(v => {
                  const vId = v._id || v.id || v.code;
                  const isCopied = copiedVoucherCode === v.code;
                  const planText = v.durationMonths === 12 ? '1 वर्ष (वार्षिक)' : `${v.durationMonths} महीना`;
                  const shareMsg = `नमस्ते! आपकी दुकान के लिए ग्रामीण किराना प्रो (${planText}) एक्टिवेशन कोड है:\n\n🔑 *${v.code}*\n\nदुकानदार ऐप में 'कूपन या वाउचर कोड' बॉक्स में यह कोड दर्ज करके प्रो सक्रिय करें। (सुरक्षा नोट: यह सिंगल-यूज़ कोड है, केवल 1 बार उपयोग किया जा सकता है)`;

                  return (
                    <div
                      key={vId}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        v.isRedeemed
                          ? 'bg-stone-50/80 border-stone-200 opacity-75'
                          : 'bg-white border-amber-300/80 shadow-xs hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-base sm:text-lg font-black tracking-wider text-stone-950 bg-stone-100 px-2.5 py-1 rounded-xl border border-stone-300 select-all">
                              {v.code}
                            </span>
                            {v.campaign && (
                              <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-200 font-bold text-[10px] uppercase">
                                🏷️ {v.campaign}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyVoucherCode(v.code)}
                              className="p-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer active:scale-90 transition"
                              title="कोड कॉपी करें"
                            >
                              {isCopied ? (
                                <CheckCheck className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {v.note && (
                            <p className="text-xs text-stone-600 font-medium mt-1 m-0">
                              📝 {v.note}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        {v.isRedeemed ? (
                          <span className="px-2.5 py-1 rounded-full bg-stone-200 text-stone-700 text-[11px] font-black border border-stone-300 shrink-0">
                            🔒 उपयोग हो चुका
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-black border border-emerald-300 shrink-0">
                            ✓ सक्रिय (उपलब्ध)
                          </span>
                        )}
                      </div>

                      {/* Details Row */}
                      <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                            👑 {planText}
                          </span>
                          <span className="text-[11px]">
                            {new Date(v.createdAt).toLocaleDateString('hi-IN')}
                          </span>
                        </div>

                        {/* Actions or Redemption Store Name */}
                        {v.isRedeemed ? (
                          <div className="text-[11px] text-stone-600 font-medium">
                            🏪 <strong>{v.redeemedByStoreName || 'दुकान'}</strong> द्वारा रिडीम
                            {v.redeemedAt && ` (${new Date(v.redeemedAt).toLocaleDateString('hi-IN')})`}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={buildWhatsAppUrl('', shareMsg)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95 transition shadow-2xs"
                              title="व्हाट्सएप पर कोड भेजें"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>व्हाट्सएप</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteVoucher(v)}
                              className="p-1 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer active:scale-90 transition"
                              title="वाउचर हटाएं"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : adminTab === 'BROADCASTS' ? (
          /* PLATFORM BROADCASTS & ANNOUNCEMENTS MANAGER */
          <div className="village-card p-4 sm:p-6 rounded-3xl bg-white border border-amber-200 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
              <div>
                <h2 className="text-base sm:text-lg font-black text-stone-950 m-0 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-600" />
                  <span>प्लेटफ़ॉर्म लाइव घोषणाएं व ब्रॉडकास्ट ({announcements.length})</span>
                </h2>
                <p className="text-xs text-stone-500 m-0 font-medium">
                  सभी दुकानों या चुनी गई विशिष्ट दुकानों के बिलिंग काउंटर पर तुरंत लाइव बैनर संदेश भेजें
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl cursor-pointer shadow-sm flex items-center gap-2 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>नई घोषणा प्रसारित करें</span>
              </button>
            </div>

            {/* Announcements List */}
            {loadingAnnouncements ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-28 bg-stone-100 rounded-2xl" />
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-14 bg-stone-50 rounded-2xl border border-dashed border-stone-200 p-6">
                <Megaphone className="w-12 h-12 text-stone-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-sm font-bold text-stone-800">फिलहाल कोई ब्रॉडकास्ट सक्रिय नहीं है</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  आप किसी भी समय पूरे प्लेटफ़ॉर्म की सभी दुकानों या चुनी गई दुकानों के लिए नया बैनर संदेश जारी कर सकते हैं।
                </p>
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>पहला ब्रॉडकास्ट बनाएं</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map(ann => {
                  const annId = ann._id || ann.id || '';
                  const typeColors = {
                    INFO: { badge: 'bg-blue-100 text-blue-900 border-blue-300', label: 'ℹ️ सूचना' },
                    WARNING: { badge: 'bg-amber-100 text-amber-900 border-amber-300', label: '⚠️ चेतावनी' },
                    ALERT: { badge: 'bg-rose-100 text-rose-900 border-rose-300', label: '🚨 महत्वपूर्ण अलर्ट' },
                    SUCCESS: { badge: 'bg-emerald-100 text-emerald-900 border-emerald-300', label: '🎉 खुशखबरी / ऑफ़र' },
                  }[ann.type || 'INFO'];

                  return (
                    <div
                      key={annId}
                      className={`p-4 rounded-2xl border transition-all ${
                        ann.isActive
                          ? 'bg-white border-amber-200 shadow-2xs'
                          : 'bg-stone-50 border-stone-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 min-w-0">
                          {/* Badges Row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${typeColors.badge}`}>
                              {typeColors.label}
                            </span>

                            {/* Audience Target Badge */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              ann.targetMode === 'ALL'
                                ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                : 'bg-purple-50 text-purple-900 border-purple-200'
                            }`}>
                              {ann.targetMode === 'ALL'
                                ? '📢 सभी दुकानें (Universal)'
                                : `🎯 चुनी गई दुकानें (${ann.targetStoreIds?.length || 0} दुकानें)`}
                            </span>

                            {/* Plan Filter Badge */}
                            {ann.targetPlan && ann.targetPlan !== 'ALL' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                                प्लान: {ann.targetPlan}
                              </span>
                            )}

                            {/* District Filter Badge */}
                            {ann.targetDistrict && ann.targetDistrict !== 'ALL' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                                📍 {ann.targetDistrict}
                              </span>
                            )}

                            {/* Active Status Badge */}
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              ann.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-200 text-stone-600'
                            }`}>
                              {ann.isActive ? '🟢 लाइव' : '⚪ बंद'}
                            </span>
                          </div>

                          {/* Title & Message */}
                          <h3 className="text-base font-black text-stone-950 m-0">
                            {ann.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-stone-700 whitespace-pre-wrap leading-relaxed m-0">
                            {ann.message}
                          </p>

                          {/* Selected Stores Popover/List if Targeted */}
                          {ann.targetMode === 'SELECTED' && ann.targetStoreIds && ann.targetStoreIds.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200 text-xs text-purple-950">
                              <span className="font-bold">लक्षित दुकानें: </span>
                              <span className="text-stone-700 font-medium">
                                {ann.targetStoreIds.map((store: any) => 
                                  typeof store === 'object' ? `${store.storeName} (${store.ownerName || store.phone})` : store
                                ).join(', ')}
                              </span>
                            </div>
                          )}

                          {/* Meta: Expiry */}
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              समाप्ति तारीख: {ann.expiresAt ? new Date(ann.expiresAt).toLocaleDateString('hi-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }) : 'स्थायी (असीमित)'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                          <button
                            type="button"
                            onClick={() => handleToggleAnnouncement(ann)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer active:scale-95 transition-all border ${
                              ann.isActive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                            title={ann.isActive ? 'घोषणा को रोकें' : 'घोषणा को पुनः लाइव करें'}
                          >
                            {ann.isActive ? 'रोकें (Pause)' : 'लाइव करें'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                            title="घोषणा हटाएं"
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
        ) : (
          /* MULTI-STORE DATABASE STORAGE & UPGRADE ANALYTICS PANEL */
          <div className="village-card p-4 sm:p-6 rounded-3xl bg-white border border-amber-200 shadow-2xs space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
              <div>
                <h2 className="text-base sm:text-lg font-black text-stone-950 m-0 flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-600" />
                  <span>डेटा स्टोरेज व प्रो अपग्रेड एनालिटिक्स (Storage & Upgrade Engine)</span>
                </h2>
                <p className="text-xs text-stone-500 m-0 font-medium">
                  दुकान-वार MongoDB डेटा खपत, उत्पाद-ग्राहक रिकॉर्ड, और प्रो अपग्रेड के लिए सक्रिय दुकानों का स्वतः विश्लेषण
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={loadStorageAnalytics}
                  disabled={loadingStorage}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                  title="डेटा रीफ्रेश करें"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStorage ? 'animate-spin text-amber-600' : ''}`} />
                  <span>रीफ्रेश</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportStorageCSV}
                  disabled={!storageData || !storageData.stores.length}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition disabled:opacity-50"
                  title="एक्सेल स्प्रेडशीट डाउनलोड करें"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>📥 स्टोरेज व अपग्रेड CSV</span>
                </button>
              </div>
            </div>

            {loadingStorage && !storageData ? (
              <div className="space-y-4 animate-pulse">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="h-24 bg-stone-100 rounded-2xl" />
                  ))}
                </div>
                <div className="h-64 bg-stone-100 rounded-2xl" />
              </div>
            ) : storageData ? (
              <div className="space-y-5">
                {/* Platform Footprint KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Total DB Footprint */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                    <div className="flex items-center justify-between text-stone-500 mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider">कुल डेटाबेस आकार</span>
                      <HardDrive className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-stone-900">
                      {(storageData.overview.totalStorageKb / 1024).toFixed(2)} MB
                    </div>
                    <p className="text-[11px] text-stone-500 font-medium m-0 mt-1">
                      {storageData.overview.totalRecords.toLocaleString()} कुल सहेजे गए रिकॉर्ड्स
                    </p>
                  </div>

                  {/* Hot Upgrade Leads */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                    <div className="flex items-center justify-between text-emerald-800 mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider">तत्काल प्रो योग्य</span>
                      <Zap className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-950">
                      {storageData.overview.hotUpgradeCount}
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium m-0 mt-1">
                      सक्रिय स्टार्टर दुकानें • 75%+ कोटा इस्तेमाल
                    </p>
                  </div>

                  {/* Nearing Quota */}
                  <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200">
                    <div className="flex items-center justify-between text-orange-800 mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider">कोटा सीमा के पास</span>
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-orange-950">
                      {storageData.overview.nearingQuotaCount}
                    </div>
                    <p className="text-[11px] text-orange-700 font-medium m-0 mt-1">
                      50 उत्पाद / 100 ग्राहक सीमा भरने के निकट
                    </p>
                  </div>

                  {/* Power Pro Merchants */}
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
                    <div className="flex items-center justify-between text-purple-800 mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider">पावर प्रो स्टोर</span>
                      <Crown className="w-4 h-4 text-purple-700" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-purple-950">
                      {storageData.overview.powerMerchantCount}
                    </div>
                    <p className="text-[11px] text-purple-700 font-medium m-0 mt-1">
                      सक्रिय प्रो लाइसेंस व उच्च बिक्री
                    </p>
                  </div>
                </div>

                {/* Collection Breakdown Strip */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 text-xs">
                  <div className="font-bold text-stone-700 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-stone-500" />
                    <span>संग्रह-वार रिकॉर्ड्स व डेटा खपत (MongoDB Collection Breakdown):</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2 rounded-xl bg-white border border-stone-200">
                      <div className="text-[11px] text-stone-500 font-medium">📦 किराना सामान</div>
                      <div className="font-black text-stone-900">{storageData.overview.collectionBreakdown.products.count}</div>
                      <div className="text-[10px] text-stone-400">~{storageData.overview.collectionBreakdown.products.estimatedKb} KB</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-stone-200">
                      <div className="text-[11px] text-stone-500 font-medium">👥 खाता ग्राहक</div>
                      <div className="font-black text-stone-900">{storageData.overview.collectionBreakdown.customers.count}</div>
                      <div className="text-[10px] text-stone-400">~{storageData.overview.collectionBreakdown.customers.estimatedKb} KB</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-stone-200">
                      <div className="text-[11px] text-stone-500 font-medium">🧾 बिक्री बिल</div>
                      <div className="font-black text-stone-900">{storageData.overview.collectionBreakdown.sales.count}</div>
                      <div className="text-[10px] text-stone-400">~{storageData.overview.collectionBreakdown.sales.estimatedKb} KB</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-stone-200">
                      <div className="text-[11px] text-stone-500 font-medium">⚖️ उधार-जमा</div>
                      <div className="font-black text-stone-900">{storageData.overview.collectionBreakdown.transactions.count}</div>
                      <div className="text-[10px] text-stone-400">~{storageData.overview.collectionBreakdown.transactions.estimatedKb} KB</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-stone-200">
                      <div className="text-[11px] text-stone-500 font-medium">⚠️ खराबी/एक्सपायरी</div>
                      <div className="font-black text-stone-900">{storageData.overview.collectionBreakdown.spoilage.count}</div>
                      <div className="text-[10px] text-stone-400">~{storageData.overview.collectionBreakdown.spoilage.estimatedKb} KB</div>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    {[
                      { key: 'ALL', label: `सभी (${storageData.stores.length})` },
                      { key: 'HOT_UPGRADE', label: `🚀 हॉट अपग्रेड (${storageData.overview.hotUpgradeCount})` },
                      { key: 'NEARING_QUOTA', label: `🟡 कोटा सीमा के पास (${storageData.overview.nearingQuotaCount})` },
                      { key: 'POWER_MERCHANT', label: `⚡ पावर मर्चेंट (${storageData.overview.powerMerchantCount})` },
                      { key: 'DORMANT', label: `💤 निष्क्रिय (${storageData.overview.dormantCount})` },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setStorageCategoryFilter(tab.key as any)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
                          storageCategoryFilter === tab.key
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative sm:w-72">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={storageSearchQuery}
                      onChange={(e) => setStorageSearchQuery(e.target.value)}
                      placeholder="दुकान, गाँव, संचालक खोजें..."
                      className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>

                {/* Store Storage & Upgrade Analytics Cards */}
                <div className="space-y-3">
                  {storageData.stores
                    .filter(s => {
                      if (storageCategoryFilter !== 'ALL' && s.leadCategory !== storageCategoryFilter) {
                        return false;
                      }
                      if (!storageSearchQuery.trim()) return true;
                      const q = storageSearchQuery.toLowerCase();
                      return (
                        s.storeName.toLowerCase().includes(q) ||
                        s.ownerName.toLowerCase().includes(q) ||
                        s.phone.includes(q) ||
                        s.village.toLowerCase().includes(q) ||
                        s.district.toLowerCase().includes(q)
                      );
                    })
                    .map(store => {
                      const leadBadgeMap = {
                        HOT_UPGRADE: { badge: 'bg-emerald-100 text-emerald-900 border-emerald-300', label: '🔥 हॉट अपग्रेड (तत्काल प्रो योग्य)' },
                        NEARING_QUOTA: { badge: 'bg-amber-100 text-amber-900 border-amber-300', label: '🟡 कोटा सीमा के पास' },
                        POWER_MERCHANT: { badge: 'bg-purple-100 text-purple-900 border-purple-300', label: '⚡ पावर मर्चेंट (सक्रिय प्रो)' },
                        DORMANT: { badge: 'bg-stone-100 text-stone-600 border-stone-300', label: '💤 निष्क्रिय (सपोर्ट आवश्यक)' },
                        STEADY: { badge: 'bg-blue-50 text-blue-800 border-blue-200', label: '🌾 सामान्य स्टार्टर' },
                      }[store.leadCategory];

                      return (
                        <div
                          key={store.tenantId}
                          className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-300 shadow-2xs transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-black text-stone-900 m-0 truncate">
                                  {store.storeName}
                                </h3>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${leadBadgeMap.badge}`}>
                                  {leadBadgeMap.label}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  store.plan === 'PRO' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-700'
                                }`}>
                                  {store.plan === 'PRO' ? (store.isTrial ? '🎁 प्रो ट्रायल' : '🚀 प्रो प्लान') : '🌾 गाँव स्टार्टर (मुफ़्त)'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 font-medium">
                                <span>संचालक: <strong className="text-stone-700">{store.ownerName}</strong></span>
                                <span>मो.: <strong className="text-stone-700">{store.phone}</strong></span>
                                <span>📍 {store.village}{store.district ? `, ${store.district}` : ''}</span>
                                {store.lastActivityAt && (
                                  <span className="text-[11px] text-stone-400">
                                    सक्रिय: {new Date(store.lastActivityAt).toLocaleDateString('hi-IN')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                              {/* WhatsApp Pitch */}
                              {store.plan === 'FREE' && (
                                <button
                                  type="button"
                                  onClick={() => handleSendUpgradePitch(store)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
                                  title="व्हाट्सएप पर प्रो अपग्रेड ऑफ़र भेजें"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>अपग्रेड पिच 💬</span>
                                </button>
                              )}

                              {/* 360 Inspector */}
                              <button
                                type="button"
                                onClick={() => {
                                  const matchedStore = stores.find(s => s.id === store.tenantId);
                                  if (matchedStore) handleOpenInspector(matchedStore);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition"
                                title="360° मॉड्यूल नियंत्रण व कोटा"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                                <span>360° नियंत्रण</span>
                              </button>
                            </div>
                          </div>

                          {/* Database Stats Badges */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <div className="bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                              <span className="text-stone-500 text-[11px]">📦 सामान: </span>
                              <span className="font-bold text-stone-800">{store.counts.products}</span>
                            </div>
                            <div className="bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                              <span className="text-stone-500 text-[11px]">👥 ग्राहक: </span>
                              <span className="font-bold text-stone-800">{store.counts.customers}</span>
                            </div>
                            <div className="bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                              <span className="text-stone-500 text-[11px]">🧾 बिक्री बिल: </span>
                              <span className="font-bold text-stone-800">{store.counts.sales}</span>
                            </div>
                            <div className="bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                              <span className="text-stone-500 text-[11px]">⚖️ लेन-देन: </span>
                              <span className="font-bold text-stone-800">{store.counts.transactions}</span>
                            </div>
                            <div className="bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
                              <span className="text-stone-500 text-[11px]">⚠️ खराबी: </span>
                              <span className="font-bold text-stone-800">{store.counts.spoilage}</span>
                            </div>
                            <div className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 ml-auto">
                              <span className="text-blue-700 text-[11px] font-bold">अनुमानित डेटा: </span>
                              <span className="font-black text-blue-950">{store.estimatedStorageKb} KB</span>
                            </div>
                          </div>

                          {/* Quota & Upgrade Progress Meters */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-stone-100 text-xs">
                            {/* Quota Usage */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
                                <span>स्टार्टर कोटा उपयोग (Capacity)</span>
                                <span className="font-bold text-stone-900">{store.storageUsedPercent}%</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    store.storageUsedPercent >= 80
                                      ? 'bg-rose-500'
                                      : store.storageUsedPercent >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, store.storageUsedPercent)}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-stone-400">
                                सीमा: {store.quotaLimits.maxProducts} उत्पाद • {store.quotaLimits.maxCustomers} ग्राहक
                              </div>
                            </div>

                            {/* Upgrade Readiness Meter */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
                                <span>प्रो अपग्रेड लीड स्कोर (Readiness)</span>
                                <span className={`font-bold ${
                                  store.upgradeReadinessScore >= 70 ? 'text-emerald-700' : 'text-stone-700'
                                }`}>
                                  {store.upgradeReadinessScore}/100
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    store.upgradeReadinessScore >= 70
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                                      : store.upgradeReadinessScore >= 45
                                      ? 'bg-amber-500'
                                      : 'bg-stone-300'
                                  }`}
                                  style={{ width: `${Math.min(100, store.upgradeReadinessScore)}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-stone-400">
                                इन्वेंट्री संतृप्ति, ग्राहक संख्या व दैनिक बिक्री गतिशीलता पर आधारित
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================================= */}
        {/* FRAUD RADAR & THREAT INTELLIGENCE TAB (सुरक्षा व धोखाधड़ी निगरानी) */}
        {/* ========================================================================= */}
        {adminTab === 'FRAUD_RADAR' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top 4 KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: High Risk Threat Alerts */}
              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800">उच्च जोखिम अलर्ट (High Risk)</span>
                  <div className="p-1.5 rounded-xl bg-rose-100 text-rose-800">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-950">
                  {fraudData?.overview.highRiskCount || 0}
                </div>
                <div className="mt-2 text-[11px] text-rose-700 font-medium">
                  {fraudData?.overview.suspendedStoresCount || 0} खाते वर्तमान में निलंबित (Frozen) हैं
                </div>
              </div>

              {/* Card 2: Proxies & VPNs Detected */}
              <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-800">प्रॉक्सी व वीपीएन (Proxy/VPN)</span>
                  <div className="p-1.5 rounded-xl bg-purple-100 text-purple-800">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-950">
                  {fraudData?.overview.proxyHitsCount || 0}
                </div>
                <div className="mt-2 text-[11px] text-purple-700 font-medium">
                  गुमनाम या डेटासेंटर IP हेडर पहचान
                </div>
              </div>

              {/* Card 3: IP Collision Groups */}
              <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">IP कोलिशन समूह (Shared IP)</span>
                  <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-950">
                  {fraudData?.overview.ipCollisionCount || 0}
                </div>
                <div className="mt-2 text-[11px] text-amber-700 font-medium">
                  एक ही IP से 2 या अधिक दुकानें संबंधित
                </div>
              </div>

              {/* Card 4: Duplicate UTR Claims */}
              <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800">डुप्लीकेट UTR प्रयास</span>
                  <div className="p-1.5 rounded-xl bg-blue-100 text-blue-800">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-950">
                  {fraudData?.overview.duplicateUtrCount || 0}
                </div>
                <div className="mt-2 text-[11px] text-blue-700 font-medium">
                  समान 12-अंक UTR चोरी या डुप्लीकेट क्लेम
                </div>
              </div>
            </div>

            {/* Sub-Tabs: Threats & Stores | IP Collisions | Live Audit Logs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveFraudSubTab('THREATS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex-1 sm:flex-none text-center ${
                    activeFraudSubTab === 'THREATS'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  ⚠️ खतरे व फ्लैग्ड ({fraudData?.flaggedStores.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFraudSubTab('COLLISIONS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex-1 sm:flex-none text-center ${
                    activeFraudSubTab === 'COLLISIONS'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  👥 IP कोलिशन ({fraudData?.ipCollisions.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFraudSubTab('AUDIT_LOGS');
                    loadSecurityAuditLogs(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex-1 sm:flex-none text-center ${
                    activeFraudSubTab === 'AUDIT_LOGS'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  📜 सुरक्षा ऑडिट लॉग ({auditLogs.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadFraudRadar();
                  if (activeFraudSubTab === 'AUDIT_LOGS') loadSecurityAuditLogs(auditLogPage);
                }}
                disabled={loadingFraud || loadingLogs}
                className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFraud || loadingLogs ? 'animate-spin' : ''}`} />
                <span>रिफ्रेश</span>
              </button>
            </div>

            {/* SUB-TAB 1: THREATS & FLAGGED STORES */}
            {activeFraudSubTab === 'THREATS' && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="दुकान, फोन या IP खोजें..."
                      value={fraudSearch}
                      onChange={(e) => setFraudSearch(e.target.value)}
                      className="w-full text-xs sm:text-sm bg-transparent border-none focus:outline-hidden text-stone-800 placeholder-stone-400"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                    <span className="text-stone-400 mr-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> जोखिम:
                    </span>
                    {(['ALL', 'HIGH_RISK', 'SUSPICIOUS', 'SAFE'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFraudFilter(lvl)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                          fraudFilter === lvl
                            ? 'bg-rose-700 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {lvl === 'ALL'
                          ? 'सभी'
                          : lvl === 'HIGH_RISK'
                          ? '🔴 उच्च जोखिम'
                          : lvl === 'SUSPICIOUS'
                          ? '🟡 संदिग्ध'
                          : '🟢 सुरक्षित'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flagged Stores List */}
                {loadingFraud ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 font-bold text-sm flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                    सुरक्षा रडार विश्लेषण लोड हो रहा है...
                  </div>
                ) : !fraudData || fraudData.flaggedStores.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500">
                    <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <div className="font-bold text-stone-800">कोई सुरक्षा खतरा दर्ज नहीं हुआ है</div>
                    <div className="text-xs text-stone-400 mt-1">सभी दुकानें सामान्य व सुरक्षित नेटवर्क से संचालित हो रही हैं।</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fraudData.flaggedStores
                      .filter((s) => {
                        if (fraudFilter === 'HIGH_RISK') return s.riskScore >= 60;
                        if (fraudFilter === 'SUSPICIOUS') return s.riskScore >= 25 && s.riskScore < 60;
                        if (fraudFilter === 'SAFE') return s.riskScore < 25;
                        return true;
                      })
                      .filter((s) => {
                        if (!fraudSearch.trim()) return true;
                        const q = fraudSearch.toLowerCase().trim();
                        return (
                          s.storeName.toLowerCase().includes(q) ||
                          s.ownerName.toLowerCase().includes(q) ||
                          s.phone.includes(q) ||
                          s.lastIp.includes(q) ||
                          s.district.toLowerCase().includes(q)
                        );
                      })
                      .map((store) => {
                        const isHigh = store.riskScore >= 60;
                        const isMed = store.riskScore >= 25 && store.riskScore < 60;
                        const isSuspended = store.status === 'SUSPENDED';

                        return (
                          <div
                            key={store.storeId}
                            className={`p-4 rounded-2xl bg-white border transition shadow-2xs ${
                              isSuspended
                                ? 'border-stone-300 bg-stone-50/70 opacity-90'
                                : isHigh
                                ? 'border-rose-300 ring-1 ring-rose-200'
                                : isMed
                                ? 'border-amber-200'
                                : 'border-stone-200'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              {/* Store Info */}
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-black text-stone-900 text-sm sm:text-base m-0">
                                    {store.storeName}
                                  </h4>
                                  <span className="text-xs text-stone-500 font-medium">
                                    ({store.ownerName})
                                  </span>

                                  {/* Plan Badge */}
                                  <span
                                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                      store.plan === 'PRO'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : 'bg-stone-100 text-stone-700'
                                    }`}
                                  >
                                    {store.plan === 'PRO' ? '👑 PRO' : 'FREE'}
                                  </span>

                                  {/* Trial Badge */}
                                  {store.isTrial && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                                      ट्रायल
                                    </span>
                                  )}

                                  {/* Status Badge */}
                                  {isSuspended ? (
                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-700 text-white flex items-center gap-1 shadow-xs animate-pulse">
                                      <Ban className="w-3 h-3" /> खाता निलंबित (Frozen)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                      सक्रिय (Active)
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                                  <span>📞 {store.phone}</span>
                                  <span>📍 {store.village}, {store.district}</span>
                                  <span>🌐 IP: <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded-sm text-stone-800">{store.lastIp}</code></span>
                                </div>
                              </div>

                              {/* Risk Meter & Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                                {/* Risk Score Badge */}
                                <div className="text-right mr-2">
                                  <div className="text-[10px] uppercase font-bold text-stone-400">जोखिम स्कोर</div>
                                  <div
                                    className={`text-lg font-black ${
                                      isHigh ? 'text-rose-700' : isMed ? 'text-amber-700' : 'text-emerald-700'
                                    }`}
                                  >
                                    {store.riskScore}/100
                                  </div>
                                </div>

                                {/* Suspend / Unsuspend Button */}
                                {isSuspended ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnsuspendStore(store)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>सक्रिय करें</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSuspendModal(store)}
                                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
                                    title="खाता तत्काल निलंबित करें"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>खाता रोकें (Freeze)</span>
                                  </button>
                                )}

                                {/* WhatsApp Inquiry */}
                                <button
                                  type="button"
                                  onClick={() => handleFraudWhatsAppInquiry(store)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                                  title="व्हाट्सएप पर स्पष्टीकरण मांगें"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WhatsApp 💬</span>
                                </button>

                                {/* 360 Inspector */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matched = stores.find((s) => s.id === store.storeId);
                                    if (matched) handleOpenInspector(matched);
                                    else alert('स्टोर विवरण लोड हो रहा है...');
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition"
                                  title="360° स्टोर नियंत्रण"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>जांचें</span>
                                </button>
                              </div>
                            </div>

                            {/* Threat Tags & Reasons */}
                            <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
                              {store.isProxy && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                                  <Globe className="w-3 h-3" /> प्रॉक्सी / वीपीएन हेडर
                                </span>
                              )}
                              {store.isDatacenter && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200 flex items-center gap-1">
                                  <AlertOctagon className="w-3 h-3" /> डेटासेंटर / बॉट स्क्रिप्ट
                                </span>
                              )}

                              {store.riskReasons.map((r, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md"
                                >
                                  • {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: IP COLLISIONS */}
            {activeFraudSubTab === 'COLLISIONS' && (
              <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  <strong>💡 ग्रामीण संदर्भ व CSC कियोस्क सुरक्षा:</strong> ग्रामीण क्षेत्रों में साझा टावर (CGNAT) या ग्राम पंचायत कियोस्क (CSC/VLE) से एक ही IP पर कई वैध दुकानें हो सकती हैं। यदि दुकानें अलग-अलग डिवाइस पर अलग-अलग समय पर खुली हैं तो यह सामान्य है। यदि 5 मिनट के भीतर एक ही डिवाइस से 3+ ट्रायल खाते बने हों, तो तुरंत खाता रोकें।
                </div>

                {!fraudData?.ipCollisions || fraudData.ipCollisions.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <div className="font-bold text-stone-800">कोई IP कोलिशन नहीं मिला</div>
                    <div className="text-xs text-stone-400 mt-1">प्रत्येक दुकान विशिष्ट IP पते से संचालित हो रही है।</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fraudData.ipCollisions.map((group, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                              {group.ipAddress}
                            </span>
                            {group.isProxy && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                                🌐 Proxy
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            {group.storeCount} दुकानें साझा
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-stone-400 uppercase">संबंधित किराना दुकानें:</div>
                          {group.stores.map((s: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-center justify-between text-xs bg-stone-50 p-2 rounded-xl">
                              <span className="font-bold text-stone-800">{s.storeName || 'किराना दुकान'}</span>
                              <span className="text-stone-500 font-mono">{s.phone}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 3: LIVE SECURITY AUDIT LOGS */}
            {activeFraudSubTab === 'AUDIT_LOGS' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="लॉग में खोजें (दुकान, फोन, IP)..."
                      value={fraudSearch}
                      onChange={(e) => setFraudSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') loadSecurityAuditLogs(1);
                      }}
                      className="w-full text-xs sm:text-sm bg-transparent border-none focus:outline-hidden text-stone-800 placeholder-stone-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => loadSecurityAuditLogs(1)}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                  >
                    खोजें
                  </button>
                </div>

                {loadingLogs ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 font-bold text-sm flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                    ऑडिट लॉग लोड हो रहे हैं...
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500">
                    <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <div className="font-bold text-stone-700">कोई सुरक्षा लॉग नहीं मिला</div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
                    {/* Mobile Card Stack (md:hidden) */}
                    <div className="md:hidden divide-y divide-stone-100">
                      {auditLogs.map((log) => (
                        <div key={log._id} className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                log.eventType === 'STORE_REGISTRATION'
                                  ? 'bg-blue-100 text-blue-900'
                                  : log.eventType === 'LOGIN'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : log.eventType === 'FAILED_LOGIN'
                                  ? 'bg-rose-100 text-rose-900'
                                  : log.eventType === 'PAYMENT_CLAIM'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-stone-100 text-stone-800'
                              }`}
                            >
                              {log.eventType}
                            </span>

                            <span
                              className={`text-xs font-black px-2 py-0.5 rounded-md ${
                                log.riskScore >= 60
                                  ? 'bg-rose-100 text-rose-700'
                                  : log.riskScore >= 25
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              जोखिम {log.riskScore}/100
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-stone-900">{log.storeName || '—'}</div>
                              <div className="text-stone-500 text-[11px]">{log.ownerPhone || '—'}</div>
                            </div>
                            <div className="text-right text-[11px] text-stone-400">
                              {new Date(log.createdAt).toLocaleString('hi-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] bg-stone-50 p-2 rounded-xl border border-stone-200/80">
                            <div className="flex items-center gap-1.5 font-mono text-stone-700">
                              <span>IP: {log.ipAddress}</span>
                              {log.isProxy && (
                                <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-sm">
                                  🌐 Proxy
                                </span>
                              )}
                            </div>
                          </div>

                          {log.riskReasons && log.riskReasons.length > 0 && (
                            <div className="text-[11px] text-stone-600 bg-amber-50/60 p-2 rounded-xl border border-amber-200/70">
                              <span className="font-bold text-amber-900">कारण: </span>
                              <span>{log.riskReasons.join(' • ')}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#faf8f3] border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-3">समय</th>
                            <th className="p-3">घटना (Event)</th>
                            <th className="p-3">दुकान / फोन</th>
                            <th className="p-3">IP पता व प्रॉक्सी</th>
                            <th className="p-3">जोखिम</th>
                            <th className="p-3">कारण व विवरण</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {auditLogs.map((log) => (
                            <tr key={log._id} className="hover:bg-stone-50/70 transition">
                              <td className="p-3 text-stone-400 text-[11px] whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('hi-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="p-3 font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                    log.eventType === 'STORE_REGISTRATION'
                                      ? 'bg-blue-100 text-blue-900'
                                      : log.eventType === 'LOGIN'
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : log.eventType === 'FAILED_LOGIN'
                                      ? 'bg-rose-100 text-rose-900'
                                      : log.eventType === 'PAYMENT_CLAIM'
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-stone-100 text-stone-800'
                                  }`}
                                >
                                  {log.eventType}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-stone-900">{log.storeName || '—'}</div>
                                <div className="text-stone-400 text-[11px]">{log.ownerPhone || '—'}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-mono text-stone-800">{log.ipAddress}</div>
                                {log.isProxy && (
                                  <span className="text-[9px] font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-sm">
                                    🌐 Proxy
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`font-black ${
                                    log.riskScore >= 60
                                      ? 'text-rose-600'
                                      : log.riskScore >= 25
                                      ? 'text-amber-600'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  {log.riskScore}/100
                                </span>
                              </td>
                              <td className="p-3 text-stone-600 text-[11px]">
                                {log.riskReasons && log.riskReasons.length > 0 ? (
                                  <div>{log.riskReasons.join(' • ')}</div>
                                ) : (
                                  <span className="text-stone-400">सामान्य</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <span>पृष्ठ {auditLogPage} / {auditLogTotalPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={auditLogPage <= 1}
                          onClick={() => loadSecurityAuditLogs(auditLogPage - 1)}
                          className="px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                        >
                          पिछला
                        </button>
                        <button
                          type="button"
                          disabled={auditLogPage >= auditLogTotalPages}
                          onClick={() => loadSecurityAuditLogs(auditLogPage + 1)}
                          className="px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                        >
                          अगला
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STORE SUSPENSION CONFIRMATION MODAL */}
        {/* ========================================================================= */}
        {suspendModal.isOpen && suspendModal.store && (
          <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-300 animate-slide-down my-auto space-y-4">
              <div className="flex items-center gap-3 text-rose-700">
                <div className="p-2.5 rounded-2xl bg-rose-100">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 m-0">
                    खाता निलंबित करें (Freeze Store)
                  </h3>
                  <p className="text-xs text-stone-500 m-0 font-medium">
                    {suspendModal.store.storeName} ({suspendModal.store.ownerName})
                  </p>
                </div>
              </div>

              <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 text-xs text-rose-900 leading-relaxed">
                ⚠️ <strong>तत्काल प्रभाव:</strong> इस दुकान का खाता तुरंत फ्रीज हो जाएगा। दुकानदार व मुनीम का सक्रिय लॉगिन सत्र तत्काल रद्द हो जाएगा और वे बिलिंग या क्लाउड सिंक नहीं कर सकेंगे।
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  निलंबन का कारण (Reason):
                </label>
                <input
                  type="text"
                  value={suspendModal.reason}
                  onChange={(e) => setSuspendModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-stone-300 focus:outline-rose-500 bg-white"
                  placeholder="जैसे: डुप्लीकेट UTR, संदिग्ध प्रॉक्सी लॉगिन..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSuspendModal({ isOpen: false, store: null, reason: '', isProcessing: false })}
                  disabled={suspendModal.isProcessing}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSuspend}
                  disabled={suspendModal.isProcessing}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {suspendModal.isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>निलंबित हो रहा है...</span>
                    </>
                  ) : (
                    <span>⛔ हाँ, तुरंत खाता निलंबित करें</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE LIVE BROADCAST MODAL */}
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-amber-300 animate-slide-down my-auto">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-stone-200 bg-[#faf8f3] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-black">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-950 m-0">
                      नई लाइव घोषणा प्रसारित करें
                    </h3>
                    <p className="text-xs text-stone-500 m-0 font-medium">
                      दुकानों के बिलिंग स्क्रीन पर तुरंत लाइव बैनर सूचना भेजें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCreateBroadcast} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* 1. Title */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    घोषणा का शीर्षक (Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="उदा: 📢 आज रात 11 बजे सर्वर मेंटेनेंस / ₹99 प्रो प्लान ऑफर"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* 2. Message */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    घोषणा का संदेश (Detailed Message) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="दुकानदार को दिखने वाला पूरा विवरण लिखें..."
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* 3. Announcement Type */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    प्रकार (Announcement Type)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'INFO', label: 'ℹ️ सूचना', color: 'border-blue-300 bg-blue-50 text-blue-900' },
                      { id: 'WARNING', label: '⚠️ चेतावनी', color: 'border-amber-300 bg-amber-50 text-amber-900' },
                      { id: 'ALERT', label: '🚨 महत्वपूर्ण', color: 'border-rose-300 bg-rose-50 text-rose-900' },
                      { id: 'SUCCESS', label: '🎉 खुशखबरी', color: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewType(t.id as AnnouncementType)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          newType === t.id
                            ? `${t.color} ring-2 ring-amber-500 font-black shadow-xs`
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Target Mode: ALL vs SELECTED STORES */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                  <label className="block text-xs font-black text-stone-900 uppercase tracking-wider">
                    🎯 लक्षित दुकानें (Target Stores) *
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option ALL */}
                    <div
                      onClick={() => setNewTargetMode('ALL')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        newTargetMode === 'ALL'
                          ? 'bg-white border-amber-500 ring-2 ring-amber-500 shadow-xs'
                          : 'bg-white/70 border-stone-200 hover:border-amber-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetMode"
                        checked={newTargetMode === 'ALL'}
                        onChange={() => setNewTargetMode('ALL')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <div className="text-xs font-black text-stone-900">
                          📢 सभी दुकानें (All Stores)
                        </div>
                        <div className="text-[11px] text-stone-500">
                          प्लेटफ़ॉर्म की प्रत्येक किराना दुकान को दिखेगा
                        </div>
                      </div>
                    </div>

                    {/* Option SELECTED */}
                    <div
                      onClick={() => setNewTargetMode('SELECTED')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        newTargetMode === 'SELECTED'
                          ? 'bg-white border-purple-500 ring-2 ring-purple-500 shadow-xs'
                          : 'bg-white/70 border-stone-200 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetMode"
                        checked={newTargetMode === 'SELECTED'}
                        onChange={() => setNewTargetMode('SELECTED')}
                        className="mt-0.5 text-purple-600"
                      />
                      <div>
                        <div className="text-xs font-black text-stone-900">
                          🎯 चुनी गई दुकानें (Selected Stores)
                        </div>
                        <div className="text-[11px] text-stone-500">
                          केवल आपकी चुनी हुई विशिष्ट दुकानों को दिखेगा
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* If SELECTED mode: Store selector checklist */}
                  {newTargetMode === 'SELECTED' && (
                    <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-stone-800">
                          दुकानें चुनें ({newTargetStoreIds.length} चुनी गईं):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setNewTargetStoreIds(stores.map(s => s.id))}
                            className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                          >
                            सभी चुनें ({stores.length})
                          </button>
                          <span className="text-stone-300">|</span>
                          <button
                            type="button"
                            onClick={() => setNewTargetStoreIds([])}
                            className="text-[11px] font-bold text-stone-500 hover:underline cursor-pointer"
                          >
                            साफ करें
                          </button>
                        </div>
                      </div>

                      {/* Store Filter Input */}
                      <input
                        type="text"
                        value={storeFilterInModal}
                        onChange={(e) => setStoreFilterInModal(e.target.value)}
                        placeholder="दुकान या संचालक का नाम खोजें..."
                        className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                      />

                      {/* Scrollable list of stores */}
                      <div className="max-h-44 overflow-y-auto bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 p-1">
                        {stores
                          .filter(s => {
                            if (!storeFilterInModal.trim()) return true;
                            const q = storeFilterInModal.toLowerCase();
                            return (
                              s.storeName.toLowerCase().includes(q) ||
                              s.ownerName.toLowerCase().includes(q) ||
                              s.phone.includes(q) ||
                              (s.address?.district && s.address.district.toLowerCase().includes(q))
                            );
                          })
                          .map(store => {
                            const isChecked = newTargetStoreIds.includes(store.id);
                            return (
                              <label
                                key={store.id}
                                className="flex items-center gap-2.5 p-2 hover:bg-stone-50 rounded-lg cursor-pointer text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setNewTargetStoreIds(prev =>
                                      isChecked
                                        ? prev.filter(id => id !== store.id)
                                        : [...prev, store.id]
                                    );
                                  }}
                                  className="rounded-sm text-purple-600 focus:ring-purple-500"
                                />
                                <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                  <div className="truncate">
                                    <span className="font-bold text-stone-900">{store.storeName}</span>
                                    <span className="text-stone-500 text-[11px] ml-1.5 font-normal">
                                      ({store.ownerName} • {store.phone})
                                    </span>
                                  </div>
                                  {store.address?.district && (
                                    <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-sm shrink-0">
                                      {store.address.district}
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Optional Plan & District Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      प्लान फ़िल्टर (Plan Filter)
                    </label>
                    <select
                      value={newTargetPlan}
                      onChange={(e) => setNewTargetPlan(e.target.value as any)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium"
                    >
                      <option value="ALL">सभी प्लान (FREE + PRO)</option>
                      <option value="FREE">केवल गाँव स्टार्टर (FREE)</option>
                      <option value="PRO">केवल प्रो लाइसेंस (PRO)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      जिला फ़िल्टर (District Filter)
                    </label>
                    <select
                      value={newTargetDistrict}
                      onChange={(e) => setNewTargetDistrict(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium"
                    >
                      <option value="ALL">सभी जिले (Universal)</option>
                      {overview?.districtBreakdown.map(d => (
                        <option key={d.district} value={d.district}>
                          {d.district}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Expiry / Duration */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    घोषणा की अवधि (Duration)
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { days: 1, label: '1 दिन' },
                      { days: 3, label: '3 दिन' },
                      { days: 7, label: '7 दिन' },
                      { days: 15, label: '15 दिन' },
                      { days: 30, label: '30 दिन (1 माह)' },
                    ].map(d => (
                      <button
                        key={d.days}
                        type="button"
                        onClick={() => setNewDurationDays(d.days)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                          newDurationDays === d.days
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Live Preview Card */}
                <div className="pt-2">
                  <div className="text-xs font-black text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                    <span>दुकान काउंटर प्रीव्यू (Store Counter Preview):</span>
                  </div>
                  <div className={`p-3.5 rounded-xl border shadow-sm ${
                    newType === 'INFO'
                      ? 'bg-gradient-to-r from-blue-900 to-indigo-950 text-blue-100 border-blue-500/60'
                      : newType === 'WARNING'
                      ? 'bg-gradient-to-r from-amber-950 to-orange-950 text-amber-100 border-amber-500/60'
                      : newType === 'ALERT'
                      ? 'bg-gradient-to-r from-rose-950 to-red-950 text-rose-100 border-rose-500/70'
                      : 'bg-gradient-to-r from-emerald-950 to-teal-950 text-emerald-100 border-emerald-500/60'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                            {newType}
                          </span>
                          <h4 className="text-sm font-black text-white m-0 truncate">
                            {newTitle || 'शीर्षक यहाँ दिखेगा...'}
                          </h4>
                        </div>
                        <p className="text-xs text-stone-200 leading-relaxed m-0 break-words">
                          {newMessage || 'दुकानदार को दिखने वाला संदेश यहाँ प्रदर्शित होगा...'}
                        </p>
                      </div>
                      <span className="text-xs text-stone-400 p-1">✕</span>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsBroadcastModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={creatingBroadcast}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md cursor-pointer active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{creatingBroadcast ? 'प्रसारित किया जा रहा है...' : '🚀 घोषणा प्रसारित करें'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PAYMENT CLAIM REJECTION MODAL */}
        {rejectModalClaim && (
          <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-300 space-y-4 animate-slide-down my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2 text-rose-700 font-black">
                  <XCircle className="w-5 h-5" />
                  <span>भुगतान क्लेम अस्वीकृत करें</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalClaim(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-stone-600 space-y-1 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div>दुकान: <strong className="text-stone-900">{rejectModalClaim.storeName}</strong> ({rejectModalClaim.ownerName})</div>
                <div>फोन: <strong>{rejectModalClaim.phone}</strong></div>
                <div>UTR: <strong className="font-mono text-stone-900">{rejectModalClaim.utrNumber}</strong> (राशि: ₹{rejectModalClaim.amount})</div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700">अस्वीकृति का कारण चुनें या लिखें:</label>
                <div className="space-y-1.5 text-xs">
                  {[
                    'बैंक खाते में इस UTR से भुगतान प्राप्त नहीं हुआ।',
                    'अमान्य या अधूरा UTR नंबर।',
                    'प्राप्त राशि प्रो प्लान शुल्क से कम है।',
                    'डुप्लीकेट या पहले इस्तेमाल किया गया UTR।',
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRejectionReasonInput(reason)}
                      className={`w-full text-left p-2 rounded-xl border text-xs cursor-pointer transition ${
                        rejectionReasonInput === reason
                          ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="कस्टम कारण लिखें..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs mt-2 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setRejectModalClaim(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleRejectClaim}
                  disabled={!rejectionReasonInput.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  अस्वीकृत करें
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Single Store Pause Modal */}
        {pauseModal.isOpen && pauseModal.store && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                    <Pause className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-stone-900">प्रो प्लान रोकें (Pause Pro)</h3>
                    <p className="text-[11px] text-stone-500 font-medium">{pauseModal.store.storeName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPauseModal({ isOpen: false, store: null, reason: '' })}
                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Day Preservation Guarantee Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-blue-950">
                  <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>शून्य दिन नुकसान गारंटी (Zero-Day-Loss)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-800">
                  वर्तमान में <strong>{pauseModal.store.daysRemaining ?? 0} दिन</strong> शेष हैं। प्लान रोकने पर यह दिन सुरक्षित (Freeze) रहेंगे। जब आप प्रो पुनः चालू करेंगे, तो यह दिन उस दिन से आगे जुड़ जाएंगे।
                </p>
              </div>

              {/* Pause Reason Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700">रोकने का कारण चुनें:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {[
                    'दुकानदार का अनुरोध',
                    'भुगतान सत्यापन लंबित',
                    'दुकान अस्थायी बंद',
                    'तकनीकी रखरखाव',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPauseModal(prev => ({ ...prev, reason: r }))}
                      className={`text-left p-2 rounded-xl border text-xs cursor-pointer transition ${
                        pauseModal.reason === r
                          ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">अन्य या विवरण (वैकल्पिक):</label>
                  <input
                    type="text"
                    value={pauseModal.reason}
                    onChange={(e) => setPauseModal(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="कारण लिखें..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setPauseModal({ isOpen: false, store: null, reason: '' })}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPauseStore}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>प्रो रोकें (Confirm Pause)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. Universal Bulk Action Confirmation Modal */}
        {bulkActionModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black ${
                    bulkActionModal.action?.includes('SUSPEND')
                      ? 'bg-rose-100 text-rose-800'
                      : bulkActionModal.action?.includes('PAUSE')
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-stone-900">{bulkActionModal.title}</h3>
                    <p className="text-[11px] text-stone-500 font-medium">यूनिवर्सल बल्क ऑपरेशन</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkActionModal(prev => ({ ...prev, isOpen: false }))}
                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 text-sm font-bold"
                  disabled={bulkActionModal.isProcessing}
                >
                  ✕
                </button>
              </div>

              {/* Action Description */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-xs text-stone-800 space-y-1">
                <p className="text-xs leading-relaxed font-medium">
                  {bulkActionModal.desc}
                </p>
                <div className="text-[11px] text-stone-500 flex items-center gap-1 pt-1">
                  <span>प्रभावित संख्या:</span>
                  <span className="font-bold text-stone-800">
                    {bulkActionModal.action?.includes('PAUSE')
                      ? `${stores.filter(s => s.subscription?.plan === 'PRO' && s.subscription?.status === 'ACTIVE').length} सक्रिय प्रो स्टोर`
                      : bulkActionModal.action?.includes('RESUME')
                      ? `${stores.filter(s => s.subscription?.plan === 'PRO' && s.subscription?.status === 'PAUSED').length} रुके हुए प्रो स्टोर`
                      : `${stores.length} कुल स्टोर`}
                  </span>
                </div>
              </div>

              {/* Reason input for Pause All */}
              {bulkActionModal.action === 'PAUSE_ALL' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">रोकने का कारण (Reason):</label>
                  <input
                    type="text"
                    value={bulkActionModal.reason}
                    onChange={(e) => setBulkActionModal(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="उदा. सर्वर अपग्रेड, आपातकालीन रखरखाव..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setBulkActionModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={bulkActionModal.isProcessing}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer disabled:opacity-50"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkAction}
                  disabled={bulkActionModal.isProcessing}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-50 ${
                    bulkActionModal.action?.includes('SUSPEND')
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : bulkActionModal.action?.includes('PAUSE')
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {bulkActionModal.isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>प्रक्रिया जारी...</span>
                    </>
                  ) : (
                    <span>हाँ, क्रियान्वित करें</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Voucher Modal */}
        {isVoucherModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-stone-900 m-0">नया सिंगल-यूज़ वाउचर बनाएं</h3>
                    <p className="text-xs text-stone-500 m-0">सुरक्षित, नॉन-रिपीट एक्टिवेशन कोड</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateVouchers} className="space-y-4">
                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">प्रो प्लान अवधि (Duration):</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { months: 1, label: '1 महीना (₹99)' },
                      { months: 3, label: '3 महीना (₹249)' },
                      { months: 12, label: '1 वर्ष (₹899)' },
                    ].map(opt => (
                      <button
                        key={opt.months}
                        type="button"
                        onClick={() => setNewVoucherMonths(opt.months as 1 | 3 | 12)}
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer text-center transition ${
                          newVoucherMonths === opt.months
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">कितने वाउचर बनाने हैं (Quantity):</label>
                  <div className="flex items-center gap-2">
                    {[1, 3, 5, 10].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewVoucherCount(c)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer text-center transition ${
                          newVoucherCount === c
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">नोट / दुकानदार का नाम (वैकल्पिक):</label>
                  <input
                    type="text"
                    value={newVoucherNote}
                    onChange={(e) => setNewVoucherNote(e.target.value)}
                    placeholder="उदा. बिलासपुर डीलर, रमेश किराना..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Campaign / Festive Tag */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">प्रमोशनल / अभियान टैग (वैकल्पिक):</label>
                  <input
                    type="text"
                    value={newVoucherCampaign}
                    onChange={(e) => setNewVoucherCampaign(e.target.value.toUpperCase())}
                    placeholder="उदा. DIWALI-2026, FESTIVE-50, LAUNCH-OFFER"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs uppercase focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsVoucherModalOpen(false)}
                    disabled={creatingVoucher}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer disabled:opacity-50"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={creatingVoucher}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {creatingVoucher ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>बना रहे हैं...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>वाउचर जनरेट करें</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Store 360° Inspector & Module Controls Modal */}
        {isInspectorOpen && inspectorStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-5 animate-scaleUp my-auto max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-purple-100 text-purple-900">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 m-0">
                      360° स्टोर नियंत्रण व ऑडिट — {inspectorStore.storeName}
                    </h3>
                    <p className="text-xs text-stone-500 m-0 font-medium">
                      संचालक: {inspectorStore.ownerName} • {inspectorStore.phone} • {inspectorStore.address?.village}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(false)}
                  className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section 1: Live Database Footprint */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>लाइव डेटाबेस रिकॉर्ड्स व खपत (MongoDB Footprint):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                    <div className="text-[11px] text-stone-500">📦 उत्पाद (सामान)</div>
                    <div className="font-black text-stone-900 text-sm">{inspectorStore.productCount ?? '—'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                    <div className="text-[11px] text-stone-500">👥 खाता ग्राहक</div>
                    <div className="font-black text-stone-900 text-sm">{inspectorStore.customerCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                    <div className="text-[11px] text-stone-500">🧾 बिक्री पर्चियाँ</div>
                    <div className="font-black text-stone-900 text-sm">{inspectorStore.salesCount ?? '—'}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-[11px] text-blue-700 font-bold">💾 कुल अनुमानित डेटा</div>
                    <div className="font-black text-blue-950 text-sm">{inspectorStore.storageKb ? `${inspectorStore.storageKb} KB` : '—'}</div>
                  </div>
                </div>
              </div>

              {/* Section 2: Granular Module Controls (Feature Flags) */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-700" />
                    <span>मॉड्यूल नियंत्रण (Granular Feature Flags):</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveFeatures}
                    disabled={savingFeatures}
                    className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {savingFeatures ? 'सुरक्षित हो रहा है...' : '💾 मॉड्यूल बदलाव लागू करें'}
                  </button>
                </div>
                <p className="text-[11px] text-purple-800 m-0">
                  एडमिन द्वारा सेट किए गए मॉड्यूल ओवरराइड्स स्टोर के बेस प्लान से ऊपर प्राथमिकता रखते हैं।
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'haatMode', label: '🎪 साप्ताहिक हाट-बाज़ार मोड', desc: 'हाट के लिए 12 बड़ी टच बटन व तेज़ बिलिंग' },
                    { key: 'thermalPrinting', label: '🖨️ ब्लूटूथ थर्मल प्रिंटिंग', desc: '58mm/80mm पोर्टेबल प्रिंटर रसीद पर्ची' },
                    { key: 'voiceBilling', label: '🎙️ बोलकर दर्ज करें (आवाज सहायक)', desc: 'गाँव की तौल (पाव, पसेरी) व बोलकर सर्च' },
                    { key: 'cameraScanner', label: '📷 कैमरा बारकोड स्कैनर', desc: 'मोबाइल कैमरा से 1-सेकंड बारकोड स्कैन' },
                    { key: 'spoilageGuard', label: '⚠️ खराबी व एक्सपायरी गार्ड', desc: 'बिजली कटौती नुकसान व डिस्ट्रीब्यूटर क्लेम' },
                    { key: 'mandiPlanner', label: '🌾 मंडी खरीदारी व भाव शीट', desc: 'थोक खरीद लिस्ट, मार्जिन गार्ड व दैनिक भाव' },
                  ].map(m => {
                    const isEnabled = !!editingFeatures[m.key];
                    return (
                      <div
                        key={m.key}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                          isEnabled
                            ? 'bg-emerald-50/80 border-emerald-300'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-stone-900">{m.label}</div>
                          <div className="text-[10px] text-stone-500 truncate">{m.desc}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingFeatures(prev => ({ ...prev, [m.key]: !isEnabled }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition ${
                            isEnabled
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                          }`}
                        >
                          {isEnabled ? 'चालू (ON)' : 'बंद (OFF)'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Quota Limit Overrides */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-amber-700" />
                    <span>स्टोर कोटा सीमा समायोजन (Custom Quota Limits):</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveQuotas}
                    disabled={savingQuotas}
                    className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {savingQuotas ? 'सुरक्षित हो रहा है...' : '💾 कोटा सीमा लागू करें'}
                  </button>
                </div>
                <p className="text-[11px] text-amber-800 m-0">
                  उच्च बिक्री वाली दुकानों को विशेष व्यवस्था के तहत अतिरिक्त क्षमता प्रदान करें।
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">अधिकतम उत्पाद सीमा (Max Products):</label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={editingQuotas.maxProducts}
                      onChange={(e) => setEditingQuotas(prev => ({ ...prev, maxProducts: parseInt(e.target.value, 10) || 50 }))}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl font-bold text-stone-900"
                    />
                    <span className="text-[10px] text-stone-400">डिफ़ॉल्ट: स्टार्टर 50, प्रो 2,000</span>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">अधिकतम ग्राहक सीमा (Max Customers):</label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={editingQuotas.maxCustomers}
                      onChange={(e) => setEditingQuotas(prev => ({ ...prev, maxCustomers: parseInt(e.target.value, 10) || 100 }))}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl font-bold text-stone-900"
                    />
                    <span className="text-[10px] text-stone-400">डिफ़ॉल्ट: स्टार्टर 100, प्रो 5,000</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Munim Staff 4-Digit PIN Reset */}
              <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 space-y-3">
                <div className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-stone-700" />
                  <span>मुनीम स्टाफ 4-अंक गुप्त PIN रीसेट (Munim Session Recovery):</span>
                </div>
                <p className="text-[11px] text-stone-500 m-0">
                  यदि दुकान का मुनीम अपना पिन भूल गया हो या मुनीम सत्र लॉक हो गया हो, तो यहाँ से नया 4-अंकों का पिन सेट करें।
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={newMunimPinInput}
                    onChange={(e) => setNewMunimPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="नया 4-अंक मुनीम PIN (उदा. 1234)"
                    className="w-48 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-center font-black tracking-widest text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleResetMunimPinSubmit}
                    disabled={resettingMunimPin || newMunimPinInput.length !== 4}
                    className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-40"
                  >
                    {resettingMunimPin ? 'रीसेट हो रहा है...' : '🔐 मुनीम PIN रीसेट करें'}
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(false)}
                  className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer"
                >
                  पूर्ण (Close)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

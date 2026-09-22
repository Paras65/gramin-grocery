import React, { useState } from 'react';
import { ShieldCheck, Lock, X, ArrowRight, AlertCircle, Phone } from 'lucide-react';
import { adminService } from '../../services/adminService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!mobile.trim() || !pin.trim()) {
      setError('कृपया मोबाइल नंबर और 4-अंकीय पिन दर्ज करें।');
      return;
    }

    try {
      setLoading(true);
      await adminService.login(mobile.trim(), pin.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'अमान्य सुपर एडमिन क्रेडेंशियल्स');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-amber-300">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-900 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h3 className="font-black text-stone-950 text-base m-0 leading-tight">
                सुपर एडमिन पोर्टल
              </h3>
              <p className="text-[11px] text-stone-500 font-medium m-0">
                Gramin Kirana Platform Command
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg font-bold cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-800 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              एडमिन मोबाइल नंबर / ID:
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                autoFocus
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="उदा. 9999999999"
                className="w-full pl-9 pr-3 py-2.5 bg-[#faf8f3] border border-stone-300 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              मास्टर एडमिन पिन (4-Digits):
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                maxLength={8}
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="••••"
                className="w-full pl-9 pr-3 py-2.5 bg-[#faf8f3] border border-stone-300 rounded-xl text-xs sm:text-sm font-bold text-stone-900 tracking-widest outline-hidden focus:border-amber-600"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>पोर्टल में प्रवेश करें</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-1">
            <p className="text-[10px] text-stone-400 font-medium m-0">
              🔒 256-Bit एन्क्रिप्टेड एडमिन प्रमाणीकरण • अनधिकृत प्रवेश प्रतिबंधित
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};


import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  icon?: string | React.ReactNode;
}

export interface AlertOptions {
  title?: string;
  message: string | React.ReactNode;
  okText?: string;
  variant?: DialogVariant;
  icon?: string | React.ReactNode;
}

export type ConfirmInput = ConfirmOptions | string;
export type AlertInput = AlertOptions | string;

interface DialogState {
  isOpen: boolean;
  isAlert: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText: string;
  cancelText?: string;
  variant: DialogVariant;
  icon?: string | React.ReactNode;
  resolve: (value: boolean) => void;
}

interface ConfirmContextType {
  confirm: (input: ConfirmInput) => Promise<boolean>;
  alert: (input: AlertInput) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((input: ConfirmInput): Promise<boolean> => {
    const options: ConfirmOptions = typeof input === 'string' ? { message: input } : input;
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        isAlert: false,
        title: options.title || 'क्या आप सुनिश्चित हैं?',
        message: options.message,
        confirmText: options.confirmText || 'हाँ, जारी रखें',
        cancelText: options.cancelText || 'रद्द करें',
        variant: options.variant || 'warning',
        icon: options.icon,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((input: AlertInput): Promise<void> => {
    const options: AlertOptions = typeof input === 'string' ? { message: input } : input;
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        isAlert: true,
        title: options.title || 'सूचना',
        message: options.message,
        confirmText: options.okText || 'समझ गया / ठीक है',
        variant: options.variant || 'info',
        icon: options.icon,
        resolve: () => resolve(),
      });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    if (dialogState) {
      dialogState.resolve(result);
      setDialogState(null);
    }
  }, [dialogState]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dialogState?.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState, handleClose]);

  // Focus trap / initial focus on safe button
  useEffect(() => {
    if (dialogState?.isOpen) {
      if (dialogState.isAlert) {
        confirmBtnRef.current?.focus();
      } else if (dialogState.variant === 'danger') {
        // Safe default: focus Cancel for destructive actions to prevent accidental Enter
        cancelBtnRef.current?.focus();
      } else {
        confirmBtnRef.current?.focus();
      }
    }
  }, [dialogState]);

  const getVariantStyles = (variant: DialogVariant) => {
    switch (variant) {
      case 'danger':
        return {
          iconWrap: 'bg-rose-100 text-rose-700 border-rose-300',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-200',
          defaultIcon: '🗑️',
          badgeText: 'उच्च सुरक्षा चेतावनी',
          badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200'
        };
      case 'warning':
        return {
          iconWrap: 'bg-amber-100 text-amber-900 border-amber-300',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-200',
          defaultIcon: '⚠️',
          badgeText: 'चेतावनी / पुष्टि',
          badgeStyle: 'bg-amber-50 text-amber-900 border-amber-200'
        };
      case 'success':
        return {
          iconWrap: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-200',
          defaultIcon: '✅',
          badgeText: 'सफलता',
          badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
      case 'info':
      default:
        return {
          iconWrap: 'bg-blue-100 text-blue-800 border-blue-300',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-200',
          defaultIcon: 'ℹ️',
          badgeText: 'आवश्यक जानकारी',
          badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200'
        };
    }
  };

  const currentStyles = dialogState ? getVariantStyles(dialogState.variant) : null;

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Unified High-Safety Village Themed Modal */}
      {dialogState?.isOpen && currentStyles && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fade-in"
          onClick={() => handleClose(false)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden transform transition-all animate-scale-up max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Accent Strip */}
            <div className={`h-2 w-full ${
              dialogState.variant === 'danger' ? 'bg-rose-500' :
              dialogState.variant === 'warning' ? 'bg-amber-500' :
              dialogState.variant === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
            }`} />

            <div className="p-5 sm:p-6 overflow-y-auto">
              {/* Header with Icon and Badge */}
              <div className="flex items-start gap-3.5 mb-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border shadow-xs ${currentStyles.iconWrap}`}>
                  {dialogState.icon || currentStyles.defaultIcon}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1 ${currentStyles.badgeStyle}`}>
                    {currentStyles.badgeText}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 leading-snug m-0">
                    {dialogState.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="p-1 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 cursor-pointer shrink-0 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Message Content */}
              <div className="text-xs sm:text-sm text-stone-700 font-medium leading-relaxed whitespace-pre-line bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/80">
                {dialogState.message}
              </div>

              {/* Action Buttons */}
              <div className={`mt-5 flex gap-2.5 ${dialogState.isAlert ? 'justify-end' : 'flex-col-reverse sm:flex-row'}`}>
                {!dialogState.isAlert && (
                  <button
                    ref={cancelBtnRef}
                    type="button"
                    onClick={() => handleClose(false)}
                    className="flex-1 py-3 px-4 rounded-2xl border-2 border-stone-300 bg-white hover:bg-stone-100 active:scale-[0.98] text-stone-700 font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-xs flex items-center justify-center min-h-[46px]"
                  >
                    {dialogState.cancelText}
                  </button>
                )}
                <button
                  ref={confirmBtnRef}
                  type="button"
                  onClick={() => handleClose(true)}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-black active:scale-[0.98] cursor-pointer transition-all shadow-md flex items-center justify-center min-h-[46px] ${currentStyles.confirmBtn}`}
                >
                  {dialogState.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmContextType => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};


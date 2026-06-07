'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-emerald-500/30',
          bg: 'bg-[#0B1A15]/85',
          text: 'text-emerald-400',
          icon: <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />,
        };
      case 'error':
        return {
          border: 'border-rose-500/30',
          bg: 'bg-[#1D0E10]/85',
          text: 'text-rose-400',
          icon: <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />,
        };
      case 'warning':
        return {
          border: 'border-amber-500/30',
          bg: 'bg-[#1C150D]/85',
          text: 'text-amber-400',
          icon: <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0" />,
        };
      case 'info':
      default:
        return {
          border: 'border-[#00D4FF]/30',
          bg: 'bg-[#081522]/85',
          text: 'text-[#00D4FF]',
          icon: <Info className="w-4.5 h-4.5 text-[#00D4FF] shrink-0" />,
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toast: { success, error, info, warning } }}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const styles = getToastStyles(t.type);
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 50, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${styles.border} ${styles.bg} backdrop-blur-md shadow-2xl`}
              >
                {styles.icon}
                <div className="flex-1 text-xs font-semibold text-slate-100 leading-normal">
                  {t.message}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 p-0.5 rounded-lg hover:bg-white/[0.04] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}

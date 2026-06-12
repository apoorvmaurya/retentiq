'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Cookie, Check } from 'lucide-react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    // Check local storage for consent
    const consent = localStorage.getItem('retentiq-cookie-consent');
    if (!consent) {
      // Delay showing the banner slightly for a smoother entry
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const consentSettings = { essential: true, analytics: true, marketing: true };
    localStorage.setItem('retentiq-cookie-consent', JSON.stringify(consentSettings));
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('retentiq-cookie-consent', JSON.stringify(preferences));
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const consentSettings = { essential: true, analytics: false, marketing: false };
    localStorage.setItem('retentiq-cookie-consent', JSON.stringify(consentSettings));
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed bottom-6 left-4 right-4 md:left-6 md:right-auto md:w-[420px] z-50 rounded-2xl glass-panel border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-5 text-left font-sans"
        >
          {!showCustomize ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[#00D4FF] shrink-0 mt-0.5">
                  <Cookie className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F8F6F0]">We respect your privacy</h4>
                  <p className="text-[11px] text-[#8B95AB] leading-relaxed mt-1">
                    RetentIQ uses cookies to optimize your platform dashboard experience, analyze
                    site usage, and support customer success. Customize preferences below or accept
                    all.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-lg bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-[10px] tracking-wider uppercase transition-all shadow-[0_4px_12px_rgba(0,212,255,0.15)] flex-1 text-center cursor-pointer"
                >
                  Accept All
                </button>
                <button
                  onClick={() => setShowCustomize(true)}
                  className="px-4 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-white font-bold text-[10px] tracking-wider uppercase transition-all flex-1 text-center cursor-pointer"
                >
                  Customize
                </button>
                <button
                  onClick={handleRejectAll}
                  className="w-full text-center text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase tracking-wider py-1.5 transition-colors cursor-pointer"
                >
                  Reject Optional
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#F8F6F0] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#00D4FF]" /> Cookie Settings
                </h4>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="text-[10px] text-[#00D4FF] hover:underline font-bold uppercase tracking-wider cursor-pointer"
                >
                  Back
                </button>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 border-t border-b border-white/[0.06] py-3">
                {/* Essential */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-white">Essential Cookies</p>
                    <p className="text-[9px] text-[#8B95AB]">
                      Required for platform authorization and core settings.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[8px] font-bold text-slate-400 uppercase select-none">
                    Required
                  </span>
                </div>

                {/* Analytics */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-white">Analytics Cookies</p>
                    <p className="text-[9px] text-[#8B95AB]">
                      Anonymously monitors page usage patterns for design optimization.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences((prev) => ({ ...prev, analytics: !prev.analytics }))
                    }
                    className={`w-8 h-4 rounded-full transition-all relative ${
                      preferences.analytics ? 'bg-[#00D4FF]' : 'bg-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#0A0F1E] transition-all ${
                        preferences.analytics ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Marketing */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-white">Marketing & Support</p>
                    <p className="text-[9px] text-[#8B95AB]">
                      Supports simulated onboarding walkthroughs and chat assistants.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences((prev) => ({ ...prev, marketing: !prev.marketing }))
                    }
                    className={`w-8 h-4 rounded-full transition-all relative ${
                      preferences.marketing ? 'bg-[#00D4FF]' : 'bg-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#0A0F1E] transition-all ${
                        preferences.marketing ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <button
                onClick={handleSavePreferences}
                className="w-full py-2 rounded-lg bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-[#0A0F1E] font-bold text-[10px] tracking-wider uppercase transition-all shadow-[0_4px_12px_rgba(0,212,255,0.15)] flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Save Preferences
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

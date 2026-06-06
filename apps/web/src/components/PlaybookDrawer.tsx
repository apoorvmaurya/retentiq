import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface PlaybookStep {
  step: number;
  headline: string;
  detail: string;
}

interface PlaybookDrawerProps {
  playbookOpen: boolean;
  setPlaybookOpen: (open: boolean) => void;
  playbookLoading: boolean;
  playbookSteps: PlaybookStep[];
  onConfirm: () => void;
}

export default function PlaybookDrawer({
  playbookOpen,
  setPlaybookOpen,
  playbookLoading,
  playbookSteps,
  onConfirm,
}: PlaybookDrawerProps) {
  return (
    <AnimatePresence>
      {playbookOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setPlaybookOpen(false)}
            className="fixed inset-0 bg-[#000] z-40"
          />
          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 22, stiffness: 130 }}
            className="fixed top-0 right-0 bottom-0 w-[450px] max-w-full bg-white border-l border-slate-200 shadow-2xl z-50 p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">CSM Churn Playbook</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                      Automated retention rules
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPlaybookOpen(false)}
                  className="p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {playbookLoading ? (
                <div className="space-y-6 py-8 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-100 rounded w-1/3" />
                        <div className="h-3 bg-slate-100 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : playbookSteps.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic text-sm">
                  Failed to query Groq playbook. Please try again.
                </div>
              ) : (
                <div className="space-y-6">
                  {playbookSteps.map((step) => (
                    <div key={step.step} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {step.step}
                      </div>
                      <div>
                        <h5 className="text-sm font-extrabold text-slate-900">{step.headline}</h5>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-6 mt-6 flex items-center gap-3">
              <button
                onClick={onConfirm}
                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer text-center"
              >
                Confirm & Dispatch Playbook
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

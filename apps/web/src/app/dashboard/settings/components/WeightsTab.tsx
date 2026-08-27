'use client';

import React from 'react';
import { Sliders, Save, RefreshCw } from 'lucide-react';

export interface Weights {
  loginFrequency30dWeight: number;
  loginFrequency14dWeight: number;
  loginFrequency7dWeight: number;
  featureAdoptionWeight: number;
  usageTrendWeight: number;
  supportVolumeWeight: number;
  supportSentimentWeight: number;
  billingEventsWeight: number;
  onboardingTimeWeight: number;
}

export interface WeightsTabProps {
  weights: Weights;
  totalWeight: number;
  saving: boolean;
  onWeightChange: (key: keyof Weights, val: number) => void;
  onSaveWeights: () => Promise<void>;
}

export function WeightsTab({
  weights,
  totalWeight,
  saving,
  onWeightChange,
  onSaveWeights,
}: WeightsTabProps) {
  return (
    <div className="glass-panel rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <h4 className="font-bold text-white text-base flex items-center gap-2">
          <Sliders className="w-4.5 h-4.5 text-cyan-400" />
          Health Score Weight Tuning
        </h4>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
              totalWeight === 100
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            Total Allocated: {totalWeight} / 100%
          </span>
          <button
            onClick={onSaveWeights}
            disabled={saving || totalWeight !== 100}
            className="btn-primary"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Config
          </button>
        </div>
      </div>

      {totalWeight !== 100 && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/25 text-xs font-bold">
          ⚠️ The weights must sum up to exactly 100% for the custom scoring engine to be balanced.
          Currently, it is {totalWeight}%.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Section A: Engagement */}
        <div className="space-y-6">
          <h5 className="font-bold text-cyan-400 text-sm border-b border-slate-800/40 pb-2">
            Engagement Signals
          </h5>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Login Frequency (30 Days)</span>
                <span className="text-cyan-400">{weights.loginFrequency30dWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.loginFrequency30dWeight}
                onChange={(e) =>
                  onWeightChange('loginFrequency30dWeight', parseInt(e.target.value, 10))
                }
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Login Frequency (14 Days)</span>
                <span className="text-cyan-400">{weights.loginFrequency14dWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.loginFrequency14dWeight}
                onChange={(e) =>
                  onWeightChange('loginFrequency14dWeight', parseInt(e.target.value, 10))
                }
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Login Frequency (7 Days)</span>
                <span className="text-cyan-400">{weights.loginFrequency7dWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.loginFrequency7dWeight}
                onChange={(e) =>
                  onWeightChange('loginFrequency7dWeight', parseInt(e.target.value, 10))
                }
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Feature Adoption Score (Breadth)</span>
                <span className="text-cyan-400">{weights.featureAdoptionWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.featureAdoptionWeight}
                onChange={(e) =>
                  onWeightChange('featureAdoptionWeight', parseInt(e.target.value, 10))
                }
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Usage trend (WoW Activity Change)</span>
                <span className="text-cyan-400">{weights.usageTrendWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.usageTrendWeight}
                onChange={(e) => onWeightChange('usageTrendWeight', parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Section B: Operations & Financial */}
        <div className="space-y-6">
          <h5 className="font-bold text-cyan-400 text-sm border-b border-slate-800/40 pb-2">
            Support & Financial Signals
          </h5>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Support Ticket Volume</span>
                <span className="text-cyan-400">{weights.supportVolumeWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.supportVolumeWeight}
                onChange={(e) =>
                  onWeightChange('supportVolumeWeight', parseInt(e.target.value, 10))
                }
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Conversation Sentiment Score</span>
                <span className="text-cyan-400">{weights.supportSentimentWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.supportSentimentWeight}
                onChange={(e) =>
                  onWeightChange('supportSentimentWeight', parseInt(e.target.value, 10))
                }
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Billing Events (Payment Failures)</span>
                <span className="text-cyan-400">{weights.billingEventsWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.billingEventsWeight}
                onChange={(e) =>
                  onWeightChange('billingEventsWeight', parseInt(e.target.value, 10))
                }
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Onboarding Duration / Speed</span>
                <span className="text-cyan-400">{weights.onboardingTimeWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.onboardingTimeWeight}
                onChange={(e) =>
                  onWeightChange('onboardingTimeWeight', parseInt(e.target.value, 10))
                }
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeightsTab;

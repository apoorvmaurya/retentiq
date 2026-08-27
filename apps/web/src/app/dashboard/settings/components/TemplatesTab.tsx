'use client';

import React from 'react';
import { Save, RefreshCw } from 'lucide-react';

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export interface TemplatesTabProps {
  templates: Template[];
  selectedTemplateIndex: number;
  templateSubject: string;
  setTemplateSubject: (val: string) => void;
  templateBody: string;
  setTemplateBody: (val: string) => void;
  saving: boolean;
  onSelectTemplate: (idx: number) => void;
  onSaveTemplate: () => Promise<void>;
}

export function TemplatesTab({
  templates,
  selectedTemplateIndex,
  templateSubject,
  setTemplateSubject,
  templateBody,
  setTemplateBody,
  saving,
  onSelectTemplate,
  onSaveTemplate,
}: TemplatesTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Templates Selector Left Sidebar */}
      <div className="glass-panel rounded-xl p-4 h-fit space-y-3">
        <h5 className="font-bold text-white text-xs px-2 uppercase tracking-wider block mb-2">
          Templates
        </h5>
        {templates.map((tpl, i) => (
          <button
            key={tpl.id}
            onClick={() => onSelectTemplate(i)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold border transition-all ${
              selectedTemplateIndex === i
                ? 'bg-cyan-950/40 border-cyan-800/40 text-cyan-400'
                : 'bg-slate-950/20 border-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tpl.name}
          </button>
        ))}
      </div>

      {/* Template Editor */}
      <div className="glass-panel rounded-xl p-6 lg:col-span-3 space-y-6">
        {templates.length > 0 ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-white text-base">
                  Edit: {templates[selectedTemplateIndex]?.name}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Customize automated playbook emails sent during health scoring transitions.
                </p>
              </div>
              <button onClick={onSaveTemplate} disabled={saving} className="btn-primary">
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Template
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="dashboard-input"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                  Email Body Content
                </label>
                <textarea
                  rows={8}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="dashboard-input font-sans text-sm leading-relaxed"
                />
              </div>
              <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/50 space-y-2 text-xs">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
                  Supported Merge Tags:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-slate-400">
                  <div>
                    <code className="text-cyan-400 font-mono font-bold">{'{{account_name}}'}</code>{' '}
                    - Customer company
                  </div>
                  <div>
                    <code className="text-cyan-400 font-mono font-bold">{'{{health_score}}'}</code>{' '}
                    - Health score
                  </div>
                  <div>
                    <code className="text-cyan-400 font-mono font-bold">{'{{csm_name}}'}</code> -
                    CSM name
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-slate-400">No template selected.</div>
        )}
      </div>
    </div>
  );
}

export default TemplatesTab;

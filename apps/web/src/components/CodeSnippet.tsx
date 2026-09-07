'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2 } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

export interface CodeSnippetTab {
  id: string;
  label: string;
  code: string;
  language?: string;
}

export interface CodeSnippetProps {
  title?: string;
  code?: string;
  language?: string;
  tabs?: CodeSnippetTab[];
  className?: string;
}

export default function CodeSnippet({
  title,
  code,
  language = 'bash',
  tabs,
  className = '',
}: CodeSnippetProps) {
  const [activeTabId, setActiveTabId] = useState<string>(tabs && tabs.length > 0 ? tabs[0].id : '');
  const [copied, setCopied] = useState(false);

  const activeSnippet =
    tabs && tabs.length > 0
      ? tabs.find((t) => t.id === activeTabId)?.code || tabs[0].code
      : code || '';

  const activeLang =
    tabs && tabs.length > 0
      ? tabs.find((t) => t.id === activeTabId)?.language || language
      : language;

  const handleCopy = async () => {
    const success = await copyToClipboard(activeSnippet);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`rounded-xl border border-white/10 bg-[#040814] overflow-hidden shadow-2xl ${className}`}
    >
      {/* Top Header / Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/3 border-b border-white/6 text-xs">
        <div className="flex items-center gap-2">
          {tabs && tabs.length > 0 ? (
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTabId === tab.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              {activeLang === 'bash' || activeLang === 'sh' ? (
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
              {title && <span className="font-semibold text-slate-300 text-[11px]">{title}</span>}
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                {activeLang}
              </span>
            </div>
          )}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/4 hover:bg-white/8 border border-white/10 text-slate-300 hover:text-white text-[11px] font-medium transition-all cursor-pointer select-none"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <pre className="p-4 overflow-x-auto text-[11px] sm:text-xs font-mono text-cyan-300 leading-relaxed whitespace-pre selection:bg-cyan-500/30">
        <code>{activeSnippet}</code>
      </pre>
    </div>
  );
}

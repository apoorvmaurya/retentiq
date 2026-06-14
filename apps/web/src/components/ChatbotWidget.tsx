'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, MessageSquare, Send, Bot, Maximize2, Minimize2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Markdown from './Markdown';

interface Message {
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  actionPill?: string;
  suggestedAction?: {
    name: string;
    args: any;
    executed?: boolean;
  };
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Hi there! I'm RetentIQ's AI assistant. Ask me anything about customer health scoring, integrations, or setting up Slack alerts!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const faqItems = [
    { label: 'How does ML scoring work?', query: 'How does your predictive health scoring work?' },
    { label: 'Which CRM tools sync?', query: 'What integrations does RetentIQ support?' },
    { label: 'Tell me about alerts.', query: 'How do Slack and email alerts trigger?' },
    { label: 'Is there a free trial?', query: 'Do you offer a free plan or trial?' },
  ];

  // Auto-scroll to bottom of thread
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const shouldAutoExecuteAction = (promptText: string, actionName: string) => {
    if (actionName === 'submit_contact_request') return true;
    const query = promptText.toLowerCase();
    const explicitKeywords = [
      'go to',
      'navigate to',
      'take me to',
      'redirect me to',
      'login',
      'signup',
      'sign up',
      'sign in',
      'register',
    ];
    return explicitKeywords.some((keyword) => query.includes(keyword));
  };

  const getActionLabel = (name: string, args: any, executed?: boolean) => {
    switch (name) {
      case 'navigate_to': {
        const target = args?.target || '';
        const targetName = target.startsWith('#')
          ? `Section ${target}`
          : target === '/'
            ? 'Home Page'
            : `${target.replace('/', '').charAt(0).toUpperCase()}${target.slice(2)} Page`;
        return executed ? `Navigated to ${targetName}` : `Go to ${targetName}`;
      }
      case 'calculate_roi':
        return executed ? 'ROI Calculated' : 'Calculate ROI';
      case 'open_command_menu':
        return executed ? 'Search Menu Opened' : 'Open Search Menu';
      case 'submit_contact_request':
        return executed ? 'Demo Request Submitted' : 'Submit Demo Request';
      default:
        return executed ? 'Action Executed' : 'Execute Action';
    }
  };

  const getActionPillText = (name: string, args: any) => {
    switch (name) {
      case 'calculate_roi':
        return 'Updated ROI Modeler parameters';
      case 'open_command_menu':
        return 'Opened Search Center (⌘K)';
      case 'navigate_to':
        return args?.target?.startsWith('#')
          ? `Scrolled to ${args.target}`
          : `Navigated to ${args.target}`;
      case 'submit_contact_request':
        return `Submitted demo request for ${args?.email}`;
      default:
        return 'Action completed';
    }
  };

  const smoothScrollToElement = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const elementPosition = el.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - 96; // 96px offset for fixed navbar spacing
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }, 200);
  };

  const executeAction = (name: string, args: any) => {
    if (name === 'calculate_roi') {
      const { mrr, churnRate, reduction } = args;
      const event = new CustomEvent('retentiq-update-roi', {
        detail: { mrr, churnRate, reduction },
      });
      window.dispatchEvent(event);

      setTimeout(() => {
        smoothScrollToElement('roi-calculator');
      }, 300);
    } else if (name === 'open_command_menu') {
      const btn = document.getElementById('global-search-trigger');
      if (btn) btn.click();
    } else if (name === 'navigate_to') {
      const { target } = args;
      if (target.startsWith('#')) {
        smoothScrollToElement(target.slice(1));
      } else {
        router.push(target);
      }
    } else if (name === 'submit_contact_request') {
      const { email: clientEmail, message: clientMsg } = args;
      const currentRequests = JSON.parse(localStorage.getItem('retentiq-demo-requests') || '[]');
      currentRequests.push({
        email: clientEmail,
        message: clientMsg,
        date: new Date().toISOString(),
      });
      localStorage.setItem('retentiq-demo-requests', JSON.stringify(currentRequests));
    }
  };

  const handleExecuteAction = (msg: Message, index: number) => {
    if (!msg.suggestedAction || msg.suggestedAction.executed) return;

    // Execute the action
    executeAction(msg.suggestedAction.name, msg.suggestedAction.args);

    // Update state to mark it executed and update the action pill
    setMessages((prev) =>
      prev.map((m, idx) => {
        if (idx === index && m.suggestedAction) {
          const updatedAction = { ...m.suggestedAction, executed: true };
          return {
            ...m,
            suggestedAction: updatedAction,
            actionPill: `Action: ${getActionPillText(updatedAction.name, updatedAction.args)}`,
          };
        }
        return m;
      }),
    );
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = { sender: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map((msg) => ({
        role: msg.sender === 'ai' ? ('assistant' as const) : ('user' as const),
        content: msg.text,
      }));
      history.push({ role: 'user', content: text });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) {
        throw new Error('Failed to reach AI assistant');
      }

      const data = await response.json();
      const reply = data.message;

      const replyText = reply?.content || "I couldn't process that query.";
      let actionPillText: string | undefined = undefined;
      let suggestedAction: any = undefined;

      if (reply?.tool_calls && reply.tool_calls.length > 0) {
        // Take the first tool call
        const tool = reply.tool_calls[0];
        const { name, arguments: argsString } = tool.function;
        let args: any = {};
        try {
          args = JSON.parse(argsString || '{}');
        } catch {
          // Ignore argument parsing errors
        }

        suggestedAction = { name, args, executed: false };

        const autoExecute = shouldAutoExecuteAction(text, name);
        if (autoExecute) {
          executeAction(name, args);
          suggestedAction.executed = true;
          actionPillText = getActionPillText(name, args);
        } else {
          actionPillText = `Suggested action: ${getActionLabel(name, args, false)}`;
        }
      }

      const aiMsg: Message = {
        sender: 'ai',
        text: replyText,
        timestamp: new Date(),
        actionPill: actionPillText,
        suggestedAction,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('[Chatbot] AI completions failed:', err);
      const errorMsg: Message = {
        sender: 'ai',
        text: 'Sorry, I had trouble communicating with the server. Please try again or check your connection.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Hidden button to let Command Menu open this chatbot */}
      <button id="chatbot-widget-trigger" onClick={() => setIsOpen(true)} className="hidden" />

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 font-sans">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#00D4FF] via-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-[#0A0F1E] flex items-center justify-center shadow-[0_8px_30px_rgba(0,212,255,0.4)] cursor-pointer relative"
          aria-label={isOpen ? 'Close support chat' : '1, Toggle AI support chat'}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 45, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -45, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <MessageSquare className="w-6 h-6" />
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#0A0F1E] flex items-center justify-center text-[7px] font-bold text-white animate-bounce">
                  1
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Chat Window Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: 'spring', stiffness: 280, damping: 25 }}
              className={`fixed z-50 rounded-2xl glass-panel border border-white/[0.08] shadow-[0_24px_50px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden origin-bottom-right ${
                isExpanded
                  ? 'bottom-24 right-4 left-4 sm:left-auto sm:right-6 w-auto sm:w-[650px] h-[600px] sm:h-[650px] max-h-[calc(100vh-8rem)]'
                  : 'bottom-24 right-4 left-4 sm:left-auto sm:right-6 w-auto sm:w-[380px] h-[500px] max-h-[calc(100vh-8rem)]'
              }`}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.01] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-[#00D4FF] relative">
                    <Bot className="w-4 h-4 animate-pulse" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#F8F6F0]">RetentIQ Agent</h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[8px] text-[#8B95AB] uppercase tracking-wider font-semibold">
                        Llama 3.3 Active
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? 'Minimize Window' : 'Expand Window'}
                    aria-label={isExpanded ? 'Minimize Window' : 'Expand Window'}
                    className="p-1 rounded-md text-slate-400 hover:text-[#00D4FF] hover:bg-white/[0.04] transition-all cursor-pointer"
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsExpanded(false);
                    }}
                    title="Close support chat"
                    aria-label="Close support chat"
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/[0.04] bg-[#0A0F1E]/30">
                {messages.map((msg, idx) => {
                  const isAI = msg.sender === 'ai';
                  return (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className={`flex gap-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}>
                        {isAI && (
                          <div className="w-6.5 h-6.5 rounded-md bg-gradient-to-br from-[#101726] to-[#0A0F1E] border border-white/[0.08] flex items-center justify-center text-[#00D4FF] shrink-0 shadow-sm mt-0.5">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm transition-all ${
                            isAI
                              ? 'bg-[#0c1224]/85 border border-white/[0.07] text-slate-200 max-w-[85%]'
                              : 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium max-w-[78%] shadow-[0_4px_12px_rgba(6,182,212,0.15)]'
                          }`}
                        >
                          <Markdown content={msg.text} />
                        </div>
                      </div>

                      {msg.suggestedAction ? (
                        <div className={`flex ${isAI ? 'justify-start pl-9' : 'justify-end'}`}>
                          <button
                            type="button"
                            onClick={() => handleExecuteAction(msg, idx)}
                            disabled={msg.suggestedAction.executed}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              msg.suggestedAction.executed
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 opacity-80 cursor-default select-none'
                                : 'bg-[#00D4FF]/10 hover:bg-[#00D4FF]/20 border-[#00D4FF]/30 text-[#00D4FF] cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,212,255,0.05)]'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-current animate-pulse" />
                            {getActionLabel(
                              msg.suggestedAction.name,
                              msg.suggestedAction.args,
                              msg.suggestedAction.executed,
                            )}
                          </button>
                        </div>
                      ) : (
                        msg.actionPill && (
                          <div className={`flex ${isAI ? 'justify-start pl-8.5' : 'justify-end'}`}>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8.5px] font-bold text-emerald-400 select-none">
                              <Sparkles className="w-2.5 h-2.5 animate-pulse text-emerald-400" />{' '}
                              Action: {msg.actionPill}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}

                {/* Simulated typing status */}
                {isTyping && (
                  <div className="flex gap-2.5 justify-start">
                    <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[#00D4FF] shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-2 text-xs text-slate-400 flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Suggestions / FAQ items */}
              {messages.length === 1 && !isTyping && (
                <div className="p-3 border-t border-white/[0.04] bg-white/[0.005] shrink-0">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">
                    Common Questions
                  </p>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
                    {faqItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleSend(item.query)}
                        className="px-2.5 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-[10px] text-slate-300 hover:text-[#00D4FF] hover:border-[#00D4FF]/25 transition-all text-left cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="p-3 border-t border-white/[0.06] bg-[#020205]/40 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-full px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.04] transition-all"
                  aria-label="Ask chatbot assistant"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00D4FF] to-cyan-500 text-[#0A0F1E] flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none hover:scale-105 cursor-pointer shadow-md shadow-cyan-500/10"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

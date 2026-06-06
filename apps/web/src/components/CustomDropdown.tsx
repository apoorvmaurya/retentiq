import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function CustomDropdown({ options, value, onChange, label, className = '' }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block mb-1">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3.5 py-2.5 bg-slate-950 border border-indigo-950/60 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:border-[#00D4FF] focus:outline-none transition-all flex items-center gap-2 cursor-pointer min-w-[140px] justify-between shadow-lg"
      >
        <span className="flex items-center gap-2">
          {selectedOption.icon}
          {selectedOption.label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 mt-2 w-full min-w-[160px] bg-[#070C1E]/95 border border-indigo-950/60 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.8)] overflow-hidden z-30 p-1.5 backdrop-blur-md"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-xs font-medium rounded-lg flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                  option.value === value
                    ? 'bg-[#00D4FF]/10 text-[#00D4FF] font-semibold'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span className="flex items-center shrink-0">
                  {option.icon}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

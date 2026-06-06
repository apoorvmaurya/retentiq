import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, type = 'text', value, onChange, onFocus, onBlur, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value !== undefined && value !== null && value !== '';

    return (
      <div className={`relative rounded-xl border border-white/[0.08] bg-slate-950/60 transition-all duration-200 focus-within:border-[#00D4FF] focus-within:ring-2 focus-within:ring-[#00D4FF]/20 ${className}`}>
        <motion.label
          initial={false}
          animate={{
            y: isFocused || hasValue ? -10 : 0,
            scale: isFocused || hasValue ? 0.78 : 1,
            color: isFocused ? '#00D4FF' : '#8B95AB',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="absolute left-4 top-4 origin-top-left pointer-events-none text-sm font-medium z-10"
        >
          {label}
        </motion.label>
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          className="w-full px-4 pt-6 pb-2 bg-transparent text-white text-sm focus:outline-none placeholder-transparent"
          style={{ outline: 'none' }}
          {...props}
        />
        {isFocused && (
          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ outline: '2px solid #00D4FF' }} />
        )}
      </div>
    );
  }
);

FloatingInput.displayName = 'FloatingInput';

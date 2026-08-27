'use client';

import React, { useState } from 'react';
import { motion, useMotionValueEvent } from 'framer-motion';

export interface TimelineNodeProps {
  index: number;
  progress: any;
}

export function TimelineNode({ index, progress }: TimelineNodeProps) {
  const threshold = index === 0 ? 0.05 : index === 1 ? 0.33 : index === 2 ? 0.66 : 0.9;
  const [active, setActive] = useState(false);

  useMotionValueEvent(progress, 'change', (latest: number) => {
    const isNextActive = latest >= threshold;
    setActive((prevActive) => {
      if (prevActive !== isNextActive) {
        return isNextActive;
      }
      return prevActive;
    });
  });

  return (
    <div className="relative flex items-center justify-center" data-testid="timeline-node">
      <motion.div
        animate={{
          scale: active ? 1.25 : 1,
          backgroundColor: active ? 'rgba(0, 212, 255, 1)' : 'rgba(10, 15, 30, 1)',
          borderColor: active ? 'rgba(0, 212, 255, 1)' : 'rgba(255, 255, 255, 0.12)',
          boxShadow: active ? '0 0 12px rgba(0, 212, 255, 0.6)' : 'none',
        }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-3.5 h-3.5 rounded-full border-2 bg-[#0A0F1E] z-10 cursor-pointer"
      />
      {active && (
        <span
          data-testid="timeline-ping"
          className="absolute w-6 h-6 rounded-full bg-[#00D4FF]/20 animate-ping pointer-events-none z-0"
        />
      )}
    </div>
  );
}

export default TimelineNode;

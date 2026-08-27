'use client';

import React, { useState, useRef } from 'react';

export interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = '' }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      data-testid="spotlight-card"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl border border-white/8 transition-colors duration-300 ${className}`}
      style={{
        background: isHovered
          ? `radial-gradient(circle 220px at ${coords.x}px ${coords.y}px, rgba(0, 212, 255, 0.08), transparent 70%), rgba(255,255,255,0.015)`
          : 'rgba(255,255,255,0.015)',
      }}
    >
      {children}
    </div>
  );
}

export default SpotlightCard;

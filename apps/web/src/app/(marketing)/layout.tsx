import React from 'react';
import ChatbotWidget from '@/components/ChatbotWidget';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {children}
      <ChatbotWidget />
    </div>
  );
}

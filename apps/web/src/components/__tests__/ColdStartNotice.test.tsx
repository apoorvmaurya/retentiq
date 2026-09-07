import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ColdStartNotice } from '../ColdStartNotice';

describe('ColdStartNotice Component', () => {
  it('renders informative cold start notice with countdown and retry button', () => {
    const handleRetry = vi.fn();
    const handleLoadDemo = vi.fn();

    render(
      <ColdStartNotice
        isSlowLoading={true}
        onRetry={handleRetry}
        onLoadDemoData={handleLoadDemo}
      />,
    );

    expect(screen.getByText(/Waking Up Cloud Database Instances/i)).toBeDefined();
    expect(screen.getByText(/Free-Tier Sleep Mode/i)).toBeDefined();
    expect(screen.getByText(/Auto-retrying in/i)).toBeDefined();

    const retryBtn = screen.getByRole('button', { name: /Wake Up & Retry/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    const demoBtn = screen.getByRole('button', { name: /View Sample Data/i });
    fireEvent.click(demoBtn);
    expect(handleLoadDemo).toHaveBeenCalledTimes(1);
  });

  it('renders compact mode with sample data option', () => {
    const handleRetry = vi.fn();
    const handleLoadDemo = vi.fn();

    render(
      <ColdStartNotice
        compact={true}
        error="Connection timeout"
        onRetry={handleRetry}
        onLoadDemoData={handleLoadDemo}
      />,
    );

    expect(screen.getByText(/Database warming up \(cold start\)/i)).toBeDefined();
    expect(screen.getByText(/Sample Data/i)).toBeDefined();

    const demoBtn = screen.getByRole('button', { name: /Sample Data/i });
    fireEvent.click(demoBtn);
    expect(handleLoadDemo).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Counter } from '../Counter';

// Mock framer-motion useInView and animate
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<any>('framer-motion');
  return {
    ...actual,
    useInView: () => true,
    animate: (_from: number, to: number, opts: any) => {
      opts.onUpdate(to);
      return { stop: vi.fn() };
    },
  };
});

describe('Counter Component', () => {
  it('should render initial value and suffix', () => {
    render(<Counter value={100} suffix="%" />);
    const el = screen.getByTestId('marketing-counter');
    expect(el).toBeDefined();
    expect(el.textContent).toContain('%');
  });

  it('should format number with custom suffix and duration', () => {
    render(<Counter value={42} suffix="k" duration={2} />);
    const el = screen.getByTestId('marketing-counter');
    expect(el.textContent).toBe('42k');
  });
});

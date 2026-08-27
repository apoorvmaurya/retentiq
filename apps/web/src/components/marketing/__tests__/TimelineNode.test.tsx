import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineNode } from '../TimelineNode';

describe('TimelineNode Component', () => {
  it('should render node container', () => {
    const mockProgress = {
      on: vi.fn(),
      get: vi.fn(() => 0),
    };
    render(<TimelineNode index={0} progress={mockProgress} />);
    expect(screen.getByTestId('timeline-node')).toBeDefined();
  });
});

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpotlightCard } from '../SpotlightCard';

describe('SpotlightCard Component', () => {
  it('should render children properly', () => {
    render(
      <SpotlightCard>
        <span>Card Content</span>
      </SpotlightCard>,
    );
    expect(screen.getByText('Card Content')).toBeDefined();
  });

  it('should handle mouse enter, move, and leave events', () => {
    render(
      <SpotlightCard className="test-card">
        <span>Interactive Card</span>
      </SpotlightCard>,
    );
    const card = screen.getByTestId('spotlight-card');
    expect(card.className).toContain('test-card');

    fireEvent.mouseEnter(card);
    fireEvent.mouseMove(card, { clientX: 100, clientY: 150 });
    fireEvent.mouseLeave(card);
  });
});

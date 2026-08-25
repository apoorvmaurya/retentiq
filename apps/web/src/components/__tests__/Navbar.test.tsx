import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import Navbar from '../Navbar';

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders branding and main navigation links', () => {
    render(<Navbar />);

    expect(screen.getByText('RetentIQ')).toBeTruthy();
    expect(screen.getByRole('link', { name: /workflow/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /capabilities/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /pricing/i })).toBeTruthy();
  });

  it('renders login and start free call-to-action buttons', () => {
    render(<Navbar />);

    const loginLinks = screen.getAllByRole('link', { name: /login/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks[0].getAttribute('href')).toBe('/login');

    const startLinks = screen.getAllByRole('link', { name: /start free/i });
    expect(startLinks.length).toBeGreaterThan(0);
    expect(startLinks[0].getAttribute('href')).toBe('/dashboard');
  });

  it('triggers search trigger element on search button click', () => {
    const trigger = document.createElement('button');
    trigger.id = 'global-search-trigger';
    const clickSpy = vi.fn();
    trigger.addEventListener('click', clickSpy);
    document.body.appendChild(trigger);

    render(<Navbar />);

    const searchBtns = screen.getAllByRole('button', { name: /open command menu/i });
    expect(searchBtns.length).toBeGreaterThan(0);

    fireEvent.click(searchBtns[0]);
    expect(clickSpy).toHaveBeenCalled();

    document.body.removeChild(trigger);
  });

  it('toggles mobile menu on menu button click', () => {
    render(<Navbar />);

    const menuToggle = screen.getByRole('button', { name: /open menu/i });
    expect(menuToggle).toBeTruthy();

    fireEvent.click(menuToggle);
    expect(screen.getByRole('button', { name: /close menu/i })).toBeTruthy();
  });
});

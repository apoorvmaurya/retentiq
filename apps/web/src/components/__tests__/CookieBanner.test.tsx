import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CookieBanner from '../CookieBanner';

describe('CookieBanner Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render if consent is already set in localStorage', () => {
    localStorage.setItem(
      'retentiq-cookie-consent',
      JSON.stringify({ essential: true, analytics: true, marketing: true }),
    );

    render(<CookieBanner />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(/We respect your privacy/i)).toBeNull();
  });

  it('renders after delay when no consent exists and accepts all cookies', () => {
    render(<CookieBanner />);

    // Initially not visible before timer
    expect(screen.queryByText(/We respect your privacy/i)).toBeNull();

    // Advance timer to trigger display
    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.getByText(/We respect your privacy/i)).toBeTruthy();

    const acceptBtn = screen.getByRole('button', { name: /accept all/i });
    fireEvent.click(acceptBtn);

    const saved = JSON.parse(localStorage.getItem('retentiq-cookie-consent') || '{}');
    expect(saved).toEqual({ essential: true, analytics: true, marketing: true });
  });

  it('allows customizing preferences and saving', () => {
    render(<CookieBanner />);

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    const customizeBtn = screen.getByRole('button', { name: /customize/i });
    fireEvent.click(customizeBtn);

    expect(screen.getByText(/Cookie Settings/i)).toBeTruthy();
    expect(screen.getByText(/Essential Cookies/i)).toBeTruthy();

    const saveBtn = screen.getByRole('button', { name: /save preferences/i });
    fireEvent.click(saveBtn);

    const saved = JSON.parse(localStorage.getItem('retentiq-cookie-consent') || '{}');
    expect(saved.essential).toBe(true);
  });

  it('allows rejecting optional cookies', () => {
    render(<CookieBanner />);

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    const rejectBtn = screen.getByRole('button', { name: /reject optional/i });
    fireEvent.click(rejectBtn);

    const saved = JSON.parse(localStorage.getItem('retentiq-cookie-consent') || '{}');
    expect(saved).toEqual({ essential: true, analytics: false, marketing: false });
  });
});

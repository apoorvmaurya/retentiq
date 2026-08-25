import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from '../Footer';

describe('Footer Component', () => {
  it('renders branding and description', () => {
    render(<Footer />);

    expect(screen.getByText('RetentIQ')).toBeTruthy();
    expect(screen.getByText(/AI-powered customer churn-intelligence platform/i)).toBeTruthy();
  });

  it('renders all key navigation link categories', () => {
    render(<Footer />);

    expect(screen.getByRole('heading', { name: /product/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /company/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /resources/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /legal/i })).toBeTruthy();

    // Check specific links
    expect(screen.getByRole('link', { name: /privacy policy/i }).getAttribute('href')).toBe(
      '/privacy',
    );
    expect(screen.getByRole('link', { name: /terms of service/i }).getAttribute('href')).toBe(
      '/terms',
    );
    expect(screen.getByRole('link', { name: /documentation/i }).getAttribute('href')).toBe(
      '/documentation',
    );
  });

  it('renders copyright and system operational indicator', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeTruthy();
    expect(screen.getByText(/All systems operational/i)).toBeTruthy();
  });
});

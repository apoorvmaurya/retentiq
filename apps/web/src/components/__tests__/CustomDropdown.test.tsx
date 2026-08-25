import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomDropdown } from '../CustomDropdown';

describe('CustomDropdown Component', () => {
  const options = [
    { value: 'all', label: 'All Tiers' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'pro', label: 'Pro Tier' },
  ];

  it('renders with label and selected option', () => {
    render(
      <CustomDropdown options={options} value="all" onChange={() => {}} label="Filter by Tier" />,
    );

    expect(screen.getByText('Filter by Tier')).toBeTruthy();
    expect(screen.getByText('All Tiers')).toBeTruthy();
  });

  it('opens options menu on click and triggers onChange', () => {
    const handleChange = vi.fn();
    render(<CustomDropdown options={options} value="all" onChange={handleChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const enterpriseOption = screen.getByText('Enterprise');
    expect(enterpriseOption).toBeTruthy();

    fireEvent.click(enterpriseOption);
    expect(handleChange).toHaveBeenCalledWith('enterprise');
  });
});

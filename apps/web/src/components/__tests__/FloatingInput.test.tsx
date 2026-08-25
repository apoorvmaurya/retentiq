import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingInput } from '../FloatingInput';

describe('FloatingInput Component', () => {
  it('renders label and input properly', () => {
    render(<FloatingInput label="Email Address" value="" onChange={() => {}} />);
    expect(screen.getByText('Email Address')).toBeTruthy();
  });

  it('handles focus and value changes', () => {
    const handleChange = vi.fn();
    render(
      <FloatingInput label="Password" type="password" value="secret" onChange={handleChange} />,
    );

    const input = screen.getByDisplayValue('secret');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'newpassword' } });

    expect(handleChange).toHaveBeenCalled();
  });
});

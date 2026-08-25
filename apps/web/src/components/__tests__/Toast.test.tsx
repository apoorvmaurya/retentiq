import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';

function TestConsumer() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Operation succeeded!')}>Trigger Success</button>
      <button onClick={() => toast.error('Something went wrong!')}>Trigger Error</button>
      <button onClick={() => toast.warning('Careful now!')}>Trigger Warning</button>
      <button onClick={() => toast.info('For your info!')}>Trigger Info</button>
    </div>
  );
}

describe('Toast Component', () => {
  it('renders and displays toasts correctly across all types', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    const successBtn = screen.getByText('Trigger Success');
    fireEvent.click(successBtn);
    expect(screen.getByText('Operation succeeded!')).toBeTruthy();

    const errorBtn = screen.getByText('Trigger Error');
    fireEvent.click(errorBtn);
    expect(screen.getByText('Something went wrong!')).toBeTruthy();

    const warningBtn = screen.getByText('Trigger Warning');
    fireEvent.click(warningBtn);
    expect(screen.getByText('Careful now!')).toBeTruthy();

    const infoBtn = screen.getByText('Trigger Info');
    fireEvent.click(infoBtn);
    expect(screen.getByText('For your info!')).toBeTruthy();
  });
});

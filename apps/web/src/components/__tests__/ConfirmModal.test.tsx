import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../ConfirmModal';

describe('ConfirmModal Component', () => {
  it('renders title, description and triggers actions', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Delete Customer Account"
        description="Are you sure you want to delete this account? This action cannot be undone."
        confirmLabel="Yes, Delete"
        cancelLabel="Keep Account"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isDanger={true}
      />,
    );

    expect(screen.getByText('Delete Customer Account')).toBeTruthy();
    expect(screen.getByText(/Are you sure you want to delete this account/)).toBeTruthy();

    const confirmButton = screen.getByText('Yes, Delete');
    fireEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    const cancelButton = screen.getByText('Keep Account');
    fireEvent.click(cancelButton);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(
      <ConfirmModal
        isOpen={false}
        title="Hidden Modal"
        description="Should not be visible"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.queryByText('Hidden Modal')).toBeNull();
  });
});

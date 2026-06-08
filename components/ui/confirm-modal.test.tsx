import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './confirm-modal';

describe('ConfirmModal component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="portal-root"></div>';
  });

  it('should render correct title and message', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        confirmText="Yes, delete it"
        cancelText="No, keep it"
      />
    );

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
    expect(screen.getByText('Yes, delete it')).toBeInTheDocument();
    expect(screen.getByText('No, keep it')).toBeInTheDocument();
  });

  it('should call onConfirm and onClose when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Confirm Title"
        message="Message content"
        confirmText="ConfirmBtn"
        cancelText="CancelBtn"
      />
    );

    fireEvent.click(screen.getByText('ConfirmBtn'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Confirm Title"
        message="Message content"
        confirmText="ConfirmBtn"
        cancelText="CancelBtn"
      />
    );

    fireEvent.click(screen.getByText('CancelBtn'));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });
});

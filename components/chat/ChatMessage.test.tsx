import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ChatMessage } from './ChatMessage';

// Mock MarkdownRenderer
vi.mock('./MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown-renderer">{content}</div>
}));

// Mock Toast Store
vi.mock('@/lib/store/toast-store', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}));

describe('ChatMessage Component', () => {
  const defaultProps: any = {
    message: {
      id: 'msg-1',
      role: 'user',
      content: 'Hello AI',
      timestamp: new Date(),
      isEdited: false,
    },
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onRegenerate: vi.fn(),
    onSwitchVersion: vi.fn(),
  };

  it('renders user message correctly', () => {
    render(<ChatMessage {...defaultProps} />);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('Hello AI');
  });

  it('renders AI message correctly', () => {
    const aiMessage = { ...defaultProps.message, role: 'assistant', content: 'Hello User' };
    render(<ChatMessage {...defaultProps} message={aiMessage} />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-renderer')).toHaveTextContent('Hello User');
  });

  it('enters edit mode and calls onEdit when saved', async () => {
    const user = userEvent.setup();
    const onEditMock = vi.fn();
    render(<ChatMessage {...defaultProps} onEdit={onEditMock} />);
    
    // Find and click edit button
    const editButton = screen.getByTitle('Edit message');
    await user.click(editButton);
    
    // Find textarea and type
    const textarea = screen.getByDisplayValue('Hello AI');
    await user.clear(textarea);
    await user.type(textarea, 'Hello updated');
    
    // Click Save
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    expect(onEditMock).toHaveBeenCalledWith('msg-1', 'Hello updated');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteMock = vi.fn();
    render(<ChatMessage {...defaultProps} onDelete={onDeleteMock} />);
    
    const deleteButton = screen.getByTitle('Delete message');
    await user.click(deleteButton);
    
    expect(onDeleteMock).toHaveBeenCalledWith('msg-1');
  });

  it('shows (edited) tag if message is edited', () => {
    const editedMessage = { ...defaultProps.message, isEdited: true };
    render(<ChatMessage {...defaultProps} message={editedMessage} />);
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });
});

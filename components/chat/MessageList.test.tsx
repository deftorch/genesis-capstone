import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageList } from './MessageList';
import { useUIStore } from '@/lib/store/ui-store';
import { useChatStore } from '@/lib/store/chat-store';
import { useToast } from '@/lib/store/toast-store';

// Mock the child components that use canvas
vi.mock('@/components/p5/P5Canvas', () => ({
  default: () => <div data-testid="p5-canvas">P5 Canvas</div>
}));
vi.mock('@/components/d3/D3Canvas', () => ({
  default: () => <div data-testid="d3-canvas">D3 Canvas</div>
}));
vi.mock('@/components/svg/SVGCanvas', () => ({
  default: () => <div data-testid="svg-canvas">SVG Canvas</div>
}));
vi.mock('@/components/mermaid/MermaidCanvas', () => ({
  default: () => <div data-testid="mermaid-canvas">Mermaid Canvas</div>
}));

// Mock toast store
vi.mock('@/lib/store/toast-store', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

describe('MessageList & MessageItem Components', () => {
  beforeEach(() => {
    useUIStore.setState({ activeChatId: 'chat-1' });
    useChatStore.setState({
      chats: [
        {
          id: 'chat-1',
          title: 'Test',
          messages: [
            { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date() },
            { id: 'msg-2', role: 'assistant', content: 'Hi there', timestamp: new Date() },
            { id: 'msg-3', role: 'assistant', content: 'Here is code:\n```javascript\nfunction setup() {}\n```', timestamp: new Date() }
          ],
          modelConfig: {} as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          isStarred: false,
          totalTokens: 0,
        }
      ]
    });
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.clearAllMocks();
  });

  const defaultProps: any = {
    messages: [
      { type: 'user', content: 'Hello' },
      { type: 'ai', content: 'Hi there' },
      { type: 'ai', content: 'Here is code:\n```javascript\nfunction setup() {}\n```' }
    ],
    isLoading: false,
    regeneratingId: null,
    onRegenerate: vi.fn(),
    onSwitchVersionIdx: vi.fn(),
    onSaveMessageEdit: vi.fn(),
    codeVersions: [
      { messageIndex: 2, versionNumber: 1, code: 'function setup() {}', renderer: 'p5' }
    ]
  };

  it('renders empty state if no messages', () => {
    render(<MessageList {...defaultProps} messages={[]} />);
    expect(screen.getByText('Start creating')).toBeInTheDocument();
    expect(screen.getByText('Describe what you want to visualize')).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    render(<MessageList {...defaultProps} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('renders P5 canvas preview inside chat when AI returns code', () => {
    render(<MessageList {...defaultProps} />);
    expect(screen.getByTestId('p5-canvas')).toBeInTheDocument();
  });

  it('shows loading indicator when isLoading is true', () => {
    render(<MessageList {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Analyzing request...')).toBeInTheDocument();
  });

  it('calls onRegenerate when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRegenerateMock = vi.fn();
    render(<MessageList {...defaultProps} onRegenerate={onRegenerateMock} />);
    
    // Find regenerate buttons (Lucide RotateCw icon renders as SVG inside button)
    const retryButtons = screen.getAllByTitle('Retry generation');
    expect(retryButtons.length).toBeGreaterThan(0);
    
    await user.click(retryButtons[1]);
    expect(onRegenerateMock).toHaveBeenCalledWith('msg-2');
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatPage from './page';
import { useChatStore } from '@/lib/store/chat-store';

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = { push: mockPush, replace: mockReplace };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ chatId: 'test-chat-123' }),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock child components
vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/components/chat/ChatMessage', () => ({
  ChatMessage: ({ message }: any) => <div data-testid="chat-message">{message.content}</div>,
}));

vi.mock('@/components/chat/ChatInput', () => ({
  ChatInput: () => <div data-testid="chat-input">ChatInput</div>,
}));

vi.mock('@/components/settings/SettingsModal', () => ({
  SettingsModal: () => <div data-testid="settings-modal">SettingsModal</div>,
}));

vi.mock('@/components/settings/ModelSelector', () => ({
  ModelSelector: () => <div data-testid="model-selector">ModelSelector</div>,
}));

describe('ChatPage (app/chat/[chatId]/page.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Setup chat store with a dummy chat
    useChatStore.setState({
      chats: [
        {
          id: 'test-chat-123',
          title: 'New Chat',
          messages: [{ id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() }],
          modelConfig: { model: 'gemini-1.5-pro', temperature: 0.7, maxTokens: 2048 },
          createdAt: new Date(),
          updatedAt: new Date(),
          isStarred: false,
          totalTokens: 10,
        }
      ],
      currentChatId: 'test-chat-123',
    } as any);
  });

  it('renders chat messages if chat exists', () => {
    render(<ChatPage />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('chat-message')).toHaveTextContent('Hello');
  });

  it('redirects to home if chat does not exist', () => {
    useChatStore.setState({ chats: [] });
    render(<ChatPage />);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

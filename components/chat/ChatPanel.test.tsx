import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatPanel } from './ChatPanel';
import { useUIStore } from '@/lib/store/ui-store';
import { useChatStore } from '@/lib/store/chat-store';

// Mock the child views to simplify the test of the "God Component"
vi.mock('./views/HomeView', () => ({
  HomeView: () => <div data-testid="home-view">Home View</div>,
}));
vi.mock('./views/ProjectsView', () => ({
  ProjectsView: () => <div data-testid="projects-view">Projects View</div>,
}));
vi.mock('./views/ChatsView', () => ({
  ChatsView: () => <div data-testid="chats-view">Chats View</div>,
}));
vi.mock('./views/GalleryView', () => ({
  GalleryView: () => <div data-testid="gallery-view">Gallery View</div>,
}));
vi.mock('./views/ActiveChatView', () => ({
  ActiveChatView: () => <div data-testid="active-chat-view">Active Chat View</div>,
}));

// Mock ResizeObserver for any child components that might use it
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('ChatPanel (God Component)', () => {
  const defaultProps: any = {
    messages: [],
    isLoading: false,
    onSendMessage: vi.fn(),
    onStopGeneration: vi.fn(),
    attachedImages: [],
    setAttachedImages: vi.fn(),
    removeAttachedImage: vi.fn(),
    isUploading: false,
    fileInputRef: { current: null },
    chatInputRef: { current: null },
    selectedModel: 'gemini-1.5-pro',
    setSelectedModel: vi.fn(),
    codeVersions: [],
    regeneratingId: null,
    onRegenerate: vi.fn(),
    onSwitchVersionIdx: vi.fn(),
    onSaveMessageEdit: vi.fn(),
    onStartNewChat: vi.fn(),
    onSelectChat: vi.fn(),
    onLoadArtifactCode: vi.fn(),
    onDeleteArtifact: vi.fn(),
    chatSearchQuery: '',
    setChatSearchQuery: vi.fn(),
    isMultiSelectChats: false,
    setIsMultiSelectChats: vi.fn(),
    selectedChatIds: [],
    setSelectedChatIds: vi.fn(),
    greeting: 'Hello',
  };

  beforeEach(() => {
    // Reset stores
    useUIStore.setState({
      currentView: 'home',
      sidebarOpen: true,
      activeChatId: null,
      showArtifact: false,
      isArtifactFullscreen: false,
      isSettingsOpen: false,
    });
    useChatStore.setState({ chats: [] });
    vi.clearAllMocks();
  });

  it('renders Genesis brand in header when not in chat view', () => {
    useUIStore.setState({ sidebarOpen: false });
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Genesis')).toBeInTheDocument();
  });

  it('renders HomeView by default', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByTestId('home-view')).toBeInTheDocument();
  });

  it('renders ActiveChatView when currentView is chat', () => {
    useUIStore.setState({ currentView: 'chat' });
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByTestId('active-chat-view')).toBeInTheDocument();
  });

  it('renders chat title if activeChatId exists and in chat view', () => {
    useChatStore.setState({
      chats: [
        {
          id: 'chat-1',
          title: 'My Custom Chat',
          messages: [],
          modelConfig: {} as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          isStarred: false,
          totalTokens: 0,
        },
      ],
    });
    useUIStore.setState({ currentView: 'chat', activeChatId: 'chat-1' });
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('My Custom Chat')).toBeInTheDocument();
  });

  it('opens settings when clicking upgrade/settings button', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} />);
    
    // Desktop upgrade button
    const upgradeButton = screen.getByText('Upgrade');
    await user.click(upgradeButton);
    
    expect(useUIStore.getState().isSettingsOpen).toBe(true);
  });

  it('renders other views correctly based on uiStore state', () => {
    const { unmount } = render(<ChatPanel {...defaultProps} />);
    
    act(() => useUIStore.setState({ currentView: 'projects' }));
    expect(screen.getByTestId('projects-view')).toBeInTheDocument();

    act(() => useUIStore.setState({ currentView: 'gallery' }));
    expect(screen.getByTestId('gallery-view')).toBeInTheDocument();

    act(() => useUIStore.setState({ currentView: 'chats' }));
    expect(screen.getByTestId('chats-view')).toBeInTheDocument();
    
    unmount();
  });
});

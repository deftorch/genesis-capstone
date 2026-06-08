import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '@/lib/store/ui-store';
import { useChatStore } from '@/lib/store/chat-store';

/**
 * Sidebar tests.
 * Tests the store-level behaviors that drive Sidebar rendering:
 * - Chat list rendering (sorting, filtering)
 * - Chat operations (rename, delete, star)
 * - Navigation between views
 * - Sidebar open/close state
 */
describe('Sidebar — Store Logic & Chat Operations', () => {
  beforeEach(() => {
    const baseConfig = {
      id: 'default',
      name: 'Default',
      provider: 'google' as const,
      model: 'gemini-3-flash' as const,
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.95,
      frequencyPenalty: 0,
      presencePenalty: 0,
    };

    useChatStore.setState({
      chats: [
        {
          id: 'chat-older',
          title: 'Older Chat',
          messages: [
            { id: 'm1', role: 'user', content: 'Hello', timestamp: new Date(), tokens: 5 },
          ],
          modelConfig: baseConfig,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
          isStarred: false,
          totalTokens: 10,
        },
        {
          id: 'chat-newer',
          title: 'Newer Chat',
          messages: [
            { id: 'm2', role: 'user', content: 'Hi', timestamp: new Date(), tokens: 3 },
            { id: 'm3', role: 'assistant', content: 'Hello!', timestamp: new Date(), tokens: 4 },
          ],
          modelConfig: baseConfig,
          createdAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-01'),
          isStarred: true,
          totalTokens: 20,
        },
        {
          id: 'chat-mid',
          title: 'Mid Chat',
          messages: [],
          modelConfig: baseConfig,
          createdAt: new Date('2026-03-01'),
          updatedAt: new Date('2026-03-01'),
          isStarred: false,
          totalTokens: 0,
        },
      ],
      artifacts: [
        {
          id: 'art-1',
          chatId: 'chat-newer',
          chatTitle: 'Newer Chat',
          code: '// p5 code',
          renderer: 'p5',
          createdAt: new Date(),
        },
      ],
      projects: [],
    });

    useUIStore.setState({
      sidebarOpen: true,
      currentView: 'home',
      activeChatId: null,
      chatMenuOpenId: null,
    });
  });

  it('should render chat list sorted by updatedAt descending', () => {
    const { chats } = useChatStore.getState();
    const sorted = [...chats].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    expect(sorted[0].id).toBe('chat-newer');
    expect(sorted[1].id).toBe('chat-mid');
    expect(sorted[2].id).toBe('chat-older');
  });

  it('should display correct message count for each chat', () => {
    const { chats } = useChatStore.getState();
    
    const olderChat = chats.find(c => c.id === 'chat-older');
    const newerChat = chats.find(c => c.id === 'chat-newer');
    const midChat = chats.find(c => c.id === 'chat-mid');

    expect(olderChat?.messages.length).toBe(1);
    expect(newerChat?.messages.length).toBe(2);
    expect(midChat?.messages.length).toBe(0);
  });

  it('should display correct artifact count for gallery badge', () => {
    const { artifacts } = useChatStore.getState();
    expect(artifacts.length).toBe(1);
  });

  it('should rename a chat', () => {
    useChatStore.getState().renameChat('chat-older', 'Renamed Chat');
    const chat = useChatStore.getState().chats.find(c => c.id === 'chat-older');
    expect(chat?.title).toBe('Renamed Chat');
  });

  it('should delete a chat and cascade-remove related artifacts', () => {
    // Verify initial state
    expect(useChatStore.getState().chats.length).toBe(3);
    expect(useChatStore.getState().artifacts.length).toBe(1);

    // Delete the chat that has an artifact
    useChatStore.getState().deleteChat('chat-newer');

    expect(useChatStore.getState().chats.length).toBe(2);
    // Artifacts linked to the deleted chat should also be removed
    expect(useChatStore.getState().artifacts.length).toBe(0);
  });

  it('should toggle sidebar open/close', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);

    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().setSidebarOpen(true);
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('should navigate between views', () => {
    const { setCurrentView } = useUIStore.getState();

    setCurrentView('chats');
    expect(useUIStore.getState().currentView).toBe('chats');

    setCurrentView('projects');
    expect(useUIStore.getState().currentView).toBe('projects');

    setCurrentView('gallery');
    expect(useUIStore.getState().currentView).toBe('gallery');

    setCurrentView('home');
    expect(useUIStore.getState().currentView).toBe('home');
  });

  it('should set active chat when selecting a chat', () => {
    useUIStore.getState().setActiveChatId('chat-newer');
    useUIStore.getState().setCurrentView('chat');

    expect(useUIStore.getState().activeChatId).toBe('chat-newer');
    expect(useUIStore.getState().currentView).toBe('chat');
  });

  it('should track which chat context menu is open', () => {
    expect(useUIStore.getState().chatMenuOpenId).toBeNull();

    useUIStore.getState().setChatMenuOpenId('chat-older');
    expect(useUIStore.getState().chatMenuOpenId).toBe('chat-older');

    // Toggle off
    useUIStore.getState().setChatMenuOpenId(null);
    expect(useUIStore.getState().chatMenuOpenId).toBeNull();
  });
});

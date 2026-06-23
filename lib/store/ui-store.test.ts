import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const initialState = useUIStore.getState();
    useUIStore.setState({
      showArtifact: false,
      isArtifactFullscreen: false,
      sidebarOpen: true,
      currentView: 'home',
      activeChatId: null,
      zoom: 1,
      inputMessage: '',
    });
  });

  it('should initialize with default values', () => {
    const state = useUIStore.getState();
    expect(state.currentView).toBe('home');
    expect(state.sidebarOpen).toBe(true);
    expect(state.zoom).toBe(1);
    expect(state.showArtifact).toBe(false);
  });

  it('should update basic boolean states correctly', () => {
    useUIStore.getState().setShowArtifact(true);
    expect(useUIStore.getState().showArtifact).toBe(true);

    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('should update currentView and activeChatId', () => {
    useUIStore.getState().setCurrentView('chat');
    expect(useUIStore.getState().currentView).toBe('chat');

    useUIStore.getState().setActiveChatId('chat-123');
    expect(useUIStore.getState().activeChatId).toBe('chat-123');
  });

  it('should restrict zoom bounds between 0.25 and 4', () => {
    // Test direct value
    useUIStore.getState().setZoom(5);
    expect(useUIStore.getState().zoom).toBe(4); // Max 4

    useUIStore.getState().setZoom(0.1);
    expect(useUIStore.getState().zoom).toBe(0.25); // Min 0.25

    useUIStore.getState().setZoom(2);
    expect(useUIStore.getState().zoom).toBe(2);

    // Test updater function
    useUIStore.getState().setZoom((prev) => prev * 3); // 2 * 3 = 6 -> capped at 4
    expect(useUIStore.getState().zoom).toBe(4);

    useUIStore.getState().setZoom((prev) => prev - 3.9); // 4 - 3.9 = 0.1 -> capped at 0.25
    expect(useUIStore.getState().zoom).toBe(0.25);
  });

  it('should reset state correctly using resetForNewChat', () => {
    // Modify some states
    useUIStore.setState({
      currentView: 'chats',
      activeChatId: 'chat-abc',
      p5Code: 'function() {}',
      showArtifact: true,
      inputMessage: 'hello',
    });

    useUIStore.getState().resetForNewChat();

    const state = useUIStore.getState();
    expect(state.currentView).toBe('home');
    expect(state.activeChatId).toBeNull();
    expect(state.p5Code).toBe('');
    expect(state.showArtifact).toBe(false);
    expect(state.inputMessage).toBe('');
  });
});

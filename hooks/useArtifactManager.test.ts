import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useArtifactManager } from './useArtifactManager';
import { useChatStore } from '@/lib/store/chat-store';

describe('useArtifactManager hook', () => {
  beforeEach(() => {
    useChatStore.setState({ chats: [], activeChatId: null });
  });

  it('should call addArtifact on chat store with correct parameters', () => {
    // We can spy on the store method, but a simpler way is to just use the actual store and verify state changes.
    // However, since useChatStore requires an existing chat to add an artifact, we create one first.
    useChatStore.getState().createChat('Test chat', 'chat-1');

    const { result } = renderHook(() => useArtifactManager());

    act(() => {
      result.current.addArtifact('chat-1', 'Test chat', 'function setup() {}', 'p5');
    });

    const state = useChatStore.getState();
    const artifacts = state.artifacts.filter(a => a.chatId === 'chat-1');
    expect(artifacts.length).toBe(1);
    expect(artifacts[0].code).toBe('function setup() {}');
    expect(artifacts[0].renderer).toBe('p5');
  });

  it('should call deleteArtifact and remove from store', () => {
    useChatStore.getState().createChat('Test chat', 'chat-2');
    
    const { result } = renderHook(() => useArtifactManager());

    act(() => {
      result.current.addArtifact('chat-2', 'Test chat', 'some code', 'd3');
    });

    let state = useChatStore.getState();
    const artifactId = state.artifacts.find(a => a.chatId === 'chat-2')!.id;

    act(() => {
      result.current.deleteArtifact(artifactId);
    });

    state = useChatStore.getState();
    expect(state.artifacts.filter(a => a.chatId === 'chat-2').length).toBe(0);
  });
});

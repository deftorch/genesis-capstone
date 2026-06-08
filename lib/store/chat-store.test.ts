import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chat-store';

describe('Chat Store', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useChatStore.getState().clearAll();
  });

  it('should create a chat and add it to the chats list', () => {
    const store = useChatStore.getState();
    const chatId = store.createChat('Test Chat');

    expect(chatId).toBeDefined();
    expect(useChatStore.getState().chats.length).toBe(1);
    expect(useChatStore.getState().chats[0].title).toBe('Test Chat');
  });

  it('should support adding messages to a chat', () => {
    const store = useChatStore.getState();
    const chatId = store.createChat('Test Chat');
    
    store.addMessage(chatId, {
      role: 'user',
      content: 'Hello, AI!',
      tokens: 5,
    });

    const chats = useChatStore.getState().chats;
    expect(chats[0].messages.length).toBe(1);
    expect(chats[0].messages[0].content).toBe('Hello, AI!');
    expect(chats[0].totalTokens).toBe(5);
  });

  it('should support message versioning', () => {
    const store = useChatStore.getState();
    const chatId = store.createChat('Test Chat');
    
    store.addMessage(chatId, {
      role: 'user',
      content: 'Hello',
    });

    const msgId = useChatStore.getState().chats[0].messages[0].id;

    // Update message to create a second version
    store.updateMessage(chatId, msgId, 'Hello World');
    
    let msg = useChatStore.getState().chats[0].messages[0];
    expect(msg.content).toBe('Hello World');
    expect(msg.versions).toEqual(['Hello', 'Hello World']);
    expect(msg.activeVersionIdx).toBe(1);

    // Switch back to version 0
    store.switchMessageVersion(chatId, msgId, 0);
    msg = useChatStore.getState().chats[0].messages[0];
    expect(msg.content).toBe('Hello');
    expect(msg.activeVersionIdx).toBe(0);
  });

  it('should handle artifacts lifecycle and cascading deletes', () => {
    const store = useChatStore.getState();
    const chatId = store.createChat('Creative Chat');

    // Add artifact
    store.addArtifact({
      chatId,
      chatTitle: 'Creative Chat',
      code: 'function setup() { createCanvas(100, 100); }',
      renderer: 'p5',
    });

    let artifacts = useChatStore.getState().artifacts;
    expect(artifacts.length).toBe(1);
    expect(artifacts[0].chatId).toBe(chatId);
    expect(artifacts[0].renderer).toBe('p5');

    // Cascade delete chat should remove related artifacts
    store.deleteChat(chatId);
    expect(useChatStore.getState().chats.length).toBe(0);
    expect(useChatStore.getState().artifacts.length).toBe(0);
  });
});

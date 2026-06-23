import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useChatSubmit } from './useChatSubmit';
import { useChatStore } from '@/lib/store/chat-store';
import { useUIStore } from '@/lib/store/ui-store';

// Mock chat summarizer dynamic import
vi.mock('@/lib/chat-summarizer', () => ({
  buildContextForAPI: vi.fn((messages) => messages.map((m: any) => ({ role: m.role, content: m.content }))),
  shouldUpdateSummary: vi.fn(() => false),
  generateMessagesSummary: vi.fn(() => ''),
}));

// Utility to create a mocked ReadableStream
function createMockStream(chunks: string[]) {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => {
        controller.enqueue(new TextEncoder().encode(chunk));
      });
      controller.close();
    },
  });
}

describe('useChatSubmit hook', () => {
  beforeEach(() => {
    // Clear state before each test
    useChatStore.setState({ chats: [], activeChatId: null });
    useUIStore.setState({ 
      inputMessage: '', 
      currentView: 'home',
      showArtifact: false,
      editableCode: '',
      p5Code: null,
      previousCode: null,
      activeRenderer: 'p5',
      activeTab: 'code'
    });
    
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useChatSubmit({ chatId: null, selectedModel: 'gemini-1.5-pro' }));
    
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.submit).toBe('function');
    expect(typeof result.current.stopGeneration).toBe('function');
  });

  it('should not submit if message is empty and no images', async () => {
    const { result } = renderHook(() => useChatSubmit({ chatId: null, selectedModel: 'gemini-1.5-pro' }));
    
    await act(async () => {
      await result.current.submit('   ', [], []);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should create a new chat if activeChatId is null and submit message', async () => {
    // Mock successful stream response
    const mockStreamChunks = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello "}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"World!"}]}}]}\n\n',
      'data: [DONE]\n\n'
    ];
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      body: createMockStream(mockStreamChunks),
    });

    const { result } = renderHook(() => useChatSubmit({ chatId: null, selectedModel: 'gemini-1.5-pro' }));

    await act(async () => {
      await result.current.submit('Test message', [], []);
    });

    const state = useChatStore.getState();
    expect(state.chats.length).toBe(1);
    expect(state.chats[0].title).toBe('Test message');
    expect(state.chats[0].messages.length).toBe(2); // user message + assistant response
    expect(state.chats[0].messages[0].role).toBe('user');
    expect(state.chats[0].messages[0].content).toBe('Test message');
    expect(state.chats[0].messages[1].role).toBe('assistant');
    expect(state.chats[0].messages[1].content).toBe('Hello World!');
    
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle code extraction and update ui store', async () => {
    const aiResponse = 'Here is your code:\n```javascript\nfunction setup() {}\n```';
    const mockStreamChunks = [
      `data: {"candidates":[{"content":{"parts":[{"text":"${aiResponse.replace(/\n/g, '\\n')}"}]}}]}\n\n`,
      'data: [DONE]\n\n'
    ];
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      body: createMockStream(mockStreamChunks),
    });

    const { result } = renderHook(() => useChatSubmit({ chatId: null, selectedModel: 'gemini-1.5-pro' }));

    await act(async () => {
      await result.current.submit('Draw a circle', [], []);
    });

    const uiState = useUIStore.getState();
    expect(uiState.showArtifact).toBe(true);
    expect(uiState.editableCode).toBe('function setup() {}');
    expect(uiState.p5Code).toBe('function setup() {}');
    expect(uiState.activeRenderer).toBe('p5');
  });

  it('should handle fetch error gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useChatSubmit({ chatId: null, selectedModel: 'gemini-1.5-pro' }));

    await act(async () => {
      await result.current.submit('Hello', [], []);
    });

    const state = useChatStore.getState();
    const chat = state.chats[0];
    expect(chat.messages[1].content).toBe('Failed to connect to AI service. Please try again.');
    expect(result.current.isLoading).toBe(false);
  });

  it('should abort generation when stopGeneration is called', async () => {
    let mockReaderRead: any;
    const mockReader = {
      read: vi.fn(() => {
        return new Promise((resolve, reject) => {
          mockReaderRead = { resolve, reject };
        });
      })
    };

    (global.fetch as any).mockImplementationOnce((url: any, options: any) => {
      options.signal.addEventListener('abort', () => {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        mockReaderRead?.reject(err);
      });
      return Promise.resolve({
        ok: true,
        body: { getReader: () => mockReader }
      });
    });

    const { result } = renderHook(() => useChatSubmit({ chatId: null, selectedModel: 'gemini-1.5-pro' }));

    let submitPromise: Promise<void>;
    
    act(() => {
      submitPromise = result.current.submit('Long task', [], []);
    });

    // Let the fetch start and reach reader.read()
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.stopGeneration();
    });

    await act(async () => {
      try {
        await submitPromise;
      } catch(e) {}
    });

    expect(result.current.isLoading).toBe(false);
    const state = useChatStore.getState();
    const chat = state.chats[0];
    const lastMsg = chat.messages[chat.messages.length - 1];
    expect(lastMsg.content).toBe('Generation stopped.');
  });
});

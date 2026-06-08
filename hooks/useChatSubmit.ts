import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '@/lib/store/chat-store';
import { useUIStore } from '@/lib/store/ui-store';
import { extractCode } from '@/lib/extract-code';
import { ImageAttachment } from '@/types';

interface UseChatSubmitOptions {
  chatId: string | null;
  selectedModel: string;
}

export function useChatSubmit({ chatId, selectedModel }: UseChatSubmitOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatStore = useChatStore();
  const ui = useUIStore();

  // Build image payloads from data URLs (exactly as in page.tsx)
  const buildImagePayloads = useCallback((images: ImageAttachment[]) => {
    return images.map((img) => {
      const url = img.url;
      if (url.startsWith('data:')) {
        // Match any mime type: data:[<mediatype>];base64,<data>
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) return { mimeType: match[1], base64: match[2] };
      }
      return { url };
    });
  }, []);

  // Sync messages from store to local state (needed after updating store)
  const syncMessages = useCallback((targetChatId: string) => {
    const chat = chatStore.chats.find((c) => c.id === targetChatId);
    if (!chat) return [];
    return chat.messages.map((msg) => ({
      type: msg.role === 'user' ? 'user' : 'ai',
      content: msg.content,
    }));
  }, [chatStore.chats]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setRegeneratingId(null);
    }
  }, []);

  const submit = useCallback(async (
    messageToSend: string,
    currentMessages: { type: string; content: string; images?: string[] }[],
    images: ImageAttachment[] = [],
    activeChatId: string | null = chatId,
  ) => {
    if (!messageToSend.trim() && images.length === 0) return;

    const imagePreviewUrls = images.map((img) => img.preview || img.url);

    const newMessages = [
      ...currentMessages,
      {
        type: 'user',
        content: messageToSend,
        images: imagePreviewUrls.length > 0 ? imagePreviewUrls : undefined,
      },
    ];

    ui.setInputMessage('');
    setIsLoading(true);
    ui.setCurrentView('chat');
    ui.setShowArtifact(false);

    // Create a new chat if it doesn't exist
    let currentChatId = activeChatId;
    if (!currentChatId) {
      const title = messageToSend.length > 40
        ? messageToSend.substring(0, 40) + '...'
        : messageToSend;
      currentChatId = chatStore.createChat(title);
      chatStore.updateModelConfig(currentChatId, { model: selectedModel as any });
      ui.setActiveChatId(currentChatId);
    }

    chatStore.addMessage(currentChatId, {
      role: 'user',
      content: messageToSend,
      tokens: 0,
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const imagePayloads = buildImagePayloads(images);
      const { buildContextForAPI } = await import('@/lib/chat-summarizer');
      
      const updatedChat = chatStore.chats.find(c => c.id === currentChatId);
      const apiMessages = updatedChat 
        ? buildContextForAPI(
            updatedChat.messages,
            updatedChat.summary,
            updatedChat.lastSummarizedIndex
          )
        : newMessages.map((msg) => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
          }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          currentCode: ui.editableCode || '',
          images: imagePayloads.length > 0 ? imagePayloads : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let aiContent = '';
      const messageId = chatStore.addMessage(currentChatId!, {
        role: 'assistant',
        content: '',
        tokens: 0,
      });

      let done = false;
      let buffer = '';
      let finalUsageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } | null = null;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data:')) {
              const dataStr = trimmedLine.slice(5).trim();
              if (dataStr === '[DONE]' || !dataStr) continue;
              
              try {
                const data = JSON.parse(dataStr);
                if (data.usageMetadata) {
                  finalUsageMetadata = data.usageMetadata;
                }
                const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textChunk) {
                  aiContent += textChunk;
                  chatStore.updateMessageContent(currentChatId!, messageId, aiContent);
                }
              } catch (e) {
                console.warn('Error parsing stream chunk:', e);
              }
            }
          }
        }
      }

      // Process any remaining buffer just in case
      if (buffer.trim().startsWith('data:')) {
        try {
          const dataStr = buffer.trim().slice(5).trim();
          if (dataStr && dataStr !== '[DONE]') {
            const data = JSON.parse(dataStr);
            if (data.usageMetadata) {
              finalUsageMetadata = data.usageMetadata;
            }
            const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              aiContent += textChunk;
              chatStore.updateMessageContent(currentChatId!, messageId, aiContent);
            }
          }
        } catch (e) {
          // Ignore final parse error
        }
      }

      if (finalUsageMetadata) {
        const promptTokens = finalUsageMetadata.promptTokenCount ?? 0;
        const completionTokens = finalUsageMetadata.candidatesTokenCount ?? 0;
        
        // Update assistant message tokens
        chatStore.updateMessageTokens(currentChatId!, messageId, completionTokens);
        
        // Find user message added just before
        const chat = chatStore.chats.find(c => c.id === currentChatId);
        if (chat && chat.messages.length >= 2) {
          const userMsg = chat.messages[chat.messages.length - 2];
          if (userMsg && userMsg.role === 'user') {
            chatStore.updateMessageTokens(currentChatId!, userMsg.id, promptTokens);
          }
        }
        
        chatStore.updateChatTokens(currentChatId!, promptTokens + completionTokens);
      }

      // Once done, extract code
      const extracted = extractCode(aiContent);
      if (extracted) {
        if (ui.p5Code) ui.setPreviousCode(ui.p5Code);
        ui.setP5Code(extracted.code);
        ui.setEditableCode(extracted.code);
        ui.setActiveRenderer(extracted.renderer);
        ui.setActiveTab('preview');
        ui.setShowArtifact(true);

        const chat = chatStore.chats.find((c) => c.id === currentChatId);
        chatStore.addArtifact({
          chatId: currentChatId!,
          chatTitle: chat?.title || 'Untitled',
          code: extracted.code,
          renderer: extracted.renderer,
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        chatStore.addMessage(currentChatId, {
          role: 'assistant',
          content: 'Generation stopped.',
          tokens: 0,
        });
      } else {
        chatStore.addMessage(currentChatId, {
          role: 'assistant',
          content: 'Failed to connect to AI service. Please try again.',
          tokens: 10,
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [chatId, selectedModel, ui, chatStore, buildImagePayloads]);

  return { submit, isLoading, stopGeneration, regeneratingId, setRegeneratingId, syncMessages };
}

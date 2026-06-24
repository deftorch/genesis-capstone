'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/lib/store/chat-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useToast } from '@/lib/store/toast-store';
import { useUIStore } from '@/lib/store/ui-store';

import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ArtifactPanel } from '@/components/artifact/ArtifactPanel';

import { SettingsModal } from '@/components/settings/SettingsModal';

import { useChatSubmit } from '@/hooks/useChatSubmit';
import { useVersionHistory } from '@/hooks/useVersionHistory';
import { useArtifactManager } from '@/hooks/useArtifactManager';

import { extractCode } from '@/lib/extract-code';
import { parseSSEStream } from '@/lib/sse-parser';
import { AIModel, ImageAttachment, RendererType } from '@/types';
import { FILE_UPLOAD_CONFIG } from '@/config/constants';

const GenesisApp = () => {
  const chatStore = useChatStore();
  const ui = useUIStore();
  const { preferences } = useSettingsStore();
  const { toast } = useToast();

  const [greeting, setGreeting] = useState('Welcome back');
  const [messages, setMessages] = useState<
    { type: string; content: string; images?: string[] }[]
  >([]);

  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-3-flash');
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // States for search and multi-select in Chats dashboard
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isMultiSelectChats, setIsMultiSelectChats] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);

  // State/controller references for submits & edits
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Set greeting based on time of day
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Good morning');
    else if (hrs < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Hydration guard + seed dummy data / migration logic on mount
  useEffect(() => {
    setHydrated(true);

    if (typeof window !== 'undefined') {
      try {
        const oldStored = localStorage.getItem('genesis-artifacts');
        if (oldStored) {
          const parsed = JSON.parse(oldStored);
          if (parsed && parsed.length > 0) {
            parsed.forEach((art: any) => {
              const exists = chatStore.artifacts.some(
                (a) => a.chatId === art.chatId && a.renderer === art.renderer
              );
              if (!exists) {
                chatStore.addArtifact({
                  chatId: art.chatId,
                  chatTitle: art.chatTitle,
                  code: art.code,
                  renderer: art.renderer,
                });
              }
            });
            localStorage.removeItem('genesis-artifacts');
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, [chatStore]);

  // Synchronize local messages state automatically when activeChatId or chatStore.chats change
  useEffect(() => {
    if (ui.activeChatId) {
      const chat = chatStore.chats.find((c) => c.id === ui.activeChatId);
      if (chat) {
        const loaded = chat.messages.map((msg) => ({
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          images: msg.images?.map((img) => img.url),
        }));
        setMessages(loaded);

        if (chat.modelConfig?.model) {
          setSelectedModel(chat.modelConfig.model as AIModel);
        }
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [ui.activeChatId, chatStore.chats]);

  // Track code versions from history
  const { codeVersions } = useVersionHistory(messages);

  // Artifact managers
  const { addArtifact, deleteArtifact } = useArtifactManager();

  // Chat Submission hooks
  const { submit: chatSubmit, isLoading, stopGeneration } = useChatSubmit({
    chatId: ui.activeChatId,
    selectedModel,
  });

  const startNewChat = () => {
    ui.resetForNewChat();
    setMessages([]);
    setAttachedImages([]);
    setTimeout(() => chatInputRef.current?.focus(), 50);
  };

  const selectChat = (chatId: string, shouldShowArtifact = false) => {
    const chat = chatStore.chats.find((c) => c.id === chatId);
    if (!chat) return;

    ui.setActiveChatId(chatId);
    ui.setCurrentView('chat');

    let hasCode = false;
    for (const msg of chat.messages) {
      if (msg.role === 'assistant' && extractCode(msg.content)) {
        hasCode = true;
        break;
      }
    }

    ui.setShowArtifact(hasCode ? shouldShowArtifact : false);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      ui.setSidebarOpen(false);
    }
  };

  const loadArtifactCode = (artifact: any) => {
    selectChat(artifact.chatId, true);
    ui.setActiveTab('preview');
  };

  const openGallery = () => {
    ui.setCurrentView('gallery');
    ui.setShowArtifact(false);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      ui.setSidebarOpen(false);
    }
  };

  const deleteChat = (chatId: string) => {
    chatStore.deleteChat(chatId);
    if (ui.activeChatId === chatId) {
      startNewChat();
    }
  };

  const onSendMessage = async (customPrompt?: string) => {
    const text = customPrompt || ui.inputMessage;
    if (!text.trim() && attachedImages.length === 0) return;

    const prevActiveChatId = ui.activeChatId;
    setAttachedImages([]);

    await chatSubmit(text, messages, attachedImages, prevActiveChatId);
  };

  const handleSaveMessageEdit = async (messageId: string, index: number, text: string) => {
    if (!ui.activeChatId || !text.trim()) return;

    chatStore.updateMessage(ui.activeChatId, messageId, text);

    const chat = chatStore.chats.find((c) => c.id === ui.activeChatId);
    let assistantMessageId = '';
    if (chat) {
      const nextIdx = index + 1;
      if (nextIdx < chat.messages.length && chat.messages[nextIdx].role === 'assistant') {
        assistantMessageId = chat.messages[nextIdx].id;
      }
    }

    // Trigger regeneration
    ui.setShowArtifact(false);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const latestChatStore = useChatStore.getState();
      const updatedChat = latestChatStore.chats.find((c) => c.id === ui.activeChatId);
      if (!updatedChat) return;
      const history = updatedChat.messages.slice(0, index + 1).map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      const hasCodeContext = history.some((m) => m.content.includes('// renderer:'));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history,
          model: updatedChat.modelConfig.model || 'gemini-3-flash',
          currentCode: hasCodeContext ? ui.editableCode || '' : '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!assistantMessageId) {
        assistantMessageId = chatStore.addMessage(ui.activeChatId, { role: 'assistant', content: '', tokens: 0 });
      } else {
        chatStore.updateMessageContent(ui.activeChatId, assistantMessageId, '');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported.');
      
      let aiContent = '';
      let finalUsageMetadata: any = null;

      await parseSSEStream(
        reader,
        (textChunk) => {
          aiContent += textChunk;
          chatStore.updateMessageContent(ui.activeChatId!, assistantMessageId, aiContent);
        },
        (metadata) => {
          if (metadata) {
            finalUsageMetadata = metadata;
          }
        }
      );

      if (finalUsageMetadata) {
        chatStore.updateMessageTokens(ui.activeChatId, assistantMessageId, finalUsageMetadata.candidatesTokenCount ?? 0);
      }

      const extracted = extractCode(aiContent);
      if (extracted) {
        if (ui.p5Code) ui.setPreviousCode(ui.p5Code);
        ui.setP5Code(extracted.code);
        ui.setEditableCode(extracted.code);
        ui.setActiveRenderer(extracted.renderer);
        ui.setActiveTab('preview');
        ui.setShowArtifact(true);
        addArtifact(ui.activeChatId, updatedChat.title || 'Untitled', extracted.code, extracted.renderer);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const stopMsg = 'Generation stopped.';
        if (assistantMessageId) {
          chatStore.updateMessage(ui.activeChatId, assistantMessageId, stopMsg);
        } else {
          chatStore.addMessage(ui.activeChatId, {
            role: 'assistant',
            content: stopMsg,
            tokens: 0,
          });
        }
      } else {
        const errMsg = 'Failed to connect to AI service. Please try again.';
        if (assistantMessageId) {
          chatStore.updateMessage(ui.activeChatId, assistantMessageId, errMsg);
        } else {
          chatStore.addMessage(ui.activeChatId, {
            role: 'assistant',
            content: errMsg,
            tokens: 10,
          });
        }
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateMessage = async (messageId: string) => {
    if (!ui.activeChatId) return;
    const chat = chatStore.chats.find((c) => c.id === ui.activeChatId);
    if (!chat) return;

    const messageIndex = chat.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const message = chat.messages[messageIndex];
    const isAssistant = message.role === 'assistant';

    let userMessageIndex = messageIndex;
    let assistantMessageId = '';

    if (isAssistant) {
      userMessageIndex = messageIndex - 1;
      assistantMessageId = messageId;
    } else {
      const assistantMessageIndex = messageIndex + 1;
      if (
        assistantMessageIndex < chat.messages.length &&
        chat.messages[assistantMessageIndex].role === 'assistant'
      ) {
        assistantMessageId = chat.messages[assistantMessageIndex].id;
      }
    }

    if (userMessageIndex < 0) return;

    setRegeneratingId(messageId);
    ui.setShowArtifact(false);

    const history = chat.messages.slice(0, userMessageIndex + 1).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const modelToUse = selectedModel || 'gemini-3-flash';
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const hasCodeContext = history.some((m) => m.content.includes('// renderer:'));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history,
          model: modelToUse,
          currentCode: hasCodeContext ? ui.editableCode || '' : '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!assistantMessageId) {
        assistantMessageId = chatStore.addMessage(ui.activeChatId, { role: 'assistant', content: '', tokens: 0 });
      } else {
        chatStore.updateMessageContent(ui.activeChatId, assistantMessageId, '');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported.');
      
      let aiContent = '';
      let finalUsageMetadata: any = null;

      await parseSSEStream(
        reader,
        (textChunk) => {
          aiContent += textChunk;
          chatStore.updateMessageContent(ui.activeChatId!, assistantMessageId, aiContent);
        },
        (metadata) => {
          if (metadata) {
            finalUsageMetadata = metadata;
          }
        }
      );

      if (finalUsageMetadata) {
        chatStore.updateMessageTokens(ui.activeChatId, assistantMessageId, finalUsageMetadata.candidatesTokenCount ?? 0);
      }

      const extracted = extractCode(aiContent);
      if (extracted) {
        if (ui.p5Code) ui.setPreviousCode(ui.p5Code);
        ui.setP5Code(extracted.code);
        ui.setEditableCode(extracted.code);
        ui.setActiveRenderer(extracted.renderer);
        ui.setActiveTab('preview');
        ui.setShowArtifact(true);
        addArtifact(ui.activeChatId, chat.title || 'Untitled', extracted.code, extracted.renderer);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const stopMsg = 'Generation stopped.';
        if (assistantMessageId) {
          chatStore.updateMessage(ui.activeChatId, assistantMessageId, stopMsg);
        } else {
          chatStore.addMessage(ui.activeChatId, {
            role: 'assistant',
            content: stopMsg,
            tokens: 0,
          });
        }
      } else {
        const errMsg = 'Failed to connect to AI service. Please try again.';
        if (assistantMessageId) {
          chatStore.updateMessage(ui.activeChatId, assistantMessageId, errMsg);
        } else {
          chatStore.addMessage(ui.activeChatId, {
            role: 'assistant',
            content: errMsg,
            tokens: 10,
          });
        }
      }
    } finally {
      setRegeneratingId(null);
      abortControllerRef.current = null;
    }
  };

  const handleSwitchVersionIdx = (messageId: string, idx: number) => {
    if (ui.activeChatId) {
      chatStore.switchMessageVersion(ui.activeChatId, messageId, idx);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const validFiles = files.filter((file) => {
      if (!FILE_UPLOAD_CONFIG.acceptedTypes.includes(file.type)) {
        toast({
          title: 'Unsupported format',
          description: `${file.name} is not a supported image format`,
          variant: 'destructive',
        });
        return false;
      }
      if (file.size > FILE_UPLOAD_CONFIG.maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the maximum size of 10MB`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    if (attachedImages.length + validFiles.length > FILE_UPLOAD_CONFIG.maxFiles) {
      toast({
        title: 'Limit reached',
        description: `You can only upload up to ${FILE_UPLOAD_CONFIG.maxFiles} images`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const newImages: ImageAttachment[] = [];
      for (const file of validFiles) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });

        newImages.push({
          id: `${Date.now()}-${Math.random()}`,
          url: dataUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: dataUrl,
        });
      }
      setAttachedImages((prev) => [...prev, ...newImages]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachedImage = (imageId: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  return (
    <>
      <AppShell
        sidebar={
          <Sidebar
            onSelectChat={selectChat}
            onStartNewChat={startNewChat}
            onDeleteChat={deleteChat}
            onOpenGallery={openGallery}
            hydrated={hydrated}
          />
        }
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
      >
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
          onStopGeneration={stopGeneration}
          attachedImages={attachedImages}
          setAttachedImages={setAttachedImages}
          removeAttachedImage={removeAttachedImage}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
          chatInputRef={chatInputRef}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          codeVersions={codeVersions}
          regeneratingId={regeneratingId}
          onRegenerate={handleRegenerateMessage}
          onSwitchVersionIdx={handleSwitchVersionIdx}
          onSaveMessageEdit={handleSaveMessageEdit}
          onStartNewChat={startNewChat}
          onSelectChat={selectChat}
          onLoadArtifactCode={loadArtifactCode}
          onDeleteArtifact={deleteArtifact}
          chatSearchQuery={chatSearchQuery}
          setChatSearchQuery={setChatSearchQuery}
          isMultiSelectChats={isMultiSelectChats}
          setIsMultiSelectChats={setIsMultiSelectChats}
          selectedChatIds={selectedChatIds}
          setSelectedChatIds={setSelectedChatIds}
          greeting={greeting}
        />

        {ui.showArtifact && (
          <ArtifactPanel
            onSendMessage={onSendMessage}
            isLoading={isLoading}
            onStopGeneration={stopGeneration}
            codeVersions={codeVersions}
          />
        )}
      </AppShell>

      <SettingsModal isOpen={ui.isSettingsOpen} onClose={() => ui.setIsSettingsOpen(false)} />
    </>
  );
};

export default GenesisApp;

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

  // State/controller references for submits & edits (Moved to useChatSubmit)

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
  const { submit: chatSubmit, isLoading, stopGeneration, regeneratingId, handleRegenerateFrom } = useChatSubmit({
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
    if (handleRegenerateFrom) {
      await handleRegenerateFrom(messageId, text);
    }
  };

  const handleRegenerateMessage = async (messageId: string) => {
    if (handleRegenerateFrom) {
      await handleRegenerateFrom(messageId);
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

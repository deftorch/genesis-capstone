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

  const [messages, setMessages] = useState<
    { type: string; content: string; images?: string[] }[]
  >([]);

  const [selectedModel, setSelectedModel] = useState<AIModel>('gemini-3-flash');
  const [isUploading, setIsUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);



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



  // Chat Submission hooks
  const { submit: chatSubmit, isLoading, stopGeneration, regeneratingId, handleRegenerateFrom } = useChatSubmit({
    chatId: ui.activeChatId,
    selectedModel,
  });

  const onSendMessage = async (customPrompt?: string) => {
    const text = customPrompt || ui.inputMessage;
    if (!text.trim() && ui.attachedImages.length === 0) return;

    const prevActiveChatId = ui.activeChatId;
    const currentImages = [...ui.attachedImages];
    ui.setAttachedImages([]);

    await chatSubmit(text, messages, currentImages, prevActiveChatId);
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
    if (ui.attachedImages.length + validFiles.length > FILE_UPLOAD_CONFIG.maxFiles) {
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
      ui.setAttachedImages((prev: ImageAttachment[]) => [...prev, ...newImages]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };



  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 flex items-center justify-center animate-pulse">
            <svg className="w-full h-full" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="genesisGradLoading" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#60aaff" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path
                d="M26 16C26 21.5228 21.5228 26 16 26C10.4772 26 6 21.5228 6 16C6 10.4772 10.4772 6 16 6C19.3431 6 22.2868 7.6393 24.1002 10.1584"
                stroke="url(#genesisGradLoading)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path d="M16 16H25" stroke="url(#genesisGradLoading)" strokeWidth="2.5" strokeLinecap="round" />
              <path
                d="M16 11L17.5 14.5L21 16L17.5 17.5L16 21L14.5 17.5L11 16L14.5 14.5L16 11Z"
                fill="url(#genesisGradLoading)"
              />
            </svg>
          </div>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
            Loading workspace...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppShell
        sidebar={<Sidebar hydrated={hydrated} />}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
      >
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={onSendMessage}
          onStopGeneration={stopGeneration}
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

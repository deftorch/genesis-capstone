'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Menu,
  Settings,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ModelSelector } from '@/components/settings/ModelSelector';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ImageAnalysis } from '@/components/image/ImageAnalysis';
import { Modal, ModalHeader, ModalContent } from '@/components/ui/modal';
import { useChatStore } from '@/lib/store/chat-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useToast } from '@/lib/store/toast-store';
import { useUIStore } from '@/lib/store/ui-store';
import { estimateTokenCount } from '@/lib/utils';
import { ImageAttachment, AIModel } from '@/types';
import { AI_MODELS, API_CONFIG } from '@/config/constants';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isImageAnalysisOpen, setIsImageAnalysisOpen] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setIsMounted(true);
    if (window.innerWidth >= 1024) {
      useUIStore.getState().setSidebarOpen(true);
    }
  }, []);

  const {
    chats,
    getCurrentChat,
    setCurrentChat,
    createChat,
    deleteChat,
    addMessage,
    autoRenameChat,
    updateMessage,
    deleteMessage,
    updateModelConfig,
    switchMessageVersion,
  } = useChatStore();

  const ui = useUIStore();
  const { preferences, setTheme } = useSettingsStore();
  const { success, error } = useToast();

  // Set current chat based on URL
  React.useEffect(() => {
    if (chatId) {
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setCurrentChat(chatId);
      } else {
        // Chat not found, redirect to home
        router.replace('/');
      }
    }
  }, [chatId, chats, setCurrentChat, router]);

  const currentChat = getCurrentChat();

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const handleSendMessage = async (content: string, images?: ImageAttachment[], skipUserMessage = false) => {
    if (!chatId || !currentChat) return;

    if (!skipUserMessage) {
      addMessage(chatId, {
        role: 'user',
        content,
        images,
        tokens: estimateTokenCount(content),
      });
    }

    setIsGenerating(true);
    
    try {
      // Check if there are images - use image analysis API
      if (images && images.length > 0) {
        const imageUrl = images[0].url;

        // Build chat history for context
        const chatHistory = currentChat.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        const response = await fetch('/api/image-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: imageUrl,
            text: content,
            sessionId: chatId,
            messages: chatHistory, // Include chat history for context
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to analyze image');
        }

        const aiResponse = `📸 **Image Analysis Result:**\n\n${data.description}\n\n---\n\n*Analysis completed in ${data.responseTime}*`;

        addMessage(chatId, {
          role: 'assistant',
          content: aiResponse,
          tokens: estimateTokenCount(aiResponse),
        });

        // Auto-rename chat if this is the first assistant response
        if (currentChat.messages.filter(m => m.role === 'assistant').length === 0 && currentChat.title === 'New Chat') {
          autoRenameChat(chatId, content);
        }

        success('Image analyzed', 'Image analysis completed successfully');
      } else {
        // Text-only message - use chat API with optimized context
        const { buildContextForAPI } = await import('@/lib/chat-summarizer');
        
        // Build optimized context using summary + recent messages
        const contextMessages = buildContextForAPI(
          currentChat.messages,
          currentChat.summary,
          currentChat.lastSummarizedIndex
        );

        // Add current user message
        const allMessages = [
          ...contextMessages,
          {
            role: 'user',
            content: content,
          }
        ];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: allMessages,
            model: currentChat.modelConfig.model || 'gemini-3-flash',
            temperature: currentChat.modelConfig.temperature,
            maxTokens: currentChat.modelConfig.maxTokens,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get response');
        }

        addMessage(chatId, {
          role: 'assistant',
          content: data.message.content,
          tokens: data.message.tokens,
        });

        // Auto-rename chat if this is the first assistant response
        if (currentChat.messages.filter(m => m.role === 'assistant').length === 0 && currentChat.title === 'New Chat') {
          autoRenameChat(chatId, content);
        }

        success('Response received', 'AI response generated successfully');
      }
    } catch (err: any) {
      error('Error', err.message || 'Failed to get AI response');
      console.error('AI Response error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = async (files: File[]): Promise<ImageAttachment[]> => {
    const images: ImageAttachment[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || 'Failed to upload image');
        }

        // Create preview for UI (base64)
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        images.push({
          id: `${Date.now()}-${Math.random()}`,
          url: uploadData.url,
          name: file.name,
          size: file.size,
          type: file.type,
          preview,
        });
      } catch (err: any) {
        error('Upload failed', err.message || 'Failed to upload image');
        console.error('Image upload error:', err);
      }
    }

    return images;
  };

  const handleModelChange = (model: AIModel) => {
    if (chatId) {
      updateModelConfig(chatId, { model });
      success('Model updated', `Switched to ${model}`);
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    if (!chatId || !currentChat) return;
    
    const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Simpan images SEBELUM store diubah
    const images = currentChat.messages[messageIndex].images;
    updateMessage(chatId, messageId, content);
    
    const nextMessageIndex = messageIndex + 1;
    if (nextMessageIndex < currentChat.messages.length && 
        currentChat.messages[nextMessageIndex].role === 'assistant') {
      deleteMessage(chatId, currentChat.messages[nextMessageIndex].id);
    }

    success('Message edited', 'Regenerating response...');

    // Langsung panggil — tidak perlu timeout
    await handleSendMessage(content, images, true);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (chatId) {
      if (confirm('Are you sure you want to delete this message?')) {
        deleteMessage(chatId, messageId);
        success('Message deleted', 'Message removed from chat');
      }
    }
  };

  const handleSwitchVersion = (messageId: string, versionIdx: number) => {
    if (chatId) {
      switchMessageVersion(chatId, messageId, versionIdx);
    }
  };

  const handleRegenerateMessage = async (messageId: string, newModel?: AIModel) => {
    if (!chatId || !currentChat) return;

    const messageIndex = currentChat.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = currentChat.messages[messageIndex];
    const isAssistant = message.role === 'assistant';

    let userMessageIndex = messageIndex;
    let assistantMessageId = '';

    if (isAssistant) {
      userMessageIndex = messageIndex - 1;
      assistantMessageId = messageId;
    } else {
      const assistantMessageIndex = messageIndex + 1;
      if (assistantMessageIndex < currentChat.messages.length && 
          currentChat.messages[assistantMessageIndex].role === 'assistant') {
        assistantMessageId = currentChat.messages[assistantMessageIndex].id;
      }
    }

    if (userMessageIndex < 0) return;
    const userMessage = currentChat.messages[userMessageIndex];

    const chatModel = currentChat.modelConfig.model;
    const modelToUse = newModel || chatModel || 'gemini-3-flash';
    if (newModel && newModel !== currentChat.modelConfig.model) {
      updateModelConfig(chatId, { model: newModel });
      success('Model changed', `Regenerating with ${newModel}`);
    } else {
      success('Regenerating...', 'Generating new response');
    }

    setIsGenerating(true);

    try {
      if (userMessage.images && userMessage.images.length > 0) {
        // Image analysis regeneration
        const imageUrl = userMessage.images[0].url;
        const chatHistory = currentChat.messages.slice(0, userMessageIndex).map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

        const response = await fetch('/api/image-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: imageUrl,
            text: userMessage.content,
            sessionId: chatId,
            messages: chatHistory,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to analyze image');

        const aiResponse = `📸 **Image Analysis Result:**\n\n${data.description}\n\n---\n\n*Analysis completed in ${data.responseTime}*`;

        if (assistantMessageId) {
          updateMessage(chatId, assistantMessageId, aiResponse);
        } else {
          addMessage(chatId, {
            role: 'assistant',
            content: aiResponse,
            tokens: estimateTokenCount(aiResponse),
          });
        }
      } else {
        // Text-only regeneration
        const { buildContextForAPI } = await import('@/lib/chat-summarizer');
        
        // Build optimized context up to userMessageIndex
        const contextMessages = buildContextForAPI(
          currentChat.messages.slice(0, userMessageIndex),
          currentChat.summary,
          currentChat.lastSummarizedIndex
        );

        const allMessages = [
          ...contextMessages,
          {
            role: 'user',
            content: userMessage.content,
          }
        ];

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: allMessages,
            model: modelToUse,
            temperature: currentChat.modelConfig.temperature,
            maxTokens: currentChat.modelConfig.maxTokens,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get response');

        if (assistantMessageId) {
          updateMessage(chatId, assistantMessageId, data.message.content);
        } else {
          addMessage(chatId, {
            role: 'assistant',
            content: data.message.content,
            tokens: data.message.tokens,
          });
        }
      }
    } catch (err: any) {
      error('Error', err.message || 'Failed to get AI response');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isMounted || !currentChat) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        onSelectChat={(id) => {
          setCurrentChat(id);
          router.push(`/chat/${id}`);
          if (window.innerWidth < 768) ui.setSidebarOpen(false);
        }}
        onStartNewChat={() => {
          const newId = createChat();
          router.push(`/chat/${newId}`);
          if (window.innerWidth < 768) ui.setSidebarOpen(false);
        }}
        onDeleteChat={(id) => {
          if (confirm('Are you sure you want to delete this chat?')) {
            deleteChat(id);
            if (id === chatId) router.push('/');
          }
        }}
        onOpenGallery={() => {
          router.push('/?view=gallery');
        }}
        hydrated={isMounted}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b bg-background/95 backdrop-blur px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => ui.setSidebarOpen(!ui.sidebarOpen)}
              className="shrink-0 h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Logo size="sm" variant="full" className="shrink-0" />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="hidden lg:block">
              <ModelSelector
                value={currentChat.modelConfig.model}
                onChange={handleModelChange}
                className="w-56"
              />
            </div>
            
            <div className="lg:hidden">
              <ModelSelector
                value={currentChat.modelConfig.model}
                onChange={handleModelChange}
                className="w-40"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsImageAnalysisOpen(true)}
              title="Image Analysis"
              className="h-9 w-9"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
              className="h-9 w-9"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-2 sm:px-4">
          {currentChat.messages.length > 0 ? (
            <div className="max-w-4xl mx-auto py-4">
              {currentChat.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onRegenerate={handleRegenerateMessage}
                  onSwitchVersion={handleSwitchVersion}
                  currentModel={currentChat.modelConfig.model}
                />
              ))}
              {isGenerating && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center max-w-lg">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-6">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Ready to Chat?
                </h2>
                <p className="text-muted-foreground mb-8 text-sm sm:text-base">
                  Start a conversation with AI or upload images for analysis.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => handleSendMessage('Hello! Tell me about your capabilities.')}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Start Conversation
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsImageAnalysisOpen(true)}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Analyze Images
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-background/95 backdrop-blur">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              onSend={handleSendMessage}
              onImageUpload={handleImageUpload}
              disabled={isGenerating}
              placeholder="Type your message or upload images..."
            />
          </div>
        </div>

        {preferences.showTokenCount && (
          <div className="border-t px-4 py-1.5 text-xs text-muted-foreground text-center bg-muted/30">
            <span className="font-mono">
              {currentChat.totalTokens.toLocaleString()} tokens
            </span>
          </div>
        )}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <Modal
        isOpen={isImageAnalysisOpen}
        onClose={() => {
          setIsImageAnalysisOpen(false);
        }}
        className="w-full max-w-3xl"
      >
        <ModalHeader>
          <h2 className="text-2xl font-bold">Image Analysis with Gemini AI</h2>
        </ModalHeader>
        <ModalContent>
          <ImageAnalysis onClose={() => setIsImageAnalysisOpen(false)} />
        </ModalContent>
      </Modal>
    </div>
  );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Chat, Message, ModelConfig, Project, Artifact, ImageAttachment } from '@/types';
import { DEFAULT_MODEL_CONFIG } from '@/config/constants';
import { generateId } from '@/lib/utils';
import { generateMessagesSummary, shouldUpdateSummary } from '@/lib/chat-summarizer';

interface ChatStore {
  chats: Chat[];
  currentChatId: string | null;
  projects: Project[];
  artifacts: Artifact[];
  
  createChat: (title?: string) => string;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, title: string) => void;
  autoRenameChat: (chatId: string, firstMessage: string) => void;
  starChat: (chatId: string) => void;
  setCurrentChat: (chatId: string) => void;
  getCurrentChat: () => Chat | null;
  importChats: (chats: Chat[]) => void;
  
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (chatId: string, messageId: string, content: string, images?: ImageAttachment[]) => void;
  updateMessageContent: (chatId: string, messageId: string, content: string) => void;
  updateMessageTokens: (chatId: string, messageId: string, tokens: number) => void;
  updateChatTokens: (chatId: string, tokens: number) => void;
  switchMessageVersion: (chatId: string, messageId: string, versionIdx: number) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  updateChatSummary: (chatId: string) => void;
  
  createProject: (name: string, description?: string) => string;
  deleteProject: (projectId: string) => void;
  moveToProject: (chatId: string, projectId: string | null) => void;
  renameProject: (projectId: string, name: string, description?: string) => void;
  
  updateModelConfig: (chatId: string, config: Partial<ModelConfig>) => void;
  
  searchChats: (query: string) => Chat[];
  
  addArtifact: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => void;
  deleteArtifact: (artifactId: string) => void;
  deleteArtifactsForChat: (chatId: string) => void;
  
  clearAll: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      currentChatId: null,
      projects: [],
      artifacts: [],

      createChat: (title = 'New Chat') => {
        const newChat: Chat = {
          id: generateId(),
          title,
          messages: [],
          modelConfig: { ...DEFAULT_MODEL_CONFIG, id: generateId() },
          createdAt: new Date(),
          updatedAt: new Date(),
          isStarred: false,
          totalTokens: 0,
        };
        
        set((state: ChatStore) => ({
          chats: [newChat, ...state.chats],
          currentChatId: newChat.id,
        }));
        
        return newChat.id;
      },

      deleteChat: (chatId: string) => {
        set((state: ChatStore) => ({
          chats: state.chats.filter((chat: Chat) => chat.id !== chatId),
          currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
          projects: state.projects.map((p: Project) => ({
            ...p,
            chatIds: p.chatIds.filter((id: string) => id !== chatId),
          })),
          artifacts: state.artifacts.filter((a: Artifact) => a.chatId !== chatId),
        }));
      },

      renameChat: (chatId: string, title: string) => {
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId ? { ...chat, title, updatedAt: new Date() } : chat
          ),
          // Update chatTitle on matching artifacts
          artifacts: state.artifacts.map((a: Artifact) =>
            a.chatId === chatId ? { ...a, chatTitle: title } : a
          ),
        }));
      },

      autoRenameChat: (chatId: string, firstMessage: string) => {
        const title = firstMessage.length > 50 
          ? firstMessage.substring(0, 50) + '...'
          : firstMessage;
        
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId ? { ...chat, title, updatedAt: new Date() } : chat
          ),
          // Update chatTitle on matching artifacts
          artifacts: state.artifacts.map((a: Artifact) =>
            a.chatId === chatId ? { ...a, chatTitle: title } : a
          ),
        }));
      },

      starChat: (chatId: string) => {
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId ? { ...chat, isStarred: !chat.isStarred } : chat
          ),
        }));
      },

      setCurrentChat: (chatId: string) => {
        set({ currentChatId: chatId });
      },

      getCurrentChat: () => {
        const state = get();
        return state.chats.find((chat: Chat) => chat.id === state.currentChatId) || null;
      },

      importChats: (importedChats: Chat[]) => {
        set((state: ChatStore) => {
          const processedChats = importedChats.map((chat: any) => ({
            ...chat,
            id: chat.id || generateId(),
            projectId: chat.projectId || chat.folderId,
            createdAt: chat.createdAt instanceof Date ? chat.createdAt : new Date(chat.createdAt),
            updatedAt: chat.updatedAt instanceof Date ? chat.updatedAt : new Date(chat.updatedAt),
            messages: chat.messages.map((msg: any) => ({
              ...msg,
              id: msg.id || generateId(),
              timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
              versions: msg.versions || [msg.content],
              activeVersionIdx: msg.activeVersionIdx !== undefined ? msg.activeVersionIdx : 0,
            })),
          }));

          const existingIds = new Set(state.chats.map((c: Chat) => c.id));
          const newChats = processedChats.filter((c: Chat) => !existingIds.has(c.id));

          return {
            chats: [...newChats, ...state.chats],
          };
        });
      },

      addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          timestamp: new Date(),
          versions: message.versions || [message.content],
          activeVersionIdx: message.activeVersionIdx !== undefined ? message.activeVersionIdx : 0,
        };

        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, newMessage],
                  updatedAt: new Date(),
                  totalTokens: chat.totalTokens + (message.tokens || 0),
                }
              : chat
          ),
        }));

        // Auto-update summary jika perlu
        const chat = get().chats.find((c: Chat) => c.id === chatId);
        if (chat && shouldUpdateSummary(chat.messages.length, chat.lastSummarizedIndex)) {
          get().updateChatSummary(chatId);
        }
        
        return newMessage.id;
      },

      updateChatSummary: (chatId: string) => {
        set((state: ChatStore) => {
          const chat = state.chats.find((c: Chat) => c.id === chatId);
          if (!chat) return state;

          const summary = generateMessagesSummary(chat.messages);
          
          return {
            chats: state.chats.map((c: Chat) =>
              c.id === chatId
                ? {
                    ...c,
                    summary,
                    lastSummarizedIndex: c.messages.length - 1,
                    updatedAt: new Date(),
                  }
                : c
            ),
          };
        });
      },

      updateMessage: (chatId: string, messageId: string, content: string, images?: ImageAttachment[]) => {
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg: Message) => {
                    if (msg.id === messageId) {
                      const versions = msg.versions && msg.versions.length > 0 ? msg.versions : [msg.content];
                      // Only add a new version if the content has actually changed
                      const hasChanged = versions[versions.length - 1] !== content;
                      const newVersions = hasChanged ? [...versions, content] : versions;
                      return {
                        ...msg,
                        content,
                        images: images !== undefined ? images : msg.images,
                        isEdited: true,
                        versions: newVersions,
                        activeVersionIdx: newVersions.length - 1,
                      };
                    }
                    return msg;
                  }),
                  updatedAt: new Date(),
                }
              : chat
          ),
        }));
      },

      updateMessageContent: (chatId: string, messageId: string, content: string) => {
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg: Message) => {
                    if (msg.id === messageId) {
                      const versions = msg.versions && msg.versions.length > 0 ? [...msg.versions] : [msg.content];
                      // Just replace the latest version content without creating a new version history entry
                      versions[versions.length - 1] = content;
                      return {
                        ...msg,
                        content,
                        versions,
                      };
                    }
                    return msg;
                  }),
                }
              : chat
          ),
        }));
      },

      updateMessageTokens: (chatId: string, messageId: string, tokens: number) => {
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg: Message) =>
                    msg.id === messageId ? { ...msg, tokens } : msg
                  ),
                }
              : chat
          ),
        }));
      },

      updateChatTokens: (chatId: string, tokens: number) => {
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId
              ? { ...chat, totalTokens: chat.totalTokens + tokens }
              : chat
          ),
        }));
      },

      switchMessageVersion: (chatId: string, messageId: string, versionIdx: number) => {
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg: Message) => {
                    if (msg.id === messageId && msg.versions && versionIdx >= 0 && versionIdx < msg.versions.length) {
                      return {
                        ...msg,
                        content: msg.versions[versionIdx],
                        activeVersionIdx: versionIdx,
                      };
                    }
                    return msg;
                  }),
                  updatedAt: new Date(),
                }
              : chat
          ),
        }));
      },

      deleteMessage: (chatId: string, messageId: string) => {
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.filter((msg: Message) => msg.id !== messageId),
                  updatedAt: new Date(),
                }
              : chat
          ),
        }));
      },

      createProject: (name: string, description = '') => {
        const id = generateId();
        const newProject: Project = {
          id,
          name,
          description,
          chatIds: [],
          createdAt: new Date(),
        };
        
        set((state: ChatStore) => ({
          projects: [...state.projects, newProject],
        }));

        return id;
      },

      deleteProject: (projectId: string) => {
        set((state: ChatStore) => ({
          projects: state.projects.filter((p: Project) => p.id !== projectId),
          chats: state.chats.map((chat: Chat) =>
            chat.projectId === projectId ? { ...chat, projectId: undefined } : chat
          ),
        }));
      },

      renameProject: (projectId: string, name: string, description = '') => {
        set((state: ChatStore) => ({
          projects: state.projects.map((p: Project) =>
            p.id === projectId ? { ...p, name, description } : p
          ),
        }));
      },

      moveToProject: (chatId: string, projectId: string | null) => {
        set((state: ChatStore) => {
          // 1. Update chats to set the new projectId (or undefined if null)
          const updatedChats = state.chats.map((chat: Chat) =>
            chat.id === chatId ? { ...chat, projectId: projectId || undefined } : chat
          );

          // 2. Remove chatId from all projects' chatIds arrays, and add to new project's array if not null
          const updatedProjects = state.projects.map((p: Project) => {
            let chatIds = p.chatIds.filter(id => id !== chatId);
            if (projectId && p.id === projectId) {
              chatIds = [...chatIds, chatId];
            }
            return { ...p, chatIds };
          });

          return {
            chats: updatedChats,
            projects: updatedProjects,
          };
        });
      },

      updateModelConfig: (chatId: string, config: Partial<ModelConfig>) => {
        set((state: ChatStore) => ({
          chats: state.chats.map((chat: Chat) =>
            chat.id === chatId
              ? { ...chat, modelConfig: { ...chat.modelConfig, ...config } }
              : chat
          ),
        }));
      },

      searchChats: (query: string) => {
        const state = get();
        const lowerQuery = query.toLowerCase();
        
        return state.chats.filter(
          (chat: Chat) =>
            chat.title.toLowerCase().includes(lowerQuery) ||
            chat.messages.some((msg: Message) => msg.content.toLowerCase().includes(lowerQuery))
        );
      },

      addArtifact: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => {
        const newArtifact: Artifact = {
          ...artifact,
          id: generateId(),
          createdAt: new Date(),
        };
        set((state: ChatStore) => ({
          artifacts: [newArtifact, ...state.artifacts],
        }));
      },

      deleteArtifact: (artifactId: string) => {
        set((state: ChatStore) => ({
          artifacts: state.artifacts.filter((a: Artifact) => a.id !== artifactId),
        }));
      },

      deleteArtifactsForChat: (chatId: string) => {
        set((state: ChatStore) => ({
          artifacts: state.artifacts.filter((a: Artifact) => a.chatId !== chatId),
        }));
      },

      clearAll: () => {
        set({ chats: [], currentChatId: null, projects: [], artifacts: [] });
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        ...state,
        chats: state.chats.map((chat: Chat) => ({
          ...chat,
          createdAt: chat.createdAt instanceof Date ? chat.createdAt.toISOString() : chat.createdAt,
          updatedAt: chat.updatedAt instanceof Date ? chat.updatedAt.toISOString() : chat.updatedAt,
          messages: chat.messages.map((msg: Message) => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
          })),
        })),
        projects: state.projects.map((p: Project) => ({
          ...p,
          createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
        })),
        artifacts: state.artifacts.map((a: Artifact) => ({
          ...a,
          createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
        })),
      }),
      merge: (persistedState: any, currentState: any) => {
        if (!persistedState) return currentState;
        
        // Migrate chats folderId -> projectId if present
        const chats = (persistedState.chats || []).map((chat: any) => ({
          ...chat,
          projectId: chat.projectId || chat.folderId,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: (chat.messages || []).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            versions: msg.versions || [msg.content],
            activeVersionIdx: msg.activeVersionIdx !== undefined ? msg.activeVersionIdx : 0,
          })),
        }));

        // Migrate folders -> projects if present
        const rawProjects = persistedState.projects || persistedState.folders || [];
        const projects = rawProjects.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          chatIds: p.chatIds || [],
          createdAt: new Date(p.createdAt),
        }));

        // Parse artifacts
        const artifacts = (persistedState.artifacts || []).map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt),
        }));
        
        return {
          ...currentState,
          ...persistedState,
          chats,
          projects,
          artifacts,
        };
      },
    }
  )
);

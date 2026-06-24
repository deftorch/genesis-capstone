import { create } from 'zustand';
import { RendererType, ImageAttachment } from '@/types';

interface UIState {
  // Panel visibility
  showArtifact: boolean;
  isArtifactFullscreen: boolean;
  sidebarOpen: boolean;
  isMobileTemplatesOpen: boolean;
  showMobileChatInput: boolean;

  // Active chat & view
  currentView: 'home' | 'chat' | 'chats' | 'gallery' | 'projects';
  activeChatId: string | null;
  activeProjectId: string | null;

  // Artifact / canvas
  p5Code: string;
  editableCode: string;
  activeRenderer: RendererType;
  activeTab: 'preview' | 'code' | 'diff';
  previousCode: string;
  copied: boolean;

  // Version system
  activeVersionNumber: number | null;
  isVersionDropdownOpen: boolean;

  // Zoom & pan
  zoom: number;
  pan: { x: number; y: number };
  panMode: boolean;
  isTrueFullscreen: boolean;

  // Input
  inputMessage: string;
  attachedImages: ImageAttachment[];

  // Modals
  isSettingsOpen: boolean;
  isAuthModalOpen: boolean;
  isCreateProjectOpen: boolean;
  isMoveToProjectOpen: boolean;
  movingChatId: string | null;
  chatMenuOpenId: string | null;

  // Actions
  setShowArtifact: (show: boolean) => void;
  setIsArtifactFullscreen: (fs: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentView: (view: UIState['currentView']) => void;
  setActiveChatId: (id: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setP5Code: (code: string) => void;
  setEditableCode: (code: string) => void;
  setActiveRenderer: (renderer: RendererType) => void;
  setActiveTab: (tab: UIState['activeTab']) => void;
  setPreviousCode: (code: string) => void;
  setActiveVersionNumber: (n: number | null) => void;
  setZoom: (updater: ((prev: number) => number) | number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setPanMode: (mode: boolean) => void;
  setIsTrueFullscreen: (fs: boolean) => void;
  setInputMessage: (msg: string) => void;
  setAttachedImages: (images: ImageAttachment[] | ((prev: ImageAttachment[]) => ImageAttachment[])) => void;
  removeAttachedImage: (id: string) => void;
  setIsMobileTemplatesOpen: (open: boolean) => void;
  setShowMobileChatInput: (show: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setChatMenuOpenId: (id: string | null) => void;
  setMovingChatId: (id: string | null) => void;
  setIsMoveToProjectOpen: (open: boolean) => void;
  setIsCreateProjectOpen: (open: boolean) => void;

  // Compound actions
  resetForNewChat: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showArtifact: false,
  isArtifactFullscreen: false,
  sidebarOpen: true,
  isMobileTemplatesOpen: false,
  showMobileChatInput: false,
  currentView: 'home',
  activeChatId: null,
  activeProjectId: null,
  p5Code: '',
  editableCode: '',
  activeRenderer: 'p5',
  activeTab: 'preview',
  previousCode: '',
  copied: false,
  activeVersionNumber: null,
  isVersionDropdownOpen: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  panMode: false,
  isTrueFullscreen: false,
  inputMessage: '',
  attachedImages: [],
  isSettingsOpen: false,
  isAuthModalOpen: false,
  isCreateProjectOpen: false,
  isMoveToProjectOpen: false,
  movingChatId: null,
  chatMenuOpenId: null,

  setShowArtifact: (show) => set({ showArtifact: show }),
  setIsArtifactFullscreen: (fs) => set({ isArtifactFullscreen: fs }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentView: (view) => set({ currentView: view }),
  setActiveChatId: (id) => set({ activeChatId: id }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setP5Code: (code) => set({ p5Code: code }),
  setEditableCode: (code) => set({ editableCode: code }),
  setActiveRenderer: (renderer) => set({ activeRenderer: renderer }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPreviousCode: (code) => set({ previousCode: code }),
  setActiveVersionNumber: (n) => set({ activeVersionNumber: n }),
  setZoom: (updater) =>
    set((s) => ({
      zoom: typeof updater === 'function'
        ? Math.max(0.25, Math.min(updater(s.zoom), 4))
        : Math.max(0.25, Math.min(updater, 4)),
    })),
  setPan: (pan) => set({ pan }),
  setPanMode: (mode) => set({ panMode: mode }),
  setIsTrueFullscreen: (fs) => set({ isTrueFullscreen: fs }),
  setInputMessage: (msg) => set({ inputMessage: msg }),
  setAttachedImages: (images) =>
    set((state) => ({
      attachedImages:
        typeof images === 'function' ? images(state.attachedImages) : images,
    })),
  removeAttachedImage: (id) =>
    set((state) => ({
      attachedImages: state.attachedImages.filter((img) => img.id !== id),
    })),
  setIsMobileTemplatesOpen: (open) => set({ isMobileTemplatesOpen: open }),
  setShowMobileChatInput: (show) => set({ showMobileChatInput: show }),
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setIsAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  setChatMenuOpenId: (id) => set({ chatMenuOpenId: id }),
  setMovingChatId: (id) => set({ movingChatId: id }),
  setIsMoveToProjectOpen: (open) => set({ isMoveToProjectOpen: open }),
  setIsCreateProjectOpen: (open) => set({ isCreateProjectOpen: open }),

  resetForNewChat: () =>
    set({
      currentView: 'home',
      activeChatId: null,
      p5Code: '',
      editableCode: '',
      previousCode: '',
      showArtifact: false,
      isArtifactFullscreen: false,
      activeVersionNumber: null,
      inputMessage: '',
      attachedImages: [],
    }),
}));

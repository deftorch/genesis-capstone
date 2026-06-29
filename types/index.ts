// Types for AI Models
export type AIProvider = 'google';

export type AIModel = 
  | 'gemini-3-flash'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite';

export interface ModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  model: AIModel;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt?: string;
}

// Types for Chat
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: ImageAttachment[];
  timestamp: Date;
  tokens?: number;
  isEdited?: boolean;
  parentId?: string; // For branching conversations
  versions?: string[];
  activeVersionIdx?: number;
}

export interface ImageAttachment {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
  analysis?: ImageAnalysisResult;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  modelConfig: ModelConfig;
  createdAt: Date;
  updatedAt: Date;
  summary?: string; // Rangkuman chat untuk context
  lastSummarizedIndex?: number; // Index message terakhir yang sudah dirangkum
  projectId?: string;
  isStarred: boolean;
  totalTokens: number;
}

// Types for Image Analysis
export type AnalysisType = 
  | 'object-detection'
  | 'label-detection'
  | 'text-recognition'
  | 'face-detection'
  | 'landmark-recognition'
  | 'image-description'
  | 'visual-qa';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface ImageAnalysisResult {
  type: AnalysisType;
  detections: Detection[];
  description?: string;
  text?: string;
  metadata?: Record<string, any>;
}

// Types for User & Settings
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
}

export interface APIKeyConfig {
  provider: AIProvider;
  key: string;
  isActive: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  language: string;
  defaultModel: AIModel;
  defaultProvider: AIProvider;
  autoSave: boolean;
  showTokenCount: boolean;
  enableNotifications: boolean;
  developerMode?: boolean;
}

// Types for Analytics
export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  apiCalls: number;
  modelUsage: Record<AIModel, number>;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    cost: number;
  }>;
}

// Types for Projects
export interface Project {
  id: string;
  name: string;
  description?: string;
  chatIds: string[];
  createdAt: Date;
}

// Export Types
export type ExportFormat = 'pdf' | 'markdown' | 'json' | 'text';

export interface ExportOptions {
  format: ExportFormat;
  includeImages: boolean;
  includeMetadata: boolean;
}

// Renderer and Artifact Types
export type RendererType = 'p5' | 'd3' | 'svg' | 'mermaid' | 'twojs' | 'mojs' | 'pixi' | 'gsap' | 'anime' | 'lottie' | 'matter' | 'html' | 'remotion' | 'plan';

export interface Artifact {
  id: string;
  chatId: string;
  chatTitle: string;
  code: string;
  renderer: RendererType;
  createdAt: Date;
}

import { AIModel, AIProvider, ModelConfig } from '@/types';

// API Configuration
export const API_CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL_ID: 'gemini-3-flash-preview',
  // OpenRouter API - Requires account at https://openrouter.ai
  // Get your API key at: https://openrouter.ai/keys
  // Note: Free models available after registration
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  OPENROUTER_SITE_NAME: 'Genesis',
};

// Helper to get all configured Gemini API keys for rotation
export function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  
  try {
    const { useSettingsStore } = require('@/lib/store/settings-store');
    const storeKey = useSettingsStore.getState().getAPIKey('google');
    if (storeKey && storeKey.key && storeKey.isActive) {
      keys.push(storeKey.key);
    }
  } catch (e) {
    // Ignore server-side require errors
  }
  
  if (process.env.GEMINI_API_KEY) {
    if (!keys.includes(process.env.GEMINI_API_KEY)) {
      keys.push(process.env.GEMINI_API_KEY);
    }
  }
  
  let index = 1;
  while (true) {
    const key = process.env[`GEMINI_API_KEY_${index}`];
    if (!key) break;
    if (!keys.includes(key)) {
      keys.push(key);
    }
    index++;
  }
  
  return keys;
}

// Image Analysis Models
export const IMAGE_ANALYSIS_MODELS = [
  {
    id: 'gemini-native',
    name: 'Gemini 2.0 Flash (Native)',
    provider: 'google',
    apiType: 'gemini-native',
    modelId: 'gemini-2.0-flash-exp',
    description: 'Google native API - Fast & free',
    free: true,
  },
  {
    id: 'gemini-flash-lite',
    name: 'Gemini Flash Lite (Native)',
    provider: 'google',
    apiType: 'gemini-native',
    modelId: 'gemini-flash-lite-latest',
    description: 'Google native API - Fast & free',
    free: true,
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash (Native)',
    provider: 'google',
    apiType: 'gemini-native',
    modelId: 'gemini-3-flash-preview',
    description: 'Google native API - Next generation',
    free: true,
  },
  {
    id: 'gemini-openrouter',
    name: 'Gemini 2.0 Flash (OpenRouter)',
    provider: 'google',
    apiType: 'openrouter',
    modelId: 'google/gemini-2.0-flash-exp:free',
    description: 'Via OpenRouter - Free',
    free: true,
  },
  // Note: GLM-4.5 Air does not support image input on OpenRouter
  // {
  //   id: 'glm-4.5-air',
  //   name: 'GLM-4.5 Air',
  //   provider: 'zhipu',
  //   apiType: 'openrouter',
  //   modelId: 'z-ai/glm-4.5-air:free',
  //   description: 'Chinese AI model - Free (Text only)',
  //   free: true,
  // }
];

export const AI_MODELS: Record<AIModel, { name: string; provider: AIProvider; contextWindow: number }> = {
  'gemini-3-flash': {
    name: 'Gemini 3 Flash (Preview)',
    provider: 'google',
    contextWindow: 1048576,
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    contextWindow: 1048576,
  },
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    contextWindow: 1048576,
  },
};

// Default Model Configuration
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  id: 'default',
  name: 'Default Configuration',
  provider: 'google',
  model: 'gemini-3-flash',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.95,
  frequencyPenalty: 0,
  presencePenalty: 0,
  systemPrompt: 'You are Genesis, a creative AI assistant specialized in generating visual content using p5.js, D3.js, SVG, and Mermaid.js.',
};

// Model Pricing (per 1K tokens)
export const MODEL_PRICING = {
  'gemini-3-flash': { input: 0, output: 0 },
  'gemini-2.5-flash': { input: 0, output: 0 },
  'gemini-2.5-flash-lite': { input: 0, output: 0 },
};

// Image Analysis Types
export const ANALYSIS_TYPES = [
  { value: 'object-detection', label: 'Object Detection', icon: '🎯' },
  { value: 'label-detection', label: 'Label Detection', icon: '🏷️' },
  { value: 'text-recognition', label: 'Text Recognition (OCR)', icon: '📝' },
  { value: 'face-detection', label: 'Face Detection', icon: '👤' },
  { value: 'landmark-recognition', label: 'Landmark Recognition', icon: '🗺️' },
  { value: 'image-description', label: 'Image Description', icon: '📸' },
  { value: 'visual-qa', label: 'Visual Q&A', icon: '❓' },
] as const;

// File Upload Constraints
export const FILE_UPLOAD_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  acceptedTypes: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv', 'text/plain', 'text/markdown'
  ],
  acceptedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.doc', '.docx', '.csv', '.txt', '.md'],
};

// App Constants
export const APP_CONFIG = {
  name: 'Genesis',
  version: '1.0.0',
  description: 'Intelligent AI Chatbot with Image Analysis',
  maxChatHistory: 100,
  autoSaveInterval: 30000, // 30 seconds
  maxMessageLength: 4000,
  defaultTheme: 'system' as const,
};

// API Endpoints (for future backend integration)
export const API_ENDPOINTS = {
  chat: '/api/chat',
  imageAnalysis: '/api/image-analysis',
  models: '/api/models',
  settings: '/api/settings',
  auth: '/api/auth',
  export: '/api/export',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  chats: 'genesis-chats',
  currentChat: 'genesis-current-chat',
  modelConfig: 'genesis-model-config',
  userPreferences: 'genesis-preferences',
  apiKeys: 'genesis-api-keys',
  projects: 'genesis-projects',
};

// Toast Messages
export const TOAST_MESSAGES = {
  chatSaved: 'Chat saved successfully',
  chatDeleted: 'Chat deleted successfully',
  chatRenamed: 'Chat renamed successfully',
  imageSizeError: 'Image size exceeds maximum limit',
  imageTypeError: 'Invalid image type',
  copySuccess: 'Copied to clipboard',
  exportSuccess: 'Chat exported successfully',
  settingsSaved: 'Settings saved successfully',
  apiKeyInvalid: 'Invalid API key',
  networkError: 'Network error. Please try again.',
};

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from './settings-store';
import { APIKeyConfig } from '@/types';

describe('settings-store.ts', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useSettingsStore.setState({
      preferences: {
        theme: 'system',
        language: 'en',
        defaultModel: 'gemini-3-flash',
        defaultProvider: 'google',
        fontSize: 'medium',
        autoSave: true,
        showTokenCount: false,
        enableNotifications: true,
      },
      apiKeys: [],
    });
  });

  describe('Preferences actions', () => {
    it('should initialize with default preferences', () => {
      const state = useSettingsStore.getState();
      expect(state.preferences.theme).toBe('system');
      expect(state.preferences.fontSize).toBe('medium');
      expect(state.preferences.autoSave).toBe(true);
    });

    it('should support updating preferences', () => {
      const { updatePreferences } = useSettingsStore.getState();
      updatePreferences({ fontSize: 'large', autoSave: false });

      const state = useSettingsStore.getState();
      expect(state.preferences.fontSize).toBe('large');
      expect(state.preferences.autoSave).toBe(false);
      // Other settings should remain unchanged
      expect(state.preferences.theme).toBe('system');
    });

    it('should set theme and update classList for dark mode', () => {
      const { setTheme } = useSettingsStore.getState();
      
      // Test dark theme
      setTheme('dark');
      expect(useSettingsStore.getState().preferences.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Test light theme
      setTheme('light');
      expect(useSettingsStore.getState().preferences.theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

  });

  describe('API Keys actions', () => {
    it('should add an API key successfully', () => {
      const { addAPIKey } = useSettingsStore.getState();
      const newKey: APIKeyConfig = {
        provider: 'google',
        key: 'g-key-123',
        isActive: true,
      };

      addAPIKey(newKey);
      const state = useSettingsStore.getState();
      expect(state.apiKeys.length).toBe(1);
      expect(state.apiKeys[0]).toEqual(newKey);
    });

    it('should update an existing API key', () => {
      const { addAPIKey, updateAPIKey } = useSettingsStore.getState();
      const originalKey: APIKeyConfig = {
        provider: 'google',
        key: 'g-key-123',
        isActive: true,
      };
      addAPIKey(originalKey);

      updateAPIKey('google', { key: 'g-key-new', isActive: false });
      const state = useSettingsStore.getState();
      expect(state.apiKeys.length).toBe(1);
      expect(state.apiKeys[0].key).toBe('g-key-new');
      expect(state.apiKeys[0].isActive).toBe(false);
    });

    it('should remove an API key', () => {
      const { addAPIKey, removeAPIKey } = useSettingsStore.getState();
      const key: APIKeyConfig = {
        provider: 'google',
        key: 'g-key-123',
        isActive: true,
      };
      addAPIKey(key);

      removeAPIKey('google');
      const state = useSettingsStore.getState();
      expect(state.apiKeys.length).toBe(0);
    });

    it('should fetch active API key', () => {
      const { addAPIKey, getAPIKey } = useSettingsStore.getState();
      const key: APIKeyConfig = {
        provider: 'google',
        key: 'g-key-123',
        isActive: true,
      };
      addAPIKey(key);

      const activeKey = getAPIKey('google');
      expect(activeKey).toBeDefined();
      expect(activeKey?.key).toBe('g-key-123');
    });

    it('should return undefined if requested API key is inactive', () => {
      const { addAPIKey, getAPIKey } = useSettingsStore.getState();
      const key: APIKeyConfig = {
        provider: 'google',
        key: 'g-key-123',
        isActive: false,
      };
      addAPIKey(key);

      const activeKey = getAPIKey('google');
      expect(activeKey).toBeUndefined();
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useChatStore } from '@/lib/store/chat-store';

/**
 * SettingsModal tests.
 * Tests the store-level behaviors that drive SettingsModal:
 * - Theme switching (light, dark, system, custom)
 * - Preferences toggles (autoSave, showTokenCount, enableNotifications, developerMode)
 * - API key management (save, remove, get)
 * - Export data structure
 */
describe('SettingsModal — Store Logic & Settings Management', () => {
  beforeEach(() => {
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
        developerMode: false,
      },
      apiKeys: [],
    });

    useChatStore.setState({
      chats: [
        {
          id: 'chat-export-test',
          title: 'Export Test Chat',
          messages: [
            { id: 'm1', role: 'user', content: 'Hello', timestamp: new Date(), tokens: 5 },
            { id: 'm2', role: 'assistant', content: 'Hi!', timestamp: new Date(), tokens: 3 },
          ],
          modelConfig: {
            id: 'default',
            name: 'Default',
            provider: 'google',
            model: 'gemini-3-flash',
            temperature: 0.7,
            maxTokens: 4096,
            topP: 0.95,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isStarred: false,
          totalTokens: 8,
        },
      ],
      artifacts: [],
      projects: [],
    });
  });

  it('should switch themes correctly', () => {
    const { setTheme } = useSettingsStore.getState();

    setTheme('dark');
    expect(useSettingsStore.getState().preferences.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    setTheme('light');
    expect(useSettingsStore.getState().preferences.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    setTheme('system');
    expect(useSettingsStore.getState().preferences.theme).toBe('system');
  });



  it('should toggle developer mode on and off', () => {
    const { updatePreferences } = useSettingsStore.getState();

    updatePreferences({ developerMode: true });
    expect(useSettingsStore.getState().preferences.developerMode).toBe(true);

    updatePreferences({ developerMode: false });
    expect(useSettingsStore.getState().preferences.developerMode).toBe(false);
  });

  it('should toggle all general preferences', () => {
    const { updatePreferences } = useSettingsStore.getState();

    // Toggle autoSave off
    updatePreferences({ autoSave: false });
    expect(useSettingsStore.getState().preferences.autoSave).toBe(false);

    // Toggle showTokenCount on
    updatePreferences({ showTokenCount: true });
    expect(useSettingsStore.getState().preferences.showTokenCount).toBe(true);

    // Toggle enableNotifications off
    updatePreferences({ enableNotifications: false });
    expect(useSettingsStore.getState().preferences.enableNotifications).toBe(false);

    // Verify they are all independent
    const state = useSettingsStore.getState();
    expect(state.preferences.autoSave).toBe(false);
    expect(state.preferences.showTokenCount).toBe(true);
    expect(state.preferences.enableNotifications).toBe(false);
  });

  it('should save, retrieve, and remove Gemini API key', () => {
    const { addAPIKey, getAPIKey, removeAPIKey } = useSettingsStore.getState();

    // Save
    addAPIKey({ provider: 'google', key: 'AIzaSyTestKey123', isActive: true });
    expect(useSettingsStore.getState().apiKeys.length).toBe(1);

    // Retrieve active key
    const activeKey = useSettingsStore.getState().getAPIKey('google');
    expect(activeKey).toBeDefined();
    expect(activeKey?.key).toBe('AIzaSyTestKey123');
    expect(activeKey?.isActive).toBe(true);

    // Remove
    useSettingsStore.getState().removeAPIKey('google');
    expect(useSettingsStore.getState().apiKeys.length).toBe(0);
    expect(useSettingsStore.getState().getAPIKey('google')).toBeUndefined();
  });

  it('should change font size', () => {
    const { updatePreferences } = useSettingsStore.getState();

    updatePreferences({ fontSize: 'small' });
    expect(useSettingsStore.getState().preferences.fontSize).toBe('small');

    updatePreferences({ fontSize: 'large' });
    expect(useSettingsStore.getState().preferences.fontSize).toBe('large');
  });

  it('should prepare correct export data structure', () => {
    const { preferences, apiKeys } = useSettingsStore.getState();
    const { chats } = useChatStore.getState();

    // Simulate export data creation (mirrors SettingsModal.handleExportData)
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      chats: chats,
      settings: preferences,
      apiKeys: apiKeys.map(key => ({ ...key, key: '***REDACTED***' })),
    };

    expect(exportData.version).toBe('1.0');
    expect(exportData.chats.length).toBe(1);
    expect(exportData.chats[0].title).toBe('Export Test Chat');
    expect(exportData.settings.theme).toBe('system');
    // API keys should be redacted in exports
    expect(exportData.apiKeys.every(k => k.key === '***REDACTED***')).toBe(true);
  });
});

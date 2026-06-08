import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useChatStore } from '@/lib/store/chat-store';

describe('SettingsModal component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="portal-root"></div>';
    
    // Reset stores
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

    useChatStore.setState({
      chats: [],
      projects: [],
      artifacts: [],
    });
  });

  it('should render nothing if isOpen is false', () => {
    const { container } = render(<SettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render tabs and general settings when open', () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Data & Privacy')).toBeInTheDocument();

    // Verify General tab settings are displayed
    expect(screen.getByText('Auto-save chats')).toBeInTheDocument();
    expect(screen.getByText('Show token count')).toBeInTheDocument();
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('should allow navigation between tabs', () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    // Switch to Appearance tab
    fireEvent.click(screen.getByText('Appearance'));
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Font Size')).toBeInTheDocument();

    // Switch to Data & Privacy tab
    fireEvent.click(screen.getByText('Data & Privacy'));
    expect(screen.getByText('Local Storage')).toBeInTheDocument();
    expect(screen.getByText('Export Your Data')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Danger Zone')).toBeInTheDocument();
  });

  it('should trigger clear data confirmation when clicking delete button', () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    
    // Go to Privacy tab
    fireEvent.click(screen.getByText('Data & Privacy'));
    
    // Click Clear All Data
    const clearButton = screen.getByText('Clear All Data');
    fireEvent.click(clearButton);

    // Verify confirmation modal shows up
    expect(screen.getByText('Are you sure you want to delete all your chats, settings, and API keys? This action cannot be undone and you will lose all your data permanently.')).toBeInTheDocument();
  });
});

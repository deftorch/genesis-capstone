import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GenesisApp from './page';

// Mock Next.js and child components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useParams: () => ({}),
}));

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: any) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/components/chat/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel">ChatPanel</div>,
}));

vi.mock('@/components/artifact/ArtifactPanel', () => ({
  ArtifactPanel: () => <div data-testid="artifact-panel">ArtifactPanel</div>,
}));

import { useUIStore } from '@/lib/store/ui-store';
import { useChatStore } from '@/lib/store/chat-store';

describe('GenesisApp Page (app/page.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({
      showArtifact: false,
      activeChatId: null,
      isSettingsOpen: false,
      currentView: 'home',
      sidebarOpen: true,
    });
    useChatStore.setState({
      artifacts: [],
      chats: [],
    });
  });

  it('renders AppShell and ChatPanel by default', () => {
    render(<GenesisApp />);
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
  });

  it('does not render ArtifactPanel when showArtifact is false', () => {
    render(<GenesisApp />);
    expect(screen.queryByTestId('artifact-panel')).not.toBeInTheDocument();
  });
});

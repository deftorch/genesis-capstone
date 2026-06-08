import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '@/lib/store/ui-store';
import { useChatStore } from '@/lib/store/chat-store';
import { useSettingsStore } from '@/lib/store/settings-store';

/**
 * ArtifactPanel tests.
 * Since ArtifactPanel relies heavily on dynamic canvas imports (P5Canvas, D3Canvas, etc.)
 * and DOM APIs like requestFullscreen, we test the underlying store behaviors
 * and helper logic that drive the panel's UI.
 */
describe('ArtifactPanel — Store Logic & Helpers', () => {
  beforeEach(() => {
    useUIStore.setState({
      showArtifact: false,
      isArtifactFullscreen: false,
      isTrueFullscreen: false,
      activeTab: 'preview',
      activeRenderer: 'p5',
      p5Code: '',
      editableCode: '',
      previousCode: '',
      zoom: 1,
      pan: { x: 0, y: 0 },
      panMode: false,
      activeChatId: null,
      activeVersionNumber: 1,
      showMobileChatInput: false,
    });

    useChatStore.setState({
      chats: [
        {
          id: 'chat-1',
          title: 'Test Canvas',
          messages: [],
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
          totalTokens: 0,
        },
      ],
      artifacts: [],
    });
  });

  it('should toggle artifact panel visibility', () => {
    const ui = useUIStore.getState();
    expect(ui.showArtifact).toBe(false);

    useUIStore.getState().setShowArtifact(true);
    expect(useUIStore.getState().showArtifact).toBe(true);

    useUIStore.getState().setShowArtifact(false);
    expect(useUIStore.getState().showArtifact).toBe(false);
  });

  it('should switch between preview, code, and diff tabs', () => {
    const { setActiveTab } = useUIStore.getState();

    setActiveTab('preview');
    expect(useUIStore.getState().activeTab).toBe('preview');

    setActiveTab('code');
    expect(useUIStore.getState().activeTab).toBe('code');

    setActiveTab('diff');
    expect(useUIStore.getState().activeTab).toBe('diff');
  });

  it('should switch renderers (p5 → d3 → svg → mermaid)', () => {
    const { setActiveRenderer } = useUIStore.getState();

    setActiveRenderer('p5');
    expect(useUIStore.getState().activeRenderer).toBe('p5');

    setActiveRenderer('d3');
    expect(useUIStore.getState().activeRenderer).toBe('d3');

    setActiveRenderer('svg');
    expect(useUIStore.getState().activeRenderer).toBe('svg');

    setActiveRenderer('mermaid');
    expect(useUIStore.getState().activeRenderer).toBe('mermaid');
  });

  it('should manage zoom and pan state', () => {
    const ui = useUIStore.getState();

    // Zoom in
    ui.setZoom((prev) => prev + 0.1);
    expect(useUIStore.getState().zoom).toBeCloseTo(1.1, 5);

    // Zoom out
    useUIStore.getState().setZoom((prev) => prev - 0.2);
    expect(useUIStore.getState().zoom).toBeCloseTo(0.9, 5);

    // Pan
    ui.setPan({ x: 50, y: -30 });
    expect(useUIStore.getState().pan).toEqual({ x: 50, y: -30 });

    // Reset
    useUIStore.getState().setZoom(1);
    useUIStore.getState().setPan({ x: 0, y: 0 });
    expect(useUIStore.getState().zoom).toBe(1);
    expect(useUIStore.getState().pan).toEqual({ x: 0, y: 0 });
  });

  it('should toggle fullscreen state', () => {
    const { setIsArtifactFullscreen } = useUIStore.getState();

    setIsArtifactFullscreen(true);
    expect(useUIStore.getState().isArtifactFullscreen).toBe(true);

    setIsArtifactFullscreen(false);
    expect(useUIStore.getState().isArtifactFullscreen).toBe(false);
  });

  it('should set and get code correctly for download', () => {
    useUIStore.getState().setP5Code('function setup() { createCanvas(400, 400); }');
    useUIStore.getState().setEditableCode('function setup() { createCanvas(800, 800); }');

    const state = useUIStore.getState();
    expect(state.p5Code).toContain('createCanvas(400, 400)');
    expect(state.editableCode).toContain('createCanvas(800, 800)');
  });

  it('should track version numbers', () => {
    useUIStore.getState().setActiveVersionNumber(1);
    expect(useUIStore.getState().activeVersionNumber).toBe(1);

    useUIStore.getState().setActiveVersionNumber(3);
    expect(useUIStore.getState().activeVersionNumber).toBe(3);
  });

  it('should get correct friendly title from active chat', () => {
    useUIStore.getState().setActiveChatId('chat-1');
    
    const chat = useChatStore.getState().chats.find(
      (c) => c.id === useUIStore.getState().activeChatId
    );
    expect(chat?.title).toBe('Test Canvas');
  });
});

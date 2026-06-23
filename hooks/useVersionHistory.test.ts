import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useVersionHistory } from './useVersionHistory';
import { useUIStore } from '@/lib/store/ui-store';

describe('useVersionHistory hook', () => {
  beforeEach(() => {
    useUIStore.setState({
      activeVersionNumber: null,
      p5Code: null,
      editableCode: '',
      previousCode: null,
      activeRenderer: 'p5',
    });
  });

  const messages = [
    { type: 'user', content: 'Draw a circle' },
    { type: 'ai', content: '```javascript\nfunction setup() {}\n```' },
    { type: 'user', content: 'Make it red' },
    { type: 'ai', content: '```javascript\nfunction setup() { fill("red"); }\n```' },
  ];

  it('should extract code versions correctly from messages', () => {
    const { result } = renderHook(() => useVersionHistory(messages));
    
    expect(result.current.codeVersions.length).toBe(2);
    expect(result.current.codeVersions[0].versionNumber).toBe(1);
    expect(result.current.codeVersions[0].code).toBe('function setup() {}');
    expect(result.current.codeVersions[0].renderer).toBe('p5');
    
    expect(result.current.codeVersions[1].versionNumber).toBe(2);
    expect(result.current.codeVersions[1].code).toBe('function setup() { fill("red"); }');
  });

  it('should update uiStore activeVersionNumber when new version is added', () => {
    const { result, rerender } = renderHook((props: { msgs: any[] }) => useVersionHistory(props.msgs), {
      initialProps: { msgs: [messages[0], messages[1]] }
    });

    // Should set to version 1
    expect(useUIStore.getState().activeVersionNumber).toBe(1);

    // Add new message
    rerender({ msgs: messages });

    // Should update to version 2
    expect(useUIStore.getState().activeVersionNumber).toBe(2);
  });

  it('should update editable code and renderer in ui store when activeVersionNumber changes', () => {
    renderHook(() => useVersionHistory(messages));
    
    // Initially should be at the latest version (2)
    expect(useUIStore.getState().editableCode).toBe('function setup() { fill("red"); }');
    expect(useUIStore.getState().previousCode).toBe('function setup() {}');

    // Manually change version in UI store
    act(() => {
      useUIStore.getState().setActiveVersionNumber(1);
    });

    // editableCode should change to version 1 code
    expect(useUIStore.getState().editableCode).toBe('function setup() {}');
    expect(useUIStore.getState().previousCode).toBe('');
  });
});

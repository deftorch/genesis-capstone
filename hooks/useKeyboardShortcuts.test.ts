import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute shortcut callback when matching keys are pressed', () => {
    const mockCallback = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'ctrl+k': mockCallback }));

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    
    // Spy on preventDefault
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle shift, alt, and meta keys correctly', () => {
    const mockCtrlShiftA = vi.fn();
    const mockAltB = vi.fn();
    
    renderHook(() => useKeyboardShortcuts({
      'ctrl+shift+a': mockCtrlShiftA,
      'alt+b': mockAltB,
    }));

    // Trigger ctrl+shift+a
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
    }));

    // Trigger alt+b
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'b',
      altKey: true,
    }));

    expect(mockCtrlShiftA).toHaveBeenCalledTimes(1);
    expect(mockAltB).toHaveBeenCalledTimes(1);
  });

  it('should handle metaKey as ctrl', () => {
    const mockCallback = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'ctrl+f': mockCallback }));

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'f',
      metaKey: true, // e.g., Cmd on Mac
    }));

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should not execute if shortcut does not match', () => {
    const mockCallback = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'ctrl+k': mockCallback }));

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      ctrlKey: true,
    }));

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const mockCallback = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ 'ctrl+x': mockCallback }));

    unmount();

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'x',
      ctrlKey: true,
    }));

    expect(mockCallback).not.toHaveBeenCalled();
  });
});

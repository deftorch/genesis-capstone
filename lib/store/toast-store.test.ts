import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToastStore, useToast } from './toast-store';
import { renderHook, act } from '@testing-library/react';

describe('useToastStore and useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize with empty toasts', () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('should add a toast with generated id', () => {
    useToastStore.getState().addToast({ title: 'Test', description: 'Testing' });
    
    const toasts = useToastStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].title).toBe('Test');
    expect(toasts[0].description).toBe('Testing');
    expect(toasts[0].id).toBeDefined();
  });

  it('should remove toast by id', () => {
    useToastStore.getState().addToast({ title: 'To Delete' });
    let toasts = useToastStore.getState().toasts;
    expect(toasts.length).toBe(1);
    
    const id = toasts[0].id;
    useToastStore.getState().removeToast(id);
    
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it('should clear all toasts', () => {
    useToastStore.getState().addToast({ title: 'T1' });
    useToastStore.getState().addToast({ title: 'T2' });
    expect(useToastStore.getState().toasts.length).toBe(2);

    useToastStore.getState().clearToasts();
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it('should auto-remove toast after 5 seconds', () => {
    useToastStore.getState().addToast({ title: 'Auto remove' });
    expect(useToastStore.getState().toasts.length).toBe(1);

    // Fast forward 4.9 seconds
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(useToastStore.getState().toasts.length).toBe(1);

    // Fast forward remaining time (total > 5s)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  describe('useToast hook', () => {
    it('provides success wrapper method', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.success('Success Title', 'Success Desc');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBe(1);
      expect(toasts[0].title).toBe('Success Title');
      expect(toasts[0].variant).toBe('default');
    });

    it('provides error wrapper method', () => {
      const { result } = renderHook(() => useToast());
      
      act(() => {
        result.current.error('Error Title', 'Error Desc');
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBe(1);
      expect(toasts[0].title).toBe('Error Title');
      expect(toasts[0].variant).toBe('destructive');
    });
  });
});

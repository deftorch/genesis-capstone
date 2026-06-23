import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useImageAnalysis } from './useImageAnalysis';
import { useToast } from '@/lib/store/toast-store';
import { ImageAttachment } from '@/types';

// Mock the toast store
vi.mock('@/lib/store/toast-store', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

describe('useImageAnalysis hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useImageAnalysis());
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.result).toBeNull();
  });

  it('should handle analyzeImage successfully', async () => {
    const mockImage: ImageAttachment = { id: 'img1', url: 'test.jpg' };
    const { result } = renderHook(() => useImageAnalysis());

    let analyzePromise: Promise<any>;
    act(() => {
      analyzePromise = result.current.analyzeImage(mockImage, 'object-detection');
    });

    expect(result.current.isAnalyzing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {
      await analyzePromise;
    });

    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.result).toBeDefined();
    expect(result.current.result?.type).toBe('object-detection');
  });

  it('should return error if image is missing', async () => {
    const { result } = renderHook(() => useImageAnalysis());
    
    await act(async () => {
      await result.current.analyzeImage(null as any, 'object-detection');
    });

    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.result).toBeNull();
  });

  it('should analyze multiple images', async () => {
    const mockImages: ImageAttachment[] = [
      { id: 'img1', url: '1.jpg' },
      { id: 'img2', url: '2.jpg' },
    ];
    const { result } = renderHook(() => useImageAnalysis());

    let analyzePromise: Promise<any>;
    act(() => {
      analyzePromise = result.current.analyzeMultipleImages(mockImages, 'label-detection');
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    let results;
    await act(async () => {
      results = await analyzePromise;
    });

    expect(results).toHaveLength(2);
    expect(results[0].type).toBe('label-detection');
    expect(results[1].type).toBe('label-detection');
  });

  it('should clear result', () => {
    const { result } = renderHook(() => useImageAnalysis());
    
    // forcefully set result to test clear
    act(() => {
      result.current.analyzeImage({ id: 'img', url: 'test' }, 'visual-qa');
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.result).toBeDefined();

    act(() => {
      result.current.clearResult();
    });

    expect(result.current.result).toBeNull();
  });
});

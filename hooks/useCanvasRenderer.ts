import { useMemo } from 'react';
import { extractCode } from '@/lib/extract-code';
import { RendererType } from '@/types';

/**
 * Detects the renderer and extracts code from the AI message content.
 * Uses extractCode() to ensure consistent logic with the rest of the application.
 */
export function useCanvasRenderer(messageContent: string | null): {
  code: string | null;
  renderer: RendererType | null;
} {
  return useMemo(() => {
    if (!messageContent) return { code: null, renderer: null };
    const extracted = extractCode(messageContent);
    if (!extracted) return { code: null, renderer: null };
    return { code: extracted.code, renderer: extracted.renderer };
  }, [messageContent]);
}

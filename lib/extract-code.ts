import { RendererType } from '@/types';

/**
 * Helper function to extract code and detect renderer from AI response content.
 * 
 * @param content The raw message content from AI response
 * @returns An object containing code and renderer type, or null if no JS code block is found
 */
export const extractCode = (content: string): { code: string; renderer: RendererType } | null => {
  const codeBlockRegex = /```(?:javascript|js)\n([\s\S]*?)```/;
  const match = content.match(codeBlockRegex);
  if (!match) return null;

  const code = match[1].trim();
  // Detect renderer from comment on first line
  if (code.startsWith('// renderer: d3')) {
    return { code, renderer: 'd3' };
  }
  if (code.startsWith('// renderer: svg')) {
    return { code, renderer: 'svg' };
  }
  if (code.startsWith('// renderer: mermaid')) {
    return { code, renderer: 'mermaid' };
  }
  return { code, renderer: 'p5' };
};

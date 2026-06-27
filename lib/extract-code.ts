import { RendererType } from '@/types';

/**
 * Helper function to extract code and detect renderer from AI response content.
 * 
 * @param content The raw message content from AI response
 * @returns An object containing code and renderer type, or null if no JS code block is found
 */
export const extractCode = (content: string): { code: string; renderer: RendererType } | null => {
  // Matches ```javascript, ```js, ```html, ```svg, ```mermaid, or just ```
  // Also supports unclosed code blocks (for real-time streaming)
  const codeBlockRegex = /```(?:javascript|js|html|svg|mermaid)?\s*\n([\s\S]*?)(?:```|$)/i;
  const match = content.match(codeBlockRegex);
  if (!match) return null;

  const code = match[1].trim();
  
  // Use regex to detect renderer comment flexibly
  // e.g., // renderer: p5, //renderer:p5, // Renderer : P5
  const d3Regex = /\/\/\s*renderer\s*:\s*d3/i;
  const svgRegex = /\/\/\s*renderer\s*:\s*svg/i;
  const mermaidRegex = /\/\/\s*renderer\s*:\s*mermaid/i;
  const twojsRegex = /\/\/\s*renderer\s*:\s*twojs/i;
  const mojsRegex = /\/\/\s*renderer\s*:\s*mojs/i;
  const pixiRegex = /\/\/\s*renderer\s*:\s*pixi/i;
  const gsapRegex = /\/\/\s*renderer\s*:\s*gsap/i;

  if (d3Regex.test(code)) {
    return { code, renderer: 'd3' };
  }
  if (svgRegex.test(code)) {
    return { code, renderer: 'svg' };
  }
  if (mermaidRegex.test(code)) {
    return { code, renderer: 'mermaid' };
  }
  if (twojsRegex.test(code)) {
    return { code, renderer: 'twojs' };
  }
  if (mojsRegex.test(code)) {
    return { code, renderer: 'mojs' };
  }
  if (pixiRegex.test(code)) {
    return { code, renderer: 'pixi' };
  }
  if (gsapRegex.test(code)) {
    return { code, renderer: 'gsap' };
  }
  
  // Default to p5 if no specific renderer is detected, or if p5 is explicitly specified
  return { code, renderer: 'p5' };
};

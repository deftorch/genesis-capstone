import { RendererType, GameEngineData } from '@/types';

/**
 * Helper function to assemble a GameEngineData object into a single runnable code string.
 */
export const assembleGame = (data: GameEngineData): string => {
  const settingsStr = data.settings ? `// Settings: ${JSON.stringify(data.settings)}\n` : '';
  const prefabsStr = data.prefabs ? Object.values(data.prefabs).join('\n\n') + '\n\n' : '';
  const scenesStr = data.scenes ? Object.values(data.scenes).join('\n\n') + '\n\n' : '';
  const mainLogicStr = data.mainLogic || '';
  
  return `// renderer: p5\n${settingsStr}\n${prefabsStr}${scenesStr}${mainLogicStr}`;
};

/**
 * Helper function to extract code, detect renderer, and parse engineData from AI response.
 * Supports both the new JSON format and legacy Markdown format.
 * 
 * @param content The raw message content from AI response
 */
export const extractCode = (content: string): { code: string; renderer: RendererType; engineData?: GameEngineData } | null => {
  // 1. Try to parse as JSON (New Engine-Driven format)
  try {
    const parsed = JSON.parse(content);
    if (parsed.renderer && (parsed.code || parsed.engineData)) {
      let finalCode = parsed.code || '';
      
      // If it's p5 and we have engineData, assemble it for the editor/canvas
      if (parsed.renderer === 'p5' && parsed.engineData) {
        finalCode = assembleGame(parsed.engineData);
      }

      return {
        renderer: parsed.renderer as RendererType,
        code: finalCode,
        engineData: parsed.engineData
      };
    }
  } catch (e) {
    // It might be streaming or it's legacy markdown format. Fallback to Regex.
  }

  // 2. Fallback: Parse from Markdown blocks (Legacy format)
  const codeBlockRegex = /```(?:javascript|js|html|svg|mermaid)?\s*\n([\s\S]*?)(?:```|$)/i;
  const match = content.match(codeBlockRegex);
  
  if (!match) {
    // If it's streaming JSON but we can't parse it yet, return null
    if (content.trim().startsWith('{')) return null; 
    return null;
  }

  const code = match[1].trim();
  
  const d3Regex = /\/\/\s*renderer\s*:\s*d3/i;
  const svgRegex = /\/\/\s*renderer\s*:\s*svg/i;
  const mermaidRegex = /\/\/\s*renderer\s*:\s*mermaid/i;

  if (d3Regex.test(code)) return { code, renderer: 'd3' };
  if (svgRegex.test(code)) return { code, renderer: 'svg' };
  if (mermaidRegex.test(code)) return { code, renderer: 'mermaid' };
  
  return { code, renderer: 'p5' };
};

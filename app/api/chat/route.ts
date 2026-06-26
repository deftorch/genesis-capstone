import { NextRequest, NextResponse } from 'next/server';
import { streamGeminiWithRotation } from '@/lib/gemini-client';
import { chatRateLimiter } from '@/lib/rate-limiter';
import { sanitizeCodeForPrompt } from '@/lib/sanitize';
import { logger } from '@/lib/logger';

import * as z from 'zod';

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(50000),
  })).min(1).max(100),
  model: z.string().optional(),
  currentCode: z.string().max(500000).optional(),
  images: z.array(z.object({
    base64: z.string().optional(),
    mimeType: z.string().optional(),
    url: z.string().url().optional(),
  })).max(10).optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') 
          ?? req.headers.get('x-real-ip') 
          ?? 'anonymous';

  try {
    chatRateLimiter.check(20, ip);
  } catch {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const rawBody = await req.json();
    const parseResult = ChatRequestSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { messages, model, currentCode: rawCurrentCode, images } = parseResult.data;
    const currentCode = rawCurrentCode ? sanitizeCodeForPrompt(rawCurrentCode) : '';

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const lastUserPrompt = lastMessage?.content || '';

    if (!lastUserPrompt || lastUserPrompt.trim() === '') {
      return NextResponse.json(
        { error: 'Empty message content' },
        { status: 400 }
      );
    }

    // Build system instruction
    let systemPrompt = `You are Genesis, a creative AI Game Engine & Visual Assistant.

CRITICAL JSON OUTPUT RULES:
You must ALWAYS respond with a pure JSON object. Do NOT wrap it in markdown code blocks.
The JSON must strictly follow this structure:
{
  "renderer": "p5" | "d3" | "svg" | "mermaid",
  "explanation": "A short thought process of what you are doing",
  "code": "The raw code string for D3, SVG, or Mermaid ONLY. Leave empty if renderer is p5.",
  "engineData": {
    "settings": {
      "gameState": "PLAYING"
    },
    "prefabs": {
      "Player": "class Player { ... }",
      "Enemy": "class Enemy { ... }"
    },
    "scenes": {
      "Menu": "function drawMenu() { ... }"
    },
    "mainLogic": "function setup() { ... } function draw() { ... }"
  }
}

p5.js (GAME ENGINE) RULES:
- Use p5.js for games, generative art, and interactive visual logic.
- If renderer is p5, you MUST break the code down into components and put them inside the "engineData" object.
- "mainLogic" must contain setup(), draw(), and windowResized(). ALWAYS use createCanvas(windowWidth, windowHeight).
- "prefabs" should contain separate class definitions as string values.
- "scenes" should contain scene-specific functions as string values.
- Do NOT put p5.js code inside the root "code" field.
- If the user asks for a simple edit, you still return the full JSON structure with the updated component.

D3.js, SVG, and Mermaid RULES:
- If renderer is not p5, put the ENTIRE generated code inside the root "code" field.
- Leave "engineData" empty.
- For D3.js: always select '#chart'.
- For SVG: output the raw <svg> markup.
- For Mermaid: output the raw mermaid syntax.
`;

    // If there's existing code, instruct AI to modify it
    if (currentCode && currentCode.trim()) {
      systemPrompt += `
CRITICAL: The user already has existing code. You must MODIFY this existing code based on their request.
If the existing code is provided, parse it and update ONLY the parts requested. Return the full updated JSON structure.

=== CURRENT CODE/STATE ===
${currentCode}
=== END CURRENT CODE ===
`;
    }

    // Map roles to Gemini roles ('user' and 'model')
    const contents = messages.map((msg: any, idx: number) => {
      const parts: any[] = [
        {
          text: msg.content || '',
        },
      ];

      // Attach images to the LAST user message
      if (images && images.length > 0 && idx === messages.length - 1 && msg.role === 'user') {
        for (const img of images) {
          if (img.base64 && img.mimeType) {
            // Base64-encoded image from data URL
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.base64,
              },
            });
          } else if (img.url && !img.url.startsWith('data:')) {
            // Remote URL — try to fetch and convert to base64
            try {
              // For remote URLs, we add them as text reference since Gemini
              // inlineData requires base64. The model can still reference the URL.
              parts.push({
                text: `[Image URL: ${img.url}]`,
              });
            } catch {
              // Skip if URL can't be processed
            }
          }
        }
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    const requestBody = {
      contents,
      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH",
        }
      ],
    };

    // Map model names to Gemini API model IDs
    const modelIdMap: Record<string, string> = {
      'gemini-3-flash': 'gemini-3-flash-preview',
      'gemini-2.5-flash': 'gemini-2.5-flash',
      'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
    };

    const geminiModelId = (model ? modelIdMap[model] : undefined) || 'gemini-3-flash-preview';

    // Call Gemini with Key Rotation to get a stream
    const response = await streamGeminiWithRotation(geminiModelId, requestBody);

    // Return the response directly to proxy the SSE stream to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    logger.error('Chat API error', { error: error.message, stack: error.stack });
    const isQuota = error.status === 429 || error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('429');
    
    return NextResponse.json(
      {
        error: isQuota
          ? 'Your daily usage limit has been reached. Please come back tomorrow.'
          : (error.message || 'Failed to process chat request'),
        details: error.details || error.message,
      },
      { status: isQuota ? 429 : 500 }
    );
  }
}

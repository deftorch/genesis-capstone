import { NextRequest, NextResponse } from 'next/server';
import { streamGeminiWithRotation } from '@/lib/gemini-client';
import { chatRateLimiter } from '@/lib/rate-limiter';
import { sanitizeCodeForPrompt } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import { DEFAULT_SYSTEM_PROMPT, buildChatSystemPrompt } from '@/lib/system-prompts';

import * as z from 'zod';

// Keep this generous but bounded — a custom system prompt is still just text
// sent as systemInstruction, so the same order-of-magnitude cap as currentCode
// is reasonable and prevents pathological payloads.
const MAX_SYSTEM_PROMPT_LENGTH = 20000;

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
  // Optional user-supplied override for the base system prompt, set via
  // Settings > Developer > System Instructions. Falls back to
  // DEFAULT_SYSTEM_PROMPT when absent or blank.
  systemPromptOverride: z.string().max(MAX_SYSTEM_PROMPT_LENGTH).optional(),
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

    const { messages, model, currentCode: rawCurrentCode, images, systemPromptOverride } = parseResult.data;
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

    // Base system instruction: either the user's custom override (from
    // Settings > Developer > System Instructions) or the built-in default.
    // NOTE: renderer-detection (extractCode on the client) depends on the
    // "// renderer: <type>" marker convention described in the default
    // prompt. If a user fully replaces the prompt without preserving that
    // convention, code-block rendering may silently fall back to p5.js.
    const baseSystemPrompt = (systemPromptOverride && systemPromptOverride.trim())
      ? systemPromptOverride
      : DEFAULT_SYSTEM_PROMPT;

    const systemPrompt = buildChatSystemPrompt(baseSystemPrompt, currentCode);

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
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 65536,
      },
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

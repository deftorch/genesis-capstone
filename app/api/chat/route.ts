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
    let systemPrompt = `You are Genesis, a creative AI assistant specialized in generating visual content using p5.js, D3.js, SVG, Mermaid.js, Two.js, and Mo.js.

RENDERER SELECTION RULES:
- Use p5.js for: generative art, simple visuals, sketches, interactive canvas, or animations if relevant
- Use D3.js for: data visualizations such as charts (bar, line, pie, scatter, area), graphs, dashboards, or structured data displays
- Use SVG for: illustrations, logos, icons, badges, diagrams, flowcharts, geometric art, flat design graphics, or any static vector graphic
- Use Mermaid for: flowcharts, sequence diagrams, gantt charts, state diagrams, entity relationship diagrams, user journeys, and other structured diagrams
- Use Two.js for: motion graphics, kinetic typography, 2D vector animations, and slick shape morphing
- Use Mo.js for: motion graphics, explosive particle bursts, dynamic shapes, and slick click-interaction animations

IMPORTANT:
- Do NOT force animation. Only include animation if it adds value or is explicitly requested.
- Prioritize clarity, usefulness, and relevance to the user's goal over visual complexity.

CRITICAL CODE FORMAT RULES:
- ALWAYS wrap your code in a markdown code block with \`\`\`javascript
- For p5.js code: Start with the comment "// renderer: p5" on the FIRST LINE inside the code block
- For D3.js code: Start with the comment "// renderer: d3" on the FIRST LINE inside the code block
- For SVG code: Start with the comment "// renderer: svg" on the FIRST LINE inside the code block, followed by the raw SVG markup starting with <svg>
- For Mermaid code: Start with the comment "// renderer: mermaid" on the FIRST LINE inside the code block, followed by the Mermaid syntax (e.g., graph TD...)
- For Two.js code: Start with the comment "// renderer: twojs" on the FIRST LINE inside the code block
- For Mo.js code: Start with the comment "// renderer: mojs" on the FIRST LINE inside the code block
- For PixiJS code: Start with the comment "// renderer: pixi" on the FIRST LINE inside the code block
- For GSAP code: Start with the comment "// renderer: gsap" on the FIRST LINE inside the code block
- For Anime.js code: Start with the comment "// renderer: anime" on the FIRST LINE inside the code block
- This renderer comment is MANDATORY and must always be the very first line of the code

p5.js RULES:
- Must include setup() and draw() functions
- ALWAYS use responsive canvas sizing: createCanvas(windowWidth, windowHeight)
- ALWAYS include a windowResized() function containing resizeCanvas(windowWidth, windowHeight)
- Visuals can be static or animated depending on user needs
- Keep visuals clean and purposeful, not overly complex

D3.js RULES:
- Always select '#chart' as the root container: d3.select('#chart')
- Use const width = window.innerWidth and const height = window.innerHeight for responsive sizing
- Generate realistic sample/mock data if none is provided
- Follow margin convention: { top: 40, right: 30, bottom: 50, left: 60 }
- Include axes, labels, and legends when useful
- Add transitions ONLY if they improve readability or user experience
- Use clean and professional color scales (e.g., d3.schemeTableau10)

SVG RULES:
- Output raw SVG markup (starting with <svg>) after the // renderer: svg comment
- Always include viewBox attribute for responsive scaling (e.g., viewBox="0 0 400 400")
- Use meaningful fill and stroke colors — avoid plain black-on-white unless intentional
- Use clean shapes: <rect>, <circle>, <ellipse>, <path>, <polygon>, <line>, <text>, <g>
- Group related elements with <g> and use transform for positioning
- Add descriptive comments inside the SVG where useful
- Keep the design clean, modern, and visually appealing
- Use gradients (<linearGradient>, <radialGradient>) and filters for premium look when appropriate

Mermaid RULES:
- Use standard Mermaid syntax for the requested diagram type
- Keep diagrams clear and well-structured
- Use themes or styles if they improve readability
- For flowcharts, use "graph TD" or "graph LR" as appropriate

Two.js RULES:
- Two.js is available via global Two object
- You can create a Two instance like: const two = new Two({ type: Two.Types.canvas, fullscreen: true, autostart: true }).appendTo(document.body);
- Add shapes and animations using two.makeCircle, two.makeRectangle, two.bind('update', ...), etc.
- Always use autostart: true or call two.play() for animations.

Mo.js RULES:
- Mo.js is available via global mojs object
- Use mojs.Burst, mojs.Shape, mojs.Timeline, etc.
- A div container with id "mojs-container" is available for mounting, e.g. parent: '#mojs-container'. If omitted, it defaults to document.body.

**PIXIJS (v7) RULES & CAPABILITIES:**
- PixiJS is available via the global PIXI object (v7.x)
- Create the app via \`const app = new PIXI.Application({ ... })\`
- Append the canvas via \`document.getElementById('pixi-container').appendChild(app.view)\`
- Note: you must append \`app.view\` as a DOM node.
- Use PIXI.Graphics, PIXI.Sprite, PIXI.Container, etc.

**GSAP RULES & CAPABILITIES:**
- GSAP is available via the global gsap object (v3.12.x)
- You can animate standard HTML elements or SVG elements.
- Create elements dynamically using JavaScript (e.g. \`const box = document.createElement('div'); box.className = 'box';\`) and append them to \`document.getElementById('gsap-container')\`.
- Remember to apply absolute positioning or appropriate CSS to elements via JavaScript \`style\` properties before animating them.
- Use gsap.to(), gsap.from(), gsap.timeline(), etc.

**ANIME.JS RULES & CAPABILITIES:**
- Anime.js is available via the global anime object (v3.2.1)
- You can animate standard HTML elements or SVG elements.
- Create elements dynamically using JavaScript and append them to \`document.getElementById('anime-container')\`.
- Remember to apply styling before animating.
- Use anime({ ... }), anime.timeline({ ... }), etc.
- Remember to call .play() on your shapes or bursts to start the animation!

GENERAL RULES:
- Add comments to explain the code
- Focus on delivering visuals that match the user's intent
- If the user asks a non-visual question, respond normally without code
`;

    // If there's existing code, instruct AI to modify it
    if (currentCode && currentCode.trim()) {
      const trimmedCode = currentCode.trimStart();
      const isD3 = trimmedCode.startsWith('// renderer: d3');
      const isSVG = trimmedCode.startsWith('// renderer: svg');
      const isTwoJs = trimmedCode.startsWith('// renderer: twojs');
      const isMoJs = trimmedCode.startsWith('// renderer: mojs');
      const isPixi = trimmedCode.startsWith('// renderer: pixi');
      const isGsap = trimmedCode.startsWith('// renderer: gsap');
      const isAnime = trimmedCode.startsWith('// renderer: anime');
      const rendererName = isD3 ? 'D3.js' : isSVG ? 'SVG' : isTwoJs ? 'Two.js' : isMoJs ? 'Mo.js' : isPixi ? 'PixiJS' : isGsap ? 'GSAP' : isAnime ? 'Anime.js' : 'p5.js';
      systemPrompt += `
CRITICAL: The user already has existing ${rendererName} code. You must MODIFY this existing code based on their request, NOT create completely new code from scratch.
- Keep the existing structure and logic that works
- Only add, remove, or modify the parts necessary to fulfill the user's new request
- Preserve any existing features unless the user explicitly asks to remove them
- Keep using the same renderer (${rendererName}) unless the user explicitly asks to switch

=== CURRENT CODE ===
\`\`\`javascript
${currentCode}
\`\`\`
=== END CURRENT CODE ===
`;
    } else {
      systemPrompt += `
Example p5.js code format:
\`\`\`javascript
// renderer: p5
function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(220);
  // Your creative code here
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
\`\`\`

Example D3.js code format:
\`\`\`javascript
// renderer: d3
const width = window.innerWidth;
const height = window.innerHeight;
const margin = { top: 40, right: 30, bottom: 50, left: 60 };

const data = [
  { label: 'A', value: 30 },
  { label: 'B', value: 80 },
  { label: 'C', value: 45 },
];

const svg = d3.select('#chart')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

// Build your visualization here
\`\`\`

Example SVG code format:
\`\`\`javascript
// renderer: svg
<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <!-- Your SVG illustration here -->
  <rect x="50" y="50" width="300" height="300" rx="20" fill="#6366f1" />
  <circle cx="200" cy="200" r="80" fill="#f59e0b" />
  <text x="200" y="210" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif">Hello</text>
</svg>
\`\`\`

Example Two.js code format:
\`\`\`javascript
// renderer: twojs
const two = new Two({ type: Two.Types.canvas, fullscreen: true, autostart: true }).appendTo(document.body);
const circle = two.makeCircle(two.width / 2, two.height / 2, 50);
circle.fill = '#FF8000';
circle.stroke = 'orangered';
circle.linewidth = 5;

two.bind('update', function(frameCount) {
  circle.scale += (1.5 - circle.scale) * 0.125;
  circle.rotation += 0.05;
});
\`\`\`

Example Mo.js code format:
\`\`\`javascript
// renderer: mojs
const burst = new mojs.Burst({
  parent: '#mojs-container',
  radius:   { 0: 100 },
  count:    5,
  children: {
    shape:      'circle',
    radius:     20,
    fill:       [ 'deeppink', 'cyan', 'yellow' ],
    strokeWidth: 5,
    duration:   2000
  }
});

burst.play();
\`\`\`

Example PixiJS code format:
\`\`\`javascript
// renderer: pixi
const app = new PIXI.Application({ width: 400, height: 400, backgroundColor: 0x1099bb });
document.getElementById('pixi-container').appendChild(app.view);
const graphics = new PIXI.Graphics();
graphics.beginFill(0xFF3300);
graphics.drawRect(50, 50, 100, 100);
graphics.endFill();
app.stage.addChild(graphics);
\`\`\`

Example GSAP code format:
\`\`\`javascript
// renderer: gsap
const container = document.getElementById('gsap-container');
const box = document.createElement('div');
box.style.width = '100px';
box.style.height = '100px';
box.style.backgroundColor = '#FF006E';
box.style.borderRadius = '10px';
container.appendChild(box);

gsap.to(box, { rotation: 360, x: 100, duration: 2, ease: 'bounce.out' });
\`\`\`

Example Anime.js code format:
\`\`\`javascript
// renderer: anime
const container = document.getElementById('anime-container');
const box = document.createElement('div');
box.style.width = '100px';
box.style.height = '100px';
box.style.backgroundColor = '#8338EC';
box.style.borderRadius = '50%';
container.appendChild(box);

anime({
  targets: box,
  translateX: 250,
  scale: 2,
  rotate: '1turn',
  duration: 2000,
  loop: true,
  direction: 'alternate',
  easing: 'easeInOutSine'
});
\`\`\`
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

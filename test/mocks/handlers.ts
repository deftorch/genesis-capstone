import { http, HttpResponse } from 'msw';

export const handlers = [
  // Intercept Google Gemini API calls
  http.post('https://generativelanguage.googleapis.com/v1beta/models/*', async ({ request }) => {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    
    if (!key) {
      return new HttpResponse(
        JSON.stringify({ error: { message: 'API key not configured', status: 'INVALID_ARGUMENT' } }),
        { status: 400 }
      );
    }

    if (key === 'invalid-key') {
      return new HttpResponse(
        JSON.stringify({ error: { message: 'API key not valid', status: 'UNAUTHENTICATED' } }),
        { status: 401 }
      );
    }

    if (key === 'exhausted-key') {
      return new HttpResponse(
        JSON.stringify({ error: { message: 'Resource has been exhausted', status: 'RESOURCE_EXHAUSTED' } }),
        { status: 429 }
      );
    }

    // Mock successful response
    return HttpResponse.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'Here is some generated content.\n\n```javascript\n// renderer: p5\nfunction setup() {\n  createCanvas(400, 400);\n}\n```'
              }
            ],
            role: 'model'
          },
          finishReason: 'STOP'
        }
      ],
      usageMetadata: {
        promptTokenCount: 15,
        candidatesTokenCount: 20,
        totalTokenCount: 35
      }
    });
  }),

  // Intercept local /api/chat requests (for store-api integration tests)
  http.post('*/api/chat', async ({ request }) => {
    const body: any = await request.json();
    const streamContent = 'data: ' + JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'Mocked assistant response with code block:\n\n```javascript\n// renderer: d3\nconst a = 1;\n```'
              }
            ],
            role: 'model'
          }
        }
      ]
    }) + '\n\n';
    
    return new HttpResponse(streamContent, {
      headers: {
        'Content-Type': 'text/event-stream'
      }
    });
  }),

  // Intercept upload-image requests
  http.post('*/api/upload-image', async () => {
    return HttpResponse.json({
      url: '/uploads/mock-image.png',
      name: 'mock-image.png',
      size: 1024,
      type: 'image/png'
    });
  }),

  // Intercept cleanup-images requests
  http.get('*/api/cleanup-images', ({ request }) => {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token || token !== 'test-token') {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      success: true,
      deletedCount: 5
    });
  })
];

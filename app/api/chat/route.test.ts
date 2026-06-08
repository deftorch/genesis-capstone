import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';

describe('/api/chat API Route', () => {
  it('should return 400 when no messages are provided', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemini-3-flash' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid request payload');
  });

  it('should return 400 when messages array has more than 100 items', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'gemini-3-flash',
        messages: Array(101).fill({ role: 'user', content: 'test' })
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid request payload');
  });

  it('should return 400 when message content exceeds 50000 characters', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'gemini-3-flash',
        messages: [{ role: 'user', content: 'a'.repeat(50001) }]
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid request payload');
  });

  it('should return 400 when the last message is empty', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3-flash',
        messages: [{ role: 'user', content: '   ' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Empty message content');
  });

  it('should return mock AI response successfully for valid messages payload', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3-flash',
        messages: [{ role: 'user', content: 'Generate a basic p5 drawing' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.candidates[0].content.role).toBe('model');
    expect(data.candidates[0].content.parts[0].text).toContain('// renderer: p5');
  });

  it('should handle daily usage limit quota exhaustion gracefully (status 429)', async () => {
    // Override MSW handler for this test only to simulate exhausted key status
    server.use(
      http.post('https://generativelanguage.googleapis.com/v1beta/models/*', () => {
        return new HttpResponse(
          JSON.stringify({
            error: {
              message: 'Resource has been exhausted (e.g. API key limit reached).',
              status: 'RESOURCE_EXHAUSTED',
            },
          }),
          { status: 429 }
        );
      })
    );

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3-flash',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('usage limit has been reached');
  });
});

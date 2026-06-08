import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callGeminiWithRotation, streamGeminiWithRotation } from './gemini-client';
import * as constants from '@/config/constants';

// Mock getGeminiApiKeys
vi.mock('@/config/constants', () => ({
  getGeminiApiKeys: vi.fn(),
}));

describe('Gemini Client', () => {
  let fetchMock: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup fetch mock
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    
    // Suppress console.log and console.error during tests to keep output clean
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('callGeminiWithRotation', () => {
    it('should throw if no API keys configured', async () => {
      vi.mocked(constants.getGeminiApiKeys).mockReturnValue([]);

      await expect(callGeminiWithRotation('model-id', {}))
        .rejects
        .toThrow('Gemini API key not configured');
    });

    it('should succeed with first key', async () => {
      vi.mocked(constants.getGeminiApiKeys).mockReturnValue(['key-1', 'key-2']);
      
      const mockResponse = { candidates: [{ content: 'success' }] };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await callGeminiWithRotation('model-id', { prompt: 'hello' });
      
      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toContain('key=key-1');
    });

    it('should rotate to second key if first fails', async () => {
      vi.mocked(constants.getGeminiApiKeys).mockReturnValue(['key-1', 'key-2']);
      
      const mockResponse = { candidates: [{ content: 'success from key 2' }] };
      
      // First key fails with 500
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });
      
      // Second key succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await callGeminiWithRotation('model-id', { prompt: 'hello' });
      
      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toContain('key=key-1');
      expect(fetchMock.mock.calls[1][0]).toContain('key=key-2');
    });

    it('should throw quota error if all keys exhausted', async () => {
      vi.mocked(constants.getGeminiApiKeys).mockReturnValue(['key-1', 'key-2']);
      
      // Both fail with quota error
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Quota exceeded for this key',
      });

      try {
        await callGeminiWithRotation('model-id', { prompt: 'hello' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Your daily usage limit has been reached');
        expect(error.status).toBe(429);
        expect(error.details).toContain('Quota exceeded');
      }
      
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw standard error for non-quota failures', async () => {
      vi.mocked(constants.getGeminiApiKeys).mockReturnValue(['key-1']);
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request: Unknown model',
      });

      try {
        await callGeminiWithRotation('model-id', { prompt: 'hello' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Gemini API error (400)');
        expect(error.status).toBe(400);
        expect(error.details).toContain('Bad Request');
      }
      
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('streamGeminiWithRotation', () => {
    it('should succeed with first key for streaming', async () => {
      vi.mocked(constants.getGeminiApiKeys).mockReturnValue(['key-1', 'key-2']);
      
      const mockStreamResponse = {
        ok: true,
        body: 'mock-stream',
      };
      
      fetchMock.mockResolvedValueOnce(mockStreamResponse);

      const result = await streamGeminiWithRotation('model-id', { prompt: 'hello' });
      
      expect(result).toEqual(mockStreamResponse);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toContain('alt=sse&key=key-1');
    });

    it('should rotate to second key if first stream request fails', async () => {
      vi.mocked(constants.getGeminiApiKeys).mockReturnValue(['key-1', 'key-2']);
      
      const mockStreamResponse = {
        ok: true,
        body: 'mock-stream',
      };
      
      // First key fails
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      });
      
      // Second key succeeds
      fetchMock.mockResolvedValueOnce(mockStreamResponse);

      const result = await streamGeminiWithRotation('model-id', { prompt: 'hello' });
      
      expect(result).toEqual(mockStreamResponse);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toContain('key=key-1');
      expect(fetchMock.mock.calls[1][0]).toContain('key=key-2');
    });
  });
});

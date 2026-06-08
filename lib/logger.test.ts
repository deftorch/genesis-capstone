import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger.ts', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
    // Clear module cache so logger re-evaluates NODE_ENV
    vi.resetModules();
  });

  it('should log debug messages in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('./logger');

    logger.debug('test debug message', { key: 'value' });
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      '[DEBUG] test debug message',
      { key: 'value' }
    );
  });

  it('should log info messages in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('./logger');

    logger.info('test info message');
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith('[INFO] test info message', '');
  });

  it('should log warn messages in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('./logger');

    logger.warn('test warning', { detail: 'something' });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      '[WARN] test warning',
      { detail: 'something' }
    );
  });

  it('should log error messages as JSON even in development', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('./logger');

    logger.error('test error', { code: 500 });
    expect(console.error).toHaveBeenCalledTimes(1);
    // Errors are always JSON-stringified
    const loggedArg = (console.error as any).mock.calls[0][0];
    const parsed = JSON.parse(loggedArg);
    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('test error');
    expect(parsed.meta.code).toBe(500);
  });

  it('should log messages as JSON in production mode', async () => {
    process.env.NODE_ENV = 'production';
    const { logger } = await import('./logger');

    logger.info('production info', { key: 'val' });
    expect(console.log).toHaveBeenCalledTimes(1);
    const loggedArg = (console.log as any).mock.calls[0][0];
    const parsed = JSON.parse(loggedArg);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('production info');
    expect(parsed.meta.key).toBe('val');
    expect(parsed.timestamp).toBeDefined();
  });

  it('should include timestamp in all log entries', async () => {
    process.env.NODE_ENV = 'production';
    const { logger } = await import('./logger');

    logger.warn('timestamp check');
    const loggedArg = (console.warn as any).mock.calls[0][0];
    const parsed = JSON.parse(loggedArg);
    expect(parsed.timestamp).toBeDefined();
    // Should be a valid ISO string
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
  });
});

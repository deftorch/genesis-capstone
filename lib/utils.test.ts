import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatDate,
  formatMessageTimestamp,
  formatTokenCount,
  estimateCost,
  formatCurrency,
  generateId,
  truncateText,
  estimateTokenCount,
  debounce,
  throttle
} from './utils';

describe('utils.ts', () => {
  describe('cn', () => {
    it('should merge classnames successfully', () => {
      expect(cn('a', 'b')).toBe('a b');
      expect(cn('a', false && 'b')).toBe('a');
      expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Just now" for less than 60 seconds ago', () => {
      const now = new Date('2026-05-30T09:00:00.000Z');
      vi.setSystemTime(now);
      const date = new Date('2026-05-30T08:59:30.000Z');
      expect(formatDate(date)).toBe('Just now');
    });

    it('should return minutes ago for less than 60 minutes ago', () => {
      const now = new Date('2026-05-30T09:00:00.000Z');
      vi.setSystemTime(now);
      const date = new Date('2026-05-30T08:45:00.000Z');
      expect(formatDate(date)).toBe('15m ago');
    });

    it('should return hours ago for less than 24 hours ago', () => {
      const now = new Date('2026-05-30T09:00:00.000Z');
      vi.setSystemTime(now);
      const date = new Date('2026-05-29T21:00:00.000Z');
      expect(formatDate(date)).toBe('12h ago');
    });

    it('should return days ago for less than 7 days ago', () => {
      const now = new Date('2026-05-30T09:00:00.000Z');
      vi.setSystemTime(now);
      const date = new Date('2026-05-27T09:00:00.000Z');
      expect(formatDate(date)).toBe('3d ago');
    });

    it('should return date format for 7 or more days ago', () => {
      const now = new Date('2026-05-30T09:00:00.000Z');
      vi.setSystemTime(now);
      const date = new Date('2026-05-15T09:00:00.000Z');
      expect(formatDate(date)).toBe('May 15');
    });

    it('should return Invalid date for invalid inputs', () => {
      expect(formatDate('invalid')).toBe('Invalid date');
    });
  });

  describe('formatMessageTimestamp', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return time format for same day', () => {
      const now = new Date('2026-05-30T09:00:00.000Z');
      vi.setSystemTime(now);
      // Date in same local day
      const date = new Date('2026-05-30T08:30:00.000Z');
      // Format uses local time, so we just check it returns some time string containing AM/PM
      const result = formatMessageTimestamp(date);
      expect(result).toMatch(/(AM|PM)/);
    });

    it('should return month and day for same year', () => {
      const now = new Date('2026-12-30T09:00:00.000Z');
      vi.setSystemTime(now);
      const date = new Date('2026-05-30T08:30:00.000Z');
      expect(formatMessageTimestamp(date)).toBe('May 30');
    });

    it('should return MM/DD/YY for different year', () => {
      const now = new Date('2026-05-30T09:00:00.000Z');
      vi.setSystemTime(now);
      const date = new Date('2024-05-30T08:30:00.000Z');
      expect(formatMessageTimestamp(date)).toBe('05/30/24');
    });
  });

  describe('formatTokenCount', () => {
    it('should return raw number for less than 1000', () => {
      expect(formatTokenCount(950)).toBe('950');
    });

    it('should return K format for thousands', () => {
      expect(formatTokenCount(12500)).toBe('12.5K');
    });

    it('should return M format for millions', () => {
      expect(formatTokenCount(1250000)).toBe('1.25M');
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for known models', () => {
      expect(estimateCost(10000, 'gpt-4', 'input')).toBe(0.3);
      expect(estimateCost(10000, 'gemini-1.5-pro', 'input')).toBe(0.0125);
    });

    it('should return 0 for unknown models', () => {
      expect(estimateCost(10000, 'unknown-model', 'input')).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers to USD format', () => {
      expect(formatCurrency(0.3)).toBe('$0.30');
      expect(formatCurrency(1.23456)).toBe('$1.2346');
    });
  });

  describe('generateId', () => {
    it('should return a valid uuid string', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('truncateText', () => {
    it('should not truncate if length <= max', () => {
      expect(truncateText('hello', 10)).toBe('hello');
    });

    it('should truncate with ellipsis if length > max', () => {
      expect(truncateText('hello world', 5)).toBe('hello...');
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate ~4 chars per token', () => {
      expect(estimateTokenCount('abcdefgh')).toBe(2);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should delay function execution', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100);

      debounced('test');
      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(func).toHaveBeenCalledWith('test');
    });

    it('should only execute once for multiple rapid calls', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith('third');
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should execute immediately on first call', () => {
      const func = vi.fn();
      const throttled = throttle(func, 100);

      throttled('first');
      expect(func).toHaveBeenCalledWith('first');
    });

    it('should ignore subsequent calls within throttle window', () => {
      const func = vi.fn();
      const throttled = throttle(func, 100);

      throttled('first');
      throttled('second');
      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith('first');

      vi.advanceTimersByTime(100);
      throttled('third');
      expect(func).toHaveBeenCalledTimes(2);
      expect(func).toHaveBeenCalledWith('third');
    });
  });
});

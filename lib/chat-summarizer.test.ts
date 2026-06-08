import { describe, it, expect } from 'vitest';
import {
  generateMessagesSummary,
  buildContextForAPI,
  shouldUpdateSummary,
  formatContextPreview
} from './chat-summarizer';
import { Message } from '@/types';

describe('chat-summarizer.ts', () => {
  describe('generateMessagesSummary', () => {
    it('should return empty string for empty messages list', () => {
      expect(generateMessagesSummary([])).toBe('');
    });

    it('should summarize conversation by extracting short questions and answers', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'What is Next.js?', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Next.js is a React framework.', timestamp: new Date() },
        { id: '3', role: 'user', content: 'What is Vitest?', timestamp: new Date() },
        { id: '4', role: 'assistant', content: 'Vitest is a unit testing framework.', timestamp: new Date() }
      ];

      const summary = generateMessagesSummary(messages);
      expect(summary).toContain('Topics discussed: What is Next.js?; What is Vitest?');
    });

    it('should group summary by slices of 10 messages', () => {
      const messages: Message[] = Array.from({ length: 12 }, (_, i) => ({
        id: String(i + 1),
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Msg ${i + 1}`,
        timestamp: new Date()
      }));

      const summary = generateMessagesSummary(messages);
      // It should create two sections since MESSAGES_PER_SLICE is 10
      expect(summary.split('\n').length).toBe(2);
    });

    it('should truncate summary to MAX_SUMMARY_LENGTH (500) if too long', () => {
      const messages: Message[] = Array.from({ length: 6 }, (_, i) => ({
        id: String(i + 1),
        role: 'user',
        content: 'A'.repeat(100),
        timestamp: new Date()
      }));
      const summary = generateMessagesSummary(messages);
      expect(summary.length).toBeLessThanOrEqual(503); // 500 + '...'
      expect(summary.endsWith('...')).toBe(true);
    });
  });

  describe('buildContextForAPI', () => {
    it('should construct API context keeping last 5 messages by default', () => {
      const messages: Message[] = Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 1),
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Msg ${i + 1}`,
        timestamp: new Date()
      }));

      const context = buildContextForAPI(messages);
      // Should hold only the last 5 messages
      expect(context.length).toBe(5);
      expect(context[0].content).toBe('Msg 4');
    });

    it('should prepend summary as system message if provided', () => {
      const messages: Message[] = Array.from({ length: 4 }, (_, i) => ({
        id: String(i + 1),
        role: 'user',
        content: `Msg ${i + 1}`,
        timestamp: new Date()
      }));
      const summary = 'Previous chats summary content';
      
      const context = buildContextForAPI(messages, summary, 2);
      expect(context.length).toBe(2);
      expect(context[0].role).toBe('system');
      expect(context[0].content).toContain(summary);
      expect(context[1].content).toBe('Msg 4');
    });

    it('should truncate very long messages to 1000 characters', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'B'.repeat(1500), timestamp: new Date() }
      ];
      const context = buildContextForAPI(messages);
      expect(context[0].content.length).toBe(1003); // 1000 + '...'
      expect(context[0].content.endsWith('...')).toBe(true);
    });
  });

  describe('shouldUpdateSummary', () => {
    it('should return true when no previous summary exists and messages reach 10', () => {
      expect(shouldUpdateSummary(9)).toBe(false);
      expect(shouldUpdateSummary(10)).toBe(true);
    });

    it('should return true when new messages count reaches 10 since last summary', () => {
      // lastSummarizedIndex is 9 (10 messages summarized)
      // total messages count is 19 -> 19 - 9 - 1 = 9 new messages -> false
      expect(shouldUpdateSummary(19, 9)).toBe(false);
      // total messages count is 20 -> 20 - 9 - 1 = 10 new messages -> true
      expect(shouldUpdateSummary(20, 9)).toBe(true);
    });
  });

  describe('formatContextPreview', () => {
    it('should generate human readable preview format for debugging', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Hello AI', timestamp: new Date() }
      ];
      const preview = formatContextPreview(messages, 'Summary text');
      expect(preview).toContain('📋 Summary: Summary text');
      expect(preview).toContain('💬 Recent messages (1):');
      expect(preview).toContain('👤 Hello AI...');
    });
  });
});

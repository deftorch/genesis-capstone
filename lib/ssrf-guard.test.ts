import { describe, it, expect } from 'vitest';
import { isPrivateIp, isSafeUrl } from './ssrf-guard';

describe('SSRF Guard', () => {
  describe('isPrivateIp', () => {
    it('should detect loopback addresses', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.255.255.255')).toBe(true);
      expect(isPrivateIp('::1')).toBe(true);
    });

    it('should detect private network addresses', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
    });

    it('should detect link-local addresses', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
    });

    it('should allow public addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('104.244.42.1')).toBe(false);
    });
  });

  describe('isSafeUrl', () => {
    it('should block unsafe protocols', async () => {
      await expect(isSafeUrl('ftp://example.com')).resolves.toBe(false);
      await expect(isSafeUrl('file:///etc/passwd')).resolves.toBe(false);
      await expect(isSafeUrl('gopher://example.com')).resolves.toBe(false);
    });

    it('should allow safe public HTTP/HTTPS URLs', async () => {
      await expect(isSafeUrl('https://thumbsnap.com/i/abc.jpg')).resolves.toBe(true);
      await expect(isSafeUrl('http://example.com')).resolves.toBe(true);
    });
  });
});

import { LRUCache } from 'lru-cache';

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export function rateLimit(options?: Options) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options?.uniqueTokenPerInterval ?? 500,
    ttl: options?.interval ?? 60_000,
  });

  return {
    check: (limit: number, token: string) => {
      const tokenCount = tokenCache.get(token) ?? [0];
      const currentUsage = tokenCount[0];

      if (currentUsage >= limit) {
        throw new Error('Rate limit exceeded');
      }

      tokenCache.set(token, [currentUsage + 1]);
    },
  };
}

export const chatRateLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
});

export const uploadRateLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
});

export const analysisRateLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
});

import { config } from './config.js';

/** Token bucket por socket: frena floods sin castigar rafagas legitimas. */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; last: number }>();

  allow(key: string, cost = 1): boolean {
    const now = Date.now();
    const b = this.buckets.get(key) ?? { tokens: config.rateLimit.capacity, last: now };
    const elapsed = (now - b.last) / 1000;
    b.tokens = Math.min(
      config.rateLimit.capacity,
      b.tokens + elapsed * config.rateLimit.refillPerSec,
    );
    b.last = now;
    if (b.tokens < cost) {
      this.buckets.set(key, b);
      return false;
    }
    b.tokens -= cost;
    this.buckets.set(key, b);
    return true;
  }

  forget(key: string) {
    this.buckets.delete(key);
  }
}

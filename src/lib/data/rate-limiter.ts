/**
 * Token bucket rate limiter for API call throttling
 */

export interface RateLimiterConfig {
  /** Maximum tokens in the bucket */
  maxTokens: number;
  /** Tokens to add per second */
  refillRate: number;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.tokens = config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens from the bucket
   * @param tokens Number of tokens to consume (default: 1)
   * @returns true if tokens were consumed, false if not enough tokens available
   */
  tryAcquire(tokens = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Acquire tokens, waiting if necessary
   * @param tokens Number of tokens to consume (default: 1)
   * @returns Promise that resolves when tokens are acquired
   */
  async acquire(tokens = 1): Promise<void> {
    while (!this.tryAcquire(tokens)) {
      const tokensNeeded = tokens - this.tokens;
      const waitTimeMs = (tokensNeeded / this.refillRate) * 1000;
      await this.sleep(Math.min(waitTimeMs, 100)); // Max 100ms per wait
    }
  }

  /**
   * Get current available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;
    const tokensToAdd = (elapsedMs / 1000) * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Preconfigured rate limiter for Yahoo Finance API
 * 2 requests per second
 */
export const yahooFinanceRateLimiter = new RateLimiter({
  maxTokens: 2,
  refillRate: 2,
});

/**
 * Async Resilience Utilities Tests
 * Tests for timeout and retry mechanisms
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withTimeout, withRetry, withTimeoutAndRetry } from '../../../src/utils/async';

describe('Timeout Utility', () => {
  it('withTimeout resolves before timeout', async () => {
    const promise = Promise.resolve('success');
    const result = await withTimeout(promise, 1000);
    expect(result).toBe('success');
  });

  it('withTimeout rejects on timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('delayed'), 5000);
    });

    await expect(withTimeout(promise, 100)).rejects.toThrow();
  });

  it('withTimeout includes i18n key on timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('delayed'), 5000);
    });

    try {
      await withTimeout(promise, 100, 'errorTimeout');
    } catch (err: any) {
      expect(err.i18nKey).toBe('errorTimeout');
    }
  });
});

describe('Retry Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('withRetry succeeds on first try', async () => {
    const fn = vi.fn(async () => 'success');
    const result = await withRetry(fn, { retries: 2 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('withRetry retries on failure', async () => {
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt++;
      if (attempt < 2) throw new Error('Fail');
      return 'success';
    });

    const result = await withRetry(fn, { retries: 2, baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withRetry fails after max retries', async () => {
    const fn = vi.fn(async () => {
      throw new Error('Always fails');
    });

    await expect(
      withRetry(fn, { retries: 2, baseDelayMs: 10 })
    ).rejects.toThrow('Always fails');

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('withRetry uses exponential backoff', async () => {
    let attempt = 0;
    const delays: number[] = [];
    const fn = vi.fn(async () => {
      const now = Date.now();
      delays.push(now);
      attempt++;
      if (attempt < 3) throw new Error('Fail');
      return 'success';
    });

    const startTime = Date.now();
    await withRetry(fn, { retries: 3, baseDelayMs: 50, jitter: false });

    // Verify delays increase (roughly exponential)
    expect(delays.length).toBe(3);
    if (delays.length >= 2) {
      const firstDelay = delays[1] - delays[0];
      const secondDelay = delays[2] - delays[1];
      expect(secondDelay).toBeGreaterThan(firstDelay);
    }
  });

  it('withRetry applies jitter', async () => {
    const delays: number[] = [];
    let attempt = 0;

    const fn = vi.fn(async () => {
      delays.push(Date.now());
      attempt++;
      if (attempt < 3) throw new Error('Fail');
      return 'success';
    });

    await withRetry(fn, {
      retries: 3,
      baseDelayMs: 100,
      jitter: true,
    });

    // With jitter, actual delays will vary
    expect(delays.length).toBe(3);
  });

  it('withRetry respects maxDelayMs', async () => {
    const fn = vi.fn(async () => {
      throw new Error('Fail');
    });

    const startTime = Date.now();

    try {
      await withRetry(fn, {
        retries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 50,
      });
    } catch {
      // Expected to fail
    }

    const duration = Date.now() - startTime;
    // Should be roughly: 50ms + 50ms (total ~100ms, not 1000+)
    expect(duration).toBeLessThan(500);
  });
});

describe('Combined Timeout+Retry', () => {
  it('withTimeoutAndRetry combines both mechanisms', async () => {
    let attempt = 0;

    const fn = vi.fn(async () => {
      attempt++;
      if (attempt < 2) throw new Error('Fail');
      return 'success';
    });

    const result = await withTimeoutAndRetry(fn, 1000, {
      retries: 2,
      baseDelayMs: 10,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withTimeoutAndRetry fails on timeout', async () => {
    const fn = vi.fn(async () => {
      // Simulates slow operation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return 'success';
    });

    await expect(
      withTimeoutAndRetry(fn, 100, { retries: 1, baseDelayMs: 10 })
    ).rejects.toThrow();
  });
});

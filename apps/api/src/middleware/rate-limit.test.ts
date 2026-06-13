import { describe, expect, it, vi, afterEach } from 'vitest';
import { rateLimit } from './rate-limit.js';
import { HttpError } from '../lib/http.js';

function fakeContext() {
  const headers: Record<string, string> = {};
  return {
    header: (k: string, v: string) => {
      headers[k] = v;
    },
    headers,
  } as never;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimit', () => {
  it('上限以内は通過し、超過で 429 を投げる', async () => {
    const mw = rateLimit({ max: 2, windowMs: 60_000, keyFn: () => 'k1' });
    const next = vi.fn(async () => {});
    const c = fakeContext();
    await mw(c, next);
    await mw(c, next);
    expect(next).toHaveBeenCalledTimes(2);
    await expect(mw(c, next)).rejects.toSatisfy(
      (e: unknown) => e instanceof HttpError && e.status === 429,
    );
  });

  it('ウィンドウ経過後はリセットされる', async () => {
    vi.useFakeTimers();
    const mw = rateLimit({ max: 1, windowMs: 1000, keyFn: () => 'k2' });
    const next = vi.fn(async () => {});
    const c = fakeContext();
    await mw(c, next);
    await expect(mw(c, next)).rejects.toBeInstanceOf(HttpError);
    vi.advanceTimersByTime(1001);
    await mw(c, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('キーごとに独立してカウントする', async () => {
    let key = 'a';
    const mw = rateLimit({ max: 1, windowMs: 60_000, keyFn: () => key });
    const next = vi.fn(async () => {});
    const c = fakeContext();
    await mw(c, next);
    key = 'b';
    await mw(c, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('429 時に Retry-After ヘッダを返す', async () => {
    const mw = rateLimit({ max: 1, windowMs: 60_000, keyFn: () => 'k3' });
    const next = vi.fn(async () => {});
    const c = fakeContext();
    await mw(c, next);
    await expect(mw(c, next)).rejects.toBeInstanceOf(HttpError);
    expect((c as { headers: Record<string, string> }).headers['Retry-After']).toBeDefined();
  });
});

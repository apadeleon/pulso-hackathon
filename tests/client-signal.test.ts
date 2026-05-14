import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FSClient } from '../packages/core/src/client.js';

const BASE_URL = process.env.FS_TEST_URL || 'http://localhost:8000';

function makeClient() {
  return new FSClient({ baseUrl: BASE_URL });
}

function mockFetchSuccess() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: {} }),
  });
}

describe('FSClient signal forwarding', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('get() forwards signal to fetch()', async () => {
    mockFetchSuccess();
    const client = makeClient();
    const controller = new AbortController();

    await client.get('/api/test', undefined, controller.signal);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].signal).toBe(controller.signal);
  });

  it('post() forwards signal to fetch()', async () => {
    mockFetchSuccess();
    const client = makeClient();
    client.setToken('test-token');
    const controller = new AbortController();

    await client.post('/api/test', { foo: 'bar' }, undefined, controller.signal);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].signal).toBe(controller.signal);
  });

  it('guest mode allows payout preview POST requests', async () => {
    mockFetchSuccess();
    const client = makeClient();

    await client.post('/api/views/preview/payout/42', { collateral: 10 });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].headers['Username']).toBe('guest');
  });

  it('get() without signal still constructs URL and params correctly', async () => {
    mockFetchSuccess();
    const client = makeClient();

    await client.get('/api/markets', { id: '15' });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = callArgs[0] as string;
    expect(url).toContain('/api/markets');
    expect(url).toContain('id=15');
    expect(callArgs[1].method).toBe('GET');
    expect(callArgs[1].headers['Username']).toBe('guest');
  });

  it('AbortSignal cancellation rejects with AbortError', async () => {
    const controller = new AbortController();
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
          return;
        }
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    const client = makeClient();
    const promise = client.get('/api/test', undefined, controller.signal);

    // Use a microtask delay to ensure fetch has been called before aborting
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();

    await expect(promise).rejects.toThrow('The operation was aborted.');
  });
});

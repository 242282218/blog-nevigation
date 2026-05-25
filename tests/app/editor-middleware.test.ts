import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config, middleware } from '@/middleware';
import {
  EDITOR_SESSION_COOKIE,
  SESSION_NAMESPACE,
} from '@/lib/editor-auth';
import { restoreEnv } from '../helpers/api-route';

const ORIGINAL_ENV = {
  EDITOR_AUTH_INTERNAL_ORIGIN: process.env.EDITOR_AUTH_INTERNAL_ORIGIN,
  EDITOR_ACCESS_TOKEN: process.env.EDITOR_ACCESS_TOKEN,
  NODE_ENV: process.env.NODE_ENV,
};

function resetEnv(): void {
  restoreEnv(ORIGINAL_ENV);
}

async function createLegacyEditorSessionValue(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${SESSION_NAMESPACE}:${secret.trim()}`)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function createEditorRequest(path: string, secret?: string): Promise<NextRequest> {
  const headers = new Headers();

  if (secret) {
    headers.set('Cookie', `${EDITOR_SESSION_COOKIE}=${await createLegacyEditorSessionValue(secret)}`);
  }

  return new NextRequest(`http://localhost${path}`, {
    headers,
  });
}

afterEach(() => {
  resetEnv();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('editor middleware', () => {
  it('is scoped to editor routes only', () => {
    expect(config.matcher).toEqual(['/editor/:path*']);
  });

  it('allows the editor login page without a session', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'editor-secret';

    const response = await middleware(await createEditorRequest('/editor/login'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects unauthenticated editor requests to login with a safe next path', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'editor-secret';

    const response = await middleware(await createEditorRequest('/editor/settings?tab=r2'));
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toBe('http://localhost/editor/login?next=%2Feditor%2Fsettings%3Ftab%3Dr2');
  });

  it('allows editor requests when the internal auth status accepts the session', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'editor-secret';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await middleware(await createEditorRequest('/editor/navigation', 'editor-secret'));

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('/api/editor-auth', 'http://localhost'),
      expect.objectContaining({
        headers: {
          Cookie: expect.stringContaining(`${EDITOR_SESSION_COOKIE}=`),
        },
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('rejects legacy deterministic editor cookies when the auth status does not accept them', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'editor-secret';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: false }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await middleware(await createEditorRequest('/editor/navigation', 'editor-secret'));

    expect(fetchMock).toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/editor/login?next=%2Feditor%2Fnavigation');
  });

  it('does not trust the request host for runtime auth checks in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.EDITOR_ACCESS_TOKEN;
    delete process.env.EDITOR_AUTH_INTERNAL_ORIGIN;
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    const response = await middleware(
      new NextRequest('https://attacker.example/editor/navigation', {
        headers: {
          Cookie: `${EDITOR_SESSION_COOKIE}=runtime-session`,
        },
      })
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://attacker.example/editor/login?next=%2Feditor%2Fnavigation');
  });

  it('uses the configured internal origin for runtime auth checks', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.EDITOR_AUTH_INTERNAL_ORIGIN = 'http://127.0.0.1:3000';
    delete process.env.EDITOR_ACCESS_TOKEN;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await middleware(
      new NextRequest('https://public.example/editor/navigation', {
        headers: {
          Cookie: `${EDITOR_SESSION_COOKIE}=runtime-session`,
        },
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('/api/editor-auth', 'http://127.0.0.1:3000'),
      expect.objectContaining({
        headers: {
          Cookie: `${EDITOR_SESSION_COOKIE}=runtime-session`,
        },
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('aborts stalled runtime auth checks and redirects to login', async () => {
    vi.useFakeTimers();
    vi.stubEnv('NODE_ENV', 'production');
    process.env.EDITOR_AUTH_INTERNAL_ORIGIN = 'http://127.0.0.1:3000';
    delete process.env.EDITOR_ACCESS_TOKEN;
    const fetchMock = vi.fn((url: URL | RequestInfo, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const responsePromise = middleware(
      new NextRequest('https://public.example/editor/settings', {
        headers: {
          Cookie: `${EDITOR_SESSION_COOKIE}=runtime-session`,
        },
      })
    );

    await vi.advanceTimersByTimeAsync(1500);
    const response = await responsePromise;

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('/api/editor-auth', 'http://127.0.0.1:3000'),
      expect.objectContaining({
        headers: {
          Cookie: `${EDITOR_SESSION_COOKIE}=runtime-session`,
        },
        signal: expect.any(AbortSignal),
      })
    );
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.signal?.aborted).toBe(true);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://public.example/editor/login?next=%2Feditor%2Fsettings');
  });
});

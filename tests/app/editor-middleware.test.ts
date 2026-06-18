import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config, middleware } from '@/middleware';
import { EDITOR_SESSION_COOKIE } from '@/lib/editor-auth';

const ORIGINAL_ENV = {
  TRUSTED_PROXY_IPS: process.env.TRUSTED_PROXY_IPS,
};

function restoreEnv(): void {
  if (ORIGINAL_ENV.TRUSTED_PROXY_IPS === undefined) {
    delete process.env.TRUSTED_PROXY_IPS;
  } else {
    process.env.TRUSTED_PROXY_IPS = ORIGINAL_ENV.TRUSTED_PROXY_IPS;
  }
}

function createEditorRequest(path: string, session?: string, headersInit?: HeadersInit): NextRequest {
  const headers = new Headers(headersInit);

  if (session) {
    headers.set('Cookie', `${EDITOR_SESSION_COOKIE}=${session}`);
  }

  return new NextRequest(`http://localhost${path}`, {
    headers,
  });
}

afterEach(() => {
  restoreEnv();
  vi.unstubAllGlobals();
});

describe('editor middleware', () => {
  it('applies to document routes while excluding API and static assets', () => {
    expect(config.matcher).toEqual([
      expect.objectContaining({
        source: expect.stringContaining('api'),
      }),
    ]);
  });

  it('allows the editor login page without a session', () => {
    const response = middleware(createEditorRequest('/editor/login'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'self' 'nonce-");
  });

  it('redirects unauthenticated editor requests to login with a safe next path', () => {
    const response = middleware(createEditorRequest('/editor/settings?tab=r2'));
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toBe('http://localhost/editor/login?next=%2Feditor%2Fsettings%3Ftab%3Dr2');
    expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'self' 'nonce-");
  });

  it('redirects unauthenticated editor requests to the public host header', () => {
    const response = middleware(createEditorRequest(
      '/editor/settings?tab=r2',
      undefined,
      { Host: 'public.example.com' }
    ));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://public.example.com/editor/login?next=%2Feditor%2Fsettings%3Ftab%3Dr2'
    );
  });

  it('redirects unauthenticated editor requests to trusted forwarded host and proto', () => {
    process.env.TRUSTED_PROXY_IPS = '203.0.113.1';

    const response = middleware(createEditorRequest(
      '/editor/settings?tab=r2',
      undefined,
      {
        Host: 'localhost:3000',
        'X-Forwarded-Host': 'public.example.com',
        'X-Forwarded-Proto': 'https',
      }
    ));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://public.example.com/editor/login?next=%2Feditor%2Fsettings%3Ftab%3Dr2'
    );
  });

  it('allows editor requests with a session cookie without internal HTTP calls', () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    const response = middleware(createEditorRequest('/editor/navigation', 'opaque-session'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'self' 'nonce-");
  });

  it('redirects editor requests with an empty session cookie to login', () => {
    const response = middleware(createEditorRequest('/editor/blog', ''));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');

    expect(location).toContain('/editor/login');
  });

  it('allows editor requests with any non-empty session cookie (validation deferred to API routes)', () => {
    const response = middleware(createEditorRequest('/editor/blog', 'tampered-value'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('uses a static-compatible CSP for non-editor document routes', () => {
    const response = middleware(createEditorRequest('/blog'));
    const csp = response.headers.get('Content-Security-Policy');

    expect(response.status).toBe(200);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain('https://static.cloudflareinsights.com');
    expect(csp).not.toContain('nonce-');
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('keeps setup on nonce CSP because it is a configuration page', () => {
    const response = middleware(createEditorRequest('/setup'));
    const csp = response.headers.get('Content-Security-Policy');

    expect(response.status).toBe(200);
    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).not.toContain("'unsafe-inline' https://static.cloudflareinsights.com");
  });
});

import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config, middleware } from '@/middleware';
import { EDITOR_SESSION_COOKIE } from '@/lib/editor-auth';

function createEditorRequest(path: string, session?: string): NextRequest {
  const headers = new Headers();

  if (session) {
    headers.set('Cookie', `${EDITOR_SESSION_COOKIE}=${session}`);
  }

  return new NextRequest(`http://localhost${path}`, {
    headers,
  });
}

afterEach(() => {
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
    expect(response.headers.get('Content-Security-Policy')).toContain("'strict-dynamic'");
  });

  it('redirects unauthenticated editor requests to login with a safe next path', () => {
    const response = middleware(createEditorRequest('/editor/settings?tab=r2'));
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toBe('http://localhost/editor/login?next=%2Feditor%2Fsettings%3Ftab%3Dr2');
    expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'self' 'nonce-");
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

  it('attaches CSP nonce headers to non-editor document routes', () => {
    const response = middleware(createEditorRequest('/blog'));
    const csp = response.headers.get('Content-Security-Policy');

    expect(response.status).toBe(200);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });
});

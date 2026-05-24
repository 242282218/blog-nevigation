import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DELETE,
  POST,
} from '@/app/api/editor-auth/route';
import { ensureEditorSession } from '@/lib/editor-api-auth';
import {
  EDITOR_SESSION_COOKIE,
  createEditorSessionValue,
  getSafeEditorNextPath,
} from '@/lib/editor-auth';
import { restoreEnv } from '../helpers/api-route';

const ORIGINAL_ENV = {
  EDITOR_ACCESS_TOKEN: process.env.EDITOR_ACCESS_TOKEN,
};

function resetEnv(): void {
  restoreEnv(ORIGINAL_ENV);
}

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/editor-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function createSessionRequest(secret: string): Promise<NextRequest> {
  const session = await createEditorSessionValue(secret);

  return new NextRequest('http://localhost/api/data/articles', {
    headers: {
      Cookie: `${EDITOR_SESSION_COOKIE}=${session}`,
    },
  });
}

afterEach(() => {
  resetEnv();
});

describe('editor auth API', () => {
  it('rejects login when the editor token is not configured', async () => {
    delete process.env.EDITOR_ACCESS_TOKEN;

    const response = await POST(createJsonRequest({ secret: 'anything' }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('EDITOR_ACCESS_TOKEN'),
      })
    );
  });

  it('rejects malformed and wrong login secrets without setting a session cookie', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'correct-secret';

    const malformedResponse = await POST(
      new NextRequest('http://localhost/api/editor-auth', {
        method: 'POST',
        body: '{',
      })
    );
    const wrongSecretResponse = await POST(createJsonRequest({ secret: 'wrong-secret' }));

    expect(malformedResponse.status).toBe(401);
    expect(malformedResponse.headers.get('set-cookie')).toBeNull();
    expect(wrongSecretResponse.status).toBe(401);
    expect(wrongSecretResponse.headers.get('set-cookie')).toBeNull();
  });

  it('sets an http-only editor session cookie for a valid login', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'correct-secret';

    const response = await POST(createJsonRequest({ secret: 'correct-secret' }));
    const setCookie = response.headers.get('set-cookie');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(setCookie).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=lax');
    expect(setCookie).toContain('Max-Age=28800');
  });

  it('clears the editor session cookie on logout', async () => {
    const response = await DELETE();
    const setCookie = response.headers.get('set-cookie');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(setCookie).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(setCookie).toContain('Max-Age=0');
  });
});

describe('editor API session guard', () => {
  it('returns a service error when editor auth is not configured', async () => {
    delete process.env.EDITOR_ACCESS_TOKEN;

    const response = await ensureEditorSession(new NextRequest('http://localhost/api/data/articles'));

    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('EDITOR_ACCESS_TOKEN'),
      })
    );
  });

  it('rejects missing or stale sessions and accepts the current session', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'current-secret';

    const missingSessionResponse = await ensureEditorSession(
      new NextRequest('http://localhost/api/data/articles')
    );
    const staleSessionResponse = await ensureEditorSession(
      await createSessionRequest('old-secret')
    );
    const currentSessionResponse = await ensureEditorSession(
      await createSessionRequest('current-secret')
    );

    expect(missingSessionResponse?.status).toBe(401);
    expect(staleSessionResponse?.status).toBe(401);
    expect(currentSessionResponse).toBeNull();
  });
});

describe('safe editor next path', () => {
  it('keeps editor-local paths and rejects external destinations', () => {
    expect(getSafeEditorNextPath('/editor/settings?tab=r2')).toBe('/editor/settings?tab=r2');
    expect(getSafeEditorNextPath('/navigation')).toBe('/editor');
    expect(getSafeEditorNextPath('https://example.com/editor')).toBe('/editor');
    expect(getSafeEditorNextPath('//example.com/editor')).toBe('/editor');
  });
});

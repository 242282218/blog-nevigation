import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DELETE,
  GET,
  POST,
  PUT,
} from '@/app/api/editor-auth/route';
import { ensureEditorSession } from '@/lib/editor-api-auth';
import {
  EDITOR_SESSION_COOKIE,
  createEditorSessionValue,
  getSafeEditorNextPath,
} from '@/lib/editor-auth';
import {
  cleanupTempDirectories,
  createTempDirectory,
  restoreEnv,
} from '../helpers/api-route';

const ORIGINAL_ENV = {
  BLOG_DATA_ROOT: process.env.BLOG_DATA_ROOT,
  EDITOR_AUTH_CONFIG_FILE: process.env.EDITOR_AUTH_CONFIG_FILE,
  EDITOR_ALLOW_RUNTIME_AUTH_SETUP: process.env.EDITOR_ALLOW_RUNTIME_AUTH_SETUP,
  EDITOR_RUNTIME_AUTH_SETUP_TOKEN: process.env.EDITOR_RUNTIME_AUTH_SETUP_TOKEN,
  EDITOR_ACCESS_TOKEN: process.env.EDITOR_ACCESS_TOKEN,
};
const TEMP_DIRECTORIES: string[] = [];

function resetEnv(): void {
  restoreEnv(ORIGINAL_ENV);
}

function createTempDirectoryWithCleanup(prefix: string): string {
  const directory = createTempDirectory(prefix);

  TEMP_DIRECTORIES.push(directory);
  return directory;
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
  cleanupTempDirectories(TEMP_DIRECTORIES);
});

describe('editor auth API', () => {
  it('rejects login when the editor token is not initialized', async () => {
    delete process.env.EDITOR_ACCESS_TOKEN;
    process.env.EDITOR_AUTH_CONFIG_FILE = path.join(
      createTempDirectoryWithCleanup('editor-auth-empty-'),
      'editor-auth.json'
    );

    const response = await POST(createJsonRequest({ secret: 'anything' }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('未初始化编辑口令'),
      })
    );
  });

  it('initializes the editor token once from the login page and stores no plaintext secret', async () => {
    delete process.env.EDITOR_ACCESS_TOKEN;
    const directory = createTempDirectoryWithCleanup('editor-auth-setup-');
    const configFilePath = path.join(directory, 'editor-auth.json');

    process.env.EDITOR_AUTH_CONFIG_FILE = configFilePath;
    process.env.EDITOR_RUNTIME_AUTH_SETUP_TOKEN = 'setup-token';

    const setupResponse = await PUT(createJsonRequest({
      secret: 'new-secret',
      confirmSecret: 'new-secret',
      setupToken: 'setup-token',
    }));
    const setupCookie = setupResponse.headers.get('set-cookie');
    const configText = fs.readFileSync(configFilePath, 'utf8');
    const setupSession = setupCookie?.match(new RegExp(`${EDITOR_SESSION_COOKIE}=([^;]+)`))?.[1] ?? '';

    expect(setupResponse.status).toBe(200);
    expect(await setupResponse.json()).toEqual({ success: true });
    expect(setupCookie).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(configText).not.toContain('new-secret');
    expect(configText).not.toContain(setupSession);

    const sessionResponse = await GET(
      new NextRequest('http://localhost/api/editor-auth', {
        headers: {
          Cookie: setupCookie?.split(';')[0] ?? '',
        },
      })
    );

    expect(await sessionResponse.json()).toEqual({
      configured: true,
      authenticated: true,
      setupEnabled: true,
      setupTokenRequired: true,
    });

    const loginResponse = await POST(createJsonRequest({ secret: 'new-secret' }));
    const loginCookie = loginResponse.headers.get('set-cookie') ?? '';

    expect(loginResponse.status).toBe(200);
    expect(loginCookie).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(fs.readFileSync(configFilePath, 'utf8')).not.toContain(
      loginCookie.match(new RegExp(`${EDITOR_SESSION_COOKIE}=([^;]+)`))?.[1] ?? ''
    );

    const staleSetupSessionResponse = await GET(
      new NextRequest('http://localhost/api/editor-auth', {
        headers: {
          Cookie: setupCookie?.split(';')[0] ?? '',
        },
      })
    );
    const loginSessionResponse = await GET(
      new NextRequest('http://localhost/api/editor-auth', {
        headers: {
          Cookie: loginCookie.split(';')[0],
        },
      })
    );

    expect(await staleSetupSessionResponse.json()).toEqual(
      expect.objectContaining({
        configured: true,
        authenticated: false,
      })
    );
    expect(await loginSessionResponse.json()).toEqual(
      expect.objectContaining({
        configured: true,
        authenticated: true,
      })
    );
  });

  it('keeps first-use initialization closed until a setup token or explicit flag is configured', async () => {
    delete process.env.EDITOR_ACCESS_TOKEN;
    process.env.EDITOR_AUTH_CONFIG_FILE = path.join(
      createTempDirectoryWithCleanup('editor-auth-closed-'),
      'editor-auth.json'
    );

    const response = await PUT(createJsonRequest({
      secret: 'new-secret',
      confirmSecret: 'new-secret',
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('首次初始化未启用'),
      })
    );
  });

  it('rejects first-use initialization when the setup token is wrong', async () => {
    delete process.env.EDITOR_ACCESS_TOKEN;
    process.env.EDITOR_RUNTIME_AUTH_SETUP_TOKEN = 'setup-token';
    process.env.EDITOR_AUTH_CONFIG_FILE = path.join(
      createTempDirectoryWithCleanup('editor-auth-wrong-token-'),
      'editor-auth.json'
    );

    const response = await PUT(createJsonRequest({
      secret: 'new-secret',
      confirmSecret: 'new-secret',
      setupToken: 'wrong-token',
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('初始化密钥错误'),
      })
    );
  });

  it('does not allow first-use initialization to overwrite an existing token', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'correct-secret';
    process.env.EDITOR_RUNTIME_AUTH_SETUP_TOKEN = 'setup-token';
    process.env.EDITOR_AUTH_CONFIG_FILE = path.join(
      createTempDirectoryWithCleanup('editor-auth-existing-'),
      'editor-auth.json'
    );

    const response = await PUT(createJsonRequest({
      secret: 'new-secret',
      confirmSecret: 'new-secret',
      setupToken: 'setup-token',
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('已初始化'),
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

  it('revokes the current runtime editor session on logout', async () => {
    delete process.env.EDITOR_ACCESS_TOKEN;
    const configFilePath = path.join(
      createTempDirectoryWithCleanup('editor-auth-logout-'),
      'editor-auth.json'
    );

    process.env.EDITOR_AUTH_CONFIG_FILE = configFilePath;
    process.env.EDITOR_RUNTIME_AUTH_SETUP_TOKEN = 'setup-token';

    const setupResponse = await PUT(createJsonRequest({
      secret: 'new-secret',
      confirmSecret: 'new-secret',
      setupToken: 'setup-token',
    }));
    const setupCookie = setupResponse.headers.get('set-cookie')?.split(';')[0] ?? '';

    expect((await GET(new NextRequest('http://localhost/api/editor-auth', {
      headers: { Cookie: setupCookie },
    }))).status).toBe(200);

    await DELETE();

    const sessionResponse = await GET(new NextRequest('http://localhost/api/editor-auth', {
      headers: { Cookie: setupCookie },
    }));

    expect(await sessionResponse.json()).toEqual(
      expect.objectContaining({
        configured: true,
        authenticated: false,
      })
    );
  });
});

describe('editor API session guard', () => {
  it('returns a service error when editor auth is not initialized', async () => {
    delete process.env.EDITOR_ACCESS_TOKEN;
    process.env.EDITOR_AUTH_CONFIG_FILE = path.join(
      createTempDirectoryWithCleanup('editor-api-auth-empty-'),
      'editor-auth.json'
    );

    const response = await ensureEditorSession(new NextRequest('http://localhost/api/data/articles'));

    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('未初始化编辑口令'),
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

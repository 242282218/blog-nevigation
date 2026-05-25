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
  SESSION_NAMESPACE,
  getSafeEditorNextPath,
} from '@/lib/editor-auth';
import { resetEditorAuthRateLimitForTests } from '@/lib/editor-auth-rate-limit';
import { resetEnvironmentEditorSessionForTests } from '@/lib/editor-auth-runtime';
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

async function createLegacyEditorSessionValue(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${SESSION_NAMESPACE}:${secret.trim()}`)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function resetEnv(): void {
  restoreEnv(ORIGINAL_ENV);
}

function createTempDirectoryWithCleanup(prefix: string): string {
  const directory = createTempDirectory(prefix);

  TEMP_DIRECTORIES.push(directory);
  return directory;
}

function useCorruptRuntimeAuthConfig(prefix: string): string {
  delete process.env.EDITOR_ACCESS_TOKEN;
  const directory = createTempDirectoryWithCleanup(prefix);
  const configFilePath = path.join(directory, 'editor-auth.json');

  fs.writeFileSync(configFilePath, '{', 'utf8');
  process.env.EDITOR_AUTH_CONFIG_FILE = configFilePath;

  return configFilePath;
}

function createJsonRequest(body: unknown, headersInit?: HeadersInit): NextRequest {
  const headers = new Headers(headersInit);

  headers.set('Content-Type', 'application/json');

  return new NextRequest('http://localhost/api/editor-auth', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function extractSessionCookie(response: Response): string {
  return response.headers.get('set-cookie')?.split(';')[0] ?? '';
}

function createRequestWithSession(sessionCookie: string): NextRequest {
  return new NextRequest('http://localhost/api/data/articles', {
    headers: {
      Cookie: sessionCookie,
    },
  });
}

afterEach(() => {
  resetEnv();
  resetEditorAuthRateLimitForTests();
  resetEnvironmentEditorSessionForTests();
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
    const legacySession = await createLegacyEditorSessionValue('correct-secret');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(setCookie).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=lax');
    expect(setCookie).toContain('Max-Age=28800');
    expect(setCookie).not.toContain(legacySession);
  });

  it('rotates environment-token sessions and rejects legacy deterministic sessions', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'correct-secret';
    const legacySession = await createLegacyEditorSessionValue('correct-secret');

    const firstLogin = await POST(createJsonRequest({ secret: 'correct-secret' }));
    const firstCookie = extractSessionCookie(firstLogin);
    const secondLogin = await POST(createJsonRequest({ secret: 'correct-secret' }));
    const secondCookie = extractSessionCookie(secondLogin);

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);
    expect(firstCookie).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(secondCookie).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(secondCookie).not.toBe(firstCookie);

    const staleResponse = await GET(new NextRequest('http://localhost/api/editor-auth', {
      headers: { Cookie: firstCookie },
    }));
    const currentResponse = await GET(new NextRequest('http://localhost/api/editor-auth', {
      headers: { Cookie: secondCookie },
    }));
    const legacyResponse = await GET(new NextRequest('http://localhost/api/editor-auth', {
      headers: { Cookie: `${EDITOR_SESSION_COOKIE}=${legacySession}` },
    }));

    expect(await staleResponse.json()).toEqual(expect.objectContaining({ authenticated: false }));
    expect(await currentResponse.json()).toEqual(expect.objectContaining({ authenticated: true }));
    expect(await legacyResponse.json()).toEqual(expect.objectContaining({ authenticated: false }));
  });

  it('rate limits repeated login failures', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'correct-secret';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await POST(createJsonRequest({ secret: 'wrong-secret' }));
      expect(response.status).toBe(401);
    }

    const blockedResponse = await POST(createJsonRequest({ secret: 'correct-secret' }));

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.headers.get('set-cookie')).toBeNull();
    expect(await blockedResponse.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('尝试次数过多'),
      })
    );
  });

  it('does not trust forwarded IP headers for login rate limiting', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'correct-secret';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await POST(createJsonRequest(
        { secret: 'wrong-secret' },
        { 'X-Forwarded-For': `198.51.100.${attempt + 1}` }
      ));

      expect(response.status).toBe(401);
    }

    const blockedResponse = await POST(createJsonRequest(
      { secret: 'correct-secret' },
      { 'X-Forwarded-For': '198.51.100.200' }
    ));

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.headers.get('set-cookie')).toBeNull();
  });

  it('rate limits repeated setup failures', async () => {
    delete process.env.EDITOR_ACCESS_TOKEN;
    process.env.EDITOR_RUNTIME_AUTH_SETUP_TOKEN = 'setup-token';
    process.env.EDITOR_AUTH_CONFIG_FILE = path.join(
      createTempDirectoryWithCleanup('editor-auth-setup-rate-limit-'),
      'editor-auth.json'
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await PUT(createJsonRequest({
        secret: 'new-secret',
        confirmSecret: 'new-secret',
        setupToken: 'wrong-token',
      }));
      expect(response.status).toBe(403);
    }

    const blockedResponse = await PUT(createJsonRequest({
      secret: 'new-secret',
      confirmSecret: 'new-secret',
      setupToken: 'setup-token',
    }));

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.headers.get('set-cookie')).toBeNull();
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

  it('fails fast when the runtime auth config file is corrupt', async () => {
    const configFilePath = useCorruptRuntimeAuthConfig('editor-auth-corrupt-api-');
    process.env.EDITOR_RUNTIME_AUTH_SETUP_TOKEN = 'setup-token';

    const getResponse = await GET(new NextRequest('http://localhost/api/editor-auth'));
    const postResponse = await POST(createJsonRequest({ secret: 'new-secret' }));
    const putResponse = await PUT(createJsonRequest({
      secret: 'replacement-secret',
      confirmSecret: 'replacement-secret',
      setupToken: 'setup-token',
    }));
    const deleteResponse = await DELETE();

    expect(getResponse.status).toBe(500);
    expect(postResponse.status).toBe(500);
    expect(postResponse.headers.get('set-cookie')).toBeNull();
    expect(putResponse.status).toBe(500);
    expect(putResponse.headers.get('set-cookie')).toBeNull();
    expect(deleteResponse.status).toBe(500);
    expect(deleteResponse.headers.get('set-cookie')).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(deleteResponse.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(fs.readFileSync(configFilePath, 'utf8')).toBe('{');
    expect(await getResponse.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('配置文件损坏'),
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
    const loginResponse = await POST(createJsonRequest({ secret: 'current-secret' }));
    const currentSessionCookie = extractSessionCookie(loginResponse);
    const staleSession = await createLegacyEditorSessionValue('current-secret');

    const missingSessionResponse = await ensureEditorSession(
      new NextRequest('http://localhost/api/data/articles')
    );
    const staleSessionResponse = await ensureEditorSession(
      createRequestWithSession(`${EDITOR_SESSION_COOKIE}=${staleSession}`)
    );
    const currentSessionResponse = await ensureEditorSession(
      createRequestWithSession(currentSessionCookie)
    );

    expect(missingSessionResponse?.status).toBe(401);
    expect(staleSessionResponse?.status).toBe(401);
    expect(currentSessionResponse).toBeNull();
  });

  it('locks editor data APIs when the runtime auth config file is corrupt', async () => {
    useCorruptRuntimeAuthConfig('editor-api-auth-corrupt-');

    const response = await ensureEditorSession(new NextRequest('http://localhost/api/data/articles'));

    expect(response?.status).toBe(500);
    expect(await response?.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('配置文件损坏'),
      })
    );
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

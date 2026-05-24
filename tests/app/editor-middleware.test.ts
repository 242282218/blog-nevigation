import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import { config, middleware } from '@/middleware';
import {
  EDITOR_SESSION_COOKIE,
  createEditorSessionValue,
} from '@/lib/editor-auth';
import { restoreEnv } from '../helpers/api-route';

const ORIGINAL_ENV = {
  EDITOR_ACCESS_TOKEN: process.env.EDITOR_ACCESS_TOKEN,
};

function resetEnv(): void {
  restoreEnv(ORIGINAL_ENV);
}

async function createEditorRequest(path: string, secret?: string): Promise<NextRequest> {
  const headers = new Headers();

  if (secret) {
    headers.set('Cookie', `${EDITOR_SESSION_COOKIE}=${await createEditorSessionValue(secret)}`);
  }

  return new NextRequest(`http://localhost${path}`, {
    headers,
  });
}

afterEach(() => {
  resetEnv();
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

  it('allows editor requests with the current session cookie', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'editor-secret';

    const response = await middleware(await createEditorRequest('/editor/navigation', 'editor-secret'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});

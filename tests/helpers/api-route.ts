import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { EDITOR_SESSION_COOKIE, createEditorSessionValue } from '@/lib/editor-auth';

export function createTempDirectory(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function cleanupTempDirectories(directories: string[]): void {
  while (directories.length > 0) {
    fs.rmSync(directories.pop() as string, { recursive: true, force: true });
  }
}

export function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const name of Object.keys(snapshot)) {
    const value = snapshot[name];

    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

export async function createAuthedEditorRequest(url: string, init?: RequestInit): Promise<NextRequest> {
  const token = process.env.EDITOR_ACCESS_TOKEN ?? '';
  const session = await createEditorSessionValue(token);
  const headers = new Headers(init?.headers);

  headers.set('Cookie', `${EDITOR_SESSION_COOKIE}=${session}`);

  return new NextRequest(url, {
    body: init?.body,
    method: init?.method,
    headers,
  });
}

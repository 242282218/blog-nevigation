import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditorSettingsPage from '@/app/editor/settings/page';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';

vi.mock('@/app/editor/components/LogoutButton', () => ({
  LogoutButton: () => <button type="button">logout</button>,
}));

const fetchMock = vi.fn();

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function getButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(text)
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${text}`);
  }

  return button;
}

describe('EditorSettingsPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('loads Cloudflare R2 settings and submits sanitized configuration', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          persistent: true,
          revision: 'settings-revision',
          settings: DEFAULT_SITE_SETTINGS,
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          persistent: true,
          settings: {
            enabled: true,
            accountId: 'account-id',
            bucket: 'blog-data',
            accessKeyId: 'access-key',
            hasSecretAccessKey: true,
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: false,
          },
          status: {
            enabled: true,
            configured: true,
            bucket: 'blog-data',
            prefix: 'blog-navigation',
            endpoint: 'https://account-id.r2.cloudflarestorage.com',
            snapshotOnWrite: false,
            hasAccessKeyId: true,
            hasSecretAccessKey: true,
            source: 'file',
            message: null,
          },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          settings: {
            enabled: true,
            accountId: 'next-account-id',
            bucket: 'blog-data',
            accessKeyId: 'access-key',
            hasSecretAccessKey: true,
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: false,
          },
          status: {
            enabled: true,
            configured: true,
            bucket: 'blog-data',
            prefix: 'blog-navigation',
            endpoint: 'https://next-account-id.r2.cloudflarestorage.com',
            snapshotOnWrite: false,
            hasAccessKeyId: true,
            hasSecretAccessKey: true,
            source: 'file',
            message: null,
          },
        })
      );

    await act(async () => {
      root.render(<EditorSettingsPage />);
    });
    await flushPromises();

    expect(container.textContent).toContain('Cloudflare R2');
    expect(container.textContent).toContain('配置完整');
    expect(container.textContent).toContain('已保存');

    const accountInput = container.querySelector<HTMLInputElement>('#r2-account-id');
    const secretInput = container.querySelector<HTMLInputElement>('#r2-secret-access-key');
    const form = container.querySelector<HTMLFormElement>('#cloudflare-r2-form');

    expect(accountInput?.value).toBe('account-id');
    expect(secretInput?.value).toBe('');

    await act(async () => {
      if (accountInput) {
        setInputValue(accountInput, 'next-account-id');
      }
    });
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/data/cloudflare-r2',
      expect.objectContaining({
        method: 'PUT',
        body: expect.any(String),
      })
    );

    const body = JSON.parse(fetchMock.mock.calls.at(-1)?.[1]?.body as string);

    expect(body.settings).toEqual(
      expect.objectContaining({
        enabled: true,
        accountId: 'next-account-id',
        bucket: 'blog-data',
        accessKeyId: 'access-key',
        secretAccessKey: '',
      })
    );
  });

  it('disables remote R2 actions until saved settings are complete', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          persistent: true,
          revision: 'settings-revision',
          settings: DEFAULT_SITE_SETTINGS,
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          persistent: true,
          settings: {
            enabled: true,
            accountId: '',
            bucket: '',
            accessKeyId: '',
            hasSecretAccessKey: false,
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: false,
          },
          status: {
            enabled: true,
            configured: false,
            bucket: null,
            prefix: 'blog-navigation',
            endpoint: null,
            snapshotOnWrite: false,
            hasAccessKeyId: false,
            hasSecretAccessKey: false,
            source: 'file',
            message: 'R2 backup is enabled but required variables are missing.',
          },
        })
      );

    await act(async () => {
      root.render(<EditorSettingsPage />);
    });
    await flushPromises();

    expect(container.textContent).toContain('配置不完整');
    expect(getButtonByText(container, '同步云端').disabled).toBe(true);
    expect(getButtonByText(container, '云端恢复').disabled).toBe(true);
  });

  it('disables site settings save when BLOG_DATA_ROOT is not configured', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          persistent: false,
          revision: null,
          settings: DEFAULT_SITE_SETTINGS,
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          persistent: false,
          settings: {
            enabled: false,
            accountId: '',
            bucket: '',
            accessKeyId: '',
            hasSecretAccessKey: false,
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: false,
          },
          status: {
            enabled: false,
            configured: false,
            bucket: null,
            prefix: 'blog-navigation',
            endpoint: null,
            snapshotOnWrite: false,
            hasAccessKeyId: false,
            hasSecretAccessKey: false,
            source: 'default',
            message: null,
          },
        })
      );

    await act(async () => {
      root.render(<EditorSettingsPage />);
    });
    await flushPromises();

    expect(container.textContent).toContain('未配置持久化目录');
    expect(getButtonByText(container, '保存设置').disabled).toBe(true);
  });

  it('warns when settings page remote restore succeeds but the follow-up snapshot sync fails', async () => {
    const confirmMock = vi.fn().mockReturnValue(true);

    vi.stubGlobal('confirm', confirmMock);
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          persistent: true,
          revision: 'settings-revision',
          settings: DEFAULT_SITE_SETTINGS,
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          persistent: true,
          settings: {
            enabled: true,
            accountId: 'account-id',
            bucket: 'blog-data',
            accessKeyId: 'access-key',
            hasSecretAccessKey: true,
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: false,
          },
          status: {
            enabled: true,
            configured: true,
            bucket: 'blog-data',
            prefix: 'blog-navigation',
            endpoint: 'https://account-id.r2.cloudflarestorage.com',
            snapshotOnWrite: false,
            hasAccessKeyId: true,
            hasSecretAccessKey: true,
            source: 'file',
            message: null,
          },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          remoteBackup: {
            enabled: true,
            success: false,
            message: 'R2 upload failed.',
          },
        })
      );

    await act(async () => {
      root.render(<EditorSettingsPage />);
    });
    await flushPromises();

    await act(async () => {
      getButtonByText(container, '云端恢复').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushPromises();

    expect(confirmMock).toHaveBeenCalled();
    expect(container.textContent).toContain('恢复成功，但云端快照同步失败：R2 upload failed.');
  });
});

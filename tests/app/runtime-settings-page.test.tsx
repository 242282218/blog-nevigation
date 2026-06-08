import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RuntimeSettingsPage from '@/app/editor/(authenticated)/settings/runtime/page';

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

describe('RuntimeSettingsPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

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

  it('marks and focuses the confirmation field when editor secrets do not match', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        editable: {
          publicSiteUrl: 'https://example.com',
          cookieSecure: true,
          trustedProxyIps: ['127.0.0.1'],
          dataRootPath: '/var/lib/blog-navigation',
        },
        config: {
          dataRoot: {
            pendingPath: null,
            requiresRestart: false,
          },
        },
      })
    );

    await act(async () => {
      root.render(<RuntimeSettingsPage />);
    });
    await flushPromises();

    const secretInput = container.querySelector<HTMLInputElement>('#runtime-editor-secret');
    const confirmInput = container.querySelector<HTMLInputElement>('#runtime-confirm-editor-secret');
    const form = container.querySelector<HTMLFormElement>('#runtime-config-form');

    expect(secretInput).toBeInstanceOf(HTMLInputElement);
    expect(confirmInput).toBeInstanceOf(HTMLInputElement);

    await act(async () => {
      setInputValue(secretInput as HTMLInputElement, 'new-runtime-secret-12');
      setInputValue(confirmInput as HTMLInputElement, 'different-runtime-secret-12');
    });

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(confirmInput?.getAttribute('aria-invalid')).toBe('true');
    expect(confirmInput?.getAttribute('aria-describedby')).toContain('runtime-confirm-editor-secret-error');
    expect(container.querySelector('#runtime-confirm-editor-secret-error')?.textContent).toContain('两次输入的编辑口令不一致');
    expect(document.activeElement).toBe(confirmInput);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows Docker version metadata on the runtime settings page', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        editable: {
          publicSiteUrl: 'https://example.com',
          cookieSecure: true,
          trustedProxyIps: ['127.0.0.1'],
          dataRootPath: '/var/lib/blog-navigation',
        },
        config: {
          dataRoot: {
            pendingPath: null,
            requiresRestart: false,
          },
        },
        version: {
          projectVersion: '2.0.1',
          displayVersion: 'v2.0.1-build.42',
          runtime: 'docker',
          docker: {
            enabled: true,
            imageTag: 'v2.0.1-build.42',
            revision: 'abcdef1234567890',
            buildTime: '2026-06-08T08:00:00Z',
          },
        },
      })
    );

    await act(async () => {
      root.render(<RuntimeSettingsPage />);
    });
    await flushPromises();

    expect(container.textContent).toContain('版本信息');
    expect(container.textContent).toContain('v2.0.1-build.42');
    expect(container.textContent).toContain('Docker 镜像');
    expect(container.textContent).toContain('abcdef123456');
  });
});

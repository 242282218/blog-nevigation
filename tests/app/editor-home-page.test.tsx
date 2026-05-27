import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditorHomePage from '@/app/editor/(authenticated)/page';

vi.mock('@/app/editor/components/LogoutButton', () => ({
  LogoutButton: () => <button type="button">logout</button>,
}));

const fetchMock = vi.fn();
const currentManifest = {
  version: 1,
  updatedAt: '2026-05-24T00:00:00.000Z',
  resources: {
    articles: {
      revision: 'articles-revision',
      hash: 'articles-hash',
      updatedAt: '2026-05-24T00:00:00.000Z',
    },
    navigation: {
      revision: 'navigation-revision',
      hash: 'navigation-hash',
      updatedAt: '2026-05-24T00:00:00.000Z',
    },
    settings: {
      revision: 'settings-revision',
      hash: 'settings-hash',
      updatedAt: '2026-05-24T00:00:00.000Z',
    },
  },
};

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

function getButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(text)
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${text}`);
  }

  return button;
}

describe('EditorHomePage', () => {
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

  it('disables remote backup actions when R2 is not configured', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        enabled: false,
        configured: false,
      })
    );

    await act(async () => {
      root.render(<EditorHomePage />);
    });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/data/backup/remote',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      })
    );
    expect(getButtonByText(container, '同步云端').disabled).toBe(true);
    expect(getButtonByText(container, '云端恢复').disabled).toBe(true);
    expect(container.textContent).toContain('R2 未配置完整，云端同步和云端恢复暂不可用。');
  });

  it('enables remote backup actions when R2 is configured', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        enabled: true,
        configured: true,
      })
    );

    await act(async () => {
      root.render(<EditorHomePage />);
    });
    await flushPromises();

    expect(getButtonByText(container, '同步云端').disabled).toBe(false);
    expect(getButtonByText(container, '云端恢复').disabled).toBe(false);
  });

  it('keeps local restore available through an accessible file input', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        enabled: false,
        configured: false,
      })
    );

    await act(async () => {
      root.render(<EditorHomePage />);
    });
    await flushPromises();

    const restoreInput = container.querySelector<HTMLInputElement>('input[type="file"][aria-label="选择本地备份 JSON"]');

    expect(restoreInput).toBeInstanceOf(HTMLInputElement);
    expect(restoreInput?.accept).toBe('.json');
    expect(restoreInput?.className).toContain('sr-only');
    expect(restoreInput?.className).not.toContain('hidden');
  });

  it('syncs remote backups through the resource endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          enabled: true,
          configured: true,
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          remoteBackup: {
            enabled: true,
            success: true,
          },
        })
      );

    await act(async () => {
      root.render(<EditorHomePage />);
    });
    await flushPromises();

    await act(async () => {
      getButtonByText(container, '同步云端').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/data/backup/remote/sync',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(container.textContent).toContain('云端备份已同步。');
  });

  it('warns when remote restore succeeds but the follow-up snapshot sync fails', async () => {
    const confirmMock = vi.fn().mockReturnValue(true);

    vi.stubGlobal('confirm', confirmMock);
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          enabled: true,
          configured: true,
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          manifest: currentManifest,
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
      root.render(<EditorHomePage />);
    });
    await flushPromises();

    await act(async () => {
      getButtonByText(container, '云端恢复').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await flushPromises();

    expect(confirmMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/data/backup/remote/restore',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ currentManifest }),
      })
    );
    expect(container.textContent).toContain('恢复成功，但云端快照同步失败：R2 upload failed.');
  });
});

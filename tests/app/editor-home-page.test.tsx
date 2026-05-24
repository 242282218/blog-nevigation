import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditorHomePage from '@/app/editor/page';

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
    expect(container.textContent).toContain('恢复成功，但云端快照同步失败：R2 upload failed.');
  });
});

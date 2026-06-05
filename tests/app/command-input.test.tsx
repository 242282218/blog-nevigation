import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandInput } from '@/app/components/header/CommandInput';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('CommandInput', () => {
  let container: HTMLDivElement;
  let root: Root;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    pushMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          configured: true,
          authenticated: false,
          setupEnabled: false,
          setupTokenRequired: false,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('fetch', fetchMock);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function openAdminMenu(): Promise<void> {
    const openButton = container.querySelector('button');

    act(() => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const input = container.querySelector('input');

    await act(async () => {
      if (input) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;

        valueSetter?.call(input, ':admin');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  it('uses plain text for the search shortcut hint', () => {
    act(() => {
      root.render(<CommandInput />);
    });

    const shortcutHint = container.querySelector('kbd');

    expect(shortcutHint?.textContent).toContain('Ctrl');
    expect(container.textContent).not.toContain('⌘');
  });

  it('opens search as a dialog and clears the current command query', async () => {
    act(() => {
      root.render(<CommandInput />);
    });

    const openButton = container.querySelector<HTMLButtonElement>('button[aria-label="搜索文章和链接"]');

    expect(openButton?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(openButton?.getAttribute('aria-expanded')).toBe('false');

    await openAdminMenu();

    const dialog = container.querySelector('[role="dialog"][aria-label="全站搜索"]');
    const input = container.querySelector<HTMLInputElement>('input[aria-label="搜索文章或链接"]');
    const clearButton = container.querySelector<HTMLButtonElement>('button[aria-label="清空命令搜索"]');

    expect(openButton?.getAttribute('aria-expanded')).toBe('true');
    expect(openButton?.getAttribute('aria-controls')).toBe('command-search-panel');
    expect(dialog).toBeTruthy();
    expect(input?.value).toBe(':admin');
    expect(clearButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      clearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      vi.runOnlyPendingTimers();
    });

    expect(input?.value).toBe('');
    expect(input).toBe(document.activeElement);
    expect(container.textContent).toContain('输入关键词搜索文章和链接');
  });

  it('shows the settings entry in the initialized admin command menu', async () => {
    act(() => {
      root.render(<CommandInput />);
    });

    await openAdminMenu();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/editor-auth',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'include',
      })
    );
    expect(container.textContent).toContain('站点设置');
  });

  it('shows first-use initialization entry before editor auth is configured', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          configured: false,
          authenticated: false,
          setupEnabled: true,
          setupTokenRequired: true,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    act(() => {
      root.render(<CommandInput />);
    });

    await openAdminMenu();

    expect(container.textContent).toContain('初次使用初始化引导');
    expect(container.textContent).toContain('设置编辑口令后进入后台');
    expect(container.textContent).not.toContain('站点设置');

    const setupButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('初次使用初始化引导')
    );

    act(() => {
      setupButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(pushMock).toHaveBeenCalledWith('/setup');
  });
});

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownContent } from '@/app/components/markdown';

describe('MarkdownContent', () => {
  let container: HTMLDivElement;
  let root: Root;
  const writeTextMock = vi.fn();
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    });
    writeTextMock.mockResolvedValue(undefined);
    setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    setTimeoutSpy.mockRestore();
    writeTextMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders code block chrome and copies the raw code text', async () => {
    act(() => {
      root.render(
        <MarkdownContent content={'```typescript\nconst ok = true;\n```'} />
      );
    });

    expect(container.textContent).toContain('typescript');

    const copyButton = container.querySelector('button[aria-label="复制代码"]');

    expect(copyButton).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(writeTextMock).toHaveBeenCalledWith('const ok = true;');
  });

  it('does not render dangerous markdown HTML or protocols as active DOM', () => {
    act(() => {
      root.render(
        <MarkdownContent
          content={'<script>alert("xss")</script>\n\n[unsafe](javascript:alert("xss"))\n\n<img src="x" onerror="alert(\'xss\')" />'}
        />
      );
    });

    const unsafeLink = Array.from(container.querySelectorAll('a')).find((link) =>
      link.textContent?.includes('unsafe')
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(unsafeLink?.getAttribute('href')).toBeNull();
  });
});

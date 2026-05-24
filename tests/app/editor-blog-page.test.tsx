import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BlogEditorPage from '@/app/editor/blog/page';

const pushMock = vi.fn();
const exportArticleMock = vi.fn();
const exportArticlesDataMock = vi.fn();
const deleteArticleMock = vi.fn();
const importArticleMock = vi.fn();
let lastConflictAtMock: number | null = null;
let lastRemoteSaveErrorMock: { at: number; message: string } | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/app/hooks/useLocalArticles', () => ({
  useLocalArticles: () => ({
    articles: [
      {
        id: 'article-1',
        title: 'First Article',
        date: '2026-03-09',
        description: 'Desc',
        tags: ['nextjs'],
        content: '# First',
        createdAt: 1,
        updatedAt: 2,
      },
    ],
    deleteArticle: deleteArticleMock,
    exportArticle: exportArticleMock,
    exportArticlesData: exportArticlesDataMock,
    importArticle: importArticleMock,
    isLoaded: true,
    lastConflictAt: lastConflictAtMock,
    lastRemoteSaveError: lastRemoteSaveErrorMock,
  }),
}));

vi.mock('@/app/editor/blog/components/TemplateSelector', () => ({
  TemplateSelector: () => <div>template-selector</div>,
}));

vi.mock('@/app/editor/components/LogoutButton', () => ({
  LogoutButton: () => <button type="button">logout</button>,
}));

describe('BlogEditorPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  const createObjectURLMock = vi.fn(() => 'blob:articles');
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    pushMock.mockReset();
    exportArticleMock.mockReset().mockReturnValue('# First');
    exportArticlesDataMock.mockReset().mockReturnValue(
      JSON.stringify(
        [
          {
            id: 'article-1',
            title: 'First Article',
          },
        ],
        null,
        2
      )
    );
    deleteArticleMock.mockReset();
    importArticleMock.mockReset();
    lastConflictAtMock = null;
    lastRemoteSaveErrorMock = null;
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
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

  it('renders a single export button and downloads one JSON file for all articles', () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    act(() => {
      root.render(<BlogEditorPage />);
    });

    const exportButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('导出')
    );

    expect(exportButton).toBeTruthy();

    act(() => {
      exportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const downloadLink = appendChildSpy.mock.calls.at(-1)?.[0];

    expect(downloadLink).toBeInstanceOf(HTMLAnchorElement);
    expect((downloadLink as HTMLAnchorElement).download).toBe('blog-articles.json');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(removeChildSpy).toHaveBeenCalledWith(downloadLink);
    expect(createObjectURLMock).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:articles');
    expect(exportArticlesDataMock).toHaveBeenCalledOnce();
    expect(container.textContent).not.toContain('Export All');

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('shows a warning when remote article data wins a save conflict', () => {
    lastConflictAtMock = Date.now();

    act(() => {
      root.render(<BlogEditorPage />);
    });

    expect(container.textContent).toContain('服务器上的文章数据更新较新');
    expect(container.textContent).toContain('已载入服务器版本');
  });

  it('shows a warning when article data fails to sync to the server', () => {
    lastRemoteSaveErrorMock = {
      at: Date.now(),
      message: '服务器未配置持久化数据目录，文章只保存在当前浏览器。',
    };

    act(() => {
      root.render(<BlogEditorPage />);
    });

    expect(container.textContent).toContain('文章已保存在本机，但同步到服务器失败');
    expect(container.textContent).toContain('服务器未配置持久化数据目录');
  });
});

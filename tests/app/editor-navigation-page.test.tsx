import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NavigationEditorPage from '@/app/editor/navigation/page';

const addCategoryMock = vi.fn();
const updateCategoryMock = vi.fn();
const deleteCategoryMock = vi.fn();
const addToolMock = vi.fn();
const updateToolMock = vi.fn();
const deleteToolMock = vi.fn();
const exportDataMock = vi.fn();
const importDataMock = vi.fn();
const resetToDefaultMock = vi.fn();
let lastConflictAtMock: number | null = null;
let lastRemoteLoadErrorMock: { at: number; message: string } | null = null;
let lastRemoteSaveErrorMock: { at: number; message: string } | null = null;

vi.mock('@/app/hooks/useNavigationData', () => ({
  useNavigationData: () => ({
    data: [
      {
        name: 'AI Tools',
        icon: 'folder',
        slug: 'ai-tools',
        tools: [
          {
            icon: 'link',
            title: 'OpenAI',
            description: 'AI platform',
            url: 'https://openai.com',
            tags: ['ai'],
          },
        ],
      },
    ],
    isLoaded: true,
    addCategory: addCategoryMock,
    updateCategory: updateCategoryMock,
    deleteCategory: deleteCategoryMock,
    addTool: addToolMock,
    updateTool: updateToolMock,
    deleteTool: deleteToolMock,
    exportData: exportDataMock,
    importData: importDataMock,
    resetToDefault: resetToDefaultMock,
    lastConflictAt: lastConflictAtMock,
    lastRemoteLoadError: lastRemoteLoadErrorMock,
    lastRemoteSaveError: lastRemoteSaveErrorMock,
  }),
}));

vi.mock('@/app/editor/components/LogoutButton', () => ({
  LogoutButton: () => <button type="button">logout</button>,
}));

describe('NavigationEditorPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    addCategoryMock.mockReset();
    updateCategoryMock.mockReset();
    deleteCategoryMock.mockReset();
    addToolMock.mockReset();
    updateToolMock.mockReset();
    deleteToolMock.mockReset();
    exportDataMock.mockReset().mockReturnValue('[]');
    importDataMock.mockReset().mockReturnValue(true);
    resetToDefaultMock.mockReset();
    lastConflictAtMock = null;
    lastRemoteLoadErrorMock = null;
    lastRemoteSaveErrorMock = null;
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

  it('shows a warning when remote navigation data wins a save conflict', () => {
    lastConflictAtMock = Date.now();

    act(() => {
      root.render(<NavigationEditorPage />);
    });

    expect(container.textContent).toContain('服务器上的导航数据更新较新');
    expect(container.textContent).toContain('已载入服务器版本');
  });

  it('shows a warning when navigation data fails to sync to the server', () => {
    lastRemoteSaveErrorMock = {
      at: Date.now(),
      message: '服务器未配置持久化数据目录，导航只保存在当前浏览器。',
    };

    act(() => {
      root.render(<NavigationEditorPage />);
    });

    expect(container.textContent).toContain('导航已保存在本机，但同步到服务器失败');
    expect(container.textContent).toContain('服务器未配置持久化数据目录');
  });

  it('shows a warning when navigation data fails to load from the server', () => {
    lastRemoteLoadErrorMock = {
      at: Date.now(),
      message: '导航数据文件损坏。',
    };

    act(() => {
      root.render(<NavigationEditorPage />);
    });

    expect(container.textContent).toContain('导航从服务器加载失败，当前显示本机副本');
    expect(container.textContent).toContain('导航数据文件损坏');
  });

  it('requires a second click before deleting a tool link', () => {
    act(() => {
      root.render(<NavigationEditorPage />);
    });

    const deleteButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === '删除工具：OpenAI'
    );

    expect(deleteButton).toBeTruthy();

    act(() => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(deleteToolMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('再次点击删除按钮确认删除工具链接');

    const confirmButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === '确认删除工具：OpenAI'
    );

    act(() => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(deleteToolMock).toHaveBeenCalledWith(0, 0);
  });
});

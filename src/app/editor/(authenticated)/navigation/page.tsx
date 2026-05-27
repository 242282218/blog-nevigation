'use client';

import { useState, useCallback } from 'react';
import { Plus, Download, Upload, RotateCcw, Folder, Link2, Trash2, Edit2, X, Check } from 'lucide-react';
import { useNavigationData } from '@/app/hooks/useNavigationData';
import { Tool } from '@/app/types/navigation';
import { isValidNavigationUrl } from '@/lib/navigation-data';
import { cn } from '@/lib/utils';
import { EmptyState, StatusMessage } from '@/app/components/ui';
import { LogoutButton } from '../../components/LogoutButton';
import {
  EditorButton,
  EditorMain,
  EditorPage,
  EditorPanel,
  EditorTopBar,
  editorInputClassName,
} from '../../components/EditorShell';

function normalizeTagsInput(value: string): string[] {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function editorFieldLabelClassName() {
  return 'mb-1.5 block text-xs font-mono text-muted';
}

type ToolValidationField = 'title' | 'url' | 'description' | 'tags';

type ToolValidationError = {
  field: ToolValidationField;
  message: string;
};

function validateTool(tool: Tool): ToolValidationError | null {
  if (!tool.title.trim()) {
    return { field: 'title', message: '请填写工具名称。' };
  }

  if (!isValidNavigationUrl(tool.url)) {
    return {
      field: 'url',
      message: process.env.NODE_ENV === 'production'
        ? 'URL 必须是完整的 https:// 链接。'
        : 'URL 必须是完整的 https:// 链接，或本地开发用 http://localhost 链接。',
    };
  }

  if (!tool.description.trim()) {
    return { field: 'description', message: '请填写工具描述。' };
  }

  if (tool.tags.filter(Boolean).length === 0) {
    return { field: 'tags', message: '请至少填写一个标签。' };
  }

  return null;
}

function getToolFieldId(prefix: string, field: ToolValidationField): string {
  return `${prefix}-${field}`;
}

function getCategoryEditFieldId(categoryIndex: number): string {
  return `edit-category-${categoryIndex}-name`;
}

function focusToolField(prefix: string, field: ToolValidationField): void {
  window.requestAnimationFrame(() => {
    document.getElementById(getToolFieldId(prefix, field))?.focus();
  });
}

function focusCategoryEditField(categoryIndex: number): void {
  window.requestAnimationFrame(() => {
    document.getElementById(getCategoryEditFieldId(categoryIndex))?.focus();
  });
}

function getToolFieldError(
  error: ToolValidationError | null,
  field: ToolValidationField
): string | undefined {
  return error?.field === field ? error.message : undefined;
}

function toolInputProps(
  prefix: string,
  field: ToolValidationField,
  error?: string
): {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
} {
  const id = getToolFieldId(prefix, field);

  return {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
  };
}

function toolTextInputProps(field: ToolValidationField): {
  autoCapitalize?: 'none';
  autoCorrect?: 'off';
  inputMode?: 'url';
  spellCheck?: boolean;
  type: 'text' | 'url';
} {
  if (field !== 'url') {
    return { type: 'text' };
  }

  return {
    autoCapitalize: 'none',
    autoCorrect: 'off',
    inputMode: 'url',
    spellCheck: false,
    type: 'url',
  };
}

function ToolFieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={`${id}-error`} className="mt-1 text-xs text-error-600" role="alert">
      {message}
    </p>
  );
}

export default function NavigationEditorPage() {
  const {
    data,
    isLoaded,
    addCategory,
    updateCategory,
    deleteCategory,
    addTool,
    updateTool,
    deleteTool,
    exportData,
    importData,
    resetToDefault,
    lastConflictAt,
    lastRemoteLoadError,
    lastRemoteSaveError,
  } = useNavigationData();

  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editingTool, setEditingTool] = useState<{ categoryIndex: number; toolIndex: number } | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTool, setShowAddTool] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [categoryFormError, setCategoryFormError] = useState('');
  const [categoryEditName, setCategoryEditName] = useState('');
  const [categoryEditError, setCategoryEditError] = useState('');
  const [toolFormError, setToolFormError] = useState<ToolValidationError | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'folder', slug: '' });
  const [toolForm, setToolForm] = useState<Tool>({
    icon: 'link',
    title: '',
    description: '',
    url: '',
    tags: [],
  });

  const handleAddCategory = useCallback(() => {
    if (!categoryForm.name.trim()) {
      setCategoryFormError('请填写分类名称。');
      window.requestAnimationFrame(() => {
        document.getElementById('new-category-name')?.focus();
      });
      return;
    }

    addCategory({
      name: categoryForm.name.trim(),
      icon: categoryForm.icon.trim() || 'folder',
      slug: categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
    });
    setCategoryForm({ name: '', icon: 'folder', slug: '' });
    setCategoryFormError('');
    setMessage({ tone: 'success', text: '分类已添加。' });
    setShowAddCategory(false);
  }, [categoryForm, addCategory]);

  const startEditingCategory = useCallback((categoryIndex: number, categoryName: string) => {
    setEditingCategory(categoryIndex);
    setCategoryEditName(categoryName);
    setCategoryEditError('');
  }, []);

  const cancelEditingCategory = useCallback(() => {
    setEditingCategory(null);
    setCategoryEditName('');
    setCategoryEditError('');
  }, []);

  const handleSaveCategory = useCallback(
    (categoryIndex: number) => {
      const nextName = categoryEditName.trim();

      if (!nextName) {
        setCategoryEditError('请填写分类名称。');
        focusCategoryEditField(categoryIndex);
        return;
      }

      updateCategory(categoryIndex, { name: nextName });
      setMessage({ tone: 'success', text: '分类名称已更新。' });
      cancelEditingCategory();
    },
    [cancelEditingCategory, categoryEditName, updateCategory]
  );

  const handleAddTool = useCallback(
    (categoryIndex: number) => {
      const normalizedTool = {
        ...toolForm,
        icon: toolForm.icon.trim() || 'link',
        title: toolForm.title.trim(),
        description: toolForm.description.trim(),
        url: toolForm.url.trim(),
        tags: toolForm.tags.filter(Boolean),
      };
      const validationError = validateTool(normalizedTool);

      if (validationError) {
        setToolFormError(validationError);
        focusToolField(`new-tool-${categoryIndex}`, validationError.field);
        return;
      }

      addTool(categoryIndex, {
        ...normalizedTool,
      });
      setToolForm({
        icon: 'link',
        title: '',
        description: '',
        url: '',
        tags: [],
      });
      setToolFormError(null);
      setMessage({ tone: 'success', text: '工具链接已添加。' });
      setShowAddTool(null);
    },
    [toolForm, addTool]
  );

  const handleExport = useCallback(() => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'navigation-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage({ tone: 'success', text: '导航数据已导出。' });
  }, [exportData]);

  const handleReset = useCallback(() => {
    resetToDefault();
    setMessage({ tone: 'info', text: '导航数据已重置为种子数据。' });
  }, [resetToDefault]);

  const handleDeleteCategory = useCallback((categoryIndex: number) => {
    const confirmKey = `category:${categoryIndex}`;

    if (deleteConfirm !== confirmKey) {
      setDeleteConfirm(confirmKey);
      setMessage({ tone: 'info', text: '再次点击删除按钮确认删除分类。' });
      window.setTimeout(() => {
        setDeleteConfirm((current) => (current === confirmKey ? null : current));
      }, 3000);
      return;
    }

    const deleted = deleteCategory(categoryIndex);
    setDeleteConfirm(null);
    setMessage(deleted
      ? { tone: 'success', text: '分类已删除。' }
      : { tone: 'danger', text: '分类删除失败。' });
  }, [deleteCategory, deleteConfirm]);

  const handleDeleteTool = useCallback((categoryIndex: number, toolIndex: number) => {
    const confirmKey = `tool:${categoryIndex}:${toolIndex}`;

    if (deleteConfirm !== confirmKey) {
      setDeleteConfirm(confirmKey);
      setMessage({ tone: 'info', text: '再次点击删除按钮确认删除工具链接。' });
      window.setTimeout(() => {
        setDeleteConfirm((current) => (current === confirmKey ? null : current));
      }, 3000);
      return;
    }

    const deleted = deleteTool(categoryIndex, toolIndex);
    setDeleteConfirm(null);
    setMessage(deleted
      ? { tone: 'success', text: '工具链接已删除。' }
      : { tone: 'danger', text: '工具链接删除失败。' });
  }, [deleteConfirm, deleteTool]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      const handleReadError = () => {
        setMessage({ tone: 'danger', text: '导航数据文件读取失败，请重新选择 JSON 文件。' });
      };

      reader.onload = (event) => {
        const content = typeof event.target?.result === 'string' ? event.target.result : '';

        if (!content.trim()) {
          setMessage({ tone: 'danger', text: '导航数据导入失败，请检查 JSON 格式。' });
          return;
        }

        const imported = importData(content);
        setMessage(imported
          ? { tone: 'success', text: '导航数据已导入。' }
          : { tone: 'danger', text: '导航数据导入失败，请检查 JSON 格式。' });
      };
      reader.onerror = handleReadError;
      reader.onabort = handleReadError;
      reader.readAsText(file);
      e.target.value = '';
    },
    [importData]
  );

  if (!isLoaded) {
    return (
      <EditorPage className="flex items-center justify-center">
        <div className="animate-pulse text-subtle">加载中...</div>
      </EditorPage>
    );
  }

  return (
    <EditorPage className="pb-12">
      <EditorTopBar
        title="导航编辑器"
        description={`${data.length} 个分类，${data.reduce((acc, cat) => acc + cat.tools.length, 0)} 个工具`}
        eyebrow="editor.navigation"
        backHref="/editor"
        actions={(
          <>
            <LogoutButton />
            <label
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-token-card border border-border bg-surface px-3 py-2 text-sm font-medium text-fg transition hover:border-border hover:bg-surface focus-within:ring-2 focus-within:ring-link focus-within:ring-offset-2 sm:min-h-10 sm:min-w-0"
              aria-label="导入导航数据"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">导入</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="sr-only"
                aria-label="导入导航数据"
              />
            </label>

            <EditorButton
              onClick={handleExport}
              aria-label="导出导航数据"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">导出</span>
            </EditorButton>

            <EditorButton
              onClick={handleReset}
              aria-label="重置导航数据"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">重置</span>
            </EditorButton>

            <EditorButton
              onClick={() => setShowAddCategory(true)}
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              添加分类
            </EditorButton>
          </>
        )}
      />

      <EditorMain className="space-y-4">
        {lastConflictAt ? (
          <StatusMessage tone="warning">
            服务器上的导航数据更新较新，已载入服务器版本；请确认当前内容后继续编辑。
          </StatusMessage>
        ) : null}

        {lastRemoteLoadError ? (
          <StatusMessage tone="warning">
            导航从服务器加载失败，当前显示本机副本：{lastRemoteLoadError.message}
          </StatusMessage>
        ) : null}

        {lastRemoteSaveError ? (
          <StatusMessage tone="warning">
            导航已保存在本机，但同步到服务器失败：{lastRemoteSaveError.message}
          </StatusMessage>
        ) : null}

        {message ? (
          <StatusMessage tone={message.tone}>
            {message.text}
          </StatusMessage>
        ) : null}

        {showAddCategory && (
          <EditorPanel className="p-4">
            <h3 className="mb-3 text-base font-medium text-fg">添加分类</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label>
                <span className={editorFieldLabelClassName()}>分类名称</span>
                <input
                  id="new-category-name"
                  type="text"
                  placeholder="常用入口"
                  value={categoryForm.name}
                  onChange={(e) => {
                    setCategoryForm({ ...categoryForm, name: e.target.value });
                    setCategoryFormError('');
                  }}
                  className={editorInputClassName}
                  aria-invalid={Boolean(categoryFormError)}
                  aria-describedby={categoryFormError ? 'new-category-name-error' : undefined}
                />
                {categoryFormError ? (
                  <p id="new-category-name-error" className="mt-1 text-xs text-error-600" role="alert">
                    {categoryFormError}
                  </p>
                ) : null}
              </label>
              <label>
                <span className={editorFieldLabelClassName()}>图标</span>
                <input
                  type="text"
                  placeholder="folder"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  className={editorInputClassName}
                />
              </label>
              <label>
                <span className={editorFieldLabelClassName()}>Slug</span>
                <input
                  type="text"
                  placeholder="quick-access"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  className={editorInputClassName}
                />
              </label>
            </div>
            {categoryFormError ? (
              <p className="mt-3 text-sm text-error-600">{categoryFormError}</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <EditorButton
                onClick={handleAddCategory}
                variant="primary"
              >
                确认添加
              </EditorButton>
              <EditorButton
                onClick={() => setShowAddCategory(false)}
                variant="ghost"
              >
                取消
              </EditorButton>
            </div>
          </EditorPanel>
        )}

        {data.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="还没有导航分类"
            description="添加一个分类后，就可以开始整理常用工具链接。"
            action={(
              <EditorButton
                onClick={() => setShowAddCategory(true)}
                variant="accent"
              >
                <Plus className="h-4 w-4" />
                添加分类
              </EditorButton>
            )}
          />
        ) : (
          <div className="space-y-4">
            {data.map((category, categoryIndex) => (
              <EditorPanel key={categoryIndex} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border bg-background/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  {editingCategory === categoryIndex ? (
                    <label className="flex-1">
                      <span className={editorFieldLabelClassName()}>分类名称</span>
                      <input
                        id={getCategoryEditFieldId(categoryIndex)}
                        type="text"
                        value={categoryEditName}
                        onChange={(e) => {
                          setCategoryEditName(e.target.value);
                          setCategoryEditError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveCategory(categoryIndex);
                          }

                          if (e.key === 'Escape') {
                            cancelEditingCategory();
                          }
                        }}
                        className={editorInputClassName}
                        aria-invalid={Boolean(categoryEditError)}
                        aria-describedby={categoryEditError ? `${getCategoryEditFieldId(categoryIndex)}-error` : undefined}
                        autoFocus
                      />
                      {categoryEditError ? (
                        <p id={`${getCategoryEditFieldId(categoryIndex)}-error`} className="mt-1 text-xs text-error-600" role="alert">
                          {categoryEditError}
                        </p>
                      ) : null}
                    </label>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3">
                      <Folder className="h-5 w-5 shrink-0 text-accent" />
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-medium text-fg">{category.name}</h2>
                        <p className="mt-0.5 font-mono text-xs text-subtle">{category.tools.length} tools</p>
                      </div>
                    </div>
                  )}

                  <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-end">
                    {editingCategory === categoryIndex ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveCategory(categoryIndex)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-token-card bg-accent text-white transition-colors hover:bg-accent-600 focus:ring-2 focus:ring-link focus:ring-offset-2 sm:min-h-9 sm:min-w-9"
                          aria-label={`保存分类：${category.name}`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingCategory}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-token-card text-subtle transition-colors hover:bg-surface hover:text-fg focus:ring-2 focus:ring-link focus:ring-offset-2 sm:min-h-9 sm:min-w-9"
                          aria-label={`取消编辑分类：${category.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingCategory(categoryIndex, category.name)}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-token-card text-subtle transition-colors hover:bg-accent-50 hover:text-accent focus:ring-2 focus:ring-link focus:ring-offset-2 sm:min-h-9 sm:min-w-9"
                            aria-label={`编辑分类：${category.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(categoryIndex)}
                            className={deleteConfirm === `category:${categoryIndex}`
                              ? 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-token-card bg-error-50 text-error-600 transition-colors focus:ring-2 focus:ring-link focus:ring-offset-2 sm:min-h-9 sm:min-w-9'
                              : 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-token-card text-subtle transition-colors hover:bg-error-50 hover:text-error-600 focus:ring-2 focus:ring-link focus:ring-offset-2 sm:min-h-9 sm:min-w-9'}
                            aria-label={`${deleteConfirm === `category:${categoryIndex}` ? '确认删除分类' : '删除分类'}：${category.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <EditorButton
                          onClick={() => setShowAddTool(categoryIndex)}
                          className="whitespace-nowrap px-3 py-1.5"
                          variant="accent"
                        >
                          <Plus className="h-3 w-3" />
                          添加工具
                        </EditorButton>
                      </>
                    )}
                  </div>
                </div>

                {showAddTool === categoryIndex && (
                  <section
                    className="border-b border-border bg-accent-50/60 p-3"
                    aria-labelledby={`new-tool-${categoryIndex}-heading`}
                  >
                    <div className="mb-3 flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-token-card border border-danger-light bg-surface text-accent">
                        <Plus className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 id={`new-tool-${categoryIndex}-heading`} className="text-sm font-semibold text-fg">
                          添加工具到 {category.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          先补齐名称、URL、描述和标签，再保存到当前分类。
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label>
                        <span className={editorFieldLabelClassName()}>工具名称</span>
                        {(() => {
                          const error = getToolFieldError(toolFormError, 'title');
                          const fieldProps = toolInputProps(`new-tool-${categoryIndex}`, 'title', error);

                          return (
                            <>
                              <input
                                placeholder="MDN Web Docs"
                                value={toolForm.title}
                                onChange={(e) => setToolForm({ ...toolForm, title: e.target.value })}
                                className={editorInputClassName}
                                {...toolTextInputProps('title')}
                                {...fieldProps}
                              />
                              <ToolFieldError id={fieldProps.id} message={error} />
                            </>
                          );
                        })()}
                      </label>
                      <label>
                        <span className={editorFieldLabelClassName()}>URL</span>
                        {(() => {
                          const error = getToolFieldError(toolFormError, 'url');
                          const fieldProps = toolInputProps(`new-tool-${categoryIndex}`, 'url', error);

                          return (
                            <>
                              <input
                                placeholder="https://developer.mozilla.org"
                                value={toolForm.url}
                                onChange={(e) => setToolForm({ ...toolForm, url: e.target.value })}
                                className={editorInputClassName}
                                {...toolTextInputProps('url')}
                                {...fieldProps}
                              />
                              <ToolFieldError id={fieldProps.id} message={error} />
                            </>
                          );
                        })()}
                      </label>
                      <label>
                        <span className={editorFieldLabelClassName()}>描述</span>
                        {(() => {
                          const error = getToolFieldError(toolFormError, 'description');
                          const fieldProps = toolInputProps(`new-tool-${categoryIndex}`, 'description', error);

                          return (
                            <>
                              <input
                                placeholder="说明这个入口解决什么问题"
                                value={toolForm.description}
                                onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                                className={editorInputClassName}
                                {...toolTextInputProps('description')}
                                {...fieldProps}
                              />
                              <ToolFieldError id={fieldProps.id} message={error} />
                            </>
                          );
                        })()}
                      </label>
                      <label>
                        <span className={editorFieldLabelClassName()}>标签</span>
                        {(() => {
                          const error = getToolFieldError(toolFormError, 'tags');
                          const fieldProps = toolInputProps(`new-tool-${categoryIndex}`, 'tags', error);

                          return (
                            <>
                              <input
                                placeholder="文档, Web, 参考"
                                value={toolForm.tags.join(', ')}
                                onChange={(e) =>
                                  setToolForm({
                                    ...toolForm,
                                    tags: normalizeTagsInput(e.target.value),
                                  })
                                }
                                className={editorInputClassName}
                                {...toolTextInputProps('tags')}
                                {...fieldProps}
                              />
                              <ToolFieldError id={fieldProps.id} message={error} />
                            </>
                          );
                        })()}
                      </label>
                    </div>
                    {toolFormError ? (
                      <p className="mt-3 text-sm text-error-600">{toolFormError.message}</p>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <EditorButton
                        onClick={() => handleAddTool(categoryIndex)}
                        variant="primary"
                      >
                        确认添加
                      </EditorButton>
                      <EditorButton
                        onClick={() => setShowAddTool(null)}
                        variant="ghost"
                      >
                        取消
                      </EditorButton>
                    </div>
                  </section>
                )}

                <div className="divide-y divide-border-soft">
                  {category.tools.map((tool, toolIndex) => (
                    <ToolItem
                      key={toolIndex}
                      categoryIndex={categoryIndex}
                      toolIndex={toolIndex}
                      tool={tool}
                      onEdit={() => setEditingTool({ categoryIndex, toolIndex })}
                      onDelete={() => handleDeleteTool(categoryIndex, toolIndex)}
                      isDeleting={deleteConfirm === `tool:${categoryIndex}:${toolIndex}`}
                      isEditing={
                        editingTool?.categoryIndex === categoryIndex &&
                        editingTool?.toolIndex === toolIndex
                      }
                      onSave={(updates) => {
                        updateTool(categoryIndex, toolIndex, updates);
                        setMessage({ tone: 'success', text: '工具链接已更新。' });
                        setEditingTool(null);
                      }}
                      onCancel={() => setEditingTool(null)}
                    />
                  ))}
                </div>
              </EditorPanel>
            ))}
          </div>
        )}
      </EditorMain>
    </EditorPage>
  );
}

interface ToolItemProps {
  categoryIndex: number;
  toolIndex: number;
  tool: Tool;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  isDeleting: boolean;
  onSave: (updates: Partial<Tool>) => void;
  onCancel: () => void;
}

function ToolItem({
  categoryIndex,
  toolIndex,
  tool,
  onEdit,
  onDelete,
  isEditing,
  isDeleting,
  onSave,
  onCancel,
}: ToolItemProps) {
  const [form, setForm] = useState(tool);
  const [validationError, setValidationError] = useState<ToolValidationError | null>(null);
  const fieldPrefix = `edit-tool-${categoryIndex}-${toolIndex}`;

  const updateForm = (updates: Partial<Tool>) => {
    setForm((current) => ({ ...current, ...updates }));
    setValidationError(null);
  };

  const handleSave = () => {
    const normalizedTool = {
      ...form,
      icon: form.icon.trim() || 'link',
      title: form.title.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
      tags: form.tags.filter(Boolean),
    };
    const nextValidationError = validateTool(normalizedTool);

    if (nextValidationError) {
      setValidationError(nextValidationError);
      focusToolField(fieldPrefix, nextValidationError.field);
      return;
    }

    setValidationError(null);
    onSave(normalizedTool);
  };

  if (isEditing) {
    const titleError = getToolFieldError(validationError, 'title');
    const titleProps = toolInputProps(fieldPrefix, 'title', titleError);
    const urlError = getToolFieldError(validationError, 'url');
    const urlProps = toolInputProps(fieldPrefix, 'url', urlError);
    const descriptionError = getToolFieldError(validationError, 'description');
    const descriptionProps = toolInputProps(fieldPrefix, 'description', descriptionError);
    const tagsError = getToolFieldError(validationError, 'tags');
    const tagsProps = toolInputProps(fieldPrefix, 'tags', tagsError);

    return (
      <section
        className="bg-accent-50/60 p-3"
        aria-labelledby={`${fieldPrefix}-heading`}
      >
        <div className="mb-3 flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-token-card border border-danger-light bg-surface text-accent">
            <Edit2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 id={`${fieldPrefix}-heading`} className="text-sm font-semibold text-fg">
              编辑工具：{tool.title}
            </h3>
            <p className="mt-1 text-xs text-muted">
              修改会直接更新当前分类里的链接条目。
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label>
            <span className={editorFieldLabelClassName()}>工具名称</span>
            <input
              value={form.title}
              onChange={(e) => updateForm({ title: e.target.value })}
              className={editorInputClassName}
              {...toolTextInputProps('title')}
              {...titleProps}
            />
            <ToolFieldError id={titleProps.id} message={titleError} />
          </label>
          <label>
            <span className={editorFieldLabelClassName()}>URL</span>
            <input
              value={form.url}
              onChange={(e) => updateForm({ url: e.target.value })}
              className={editorInputClassName}
              {...toolTextInputProps('url')}
              {...urlProps}
            />
            <ToolFieldError id={urlProps.id} message={urlError} />
          </label>
          <label>
            <span className={editorFieldLabelClassName()}>描述</span>
            <input
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              className={editorInputClassName}
              {...toolTextInputProps('description')}
              {...descriptionProps}
            />
            <ToolFieldError id={descriptionProps.id} message={descriptionError} />
          </label>
          <label>
            <span className={editorFieldLabelClassName()}>标签</span>
            <input
              value={form.tags.join(', ')}
              onChange={(e) => updateForm({ tags: normalizeTagsInput(e.target.value) })}
              className={editorInputClassName}
              {...toolTextInputProps('tags')}
              {...tagsProps}
            />
            <ToolFieldError id={tagsProps.id} message={tagsError} />
          </label>
        </div>
        {validationError ? (
          <p className="mt-3 text-sm text-error-600">{validationError.message}</p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <EditorButton
            onClick={handleSave}
            className="px-3 py-1.5"
            variant="primary"
          >
            <Check className="w-3 h-3" />
            保存
          </EditorButton>
          <EditorButton
            onClick={onCancel}
            className="px-3 py-1.5"
            variant="ghost"
          >
            <X className="w-3 h-3" />
            取消
          </EditorButton>
        </div>
      </section>
    );
  }

  return (
    <div className="group grid gap-3 px-4 py-2.5 transition-colors hover:bg-background/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <Link2 className="mt-1 h-4 w-4 shrink-0 text-subtle" />
        <div className="min-w-0">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="truncate font-medium text-fg">{tool.title}</span>
            {tool.tags.length > 0 && (
              <span className="line-clamp-1 text-xs text-subtle sm:shrink-0">({tool.tags.join(', ')})</span>
            )}
          </div>
          <div className="mt-1 line-clamp-2 text-sm text-muted">{tool.description || tool.url}</div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-token-card text-subtle transition-colors hover:bg-accent-50 hover:text-accent focus:ring-2 focus:ring-link focus:ring-offset-2 sm:min-h-9 sm:min-w-9"
          aria-label={`打开工具：${tool.title}`}
        >
          <Link2 className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-token-card text-subtle transition-colors hover:bg-accent-50 hover:text-accent focus:ring-2 focus:ring-link focus:ring-offset-2 sm:min-h-9 sm:min-w-9"
          aria-label={`编辑工具：${tool.title}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={cn(
            'inline-flex min-h-11 min-w-11 items-center justify-center rounded-token-card transition-colors focus:ring-2 focus:ring-link focus:ring-offset-2 sm:min-h-9 sm:min-w-9',
            isDeleting
              ? 'bg-error-50 text-error-600'
              : 'text-subtle hover:bg-error-50 hover:text-error-600'
          )}
          aria-label={`${isDeleting ? '确认删除工具' : '删除工具'}：${tool.title}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

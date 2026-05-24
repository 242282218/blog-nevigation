'use client';

import { useState, useCallback } from 'react';
import { Plus, Download, Upload, RotateCcw, Folder, Link2, Trash2, Edit2, X, Check } from 'lucide-react';
import { useNavigationData } from '@/app/hooks/useNavigationData';
import { Tool } from '@/app/types/navigation';
import { isValidNavigationUrl } from '@/lib/navigation-data';
import { EmptyState, StatusMessage } from '@/app/components/ui';
import { LogoutButton } from '../components/LogoutButton';
import {
  EditorButton,
  EditorMain,
  EditorPage,
  EditorPanel,
  EditorTopBar,
  editorInputClassName,
} from '../components/EditorShell';

function normalizeTagsInput(value: string): string[] {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function editorFieldLabelClassName() {
  return 'mb-1.5 block text-xs font-mono text-muted';
}

function validateTool(tool: Tool): string | null {
  if (!tool.title.trim()) {
    return '请填写工具名称。';
  }

  if (!isValidNavigationUrl(tool.url)) {
    return 'URL 必须是完整的 https:// 链接。';
  }

  if (!tool.description.trim()) {
    return '请填写工具描述。';
  }

  if (tool.tags.filter(Boolean).length === 0) {
    return '请至少填写一个标签。';
  }

  return null;
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
    lastRemoteSaveError,
  } = useNavigationData();

  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editingTool, setEditingTool] = useState<{ categoryIndex: number; toolIndex: number } | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTool, setShowAddTool] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [categoryFormError, setCategoryFormError] = useState('');
  const [toolFormError, setToolFormError] = useState('');
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
      setToolFormError('');
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
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const imported = importData(content);
          setMessage(imported
            ? { tone: 'success', text: '导航数据已导入。' }
            : { tone: 'danger', text: '导航数据导入失败，请检查 JSON 格式。' });
        }
      };
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
    <EditorPage className="pb-20">
      <EditorTopBar
        title="导航编辑器"
        description={`${data.length} 个分类，${data.reduce((acc, cat) => acc + cat.tools.length, 0)} 个工具`}
        eyebrow="editor.navigation"
        backHref="/editor"
        actions={(
          <>
            <LogoutButton />
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-token-card border border-border bg-surface px-3 py-2 text-sm font-medium text-fg transition hover:border-border hover:bg-surface focus-within:ring-2 focus-within:ring-link focus-within:ring-offset-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">导入</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <EditorButton
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">导出</span>
            </EditorButton>

            <EditorButton
              onClick={handleReset}
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

      <EditorMain className="space-y-6">
        {lastConflictAt ? (
          <StatusMessage tone="warning">
            服务器上的导航数据更新较新，已载入服务器版本；请确认当前内容后继续编辑。
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
          <EditorPanel className="p-6">
            <h3 className="mb-4 text-lg font-medium text-fg">添加分类</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label>
                <span className={editorFieldLabelClassName()}>分类名称</span>
                <input
                  type="text"
                  placeholder="常用入口"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className={editorInputClassName}
                />
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
            <div className="mt-4 flex gap-2">
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
          <div className="space-y-8">
            {data.map((category, categoryIndex) => (
              <EditorPanel key={categoryIndex} className="overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-border bg-background/70 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
                  {editingCategory === categoryIndex ? (
                    <label className="flex-1">
                      <span className={editorFieldLabelClassName()}>分类名称</span>
                      <input
                        type="text"
                        defaultValue={category.name}
                        onBlur={(e) => {
                          updateCategory(categoryIndex, { name: e.currentTarget.value });
                          setMessage({ tone: 'success', text: '分类名称已更新。' });
                          setEditingCategory(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateCategory(categoryIndex, { name: e.currentTarget.value });
                            setMessage({ tone: 'success', text: '分类名称已更新。' });
                            setEditingCategory(null);
                          }
                        }}
                        className={editorInputClassName}
                        autoFocus
                      />
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
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(categoryIndex)}
                        className="rounded-token-card p-2 text-subtle transition-colors hover:bg-accent-50 hover:text-accent focus:ring-2 focus:ring-link focus:ring-offset-2"
                        aria-label={`编辑分类：${category.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(categoryIndex)}
                        className={deleteConfirm === `category:${categoryIndex}`
                          ? 'rounded-token-card bg-error-50 p-2 text-error-600 transition-colors focus:ring-2 focus:ring-link focus:ring-offset-2'
                          : 'rounded-token-card p-2 text-subtle transition-colors hover:bg-error-50 hover:text-error-600 focus:ring-2 focus:ring-link focus:ring-offset-2'}
                        aria-label={`${deleteConfirm === `category:${categoryIndex}` ? '确认删除分类' : '删除分类'}：${category.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <EditorButton
                      onClick={() => setShowAddTool(categoryIndex)}
                      className="min-h-8 whitespace-nowrap px-3 py-1.5"
                      variant="accent"
                    >
                      <Plus className="h-3 w-3" />
                      添加工具
                    </EditorButton>
                  </div>
                </div>

                {showAddTool === categoryIndex && (
                  <div className="border-b border-border bg-accent-50/60 p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label>
                        <span className={editorFieldLabelClassName()}>工具名称</span>
                        <input
                          type="text"
                          placeholder="MDN Web Docs"
                          value={toolForm.title}
                          onChange={(e) => setToolForm({ ...toolForm, title: e.target.value })}
                          className={editorInputClassName}
                        />
                      </label>
                      <label>
                        <span className={editorFieldLabelClassName()}>URL</span>
                        <input
                          type="text"
                          placeholder="https://developer.mozilla.org"
                          value={toolForm.url}
                          onChange={(e) => setToolForm({ ...toolForm, url: e.target.value })}
                          className={editorInputClassName}
                        />
                      </label>
                      <label>
                        <span className={editorFieldLabelClassName()}>描述</span>
                        <input
                          type="text"
                          placeholder="说明这个入口解决什么问题"
                          value={toolForm.description}
                          onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                          className={editorInputClassName}
                        />
                      </label>
                      <label>
                        <span className={editorFieldLabelClassName()}>标签</span>
                        <input
                          type="text"
                          placeholder="文档, Web, 参考"
                          value={toolForm.tags.join(', ')}
                          onChange={(e) =>
                            setToolForm({
                              ...toolForm,
                              tags: normalizeTagsInput(e.target.value),
                            })
                          }
                          className={editorInputClassName}
                        />
                      </label>
                    </div>
                    {toolFormError ? (
                      <p className="mt-3 text-sm text-error-600">{toolFormError}</p>
                    ) : null}
                    <div className="mt-4 flex gap-2">
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
                  </div>
                )}

                <div className="divide-y divide-border-soft">
                  {category.tools.map((tool, toolIndex) => (
                    <ToolItem
                      key={toolIndex}
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
  tool: Tool;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  isDeleting: boolean;
  onSave: (updates: Partial<Tool>) => void;
  onCancel: () => void;
}

function ToolItem({ tool, onEdit, onDelete, isEditing, isDeleting, onSave, onCancel }: ToolItemProps) {
  const [form, setForm] = useState(tool);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = () => {
    const normalizedTool = {
      ...form,
      icon: form.icon.trim() || 'link',
      title: form.title.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
      tags: form.tags.filter(Boolean),
    };
    const validationError = validateTool(normalizedTool);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage('');
    onSave(normalizedTool);
  };

  if (isEditing) {
    return (
      <div className="bg-accent-50/60 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label>
            <span className={editorFieldLabelClassName()}>工具名称</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={editorInputClassName}
            />
          </label>
          <label>
            <span className={editorFieldLabelClassName()}>URL</span>
            <input
              type="text"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className={editorInputClassName}
            />
          </label>
          <label>
            <span className={editorFieldLabelClassName()}>描述</span>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={editorInputClassName}
            />
          </label>
          <label>
            <span className={editorFieldLabelClassName()}>标签</span>
            <input
              type="text"
              value={form.tags.join(', ')}
              onChange={(e) => setForm({ ...form, tags: normalizeTagsInput(e.target.value) })}
              className={editorInputClassName}
            />
          </label>
        </div>
        {errorMessage ? (
          <p className="mt-3 text-sm text-error-600">{errorMessage}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <EditorButton
            onClick={handleSave}
            className="min-h-8 px-3 py-1.5"
            variant="primary"
          >
            <Check className="w-3 h-3" />
            保存
          </EditorButton>
          <EditorButton
            onClick={onCancel}
            className="min-h-8 px-3 py-1.5"
            variant="ghost"
          >
            <X className="w-3 h-3" />
            取消
          </EditorButton>
        </div>
      </div>
    );
  }

  return (
    <div className="group grid gap-3 px-4 py-3 transition-colors hover:bg-background/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
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
      <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-token-card p-2 text-subtle transition-colors hover:bg-accent-50 hover:text-accent"
          aria-label={`打开工具：${tool.title}`}
        >
          <Link2 className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-token-card p-2 text-subtle transition-colors hover:bg-accent-50 hover:text-accent"
          aria-label={`编辑工具：${tool.title}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={isDeleting
            ? 'rounded-token-card bg-error-50 p-2 text-error-600 transition-colors focus:ring-2 focus:ring-link focus:ring-offset-2'
            : 'rounded-token-card p-2 text-subtle transition-colors hover:bg-error-50 hover:text-error-600 focus:ring-2 focus:ring-link focus:ring-offset-2'}
          aria-label={`${isDeleting ? '确认删除工具' : '删除工具'}：${tool.title}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

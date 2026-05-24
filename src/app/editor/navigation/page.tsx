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
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">导入</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              <EditorButton
                onClick={handleExport}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">导出</span>
              </EditorButton>

              <EditorButton
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">重置</span>
              </EditorButton>

              <EditorButton
                onClick={() => setShowAddCategory(true)}
                variant="primary"
              >
                <Plus className="w-4 h-4" />
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
            <h3 className="text-lg font-medium text-fg mb-4">添加分类</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="分类名称"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className={editorInputClassName}
              />
              <input
                type="text"
                placeholder="图标 (可选)"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                className={editorInputClassName}
              />
              <input
                type="text"
                placeholder="slug (可选)"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                className={editorInputClassName}
              />
            </div>
            {categoryFormError ? (
              <p className="mt-3 text-sm text-red-500">{categoryFormError}</p>
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
              <div className="flex flex-col gap-3 border-b border-border bg-background/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                {editingCategory === categoryIndex ? (
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="text"
                      defaultValue={category.name}
                      onBlur={(e) => {
                        updateCategory(categoryIndex, { name: e.target.value });
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
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-3">
                    <Folder className="h-5 w-5 shrink-0 text-accent" />
                    <h2 className="min-w-0 text-lg font-medium text-fg">{category.name}</h2>
                    <span className="text-sm text-subtle">({category.tools.length})</span>
                  </div>
                )}

                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                  <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingCategory(categoryIndex)}
                    className="rounded-token-card p-2 text-subtle transition-colors hover:bg-accent-50 hover:text-accent"
                    aria-label={`编辑分类：${category.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const deleted = deleteCategory(categoryIndex);
                      setMessage(deleted
                        ? { tone: 'success', text: '分类已删除。' }
                        : { tone: 'danger', text: '分类删除失败。' });
                    }}
                    className="rounded-token-card p-2 text-subtle transition-colors hover:bg-error-50 hover:text-error-600"
                    aria-label={`删除分类：${category.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  </div>
                  <EditorButton
                    onClick={() => setShowAddTool(categoryIndex)}
                    className="min-h-8 whitespace-nowrap px-3 py-1.5"
                    variant="accent"
                  >
                    <Plus className="w-3 h-3" />
                    添加工具
                  </EditorButton>
                </div>
              </div>

              {showAddTool === categoryIndex && (
                <div className="border-b border-border bg-accent-50/60 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="工具名称 *"
                      value={toolForm.title}
                      onChange={(e) => setToolForm({ ...toolForm, title: e.target.value })}
                      className={editorInputClassName}
                    />
                    <input
                      type="text"
                      placeholder="URL *"
                      value={toolForm.url}
                      onChange={(e) => setToolForm({ ...toolForm, url: e.target.value })}
                      className={editorInputClassName}
                    />
                    <input
                      type="text"
                      placeholder="描述"
                      value={toolForm.description}
                      onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                      className={editorInputClassName}
                    />
                    <input
                      type="text"
                      placeholder="标签 (逗号分隔)"
                      value={toolForm.tags.join(', ')}
                      onChange={(e) =>
                        setToolForm({
                          ...toolForm,
                          tags: normalizeTagsInput(e.target.value),
                        })
                      }
                      className={editorInputClassName}
                    />
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
                    onDelete={() => {
                      const deleted = deleteTool(categoryIndex, toolIndex);
                      setMessage(deleted
                        ? { tone: 'success', text: '工具链接已删除。' }
                        : { tone: 'danger', text: '工具链接删除失败。' });
                    }}
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
  onSave: (updates: Partial<Tool>) => void;
  onCancel: () => void;
}

function ToolItem({ tool, onEdit, onDelete, isEditing, onSave, onCancel }: ToolItemProps) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={editorInputClassName}
          />
          <input
            type="text"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className={editorInputClassName}
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={editorInputClassName}
          />
          <input
            type="text"
            value={form.tags.join(', ')}
            onChange={(e) => setForm({ ...form, tags: normalizeTagsInput(e.target.value) })}
            className={editorInputClassName}
          />
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
    <div className="group flex items-center justify-between px-6 py-3 transition-colors hover:bg-background/70">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link2 className="w-4 h-4 text-subtle" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-fg truncate">{tool.title}</span>
            {tool.tags.length > 0 && (
              <span className="text-xs text-subtle">({tool.tags.join(', ')})</span>
            )}
          </div>
          <div className="text-sm text-muted truncate">{tool.description || tool.url}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
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
          onClick={onEdit}
          className="rounded-token-card p-2 text-subtle transition-colors hover:bg-accent-50 hover:text-accent"
          aria-label={`编辑工具：${tool.title}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-token-card p-2 text-subtle transition-colors hover:bg-error-50 hover:text-error-600"
          aria-label={`删除工具：${tool.title}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

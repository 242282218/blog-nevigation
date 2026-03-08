'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Download, Upload, RotateCcw, Folder, Link2, Trash2, Edit2, X, Check } from 'lucide-react';
import { useNavigationData } from '@/app/hooks/useNavigationData';
import { Tool } from '@/app/types/navigation';
import { LogoutButton } from '../components/LogoutButton';

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
  } = useNavigationData();

  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editingTool, setEditingTool] = useState<{ categoryIndex: number; toolIndex: number } | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTool, setShowAddTool] = useState<number | null>(null);

  // 表单状态
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'folder', slug: '' });
  const [toolForm, setToolForm] = useState<Tool>({
    icon: 'link',
    title: '',
    description: '',
    url: '',
    tags: [],
  });

  // 添加分类
  const handleAddCategory = useCallback(() => {
    if (!categoryForm.name.trim()) return;
    addCategory({
      name: categoryForm.name,
      icon: categoryForm.icon,
      slug: categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
    });
    setCategoryForm({ name: '', icon: 'folder', slug: '' });
    setShowAddCategory(false);
  }, [categoryForm, addCategory]);

  // 添加工具
  const handleAddTool = useCallback(
    (categoryIndex: number) => {
      if (!toolForm.title.trim() || !toolForm.url.trim()) return;
      addTool(categoryIndex, {
        ...toolForm,
        tags: toolForm.tags.filter(Boolean),
      });
      setToolForm({
        icon: 'link',
        title: '',
        description: '',
        url: '',
        tags: [],
      });
      setShowAddTool(null);
    },
    [toolForm, addTool]
  );

  // 导出数据
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
  }, [exportData]);

  // 导入数据
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          importData(content);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importData]
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/navigation"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">导航编辑器</h1>
                <p className="text-sm text-gray-500">
                  {data.length} 个分类，{data.reduce((acc, cat) => acc + cat.tools.length, 0)} 个工具
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LogoutButton />
              {/* 导入 */}
              <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">导入</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>

              {/* 导出 */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">导出</span>
              </button>

              {/* 重置 */}
              <button
                onClick={resetToDefault}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">重置</span>
              </button>

              {/* 添加分类 */}
              <button
                onClick={() => setShowAddCategory(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加分类
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* 添加分类表单 */}
        {showAddCategory && (
          <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">添加分类</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="分类名称"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="图标 (可选)"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="slug (可选)"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                确认添加
              </button>
              <button
                onClick={() => setShowAddCategory(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 分类列表 */}
        <div className="space-y-8">
          {data.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* 分类头部 */}
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                {editingCategory === categoryIndex ? (
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="text"
                      defaultValue={category.name}
                      onBlur={(e) => {
                        updateCategory(categoryIndex, { name: e.target.value });
                        setEditingCategory(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateCategory(categoryIndex, { name: e.currentTarget.value });
                          setEditingCategory(null);
                        }
                      }}
                      className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Folder className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-medium text-gray-900">{category.name}</h2>
                    <span className="text-sm text-gray-400">({category.tools.length})</span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingCategory(categoryIndex)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(categoryIndex)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowAddTool(categoryIndex)}
                    className="ml-2 flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    添加工具
                  </button>
                </div>
              </div>

              {/* 添加工具表单 */}
              {showAddTool === categoryIndex && (
                <div className="p-4 border-b border-gray-200 bg-blue-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="工具名称 *"
                      value={toolForm.title}
                      onChange={(e) => setToolForm({ ...toolForm, title: e.target.value })}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="URL *"
                      value={toolForm.url}
                      onChange={(e) => setToolForm({ ...toolForm, url: e.target.value })}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="描述"
                      value={toolForm.description}
                      onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="标签 (逗号分隔)"
                      value={toolForm.tags.join(', ')}
                      onChange={(e) =>
                        setToolForm({
                          ...toolForm,
                          tags: e.target.value.split(',').map((t) => t.trim()),
                        })
                      }
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleAddTool(categoryIndex)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      确认添加
                    </button>
                    <button
                      onClick={() => setShowAddTool(null)}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* 工具列表 */}
              <div className="divide-y divide-gray-100">
                {category.tools.map((tool, toolIndex) => (
                  <ToolItem
                    key={toolIndex}
                    tool={tool}
                    onEdit={() => setEditingTool({ categoryIndex, toolIndex })}
                    onDelete={() => deleteTool(categoryIndex, toolIndex)}
                    isEditing={
                      editingTool?.categoryIndex === categoryIndex &&
                      editingTool?.toolIndex === toolIndex
                    }
                    onSave={(updates) => {
                      updateTool(categoryIndex, toolIndex, updates);
                      setEditingTool(null);
                    }}
                    onCancel={() => setEditingTool(null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// 工具项组件
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

  if (isEditing) {
    return (
      <div className="p-4 bg-blue-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={form.tags.join(', ')}
            onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((t) => t.trim()) })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Check className="w-3 h-3" />
            保存
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" />
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link2 className="w-4 h-4 text-gray-400" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{tool.title}</span>
            {tool.tags.length > 0 && (
              <span className="text-xs text-gray-400">({tool.tags.join(', ')})</span>
            )}
          </div>
          <div className="text-sm text-gray-500 truncate">{tool.description || tool.url}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Link2 className="w-4 h-4" />
        </a>
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Edit2, Trash2, Download, Upload, Calendar, Tag } from 'lucide-react';
import { useLocalArticles } from '@/app/hooks/useLocalArticles';
import { TemplateSelector } from './components/TemplateSelector';
import { Article } from '@/app/types/article';
import { LogoutButton } from '../components/LogoutButton';

export default function BlogEditorPage() {
  const router = useRouter();
  const { articles, deleteArticle, exportArticle, exportArticlesData, importArticle, isLoaded } = useLocalArticles();
  const [showTemplates, setShowTemplates] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 选择模板
  const handleSelectTemplate = useCallback((templateId: string) => {
    router.push(`/editor/blog/new?template=${templateId}`);
  }, [router]);

  // 编辑文章
  const handleEdit = useCallback((articleId: string) => {
    router.push(`/editor/blog/new?edit=${articleId}`);
  }, [router]);

  // 删除文章
  const handleDelete = useCallback((articleId: string) => {
    if (deleteConfirm === articleId) {
      deleteArticle(articleId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(articleId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  }, [deleteConfirm, deleteArticle]);

  // 导出文章
  const handleExport = useCallback((article: Article) => {
    const markdown = exportArticle(article);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title || 'article'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportArticle]);

  const handleExportAll = useCallback(() => {
    const json = exportArticlesData();
    const blob = new Blob([json], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'blog-articles.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportArticlesData]);

  // 导入文章
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importArticle(content);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 重置 input
  }, [importArticle]);

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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">博客管理</h1>
              <p className="mt-1 text-sm text-gray-500">
                共 {articles.length} 篇文章
              </p>
            </div>
            <div className="flex items-center gap-3">
              <LogoutButton />
              <button
                onClick={handleExportAll}
                disabled={articles.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">导出</span>
              </button>
              {/* 导入按钮 */}
              <label className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">导入</span>
                <input
                  type="file"
                  accept=".md,.markdown"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>

              {/* 新建按钮 */}
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建文章
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* 模板选择区 */}
        {showTemplates && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">选择模板</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                收起
              </button>
            </div>
            <TemplateSelector onSelect={handleSelectTemplate} />
          </div>
        )}

        {/* 文章列表 */}
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">还没有文章</h3>
            <p className="text-gray-500 mb-6">点击"新建文章"开始写作，或导入已有文章</p>
            <button
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建文章
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onEdit={() => handleEdit(article.id)}
                onDelete={() => handleDelete(article.id)}
                onExport={() => handleExport(article)}
                isDeleting={deleteConfirm === article.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// 文章卡片组件
interface ArticleCardProps {
  article: Article;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  isDeleting: boolean;
}

function ArticleCard({ article, onEdit, onDelete, onExport, isDeleting }: ArticleCardProps) {
  return (
    <div className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {article.title || '无标题'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {article.description || '暂无描述'}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {article.date || '未设置日期'}
            </span>
            {article.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {article.tags.join(', ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onExport}
            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
            title="导出"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className={`p-2 rounded-lg transition-colors ${
              isDeleting
                ? 'text-red-500 bg-red-50'
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
            title={isDeleting ? '确认删除？' : '删除'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Download, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { PreviewPane } from '../components/PreviewPane';
import { FrontmatterForm } from '../components/FrontmatterForm';
import { useLocalArticles } from '@/app/hooks/useLocalArticles';
import { getTemplateById } from '@/lib/templates';
import { Frontmatter } from '@/app/types/article';
import { LogoutButton } from '../../components/LogoutButton';

export function NewArticleContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const editId = searchParams.get('edit');

  const { createArticle, updateArticleContent, getArticleById, exportArticle } = useLocalArticles();

  const [content, setContent] = useState('');
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    tags: [],
  });
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // 初始化：加载模板或编辑的文章
  useEffect(() => {
    if (editId) {
      // 编辑模式：加载已有文章
      const article = getArticleById(editId);
      if (article) {
        setContent(article.content);
        setFrontmatter({
          title: article.title,
          date: article.date,
          description: article.description,
          tags: article.tags,
        });
      }
    } else if (templateId) {
      // 模板模式：加载模板
      const template = getTemplateById(templateId);
      if (template) {
        setContent(template.content);
        setFrontmatter({
          ...template.frontmatter,
          date: new Date().toISOString().split('T')[0],
        });
      }
    }
  }, [templateId, editId, getArticleById]);

  // 保存文章
  const handleSave = useCallback(async () => {
    if (!frontmatter.title.trim()) {
      alert('请输入文章标题');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      if (editId) {
        // 更新已有文章
        updateArticleContent(editId, frontmatter, content);
      } else {
        // 创建新文章
        createArticle(frontmatter, content);
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [editId, frontmatter, content, createArticle, updateArticleContent]);

  // 导出 Markdown
  const handleExport = useCallback(() => {
    const article = {
      id: editId || 'new',
      title: frontmatter.title,
      date: frontmatter.date,
      description: frontmatter.description,
      tags: frontmatter.tags,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const markdown = exportArticle(article);
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${frontmatter.title || 'article'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [frontmatter, content, editId, exportArticle]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧：返回按钮和标题 */}
            <div className="flex items-center gap-4">
              <Link
                href="/editor/blog"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-800">
                  {editId ? '编辑文章' : '新建文章'}
                </h1>
                <p className="text-xs text-gray-500 font-mono">
                  {frontmatter.title || '无标题'}
                </p>
              </div>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
              <LogoutButton />
              {/* 预览切换 */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span className="hidden sm:inline">隐藏预览</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">显示预览</span>
                  </>
                )}
              </button>

              {/* 导出按钮 */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">导出</span>
              </button>

              {/* 保存按钮 */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  saveStatus === 'success'
                    ? 'bg-green-500 text-white'
                    : saveStatus === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSaving ? '保存中...' : saveStatus === 'success' ? '已保存' : '保存'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Frontmatter 表单 */}
      <FrontmatterForm value={frontmatter} onChange={setFrontmatter} />

      {/* 编辑器主体 */}
      <div className="flex h-[calc(100vh-200px)]">
        {/* 编辑区 */}
        <div
          className={`${showPreview ? 'w-1/2' : 'w-full'} border-r border-gray-200`}
        >
          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="开始编写 Markdown..."
          />
        </div>

        {/* 预览区 */}
        {showPreview && (
          <div className="w-1/2 bg-white">
            <PreviewPane content={content} />
          </div>
        )}
      </div>
    </div>
  );
}

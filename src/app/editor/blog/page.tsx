'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock3,
  Download,
  Edit2,
  FileText,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { useLocalArticles } from '@/app/hooks/useLocalArticles';
import { TemplateSelector } from './components/TemplateSelector';
import { Article } from '@/app/types/article';
import { StatusMessage } from '@/app/components/ui';
import { cn } from '@/lib/utils';
import { LogoutButton } from '../components/LogoutButton';
import {
  EditorButton,
  EditorMain,
  EditorPage,
  EditorTopBar,
} from '../components/EditorShell';

function countArticleWords(content: string): number {
  const cjkCount = content.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const wordCount = content
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return cjkCount + wordCount;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

export default function BlogEditorPage() {
  const router = useRouter();
  const { articles, deleteArticle, exportArticle, exportArticlesData, importArticle, isLoaded } = useLocalArticles();
  const [showTemplates, setShowTemplates] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sortedArticles = useMemo(
    () => [...articles].sort((first, second) => second.updatedAt - first.updatedAt),
    [articles]
  );
  const latestArticle = sortedArticles[0];
  const filteredArticles = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) {
      return sortedArticles;
    }

    return sortedArticles.filter((article) => {
      const haystack = [
        article.title,
        article.description,
        article.date,
        article.tags.join(' '),
      ].join(' ').toLowerCase();

      return haystack.includes(keyword);
    });
  }, [searchTerm, sortedArticles]);

  const handleSelectTemplate = useCallback((templateId: string) => {
    router.push(`/editor/blog/new?template=${templateId}`);
  }, [router]);

  const handleEdit = useCallback((articleId: string) => {
    router.push(`/editor/blog/new?edit=${articleId}`);
  }, [router]);

  const handleDelete = useCallback((articleId: string) => {
    if (deleteConfirm === articleId) {
      const deleted = deleteArticle(articleId);
      setDeleteConfirm(null);
      setMessage(deleted
        ? { tone: 'success', text: '文章已删除。' }
        : { tone: 'danger', text: '未找到要删除的文章。' });
    } else {
      setDeleteConfirm(articleId);
      setMessage({ tone: 'info', text: '再次点击删除按钮确认删除。' });
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  }, [deleteConfirm, deleteArticle]);

  const handleExport = useCallback((article: Article) => {
    const markdown = exportArticle(article);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${article.title || 'article'}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setMessage({ tone: 'success', text: '文章 Markdown 已导出。' });
  }, [exportArticle]);

  const handleExportAll = useCallback(() => {
    const json = exportArticlesData();
    const blob = new Blob([json], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'blog-articles.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setMessage({ tone: 'success', text: '全部文章 JSON 已导出。' });
  }, [exportArticlesData]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const content = readerEvent.target?.result as string;

      if (content) {
        const imported = importArticle(content);
        setMessage(imported
          ? { tone: 'success', text: '文章已导入。' }
          : { tone: 'danger', text: '文章导入失败，请检查 Markdown frontmatter。' });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [importArticle]);

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
        title="博客管理"
        description={`共 ${articles.length} 篇文章`}
        eyebrow="editor.blog"
        backHref="/editor"
        width="xl"
        actions={(
          <>
            <LogoutButton />
            <EditorButton
              onClick={handleExportAll}
              disabled={articles.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">导出</span>
            </EditorButton>
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-token-card border border-border bg-surface px-3 py-2 text-sm font-medium text-fg transition hover:border-border hover:bg-surface focus-within:ring-2 focus-within:ring-link focus-within:ring-offset-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">导入</span>
              <input
                type="file"
                accept=".md,.markdown"
                onChange={handleImport}
                className="hidden"
              />
            </label>

            <EditorButton
              onClick={() => setShowTemplates((current) => !current)}
              variant="primary"
            >
              <Plus className="w-4 h-4" />
              新建文章
            </EditorButton>
          </>
        )}
      />

      <EditorMain width="xl" className="space-y-8">
        {message ? (
          <StatusMessage tone={message.tone}>
            {message.text}
          </StatusMessage>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-token-card border border-border bg-surface p-5 shadow-token-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs text-accent">compose</p>
                <h2 className="mt-1 text-xl font-semibold text-fg">开始一篇新文章</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  模板已经按教程、源码、排障、发布记录等场景整理好，可以直接进入写作。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <EditorButton onClick={() => handleSelectTemplate('blank')} variant="accent">
                  <FileText className="h-4 w-4" />
                  空白文章
                </EditorButton>
                <EditorButton onClick={() => setShowTemplates(true)}>
                  <Sparkles className="h-4 w-4" />
                  模板库
                </EditorButton>
              </div>
            </div>
          </div>

          <div className="rounded-token-card border border-border bg-surface p-5 shadow-token-card">
            <p className="font-mono text-xs text-accent">recent</p>
            {latestArticle ? (
              <>
                <h2 className="mt-1 truncate text-lg font-semibold text-fg">
                  {latestArticle.title || '无标题'}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                  {latestArticle.description || '暂无描述'}
                </p>
                <button
                  type="button"
                  onClick={() => handleEdit(latestArticle.id)}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-800"
                >
                  <Edit2 className="h-4 w-4" />
                  继续编辑
                </button>
              </>
            ) : (
              <div className="mt-4 rounded-token-card border border-dashed border-border bg-background p-4 text-sm text-subtle">
                暂无最近文章
              </div>
            )}
          </div>
        </section>

        {(showTemplates || articles.length === 0) && (
          <section className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-accent">templates</p>
                <h2 className="mt-1 text-lg font-semibold text-fg">选择写作模板</h2>
              </div>
              {articles.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowTemplates(false)}
                  className="text-sm text-muted hover:text-fg"
                >
                  收起
                </button>
              ) : null}
            </div>
            <TemplateSelector onSelect={handleSelectTemplate} compact />
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs text-accent">articles</p>
              <h2 className="mt-1 text-lg font-semibold text-fg">文章列表</h2>
            </div>
            <label className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索标题、描述或标签"
                className="w-full rounded-token-card border border-border bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none transition focus:border-link focus:ring-2 focus:ring-link/20"
              />
            </label>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="rounded-token-card border border-dashed border-border bg-surface p-8 text-center text-sm text-subtle">
              {articles.length === 0 ? '还没有文章' : '没有匹配的文章'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
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
        </section>
      </EditorMain>
    </EditorPage>
  );
}

interface ArticleCardProps {
  article: Article;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  isDeleting: boolean;
}

function ArticleCard({ article, onEdit, onDelete, onExport, isDeleting }: ArticleCardProps) {
  const wordCount = countArticleWords(article.content);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 450));

  return (
    <div className="group rounded-token-card border border-border bg-surface p-5 shadow-token-card transition-all hover:border-accent-300 hover:shadow-token-card-hover">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 text-left"
          aria-label={`编辑文章：${article.title || '无标题'}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium text-fg transition-colors group-hover:text-accent">
              {article.title || '无标题'}
            </h3>
            {!article.title ? (
              <span className="rounded-token-badge bg-warning-50 px-2 py-1 text-xs text-warning-600">
                草稿
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted line-clamp-2">
            {article.description || '暂无描述'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-subtle">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {article.date || '未设置日期'}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="w-3 h-3" />
              {readingMinutes} 分钟
            </span>
            <span>{formatDate(article.updatedAt)} 更新</span>
            {article.tags.length > 0 && (
              <span className="flex min-w-0 items-center gap-1">
                <Tag className="w-3 h-3 shrink-0" />
                <span className="truncate">{article.tags.join(', ')}</span>
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-token-card p-2 text-subtle transition-colors hover:bg-accent-50 hover:text-accent"
            title="编辑"
            aria-label={`编辑文章：${article.title || '无标题'}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onExport}
            className="rounded-token-card p-2 text-subtle transition-colors hover:bg-success-50 hover:text-success"
            title="导出"
            aria-label={`导出文章：${article.title || '无标题'}`}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className={cn(
              'rounded-token-card p-2 transition-colors',
              isDeleting
                ? 'bg-error-50 text-error-600'
                : 'text-subtle hover:bg-error-50 hover:text-error-600'
            )}
            title={isDeleting ? '确认删除？' : '删除'}
            aria-label={`${isDeleting ? '确认删除文章' : '删除文章'}：${article.title || '无标题'}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

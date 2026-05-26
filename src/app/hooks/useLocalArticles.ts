'use client';

import { useCallback } from 'react';
import type { Article, Frontmatter } from '@/app/types/article';
import { useSyncedResource } from '@/app/hooks/useSyncedResource';
import {
  createArticleSlug,
  filterArticlesData,
  normalizeStoredSlug,
  parseArticlesData,
} from '@/lib/article-data';
import { normalizeArticleKind, normalizeArticleStatus } from '@/lib/article-metadata';
import {
  parseMarkdownWithFrontmatter,
  serializeMarkdownWithFrontmatter,
} from '@/lib/frontmatter';

const STORAGE_KEY = 'blog-local-articles';
const ARTICLES_API_PATH = '/api/data/articles';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function loadArticlesFromStorage(): Article[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? filterArticlesData(JSON.parse(stored)) : [];
  } catch (error) {
    console.error('Failed to load articles from localStorage:', error);
    return [];
  }
}

function saveArticlesToStorage(articles: Article[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch (error) {
    console.error('Failed to save articles to localStorage:', error);
  }
}

async function loadArticlesFromServer() {
  try {
    const response = await fetch(ARTICLES_API_PATH, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;

      return {
        error: true as const,
        message: typeof payload?.message === 'string'
          ? payload.message
          : `文章数据从服务器加载失败（HTTP ${response.status}）。`,
      };
    }

    const payload = (await response.json()) as { articles?: unknown; revision?: unknown };
    const articles = parseArticlesData(payload.articles);

    if (!articles) {
      return {
        error: true as const,
        message: '服务器返回的文章数据格式无效。',
      };
    }

    return {
      data: articles,
      revision: typeof payload.revision === 'string' ? payload.revision : null,
    };
  } catch (error) {
    console.error('Failed to load articles from server:', error);
    return {
      error: true as const,
      message: error instanceof Error ? error.message : '文章数据从服务器加载失败。',
    };
  }
}

async function saveArticlesToServer(
  articles: Article[],
  context: { revision: string | null }
) {
  try {
    const response = await fetch(ARTICLES_API_PATH, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ articles, revision: context.revision }),
    });

    const payload = (await response.json().catch(() => null)) as {
      articles?: unknown;
      revision?: unknown;
    } | null;

    if (response.status === 409) {
      const articles = parseArticlesData(payload?.articles);

      if (!articles) {
        return {
          error: true as const,
          message: '服务器返回的文章冲突数据格式无效，请刷新后重试。',
        };
      }

      return {
        conflict: true as const,
        data: articles,
        revision: typeof payload?.revision === 'string' ? payload.revision : null,
      };
    }

    if (!response.ok) {
      if (response.status === 503) {
        return {
          error: true as const,
          message: '服务器未配置持久化数据目录，文章只保存在当前浏览器。',
        };
      }

      console.error('Failed to persist articles to server:', response.status);
      return {
        error: true as const,
        message: `文章同步到服务器失败（HTTP ${response.status}）。`,
      };
    }

    return {
      revision: typeof payload?.revision === 'string' ? payload.revision : context.revision,
    };
  } catch (error) {
    console.error('Failed to persist articles to server:', error);
    return {
      error: true as const,
      message: error instanceof Error ? error.message : '文章同步到服务器失败。',
    };
  }
}

export function useLocalArticles() {
  const {
    data: articles,
    setData: setArticles,
    isLoaded,
    lastConflictAt,
    lastRemoteLoadError,
    lastRemoteSaveError,
  } = useSyncedResource<Article[]>({
    initialValue: [],
    loadLocal: loadArticlesFromStorage,
    saveLocal: saveArticlesToStorage,
    loadRemote: loadArticlesFromServer,
    saveRemote: saveArticlesToServer,
  });

  const createArticle = useCallback((frontmatter: Frontmatter, content: string): Article => {
    const now = Date.now();
    const newArticle: Article = {
      id: generateId(),
      title: frontmatter.title || 'Untitled',
      slug: normalizeStoredSlug(frontmatter.slug) || undefined,
      date: frontmatter.date || getTodayString(),
      updatedDate: frontmatter.updatedDate || undefined,
      description: frontmatter.description || '',
      kind: normalizeArticleKind(frontmatter.kind),
      status: normalizeArticleStatus(frontmatter.status, 'draft'),
      category: frontmatter.category?.trim() || undefined,
      series: frontmatter.series?.trim() || undefined,
      featured: Boolean(frontmatter.featured),
      tags: frontmatter.tags || [],
      content,
      createdAt: now,
      updatedAt: now,
      sourceLinks: frontmatter.sourceLinks || [],
      revisionNotes: frontmatter.revisionNotes || [],
      templateId: frontmatter.templateId,
    };
    newArticle.slug = newArticle.slug || createArticleSlug(newArticle);

    setArticles((previous) => [newArticle, ...previous]);
    return newArticle;
  }, [setArticles]);

  const updateArticle = useCallback((id: string, updates: Partial<Article>): Article | null => {
    let updated: Article | null = null;

    setArticles((previous) =>
      previous.map((article) => {
        if (article.id !== id) {
          return article;
        }

        updated = {
          ...article,
          ...updates,
          updatedAt: Date.now(),
        };

        return updated;
      })
    );

    return updated;
  }, [setArticles]);

  const updateArticleContent = useCallback(
    (id: string, frontmatter: Frontmatter, content: string): Article | null =>
      updateArticle(id, {
        title: frontmatter.title,
        slug: normalizeStoredSlug(frontmatter.slug) || undefined,
        date: frontmatter.date,
        updatedDate: frontmatter.updatedDate || undefined,
        description: frontmatter.description,
        kind: normalizeArticleKind(frontmatter.kind),
        status: normalizeArticleStatus(frontmatter.status, 'draft'),
        category: frontmatter.category?.trim() || undefined,
        series: frontmatter.series?.trim() || undefined,
        featured: Boolean(frontmatter.featured),
        tags: frontmatter.tags,
        content,
        sourceLinks: frontmatter.sourceLinks || [],
        revisionNotes: frontmatter.revisionNotes || [],
        templateId: frontmatter.templateId,
      }),
    [updateArticle]
  );

  const deleteArticle = useCallback(
    (id: string): boolean => {
      const target = articles.find((article) => article.id === id);

      if (!target) {
        return false;
      }

      setArticles((previous) => previous.filter((article) => article.id !== id));
      return true;
    },
    [articles, setArticles]
  );

  const getArticleById = useCallback(
    (id: string): Article | undefined => articles.find((article) => article.id === id),
    [articles]
  );

  const exportArticle = useCallback(
    (article: Article): string =>
      serializeMarkdownWithFrontmatter({
        title: article.title,
        date: article.date,
        updatedDate: article.updatedDate,
        description: article.description,
        slug: article.slug,
        kind: article.kind,
        status: article.status,
        category: article.category,
        series: article.series,
        featured: article.featured,
        tags: article.tags,
        sourceLinks: article.sourceLinks,
        revisionNotes: article.revisionNotes,
        templateId: article.templateId,
        content: article.content,
      }),
    []
  );

  const exportArticlesData = useCallback(
    (): string => JSON.stringify(articles, null, 2),
    [articles]
  );

  const importArticle = useCallback(
    (markdown: string): Article | null => {
      try {
        const parsed = parseMarkdownWithFrontmatter(markdown);

        return createArticle(
          {
            title: parsed.frontmatter.title || 'Imported Article',
            slug: parsed.frontmatter.slug,
            date: parsed.frontmatter.date || getTodayString(),
            updatedDate: parsed.frontmatter.updatedDate,
            description: parsed.frontmatter.description || '',
            kind: parsed.frontmatter.kind,
            status: parsed.frontmatter.status || 'draft',
            category: parsed.frontmatter.category,
            series: parsed.frontmatter.series,
            featured: parsed.frontmatter.featured,
            tags: parsed.frontmatter.tags || [],
            sourceLinks: parsed.frontmatter.sourceLinks || [],
            revisionNotes: parsed.frontmatter.revisionNotes || [],
            templateId: parsed.frontmatter.templateId,
          },
          parsed.content
        );
      } catch (error) {
        console.error('Failed to import article:', error);
        return null;
      }
    },
    [createArticle]
  );

  const clearAllArticles = useCallback((): void => {
    setArticles([]);
  }, [setArticles]);

  return {
    articles,
    isLoaded,
    lastConflictAt,
    lastRemoteLoadError,
    lastRemoteSaveError,
    totalCount: articles.length,
    createArticle,
    updateArticle,
    updateArticleContent,
    deleteArticle,
    getArticleById,
    exportArticle,
    exportArticlesData,
    importArticle,
    clearAllArticles,
  };
}

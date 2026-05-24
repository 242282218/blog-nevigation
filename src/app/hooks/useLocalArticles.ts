'use client';

import { useCallback } from 'react';
import type { Article, Frontmatter } from '@/app/types/article';
import { useSyncedResource } from '@/app/hooks/useSyncedResource';
import { createArticleSlug, filterArticlesData } from '@/lib/article-data';
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
      return null;
    }

    const payload = (await response.json()) as { articles?: unknown; revision?: unknown };

    return {
      data: filterArticlesData(payload.articles),
      revision: typeof payload.revision === 'string' ? payload.revision : null,
    };
  } catch (error) {
    console.error('Failed to load articles from server:', error);
    return null;
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
      return {
        conflict: true as const,
        data: filterArticlesData(payload?.articles),
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
      date: frontmatter.date || getTodayString(),
      description: frontmatter.description || '',
      tags: frontmatter.tags || [],
      content,
      createdAt: now,
      updatedAt: now,
    };
    newArticle.slug = createArticleSlug(newArticle);

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
        date: frontmatter.date,
        description: frontmatter.description,
        tags: frontmatter.tags,
        content,
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
        description: article.description,
        tags: article.tags,
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
            date: parsed.frontmatter.date || getTodayString(),
            description: parsed.frontmatter.description || '',
            tags: parsed.frontmatter.tags || [],
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

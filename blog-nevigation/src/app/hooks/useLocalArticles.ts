/*
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Article, Frontmatter } from '@/app/types/article';
import {
  parseMarkdownWithFrontmatter,
  serializeMarkdownWithFrontmatter,
} from '@/lib/frontmatter';

const STORAGE_KEY = 'blog-local-articles';

// 生成唯一 ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 获取今天的日期字符串
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// 从 LocalStorage 读取文章
function loadArticlesFromStorage(): Article[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load articles from storage:', error);
  }
  return [];
}

// 保存文章到 LocalStorage
function saveArticlesToStorage(articles: Article[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch (error) {
    console.error('Failed to save articles to storage:', error);
  }
}

export function useLocalArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始化时从 LocalStorage 加载
  useEffect(() => {
    const loaded = loadArticlesFromStorage();
    setArticles(loaded);
    setIsLoaded(true);
  }, []);

  // 文章变化时保存到 LocalStorage
  useEffect(() => {
    if (isLoaded) {
      saveArticlesToStorage(articles);
    }
  }, [articles, isLoaded]);

  // 创建新文章
  const createArticle = useCallback((frontmatter: Frontmatter, content: string): Article => {
    const now = Date.now();
    const newArticle: Article = {
      id: generateId(),
      title: frontmatter.title || '无标题',
      date: frontmatter.date || getTodayString(),
      description: frontmatter.description || '',
      tags: frontmatter.tags || [],
      content,
      createdAt: now,
      updatedAt: now,
    };
    
    setArticles((prev) => [newArticle, ...prev]);
    return newArticle;
  }, []);

  // 更新文章
  const updateArticle = useCallback((id: string, updates: Partial<Article>): Article | null => {
    let updated: Article | null = null;
    
    setArticles((prev) =>
      prev.map((article) => {
        if (article.id === id) {
          updated = {
            ...article,
            ...updates,
            updatedAt: Date.now(),
          };
          return updated;
        }
        return article;
      })
    );
    
    return updated;
  }, []);

  // 更新文章内容和 Frontmatter
  const updateArticleContent = useCallback(
    (id: string, frontmatter: Frontmatter, content: string): Article | null => {
      return updateArticle(id, {
        title: frontmatter.title,
        date: frontmatter.date,
        description: frontmatter.description,
        tags: frontmatter.tags,
        content,
      });
    },
    [updateArticle]
  );

  // 删除文章
  const deleteArticle = useCallback((id: string): boolean => {
    const article = articles.find((a) => a.id === id);
    if (!article) return false;
    
    setArticles((prev) => prev.filter((a) => a.id !== id));
    return true;
  }, [articles]);

  // 根据 ID 获取文章
  const getArticleById = useCallback(
    (id: string): Article | undefined => {
      return articles.find((a) => a.id === id);
    },
    [articles]
  );

  // 导出文章为 Markdown 文件
  const exportArticle = useCallback((article: Article): string => {
    return serializeMarkdownWithFrontmatter({
      title: article.title,
      date: article.date,
      description: article.description,
      tags: article.tags,
      content: article.content,
    });
  }, []);

  // 导入 Markdown 文件
  const importArticle = useCallback((markdown: string): Article | null => {
    try {
      const parsed = parseMarkdownWithFrontmatter(markdown);

      return createArticle(
        {
          title: parsed.frontmatter.title || '导入的文章',
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
  }, [createArticle]);

  // 清空所有文章
  const clearAllArticles = useCallback((): void => {
    setArticles([]);
  }, []);

  // 获取文章总数
  const totalCount = articles.length;

  return {
    articles,
    isLoaded,
    totalCount,
    createArticle,
    updateArticle,
    updateArticleContent,
    deleteArticle,
    getArticleById,
    exportArticle,
    importArticle,
    clearAllArticles,
  };
}
*/
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Article, Frontmatter } from '@/app/types/article';
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isArticle(value: unknown): value is Article {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.description === 'string' &&
    isStringArray(candidate.tags) &&
    typeof candidate.content === 'string' &&
    isFiniteNumber(candidate.createdAt) &&
    isFiniteNumber(candidate.updatedAt)
  );
}

function parseArticles(value: unknown): Article[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isArticle);
}

function loadArticlesFromStorage(): Article[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseArticles(JSON.parse(stored)) : [];
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

async function loadArticlesFromServer(): Promise<Article[] | null> {
  try {
    const response = await fetch(ARTICLES_API_PATH, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { articles?: unknown };
    return parseArticles(payload.articles);
  } catch (error) {
    console.error('Failed to load articles from server:', error);
    return null;
  }
}

async function saveArticlesToServer(articles: Article[]): Promise<void> {
  try {
    const response = await fetch(ARTICLES_API_PATH, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ articles }),
    });

    if (!response.ok) {
      console.error('Failed to persist articles to server:', response.status);
    }
  } catch (error) {
    console.error('Failed to persist articles to server:', error);
  }
}

export function useLocalArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      const remoteArticles = await loadArticlesFromServer();

      if (cancelled) {
        return;
      }

      if (remoteArticles) {
        setArticles(remoteArticles);
        saveArticlesToStorage(remoteArticles);
      } else {
        setArticles(loadArticlesFromStorage());
      }

      setIsLoaded(true);
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    saveArticlesToStorage(articles);

    const timer = window.setTimeout(() => {
      void saveArticlesToServer(articles);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [articles, isLoaded]);

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

    setArticles((previous) => [newArticle, ...previous]);
    return newArticle;
  }, []);

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
  }, []);

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
    [articles]
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
  }, []);

  return {
    articles,
    isLoaded,
    totalCount: articles.length,
    createArticle,
    updateArticle,
    updateArticleContent,
    deleteArticle,
    getArticleById,
    exportArticle,
    importArticle,
    clearAllArticles,
  };
}

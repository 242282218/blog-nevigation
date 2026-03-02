'use client';

import { useState, useEffect, useCallback } from 'react';
import { Article, Frontmatter } from '@/app/types/article';

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
    const frontmatter = `---
title: ${article.title}
date: ${article.date}
description: ${article.description}
tags: [${article.tags.join(', ')}]
---

`;
    return frontmatter + article.content;
  }, []);

  // 导入 Markdown 文件
  const importArticle = useCallback((markdown: string): Article | null => {
    try {
      // 简单的 frontmatter 解析
      const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      
      let title = '导入的文章';
      let date = getTodayString();
      let description = '';
      let tags: string[] = [];
      let content = markdown;

      if (frontmatterMatch) {
        const frontmatterText = frontmatterMatch[1];
        content = frontmatterMatch[2].trim();

        // 解析 frontmatter
        const titleMatch = frontmatterText.match(/title:\s*(.+)/);
        if (titleMatch) title = titleMatch[1].trim();

        const dateMatch = frontmatterText.match(/date:\s*(.+)/);
        if (dateMatch) date = dateMatch[1].trim();

        const descMatch = frontmatterText.match(/description:\s*(.+)/);
        if (descMatch) description = descMatch[1].trim();

        const tagsMatch = frontmatterText.match(/tags:\s*\[(.*?)\]/);
        if (tagsMatch) {
          tags = tagsMatch[1].split(',').map((t) => t.trim()).filter(Boolean);
        }
      }

      return createArticle({ title, date, description, tags }, content);
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

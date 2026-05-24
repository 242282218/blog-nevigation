'use client';

import { useCallback } from 'react';
import type { Category, Tool } from '@/app/types/navigation';
import defaultNavData from '@/content/seeds/navigation/data/tools.json';
import { useSyncedResource } from '@/app/hooks/useSyncedResource';
import { parseNavigationData } from '@/lib/navigation-data';

const STORAGE_KEY = 'blog-navigation-data';
const NAVIGATION_API_PATH = '/api/data/navigation';

function loadNavDataFromStorage(): Category[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    return parseNavigationData(JSON.parse(stored));
  } catch (error) {
    console.error('Failed to load navigation data from localStorage:', error);
    return null;
  }
}

function saveNavDataToStorage(data: Category[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save navigation data to localStorage:', error);
  }
}

async function loadNavDataFromServer() {
  try {
    const response = await fetch(NAVIGATION_API_PATH, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { categories?: unknown; revision?: unknown };
    const categories = parseNavigationData(payload.categories);

    return categories
      ? {
        data: categories,
        revision: typeof payload.revision === 'string' ? payload.revision : null,
      }
      : null;
  } catch (error) {
    console.error('Failed to load navigation data from server:', error);
    return null;
  }
}

async function saveNavDataToServer(
  categories: Category[],
  context: { revision: string | null }
) {
  try {
    const response = await fetch(NAVIGATION_API_PATH, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categories, revision: context.revision }),
    });

    const payload = (await response.json().catch(() => null)) as {
      categories?: unknown;
      revision?: unknown;
    } | null;

    if (response.status === 409) {
      return {
        conflict: true as const,
        data: parseNavigationData(payload?.categories) ?? [],
        revision: typeof payload?.revision === 'string' ? payload.revision : null,
      };
    }

    if (!response.ok) {
      if (response.status === 503) {
        return {
          error: true as const,
          message: '服务器未配置持久化数据目录，导航只保存在当前浏览器。',
        };
      }

      console.error('Failed to persist navigation data to server:', response.status);
      return {
        error: true as const,
        message: `导航同步到服务器失败（HTTP ${response.status}）。`,
      };
    }

    return {
      revision: typeof payload?.revision === 'string' ? payload.revision : context.revision,
    };
  } catch (error) {
    console.error('Failed to persist navigation data to server:', error);
    return {
      error: true as const,
      message: error instanceof Error ? error.message : '导航同步到服务器失败。',
    };
  }
}

export function useNavigationData() {
  const { data, setData, isLoaded, lastConflictAt, lastRemoteSaveError } = useSyncedResource<Category[]>({
    initialValue: () => parseNavigationData(defaultNavData) ?? [],
    loadLocal: loadNavDataFromStorage,
    saveLocal: saveNavDataToStorage,
    loadRemote: loadNavDataFromServer,
    saveRemote: saveNavDataToServer,
  });

  const addCategory = useCallback((category: Omit<Category, 'tools'> & { tools?: Tool[] }): Category => {
    const newCategory: Category = {
      ...category,
      tools: category.tools || [],
    };

    setData((previous) => [...previous, newCategory]);
    return newCategory;
  }, [setData]);

  const updateCategory = useCallback((index: number, updates: Partial<Category>): Category | null => {
    let updated: Category | null = null;

    setData((previous) => {
      if (index < 0 || index >= previous.length) {
        return previous;
      }

      const next = [...previous];
      updated = { ...next[index], ...updates };
      next[index] = updated;
      return next;
    });

    return updated;
  }, [setData]);

  const deleteCategory = useCallback((index: number): boolean => {
    let success = false;

    setData((previous) => {
      if (index < 0 || index >= previous.length) {
        return previous;
      }

      success = true;
      return previous.filter((_, currentIndex) => currentIndex !== index);
    });

    return success;
  }, [setData]);

  const addTool = useCallback((categoryIndex: number, tool: Tool): Tool | null => {
    let added: Tool | null = null;

    setData((previous) => {
      if (categoryIndex < 0 || categoryIndex >= previous.length) {
        return previous;
      }

      const next = [...previous];
      added = tool;
      next[categoryIndex] = {
        ...next[categoryIndex],
        tools: [...next[categoryIndex].tools, tool],
      };
      return next;
    });

    return added;
  }, [setData]);

  const updateTool = useCallback(
    (categoryIndex: number, toolIndex: number, updates: Partial<Tool>): Tool | null => {
      let updated: Tool | null = null;

      setData((previous) => {
        if (
          categoryIndex < 0 ||
          categoryIndex >= previous.length ||
          toolIndex < 0 ||
          toolIndex >= previous[categoryIndex].tools.length
        ) {
          return previous;
        }

        const next = [...previous];
        const nextTools = [...next[categoryIndex].tools];
        updated = { ...nextTools[toolIndex], ...updates };
        nextTools[toolIndex] = updated;
        next[categoryIndex] = {
          ...next[categoryIndex],
          tools: nextTools,
        };
        return next;
      });

      return updated;
    },
    [setData]
  );

  const deleteTool = useCallback((categoryIndex: number, toolIndex: number): boolean => {
    let success = false;

    setData((previous) => {
      if (
        categoryIndex < 0 ||
        categoryIndex >= previous.length ||
        toolIndex < 0 ||
        toolIndex >= previous[categoryIndex].tools.length
      ) {
        return previous;
      }

      success = true;
      const next = [...previous];
      next[categoryIndex] = {
        ...next[categoryIndex],
        tools: next[categoryIndex].tools.filter((_, currentIndex) => currentIndex !== toolIndex),
      };
      return next;
    });

    return success;
  }, [setData]);

  const exportData = useCallback((): string => JSON.stringify(data, null, 2), [data]);

  const importData = useCallback((json: string): boolean => {
    try {
      const parsed = parseNavigationData(JSON.parse(json));

      if (!parsed) {
        return false;
      }

      setData(parsed);
      return true;
    } catch (error) {
      console.error('Failed to import navigation data:', error);
      return false;
    }
  }, [setData]);

  const resetToDefault = useCallback((): void => {
    setData(parseNavigationData(defaultNavData) ?? []);
  }, [setData]);

  return {
    data,
    isLoaded,
    lastConflictAt,
    lastRemoteSaveError,
    addCategory,
    updateCategory,
    deleteCategory,
    addTool,
    updateTool,
    deleteTool,
    exportData,
    importData,
    resetToDefault,
  };
}

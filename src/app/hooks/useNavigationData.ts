'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Category, Tool } from '@/app/types/navigation';
import defaultNavData from '@/content/seeds/navigation/data/tools.json';
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

async function loadNavDataFromServer(): Promise<Category[] | null> {
  try {
    const response = await fetch(NAVIGATION_API_PATH, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { categories?: unknown };
    return parseNavigationData(payload.categories);
  } catch (error) {
    console.error('Failed to load navigation data from server:', error);
    return null;
  }
}

async function saveNavDataToServer(categories: Category[]): Promise<void> {
  try {
    const response = await fetch(NAVIGATION_API_PATH, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ categories }),
    });

    if (!response.ok) {
      if (response.status === 503) {
        return;
      }

      console.error('Failed to persist navigation data to server:', response.status);
    }
  } catch (error) {
    console.error('Failed to persist navigation data to server:', error);
  }
}

export function useNavigationData() {
  const [data, setData] = useState<Category[]>(parseNavigationData(defaultNavData) ?? []);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      const remoteData = await loadNavDataFromServer();

      if (cancelled) {
        return;
      }

      if (remoteData) {
        setData(remoteData);
        saveNavDataToStorage(remoteData);
      } else {
        const localData = loadNavDataFromStorage();
        if (localData) {
          setData(localData);
        }
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

    saveNavDataToStorage(data);

    const timer = window.setTimeout(() => {
      void saveNavDataToServer(data);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data, isLoaded]);

  const addCategory = useCallback((category: Omit<Category, 'tools'> & { tools?: Tool[] }): Category => {
    const newCategory: Category = {
      ...category,
      tools: category.tools || [],
    };

    setData((previous) => [...previous, newCategory]);
    return newCategory;
  }, []);

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
  }, []);

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
  }, []);

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
  }, []);

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
    []
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
  }, []);

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
  }, []);

  const resetToDefault = useCallback((): void => {
    setData(parseNavigationData(defaultNavData) ?? []);
  }, []);

  return {
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
  };
}

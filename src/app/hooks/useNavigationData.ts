/*
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Category, Tool } from '@/app/types/navigation';
import defaultNavData from '@/content/seeds/navigation/data/tools.json';
import { parseNavigationData } from '@/lib/navigation-data';

const STORAGE_KEY = 'blog-navigation-data';

// 从 LocalStorage 读取导航数据
function loadNavDataFromStorage(): Category[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return parseNavigationData(JSON.parse(stored));
    }
  } catch (error) {
    console.error('Failed to load navigation data from storage:', error);
  }
  return null;
}

// 保存导航数据到 LocalStorage
function saveNavDataToStorage(data: Category[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save navigation data to storage:', error);
  }
}

export function useNavigationData() {
  const [data, setData] = useState<Category[]>(
    parseNavigationData(defaultNavData) ?? []
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始化时从 LocalStorage 加载
  useEffect(() => {
    const stored = loadNavDataFromStorage();
    if (stored) {
      setData(stored);
    }
    setIsLoaded(true);
  }, []);

  // 数据变化时保存到 LocalStorage
  useEffect(() => {
    if (isLoaded) {
      saveNavDataToStorage(data);
    }
  }, [data, isLoaded]);

  // 添加分类
  const addCategory = useCallback((category: Omit<Category, 'tools'> & { tools?: Tool[] }): Category => {
    const newCategory: Category = {
      ...category,
      tools: category.tools || [],
    };
    setData((prev) => [...prev, newCategory]);
    return newCategory;
  }, []);

  // 更新分类
  const updateCategory = useCallback((index: number, updates: Partial<Category>): Category | null => {
    let updated: Category | null = null;
    setData((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const newData = [...prev];
      updated = { ...newData[index], ...updates };
      newData[index] = updated;
      return newData;
    });
    return updated;
  }, []);

  // 删除分类
  const deleteCategory = useCallback((index: number): boolean => {
    let success = false;
    setData((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      success = true;
      return prev.filter((_, i) => i !== index);
    });
    return success;
  }, []);

  // 添加工具到分类
  const addTool = useCallback((categoryIndex: number, tool: Tool): Tool | null => {
    let added: Tool | null = null;
    setData((prev) => {
      if (categoryIndex < 0 || categoryIndex >= prev.length) return prev;
      const newData = [...prev];
      added = tool;
      newData[categoryIndex] = {
        ...newData[categoryIndex],
        tools: [...newData[categoryIndex].tools, tool],
      };
      return newData;
    });
    return added;
  }, []);

  // 更新工具
  const updateTool = useCallback(
    (categoryIndex: number, toolIndex: number, updates: Partial<Tool>): Tool | null => {
      let updated: Tool | null = null;
      setData((prev) => {
        if (
          categoryIndex < 0 ||
          categoryIndex >= prev.length ||
          toolIndex < 0 ||
          toolIndex >= prev[categoryIndex].tools.length
        ) {
          return prev;
        }
        const newData = [...prev];
        const newTools = [...newData[categoryIndex].tools];
        updated = { ...newTools[toolIndex], ...updates };
        newTools[toolIndex] = updated;
        newData[categoryIndex] = {
          ...newData[categoryIndex],
          tools: newTools,
        };
        return newData;
      });
      return updated;
    },
    []
  );

  // 删除工具
  const deleteTool = useCallback((categoryIndex: number, toolIndex: number): boolean => {
    let success = false;
    setData((prev) => {
      if (
        categoryIndex < 0 ||
        categoryIndex >= prev.length ||
        toolIndex < 0 ||
        toolIndex >= prev[categoryIndex].tools.length
      ) {
        return prev;
      }
      success = true;
      const newData = [...prev];
      newData[categoryIndex] = {
        ...newData[categoryIndex],
        tools: newData[categoryIndex].tools.filter((_, i) => i !== toolIndex),
      };
      return newData;
    });
    return success;
  }, []);

  // 导出数据为 JSON
  const exportData = useCallback((): string => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  // 导入数据
  const importData = useCallback((json: string): boolean => {
    try {
      const parsed = parseNavigationData(JSON.parse(json));
      if (parsed) {
        setData(parsed);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import navigation data:', error);
      return false;
    }
  }, []);

  // 重置为默认数据
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
*/
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Category, Tool } from '@/app/types/navigation';
import defaultNavData from '@/content/posts/navigation/data/tools.json';

const STORAGE_KEY = 'blog-navigation-data';

// 从 LocalStorage 读取导航数据
function loadNavDataFromStorage(): Category[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
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
  const [data, setData] = useState<Category[]>(defaultNavData as Category[]);
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
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
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
    setData(defaultNavData as Category[]);
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

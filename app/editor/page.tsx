/*
import Link from 'next/link';
import { FileText, Compass, ArrowRight } from 'lucide-react';
import { LogoutButton } from './components/LogoutButton';

export default function EditorHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">写作中心</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理你的博客文章和导航链接
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 博客编辑器入口 */}
          <Link
            href="/editor/blog"
            className="group p-8 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="p-4 bg-blue-50 text-blue-500 rounded-xl group-hover:bg-blue-100 transition-colors">
                <FileText className="w-8 h-8" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              博客编辑器
            </h2>
            <p className="mt-2 text-gray-500">
              使用 Markdown 编写博客文章，支持实时预览和多种模板
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <span>开始写作</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* 导航编辑器入口 */}
          <Link
            href="/editor/navigation"
            className="group p-8 bg-white border border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="p-4 bg-purple-50 text-purple-500 rounded-xl group-hover:bg-purple-100 transition-colors">
                <Compass className="w-8 h-8" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
              导航编辑器
            </h2>
            <p className="mt-2 text-gray-500">
              管理导航分类和工具链接，自定义你的网址导航
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-purple-600">
              <span>编辑导航</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* 功能说明 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="w-10 h-10 bg-green-50 text-green-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">本地存储</h3>
            <p className="mt-2 text-sm text-gray-500">
              数据保存在浏览器本地，刷新页面不会丢失
            </p>
          </div>

          <div className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">导入导出</h3>
            <p className="mt-2 text-sm text-gray-500">
              支持导入导出 Markdown 和 JSON 文件，方便备份和迁移
            </p>
          </div>

          <div className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900">多种模板</h3>
            <p className="mt-2 text-sm text-gray-500">
              提供技术教程、学习笔记、项目总结等多种文章模板
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
*/
'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { FileText, Compass, ArrowRight, Download, Upload } from 'lucide-react';
import { LogoutButton } from './components/LogoutButton';

type BackupPayload = {
  version?: number;
  exportedAt?: string;
  articles?: unknown;
  navigation?: unknown;
};

function createBackupFileName(exportedAt?: string): string {
  const timestamp = exportedAt
    ? exportedAt.replace(/[:]/g, '-').replace(/\..+$/, '')
    : new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');

  return `blog-nevigation-backup-${timestamp}.json`;
}

export default function EditorHomePage() {
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleBackup = useCallback(async () => {
    setIsBusy(true);
    setMessage('');

    try {
      const response = await fetch('/api/data/backup', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`backup_failed_${response.status}`);
      }

      const payload = (await response.json()) as BackupPayload;
      const fileContent = JSON.stringify(payload, null, 2);
      const blob = new Blob([fileContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = createBackupFileName(payload.exportedAt);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setMessage('备份已下载。');
    } catch (error) {
      console.error('Failed to create backup:', error);
      setMessage('备份失败，请稍后重试。');
    } finally {
      setIsBusy(false);
    }
  }, []);

  const openRestorePicker = useCallback(() => {
    restoreInputRef.current?.click();
  }, []);

  const handleRestore = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!window.confirm('恢复会覆盖当前文章和导航数据，确定继续吗？')) {
      return;
    }

    setIsBusy(true);
    setMessage('');

    try {
      const content = await file.text();
      const payload = JSON.parse(content) as BackupPayload;

      const response = await fetch('/api/data/backup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`restore_failed_${response.status}`);
      }

      setMessage('恢复成功，刷新页面后可见最新数据。');
    } catch (error) {
      console.error('Failed to restore backup:', error);
      setMessage('恢复失败，请确认备份文件格式正确。');
    } finally {
      setIsBusy(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">编辑中心</h1>
            <p className="mt-1 text-sm text-gray-500">管理你的博客文章和导航链接</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackup}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              <span>{isBusy ? '处理中...' : '备份数据'}</span>
            </button>

            <button
              type="button"
              onClick={openRestorePicker}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              <span>{isBusy ? '处理中...' : '恢复数据'}</span>
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleRestore}
            />

            <LogoutButton />
          </div>
        </div>
        {message ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4 text-sm text-gray-600">
            {message}
          </div>
        ) : null}
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/editor/blog"
            className="group p-8 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="p-4 bg-blue-50 text-blue-500 rounded-xl group-hover:bg-blue-100 transition-colors">
                <FileText className="w-8 h-8" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              博客编辑器
            </h2>
            <p className="mt-2 text-gray-500">使用 Markdown 编写博客文章，支持实时预览和多种模板</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <span>开始写作</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/editor/navigation"
            className="group p-8 bg-white border border-gray-200 rounded-2xl hover:border-purple-300 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="p-4 bg-purple-50 text-purple-500 rounded-xl group-hover:bg-purple-100 transition-colors">
                <Compass className="w-8 h-8" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
              导航编辑器
            </h2>
            <p className="mt-2 text-gray-500">管理导航分类和工具链接，自定义你的网站导航</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-purple-600">
              <span>编辑导航</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

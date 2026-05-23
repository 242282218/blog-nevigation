'use client';

import { useCallback, useRef, useState } from 'react';
import { FileText, Compass, ArrowRight, Download, Upload, CloudDownload, CloudUpload, Settings } from 'lucide-react';
import { StatusMessage } from '@/app/components/ui';
import { LogoutButton } from './components/LogoutButton';
import {
  EditorActionCard,
  EditorButton,
  EditorMain,
  EditorPage,
  EditorPanel,
  EditorTopBar,
} from './components/EditorShell';

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

  return `blog-navigation-backup-${timestamp}.json`;
}

export default function EditorHomePage() {
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'loading'; text: string } | null>(null);

  const handleBackup = useCallback(async () => {
    setIsBusy(true);
    setMessage({ tone: 'loading', text: '正在生成备份文件...' });

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

      setMessage({ tone: 'success', text: '备份已下载。' });
    } catch (error) {
      console.error('Failed to create backup:', error);
      setMessage({ tone: 'danger', text: '备份失败，请稍后重试。' });
    } finally {
      setIsBusy(false);
    }
  }, []);

  const openRestorePicker = useCallback(() => {
    restoreInputRef.current?.click();
  }, []);

  const handleRemoteSync = useCallback(async () => {
    setIsBusy(true);
    setMessage({ tone: 'loading', text: '正在同步云端备份...' });

    try {
      const response = await fetch('/api/data/backup/remote', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'sync' }),
      });

      if (!response.ok) {
        throw new Error(`remote_sync_failed_${response.status}`);
      }

      setMessage({ tone: 'success', text: '云端备份已同步。' });
    } catch (error) {
      console.error('Failed to sync remote backup:', error);
      setMessage({ tone: 'danger', text: '云端备份失败，请检查 R2 配置。' });
    } finally {
      setIsBusy(false);
    }
  }, []);

  const handleRemoteRestore = useCallback(async () => {
    if (!window.confirm('将从 R2 最新备份覆盖当前服务器数据，确定继续吗？')) {
      return;
    }

    setIsBusy(true);
    setMessage({ tone: 'loading', text: '正在从云端恢复数据...' });

    try {
      const response = await fetch('/api/data/backup/remote', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restore' }),
      });

      if (!response.ok) {
        throw new Error(`remote_restore_failed_${response.status}`);
      }

      setMessage({ tone: 'success', text: '云端恢复成功，刷新页面后可见最新数据。' });
    } catch (error) {
      console.error('Failed to restore remote backup:', error);
      setMessage({ tone: 'danger', text: '云端恢复失败，请检查 R2 配置和备份文件。' });
    } finally {
      setIsBusy(false);
    }
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
    setMessage({ tone: 'loading', text: '正在恢复本地备份...' });

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

      setMessage({ tone: 'success', text: '恢复成功，刷新页面后可见最新数据。' });
    } catch (error) {
      console.error('Failed to restore backup:', error);
      setMessage({ tone: 'danger', text: '恢复失败，请确认备份文件格式正确。' });
    } finally {
      setIsBusy(false);
    }
  }, []);

  return (
    <EditorPage>
      <EditorTopBar
        title="编辑中心"
        description="管理博客文章、导航链接和可迁移数据"
        actions={(
          <>
            <EditorButton
              type="button"
              onClick={handleBackup}
              disabled={isBusy}
            >
              <Download className="h-4 w-4" />
              <span>{isBusy ? '处理中...' : '备份数据'}</span>
            </EditorButton>

            <EditorButton
              type="button"
              onClick={openRestorePicker}
              disabled={isBusy}
            >
              <Upload className="h-4 w-4" />
              <span>{isBusy ? '处理中...' : '恢复数据'}</span>
            </EditorButton>
            <EditorButton
              type="button"
              onClick={handleRemoteSync}
              disabled={isBusy}
            >
              <CloudUpload className="h-4 w-4" />
              <span>{isBusy ? '处理中...' : '同步云端'}</span>
            </EditorButton>

            <EditorButton
              type="button"
              onClick={handleRemoteRestore}
              disabled={isBusy}
            >
              <CloudDownload className="h-4 w-4" />
              <span>{isBusy ? '处理中...' : '云端恢复'}</span>
            </EditorButton>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleRestore}
            />

            <LogoutButton />
          </>
        )}
      />

      <EditorMain className="space-y-6">
        {message ? (
          <StatusMessage tone={message.tone}>
            {message.text}
          </StatusMessage>
        ) : null}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <EditorActionCard
            href="/editor/blog"
            icon={FileText}
            title="博客编辑器"
            description="使用 Markdown 编写文章，保留实时预览、模板和本地优先保存。"
            action="开始写作"
          />

          <EditorActionCard
            href="/editor/navigation"
            icon={Compass}
            title="导航编辑器"
            description="管理分类、工具链接和标签，让公开导航页保持可搜索、可迁移。"
            action="编辑导航"
          />

          <EditorActionCard
            href="/editor/settings"
            icon={Settings}
            title="站点设置"
            description="管理公开站点名称、描述和首页首屏文案，并随备份一起迁移。"
            action="调整设置"
          />
        </section>

        <EditorPanel className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-mono text-xs text-accent">portable data</p>
            <h2 className="mt-1 text-lg font-semibold text-fg">运行时数据边界</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              服务器数据集中在 <code className="rounded-token-card bg-surface px-1.5 py-0.5 font-mono text-fg">data/</code>，
              本页提供 JSON 离线备份与 R2 镜像操作。
            </p>
          </div>
          <ArrowRight className="hidden h-5 w-5 text-subtle md:block" />
        </EditorPanel>
      </EditorMain>
    </EditorPage>
  );
}

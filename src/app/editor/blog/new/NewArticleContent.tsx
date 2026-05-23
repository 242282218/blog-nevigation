'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Columns2,
  Download,
  Edit3,
  Eye,
  FileText,
  Hash,
  ListTree,
  Loader2,
  Save,
} from 'lucide-react';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { PreviewPane } from '../components/PreviewPane';
import { FrontmatterForm } from '../components/FrontmatterForm';
import { useLocalArticles } from '@/app/hooks/useLocalArticles';
import { getDefaultTemplate, getTemplateById } from '@/lib/templates';
import { Frontmatter } from '@/app/types/article';
import { StatusMessage } from '@/app/components/ui';
import { cn } from '@/lib/utils';
import { LogoutButton } from '../../components/LogoutButton';
import {
  EditorButton,
  EditorMain,
  EditorPage,
  EditorTopBar,
} from '../../components/EditorShell';

type EditorMode = 'write' | 'split' | 'preview';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface StoredDraft {
  version: number;
  updatedAt: number;
  content: string;
  frontmatter: Frontmatter;
}

interface HeadingItem {
  level: number;
  text: string;
  index: number;
}

const DRAFT_VERSION = 1;
const DRAFT_KEY_PREFIX = 'blog-editor-article-draft:v2';
const TEXTAREA_ID = 'article-markdown-editor';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function createSnapshot(frontmatter: Frontmatter, content: string): string {
  return JSON.stringify({ frontmatter, content });
}

function normalizeFrontmatter(frontmatter: Frontmatter): Frontmatter {
  return {
    title: frontmatter.title.trim(),
    date: frontmatter.date || getTodayString(),
    description: frontmatter.description.trim(),
    tags: frontmatter.tags.map((tag) => tag.trim()).filter(Boolean),
  };
}

function isFrontmatter(value: unknown): value is Frontmatter {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Frontmatter>;

  return (
    typeof candidate.title === 'string' &&
    typeof candidate.date === 'string' &&
    typeof candidate.description === 'string' &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) => typeof tag === 'string')
  );
}

function readStoredDraft(key: string): StoredDraft | null {
  try {
    const rawDraft = window.localStorage.getItem(key);

    if (!rawDraft) {
      return null;
    }

    const draft = JSON.parse(rawDraft) as Partial<StoredDraft>;

    if (
      draft.version !== DRAFT_VERSION ||
      typeof draft.updatedAt !== 'number' ||
      typeof draft.content !== 'string' ||
      !isFrontmatter(draft.frontmatter)
    ) {
      return null;
    }

    return draft as StoredDraft;
  } catch (error) {
    console.error('Failed to read article draft:', error);
    return null;
  }
}

function writeStoredDraft(key: string, frontmatter: Frontmatter, content: string): number | null {
  try {
    const updatedAt = Date.now();

    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: DRAFT_VERSION,
        updatedAt,
        frontmatter,
        content,
      })
    );

    return updatedAt;
  } catch (error) {
    console.error('Failed to write article draft:', error);
    return null;
  }
}

function clearStoredDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear article draft:', error);
  }
}

function countMarkdownWords(value: string): number {
  const content = value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_[\]()!-]/g, ' ');
  const cjkCount = content.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const wordCount = content
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return cjkCount + wordCount;
}

function getHeadings(content: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  let index = 0;

  for (const line of content.split('\n')) {
    const match = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line.trim());

    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2],
        index,
      });
    }

    index += line.length + 1;
  }

  return headings;
}

function formatDraftTime(timestamp: number | null): string {
  if (!timestamp) {
    return '尚未生成';
  }

  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NewArticleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const editId = searchParams.get('edit');
  const articleKey = editId ? `edit:${editId}` : `new:${templateId || 'blank'}`;
  const draftKey = `${DRAFT_KEY_PREFIX}:${articleKey}`;

  const {
    createArticle,
    updateArticleContent,
    getArticleById,
    exportArticle,
    isLoaded,
  } = useLocalArticles();

  const [content, setContent] = useState('');
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({
    title: '',
    date: getTodayString(),
    description: '',
    tags: [],
  });
  const [editorMode, setEditorMode] = useState<EditorMode>('split');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [statusMessage, setStatusMessage] = useState<{ tone: 'info' | 'success' | 'danger'; text: string } | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [loadedArticleKey, setLoadedArticleKey] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const deferredContent = useDeferredValue(content);

  const currentSnapshot = useMemo(() => createSnapshot(frontmatter, content), [content, frontmatter]);
  const isDirty = Boolean(savedSnapshot && currentSnapshot !== savedSnapshot);
  const wordCount = useMemo(() => countMarkdownWords(content), [content]);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 450));
  const headings = useMemo(() => getHeadings(content), [content]);
  const editingArticle = editId ? getArticleById(editId) : undefined;
  const missingArticle = Boolean(editId && isLoaded && loadedArticleKey === articleKey && !editingArticle);

  useEffect(() => {
    if (!isLoaded || loadedArticleKey === articleKey) {
      return;
    }

    let nextContent = '';
    let nextFrontmatter: Frontmatter = {
      title: '',
      date: getTodayString(),
      description: '',
      tags: [],
    };

    if (editId) {
      const article = getArticleById(editId);

      if (!article) {
        setLoadedArticleKey(articleKey);
        return;
      }

      nextContent = article.content;
      nextFrontmatter = {
        title: article.title,
        date: article.date,
        description: article.description,
        tags: article.tags,
      };
    } else {
      const template = getTemplateById(templateId || 'blank') || getDefaultTemplate();

      nextContent = template.content;
      nextFrontmatter = {
        ...template.frontmatter,
        date: getTodayString(),
      };
    }

    const draft = readStoredDraft(draftKey);

    if (draft) {
      nextContent = draft.content;
      nextFrontmatter = draft.frontmatter;
      setDraftSavedAt(draft.updatedAt);
      setStatusMessage({ tone: 'info', text: '已恢复本机草稿。' });
    } else {
      setDraftSavedAt(null);
    }

    setContent(nextContent);
    setFrontmatter(nextFrontmatter);
    setSavedSnapshot(createSnapshot(nextFrontmatter, nextContent));
    setLoadedArticleKey(articleKey);
    setSaveState('idle');
  }, [articleKey, draftKey, editId, getArticleById, isLoaded, loadedArticleKey, templateId]);

  useEffect(() => {
    if (!isDirty || loadedArticleKey !== articleKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const updatedAt = writeStoredDraft(draftKey, frontmatter, content);

      if (updatedAt) {
        setDraftSavedAt(updatedAt);
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [articleKey, content, draftKey, frontmatter, isDirty, loadedArticleKey]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (isDirty && saveState === 'saved') {
      setSaveState('idle');
    }
  }, [isDirty, saveState]);

  const handleSave = useCallback(async () => {
    const normalizedFrontmatter = normalizeFrontmatter(frontmatter);

    if (!normalizedFrontmatter.title) {
      setSaveState('error');
      setStatusMessage({ tone: 'danger', text: '标题不能为空。' });
      return;
    }

    setSaveState('saving');
    setStatusMessage(null);

    try {
      let savedArticleId = editId;

      if (editId) {
        const updated = updateArticleContent(editId, normalizedFrontmatter, content);

        if (!updated) {
          throw new Error('article_not_found');
        }
      } else {
        const created = createArticle(normalizedFrontmatter, content);
        savedArticleId = created.id;
      }

      setFrontmatter(normalizedFrontmatter);
      setSavedSnapshot(createSnapshot(normalizedFrontmatter, content));
      clearStoredDraft(draftKey);
      setDraftSavedAt(null);
      setSaveState('saved');
      setStatusMessage({ tone: 'success', text: '文章已保存。' });

      if (!editId && savedArticleId) {
        router.replace(`/editor/blog/new?edit=${savedArticleId}`);
      }

      window.setTimeout(() => setSaveState('idle'), 1800);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveState('error');
      setStatusMessage({ tone: 'danger', text: '保存失败，请稍后重试。' });
    }
  }, [content, createArticle, draftKey, editId, frontmatter, router, updateArticleContent]);

  const handleExport = useCallback(() => {
    const normalizedFrontmatter = normalizeFrontmatter(frontmatter);
    const article = {
      id: editId || 'new',
      title: normalizedFrontmatter.title,
      date: normalizedFrontmatter.date,
      description: normalizedFrontmatter.description,
      tags: normalizedFrontmatter.tags,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const markdown = exportArticle(article);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${normalizedFrontmatter.title || 'article'}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [content, editId, exportArticle, frontmatter]);

  const handleJumpToHeading = useCallback((heading: HeadingItem) => {
    if (editorMode === 'preview') {
      setEditorMode('split');
    }

    window.requestAnimationFrame(() => {
      const textarea = document.getElementById(TEXTAREA_ID) as HTMLTextAreaElement | null;

      if (!textarea) {
        return;
      }

      const line = content.slice(0, heading.index).split('\n').length;
      const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 22;

      textarea.focus();
      textarea.setSelectionRange(heading.index, heading.index);
      textarea.scrollTop = Math.max(0, (line - 4) * lineHeight);
    });
  }, [content, editorMode]);

  if (!isLoaded) {
    return (
      <EditorPage className="flex items-center justify-center">
        <div className="animate-pulse text-subtle">加载中...</div>
      </EditorPage>
    );
  }

  if (missingArticle) {
    return (
      <EditorPage>
        <EditorTopBar
          title="文章不存在"
          description="返回文章列表后可以重新选择。"
          eyebrow="editor.article"
          backHref="/editor/blog"
          width="xl"
        />
        <EditorMain width="xl">
          <StatusMessage tone="danger">未找到要编辑的文章。</StatusMessage>
        </EditorMain>
      </EditorPage>
    );
  }

  return (
    <EditorPage className="pb-8">
      <EditorTopBar
        title={editId ? '编辑文章' : '新建文章'}
        description={frontmatter.title || '未命名草稿'}
        eyebrow="editor.article"
        backHref="/editor/blog"
        width="xl"
        actions={(
          <>
            <LogoutButton />
            <EditorButton onClick={handleExport} aria-label="导出 Markdown">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">导出</span>
            </EditorButton>

            <EditorButton
              onClick={handleSave}
              disabled={saveState === 'saving'}
              variant={saveState === 'error' ? 'danger' : isDirty ? 'primary' : saveState === 'saved' ? 'accent' : 'secondary'}
              className={saveState === 'saved' ? 'border-success-light bg-success-50 text-success' : undefined}
            >
              {saveState === 'saving' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveState === 'saved' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : saveState === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saveState === 'saving' ? '保存中' : saveState === 'saved' ? '已保存' : '保存'}</span>
            </EditorButton>
          </>
        )}
      />

      <EditorMain width="xl" className="space-y-4">
        {statusMessage ? (
          <StatusMessage tone={statusMessage.tone}>
            {statusMessage.text}
          </StatusMessage>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <FrontmatterForm value={frontmatter} onChange={setFrontmatter} />
            <WritingInspector
              draftSavedAt={draftSavedAt}
              headings={headings}
              isDirty={isDirty}
              onJumpToHeading={handleJumpToHeading}
              readingMinutes={readingMinutes}
              wordCount={wordCount}
            />
          </aside>

          <section className="overflow-hidden rounded-token-card border border-border bg-surface shadow-token-card">
            <div className="flex flex-col gap-3 border-b border-border bg-background/80 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-xs text-accent">{editId ? 'editing' : 'draft'}</p>
                <h2 className="truncate text-base font-semibold text-fg">
                  {frontmatter.title || '未命名草稿'}
                </h2>
              </div>
              <ModeSwitch value={editorMode} onChange={setEditorMode} />
            </div>

            <div
              className={cn(
                'grid h-[calc(100vh-250px)] min-h-[620px]',
                editorMode === 'split' ? 'grid-rows-2 lg:grid-cols-2 lg:grid-rows-1' : 'grid-cols-1'
              )}
            >
              {editorMode !== 'preview' ? (
                <div className={cn('min-h-0', editorMode === 'split' ? 'border-b border-border lg:border-b-0 lg:border-r' : '')}>
                  <MarkdownEditor
                    textareaId={TEXTAREA_ID}
                    value={content}
                    onChange={setContent}
                    onSave={handleSave}
                    placeholder="开始编写 Markdown..."
                  />
                </div>
              ) : null}

              {editorMode !== 'write' ? (
                <div className="min-h-0">
                  <PreviewPane content={deferredContent} />
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </EditorMain>
    </EditorPage>
  );
}

function ModeSwitch({
  value,
  onChange,
}: {
  value: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  const modes: Array<{ value: EditorMode; label: string; icon: ReactNode }> = [
    { value: 'write', label: '写作', icon: <Edit3 className="h-4 w-4" /> },
    { value: 'split', label: '分栏', icon: <Columns2 className="h-4 w-4" /> },
    { value: 'preview', label: '预览', icon: <Eye className="h-4 w-4" /> },
  ];

  return (
    <div className="inline-flex w-full rounded-token-card border border-border bg-surface p-1 sm:w-auto">
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onChange(mode.value)}
          className={cn(
            'inline-flex min-h-8 flex-1 items-center justify-center gap-2 rounded-token-sm px-3 text-sm font-medium transition sm:flex-none',
            value === mode.value
              ? 'bg-fg text-surface shadow-token-sm'
              : 'text-muted hover:bg-background hover:text-fg'
          )}
          aria-pressed={value === mode.value}
        >
          {mode.icon}
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
}

function WritingInspector({
  wordCount,
  readingMinutes,
  headings,
  draftSavedAt,
  isDirty,
  onJumpToHeading,
}: {
  wordCount: number;
  readingMinutes: number;
  headings: HeadingItem[];
  draftSavedAt: number | null;
  isDirty: boolean;
  onJumpToHeading: (heading: HeadingItem) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-token-card border border-border bg-surface p-4 shadow-token-card">
        <p className="font-mono text-xs text-accent">writing</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric icon={<Hash className="h-4 w-4" />} label="字数" value={wordCount.toString()} />
          <Metric icon={<Clock3 className="h-4 w-4" />} label="阅读" value={`${readingMinutes} 分钟`} />
        </div>
        <div className="mt-4 rounded-token-card border border-border bg-background p-3 text-sm text-muted">
          <div className="flex items-center gap-2">
            {isDirty ? (
              <AlertCircle className="h-4 w-4 text-warning-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-success" />
            )}
            <span>{isDirty ? '有未保存改动' : '内容已保存'}</span>
          </div>
          <p className="mt-2 font-mono text-xs text-subtle">
            draft {formatDraftTime(draftSavedAt)}
          </p>
        </div>
      </section>

      <section className="rounded-token-card border border-border bg-surface p-4 shadow-token-card">
        <div className="flex items-center gap-2">
          <ListTree className="h-4 w-4 text-subtle" />
          <h2 className="text-base font-semibold text-fg">目录</h2>
        </div>
        {headings.length ? (
          <div className="mt-3 space-y-1">
            {headings.slice(0, 12).map((heading) => (
              <button
                key={`${heading.index}-${heading.text}`}
                type="button"
                onClick={() => onJumpToHeading(heading)}
                className={cn(
                  'block w-full truncate rounded-token-sm px-2 py-1.5 text-left text-sm text-muted transition hover:bg-accent-50 hover:text-accent',
                  heading.level === 2 ? 'pl-4' : heading.level === 3 ? 'pl-7' : ''
                )}
              >
                {heading.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-token-card border border-dashed border-border bg-background p-4 text-center text-sm text-subtle">
            <FileText className="mx-auto mb-2 h-5 w-5" />
            暂无标题
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-token-card border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-subtle">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold text-fg">{value}</div>
    </div>
  );
}

'use client';

import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Bold,
  Code2,
  Heading2,
  Image,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  SquareCode,
  Table2,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textareaId?: string;
  onSave?: () => void;
}

interface CursorMetrics {
  line: number;
  column: number;
}

function getCursorMetrics(value: string, cursorIndex: number): CursorMetrics {
  const beforeCursor = value.slice(0, cursorIndex);
  const lines = beforeCursor.split('\n');

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function getWordCount(value: string): number {
  const cjkCount = value.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const wordCount = value
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return cjkCount + wordCount;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  textareaId,
  onSave,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorIndex, setCursorIndex] = useState(0);
  const cursorMetrics = useMemo(() => getCursorMetrics(value, cursorIndex), [cursorIndex, value]);
  const wordCount = useMemo(() => getWordCount(value), [value]);

  const restoreSelection = useCallback((start: number, end = start) => {
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(start, end);
      setCursorIndex(end);
    });
  }, []);

  const replaceSelection = useCallback((nextValue: string, start: number, end = start) => {
    onChange(nextValue);
    restoreSelection(start, end);
  }, [onChange, restoreSelection]);

  const insertText = useCallback((before: string, after = '', fallback = '') => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const body = selectedText || fallback;
    const nextValue = value.slice(0, start) + before + body + after + value.slice(end);
    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + body.length;

    replaceSelection(nextValue, selectedText ? selectionEnd : selectionStart, selectionEnd);
  }, [replaceSelection, value]);

  const insertBlock = useCallback((block: string, selectNeedle?: string) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const needsLeadingBreak = start > 0 && value[start - 1] !== '\n';
    const needsTrailingBreak = end < value.length && value[end] !== '\n';
    const prefix = needsLeadingBreak ? '\n\n' : '';
    const suffix = needsTrailingBreak ? '\n\n' : '\n';
    const insertion = `${prefix}${block}${suffix}`;
    const nextValue = value.slice(0, start) + insertion + value.slice(end);
    const needleIndex = selectNeedle ? insertion.indexOf(selectNeedle) : -1;

    if (needleIndex >= 0 && selectNeedle) {
      const selectionStart = start + needleIndex;
      replaceSelection(nextValue, selectionStart, selectionStart + selectNeedle.length);
      return;
    }

    replaceSelection(nextValue, start + insertion.length);
  }, [replaceSelection, value]);

  const prefixSelectedLines = useCallback((prefixFactory: (lineIndex: number) => string) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const nextBreak = value.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const selectedBlock = value.slice(lineStart, lineEnd);
    const nextBlock = selectedBlock
      .split('\n')
      .map((line, index) => `${prefixFactory(index)}${line}`)
      .join('\n');
    const nextValue = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);

    replaceSelection(nextValue, lineStart, lineStart + nextBlock.length);
  }, [replaceSelection, value]);

  const toolbarActions = {
    heading: () => prefixSelectedLines(() => '## '),
    bold: () => insertText('**', '**', '重点内容'),
    italic: () => insertText('*', '*', '强调内容'),
    code: () => insertText('`', '`', 'code'),
    codeBlock: () => insertBlock('```typescript\nconst value = true;\n```', 'const value = true;'),
    link: () => insertText('[', '](https://example.com)', '链接文字'),
    image: () => insertText('![', '](https://example.com/image.png)', '图片描述'),
    list: () => prefixSelectedLines(() => '- '),
    orderedList: () => prefixSelectedLines((index) => `${index + 1}. `),
    quote: () => prefixSelectedLines(() => '> '),
    task: () => prefixSelectedLines(() => '- [ ] '),
    table: () => insertBlock('| 项目 | 说明 |\n| --- | --- |\n|  |  |'),
    callout: () => insertBlock('> [!NOTE]\n> 这里写提示内容。', '这里写提示内容。'),
    hr: () => insertBlock('---'),
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      onSave?.();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      insertText('  ');
    }
  };

  const handleCursorChange = () => {
    setCursorIndex(textareaRef.current?.selectionStart || 0);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-background/80 p-2">
        <ToolbarButton onClick={toolbarActions.heading} title="标题">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.bold} title="加粗">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.italic} title="斜体">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.code} title="行内代码">
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.codeBlock} title="代码块">
          <SquareCode className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.callout} title="提示块">
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.link} title="链接">
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.image} title="图片">
          <Image className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.list} title="无序列表">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.orderedList} title="有序列表">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.task} title="任务列表">
          <ListChecks className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.table} title="表格">
          <Table2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.quote} title="引用">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.hr} title="分隔线">
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <textarea
        id={textareaId}
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onClick={handleCursorChange}
        onKeyUp={handleCursorChange}
        onSelect={handleCursorChange}
        placeholder={placeholder || '开始编写 Markdown...'}
        className="min-h-0 flex-1 resize-none bg-surface p-4 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-subtle"
        spellCheck={false}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/80 px-3 py-2 font-mono text-xs text-subtle">
        <span>
          Ln {cursorMetrics.line}, Col {cursorMetrics.column}
        </span>
        <span>{wordCount} 字</span>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-8 w-8 items-center justify-center rounded-token-card text-muted transition-colors hover:bg-accent-50 hover:text-accent focus:ring-2 focus:ring-link focus:ring-offset-2"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}

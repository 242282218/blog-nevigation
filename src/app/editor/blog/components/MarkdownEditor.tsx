'use client';

import { useCallback, useRef } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 插入文本到光标位置
  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  // 工具栏操作
  const toolbarActions = {
    heading: () => insertText('## ', ''),
    bold: () => insertText('**', '**'),
    italic: () => insertText('*', '*'),
    code: () => insertText('`', '`'),
    codeBlock: () => insertText('```javascript\n', '\n```'),
    link: () => insertText('[', '](url)'),
    image: () => insertText('![alt](', ')'),
    list: () => insertText('- ', ''),
    orderedList: () => insertText('1. ', ''),
    quote: () => insertText('> ', ''),
    task: () => insertText('- [ ] ', ''),
    hr: () => insertText('\n---\n', ''),
  };

  // 处理 Tab 键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  ');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
        <ToolbarButton onClick={toolbarActions.heading} title="标题">
          <span className="font-bold text-xs">H</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.bold} title="加粗">
          <span className="font-bold text-xs">B</span>
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.italic} title="斜体">
          <span className="italic text-xs">I</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.code} title="行内代码">
          <span className="text-xs font-mono">&lt;/&gt;</span>
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.codeBlock} title="代码块">
          <span className="text-xs font-mono">[]</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.link} title="链接">
          <span className="text-xs">🔗</span>
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.image} title="图片">
          <span className="text-xs">🖼️</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.list} title="无序列表">
          <span className="text-xs">•</span>
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.orderedList} title="有序列表">
          <span className="text-xs">1.</span>
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.task} title="任务列表">
          <span className="text-xs">☑️</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={toolbarActions.quote} title="引用">
          <span className="text-xs">"</span>
        </ToolbarButton>
        <ToolbarButton onClick={toolbarActions.hr} title="分隔线">
          <span className="text-xs">—</span>
        </ToolbarButton>
      </div>

      {/* 编辑区 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || '开始编写 Markdown...'}
        className="flex-1 p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none bg-gray-50/50"
        spellCheck={false}
      />
    </div>
  );
}

// 工具栏按钮
function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 transition-colors"
    >
      {children}
    </button>
  );
}

// 分隔线
function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-300 mx-1" />;
}

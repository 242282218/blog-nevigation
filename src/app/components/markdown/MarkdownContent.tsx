'use client';

import { isValidElement, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    createMarkdownHeadingId,
    getMarkdownHeadings,
    isFirstMarkdownH1DuplicateTitle,
} from '@/lib/article-quality';
import '@/app/styles/markdown-preview.css';

const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [...(defaultSchema.attributes?.code || []), 'className'],
        span: [...(defaultSchema.attributes?.span || []), 'className'],
    },
};

interface MarkdownContentProps {
    content: string;
    className?: string;
    skipDuplicateTitle?: string;
}

function getLanguageFromClassName(className?: string): string {
    const match = /language-([\w-]+)/.exec(className || '');

    return match?.[1] || 'text';
}

function getCodeText(children: ReactNode): string {
    if (typeof children === 'string' || typeof children === 'number') {
        return String(children);
    }

    if (Array.isArray(children)) {
        return children.map(getCodeText).join('');
    }

    if (isValidElement<{ children?: ReactNode }>(children)) {
        return getCodeText(children.props.children);
    }

    return '';
}

function getNodeStartOffset(node: unknown): number | undefined {
    if (!node || typeof node !== 'object') {
        return undefined;
    }

    const position = (node as { position?: { start?: { offset?: unknown } } }).position;
    const offset = position?.start?.offset;

    return typeof offset === 'number' ? offset : undefined;
}

function CopyCodeButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(code);
            } else {
                const textarea = document.createElement('textarea');

                textarea.value = code;
                textarea.setAttribute('readonly', 'true');
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch (error) {
            console.error('Failed to copy code block:', error);
        }
    }

    return (
        <button
            type="button"
            className="markdown-code-block__copy"
            onClick={handleCopy}
            aria-label="复制代码"
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? '已复制' : '复制'}</span>
        </button>
    );
}

export function MarkdownContent({ content, className, skipDuplicateTitle }: MarkdownContentProps) {
    const headings = getMarkdownHeadings(content);
    const headingIdByOffset = new Map(headings.map((heading) => [heading.index, heading.id]));
    const duplicateTitleH1Index = isFirstMarkdownH1DuplicateTitle(content, skipDuplicateTitle)
        ? headings[0]?.index
        : undefined;
    const createHeadingId = (node: unknown, children: ReactNode) => {
        const offset = getNodeStartOffset(node);
        const lineStart = typeof offset === 'number'
            ? content.lastIndexOf('\n', Math.max(0, offset - 1)) + 1
            : undefined;
        const headingId = typeof lineStart === 'number'
            ? headingIdByOffset.get(lineStart)
            : undefined;

        return headingId || createMarkdownHeadingId(getCodeText(children));
    };
    const markdownComponents: Components = {
        h1({ children, node }) {
            const offset = getNodeStartOffset(node);
            const lineStart = typeof offset === 'number'
                ? content.lastIndexOf('\n', Math.max(0, offset - 1)) + 1
                : undefined;

            if (lineStart === duplicateTitleH1Index) {
                return null;
            }

            return <h1 id={createHeadingId(node, children)}>{children}</h1>;
        },
        h2({ children, node }) {
            return <h2 id={createHeadingId(node, children)}>{children}</h2>;
        },
        h3({ children, node }) {
            return <h3 id={createHeadingId(node, children)}>{children}</h3>;
        },
        h4({ children, node }) {
            return <h4 id={createHeadingId(node, children)}>{children}</h4>;
        },
        pre({ children }) {
            const codeElement = Array.isArray(children) ? children.find(isValidElement) : children;
            const className = isValidElement<{ className?: string }>(codeElement)
                ? codeElement.props.className
                : undefined;
            const language = getLanguageFromClassName(className);
            const code = getCodeText(children).replace(/\n$/, '');

            return (
                <div className="markdown-code-block">
                    <div className="markdown-code-block__header">
                        <span className="markdown-code-block__dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </span>
                        <span className="markdown-code-block__language">{language}</span>
                        <CopyCodeButton code={code} />
                    </div>
                    <pre>{children}</pre>
                </div>
            );
        },
    };

    return (
        <div className={cn('markdown-preview', className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeHighlight]}
                components={markdownComponents}
                skipHtml
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

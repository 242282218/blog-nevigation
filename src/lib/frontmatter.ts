import type { Frontmatter } from '@/app/types/article';

interface ParsedFrontmatterResult {
    content: string;
    frontmatter: Partial<Frontmatter>;
    hasFrontmatter: boolean;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function stripWrappingQuotes(value: string): string {
    const trimmed = value.trim();

    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed
            .slice(1, -1)
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
    }

    return trimmed;
}

function parseTagList(value: string): string[] {
    const trimmed = value.trim();

    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
        return [];
    }

    const inner = trimmed.slice(1, -1).trim();

    if (!inner) {
        return [];
    }

    return inner
        .split(',')
        .map((tag) => stripWrappingQuotes(tag))
        .filter(Boolean);
}

function escapeYamlString(value: string): string {
    return `"${value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r\n/g, '\n')
        .replace(/\n/g, '\\n')}"`;
}

export function parseMarkdownWithFrontmatter(markdown: string): ParsedFrontmatterResult {
    const match = markdown.match(FRONTMATTER_PATTERN);

    if (!match) {
        return {
            content: markdown,
            frontmatter: {},
            hasFrontmatter: false,
        };
    }

    const [, rawFrontmatter, content] = match;
    const parsed: Partial<Frontmatter> = {};

    for (const line of rawFrontmatter.split(/\r?\n/)) {
        const separatorIndex = line.indexOf(':');

        if (separatorIndex === -1) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        const rawValue = line.slice(separatorIndex + 1).trim();

        switch (key) {
            case 'title':
                parsed.title = stripWrappingQuotes(rawValue);
                break;
            case 'date':
                parsed.date = stripWrappingQuotes(rawValue);
                break;
            case 'description':
                parsed.description = stripWrappingQuotes(rawValue);
                break;
            case 'tags':
                parsed.tags = parseTagList(rawValue);
                break;
            default:
                break;
        }
    }

    return {
        content,
        frontmatter: parsed,
        hasFrontmatter: true,
    };
}

export function serializeMarkdownWithFrontmatter(
    article: Pick<Frontmatter, 'title' | 'date' | 'description' | 'tags'> & {
        content: string;
    }
): string {
    const lines = [
        '---',
        `title: ${escapeYamlString(article.title)}`,
        `date: ${escapeYamlString(article.date)}`,
        `description: ${escapeYamlString(article.description)}`,
        `tags: [${article.tags.map(escapeYamlString).join(', ')}]`,
        '---',
        '',
        article.content,
    ];

    return lines.join('\n');
}

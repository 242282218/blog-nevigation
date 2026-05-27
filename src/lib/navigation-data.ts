import type { Category, Tool } from '@/app/types/navigation';
import { isSafeExternalUrl } from '@/lib/url-safety';

type UnknownRecord = Record<string, unknown>;

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function createSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function isValidNavigationUrl(value: string): boolean {
    return isSafeExternalUrl(value);
}

function normalizeTags(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(isNonEmptyString)
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function normalizeTool(value: unknown): Tool | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const tool = value as UnknownRecord;

    if (
        !isNonEmptyString(tool.icon) ||
        !isNonEmptyString(tool.title) ||
        !isNonEmptyString(tool.description) ||
        !isNonEmptyString(tool.url) ||
        !isValidNavigationUrl(tool.url)
    ) {
        return null;
    }

    const tags = normalizeTags(tool.tags);

    if (tags.length === 0) {
        return null;
    }

    return {
        icon: tool.icon.trim(),
        title: tool.title.trim(),
        description: tool.description.trim(),
        url: tool.url.trim(),
        tags,
    };
}

function normalizeCategory(value: unknown): Category | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const category = value as UnknownRecord;

    if (
        !isNonEmptyString(category.name) ||
        !isNonEmptyString(category.icon) ||
        !Array.isArray(category.tools)
    ) {
        return null;
    }

    const tools = category.tools.map(normalizeTool);

    if (tools.some((tool) => tool === null)) {
        return null;
    }

    const slugSource = isNonEmptyString(category.slug) ? category.slug : category.name;
    const slug = createSlug(slugSource);

    if (!slug) {
        return null;
    }

    return {
        name: category.name.trim(),
        icon: category.icon.trim(),
        slug,
        tools: tools as Tool[],
    };
}

export function parseNavigationData(input: unknown): Category[] | null {
    if (!Array.isArray(input)) {
        return null;
    }

    const categories = input.map(normalizeCategory);

    if (categories.some((category) => category === null)) {
        return null;
    }

    const slugs = new Set<string>();

    for (const category of categories as Category[]) {
        if (slugs.has(category.slug)) {
            return null;
        }

        slugs.add(category.slug);
    }

    return categories as Category[];
}

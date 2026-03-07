import type { Category, Tool } from '@/app/types/navigation';

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

    if (!isNonEmptyString(tool.title) || !isNonEmptyString(tool.url)) {
        return null;
    }

    return {
        icon: isNonEmptyString(tool.icon) ? tool.icon.trim() : 'link',
        title: tool.title.trim(),
        description: isNonEmptyString(tool.description) ? tool.description.trim() : '',
        url: tool.url.trim(),
        tags: normalizeTags(tool.tags),
    };
}

function normalizeCategory(value: unknown): Category | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const category = value as UnknownRecord;

    if (!isNonEmptyString(category.name) || !Array.isArray(category.tools)) {
        return null;
    }

    const tools = category.tools.map(normalizeTool);

    if (tools.some((tool) => tool === null)) {
        return null;
    }

    const slugSource = isNonEmptyString(category.slug) ? category.slug : category.name;

    return {
        name: category.name.trim(),
        icon: isNonEmptyString(category.icon) ? category.icon.trim() : 'folder',
        slug: createSlug(slugSource),
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

    return categories as Category[];
}

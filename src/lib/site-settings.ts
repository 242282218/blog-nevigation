import { isRecord } from '@/lib/article-data';

export interface SiteSettings {
    siteName: string;
    siteDescription: string;
    workspaceLabel: string;
    heroTitleLineOne: string;
    heroTitleLineTwo: string;
    heroDescription: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
    siteName: '个人技术博客导航',
    siteDescription: '个人技术文章、常用链接和知识入口',
    workspaceLabel: 'workspace / blog-navigation',
    heroTitleLineOne: '技术博客与常用链接的',
    heroTitleLineTwo: '个人工作台',
    heroDescription:
        '把长期文章、开发文档、工具入口和编辑数据放在一个轻量系统里，公开阅读和服务器迁移都保持清晰。',
};

const SETTING_KEYS = [
    'siteName',
    'siteDescription',
    'workspaceLabel',
    'heroTitleLineOne',
    'heroTitleLineTwo',
    'heroDescription',
] as const;

function normalizeString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function parseSiteSettings(value: unknown): SiteSettings | null {
    if (!isRecord(value)) {
        return null;
    }

    const nextSettings = {} as Record<keyof SiteSettings, string>;

    for (const key of SETTING_KEYS) {
        const normalized = normalizeString(value[key]);

        if (!normalized) {
            return null;
        }

        nextSettings[key] = normalized;
    }

    return nextSettings;
}

export function createDefaultSiteSettings(): SiteSettings {
    return { ...DEFAULT_SITE_SETTINGS };
}

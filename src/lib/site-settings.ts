import { isRecord } from '@/lib/article-data';

export interface SiteSettings {
    siteName: string;
    siteDescription: string;
    workspaceLabel: string;
    heroTitleLineOne: string;
    heroTitleLineTwo: string;
    heroDescription: string;
    introCardEyebrow: string;
    introCardTitle: string;
    introCardDescription: string;
    introCardMetaOneLabel: string;
    introCardMetaOneValue: string;
    introCardMetaTwoLabel: string;
    introCardMetaTwoValue: string;
    introCardMetaThreeLabel: string;
    introCardMetaThreeValue: string;
    introCardStartLabel: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
    siteName: '我的技术书桌',
    siteDescription: '记录工程实践、项目复盘和长期资料的个人博客',
    workspaceLabel: 'personal notes / engineering blog',
    heroTitleLineOne: '把解决过的问题，',
    heroTitleLineTwo: '整理成下次还能用的笔记',
    heroDescription:
        '这里记录我在前端体验、工程效率、AI 工具和个人知识管理里的真实问题：背景、判断、试错和最后留下的做法。它不是教程合集，更像一份持续校准的工作日志。',
    introCardEyebrow: 'about this desk',
    introCardTitle: '你好，这里是我的公开工作日志',
    introCardDescription:
        '我把正在做、正在学、反复查的东西整理成可回看的笔记。每篇尽量保留背景、判断过程和最后可复用的结论。',
    introCardMetaOneLabel: '最近在想',
    introCardMetaOneValue: '前端体验、工程效率、AI 辅助开发',
    introCardMetaTwoLabel: '写作原则',
    introCardMetaTwoValue: '从真实问题出发，写清背景、取舍和后续',
    introCardMetaThreeLabel: '适合阅读',
    introCardMetaThreeValue: '快速了解我怎么做项目、选工具、处理问题',
    introCardStartLabel: 'start here',
};

export const SITE_SETTING_KEYS = [
    'siteName',
    'siteDescription',
    'workspaceLabel',
    'heroTitleLineOne',
    'heroTitleLineTwo',
    'heroDescription',
    'introCardEyebrow',
    'introCardTitle',
    'introCardDescription',
    'introCardMetaOneLabel',
    'introCardMetaOneValue',
    'introCardMetaTwoLabel',
    'introCardMetaTwoValue',
    'introCardMetaThreeLabel',
    'introCardMetaThreeValue',
    'introCardStartLabel',
] as const;

const LEGACY_SETTING_KEYS = [
    'siteName',
    'siteDescription',
    'workspaceLabel',
    'heroTitleLineOne',
    'heroTitleLineTwo',
    'heroDescription',
] as const;

const DEFAULTED_SETTING_KEYS = [
    'introCardEyebrow',
    'introCardTitle',
    'introCardDescription',
    'introCardMetaOneLabel',
    'introCardMetaOneValue',
    'introCardMetaTwoLabel',
    'introCardMetaTwoValue',
    'introCardMetaThreeLabel',
    'introCardMetaThreeValue',
    'introCardStartLabel',
] as const;

function normalizeString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringWithDefault(value: unknown, defaultValue: string): string | null {
    if (value === undefined) {
        return defaultValue;
    }

    return normalizeString(value);
}

export function parseSiteSettings(value: unknown): SiteSettings | null {
    if (!isRecord(value)) {
        return null;
    }

    const nextSettings = {} as SiteSettings;

    for (const key of LEGACY_SETTING_KEYS) {
        const normalized = normalizeString(value[key]);

        if (!normalized) {
            return null;
        }

        nextSettings[key] = normalized;
    }

    for (const key of DEFAULTED_SETTING_KEYS) {
        const normalized = normalizeStringWithDefault(value[key], DEFAULT_SITE_SETTINGS[key]);

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

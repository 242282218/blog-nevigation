import type {
    ArticleKind,
    ArticleStatus,
    ArticleTemplate,
    QualityRuleSeverity,
} from '@/app/types/article';

export interface MarkdownHeading {
    level: number;
    text: string;
    index: number;
}

export interface ArticleQualityInput {
    title: string;
    slug?: string;
    date: string;
    updatedDate?: string;
    description: string;
    tags: string[];
    content: string;
    kind?: ArticleKind;
    status?: ArticleStatus;
    category?: string;
    featured?: boolean;
}

export interface ArticleQualityCheck {
    id: string;
    label: string;
    severity: QualityRuleSeverity;
    passed: boolean;
}

const SECTION_ALIASES: Record<string, string[]> = {
    参考资料: ['来源', 'References', '参考链接'],
    验证: ['验证记录', '验证方式', '测试'],
    总结: ['结论', '收束'],
    根因: ['原因', 'Root Cause'],
};

export function countMarkdownWords(value: string): number {
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

export function getMarkdownHeadings(content: string, maxLevel = 4): MarkdownHeading[] {
    const headings: MarkdownHeading[] = [];
    let index = 0;

    for (const line of content.split('\n')) {
        const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line.trim());

        if (match && match[1].length <= maxLevel) {
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

export function hasRequiredSection(headings: MarkdownHeading[], section: string): boolean {
    const normalizedSection = normalizeHeadingText(section);
    const aliases = [section, ...(SECTION_ALIASES[section] || [])].map(normalizeHeadingText);

    return headings.some((heading) => {
        const normalizedHeading = normalizeHeadingText(heading.text);

        return normalizedHeading === normalizedSection ||
            aliases.some((alias) => normalizedHeading.includes(alias));
    });
}

export function getArticleQualityChecks(
    article: ArticleQualityInput,
    template?: ArticleTemplate
): ArticleQualityCheck[] {
    const headings = getMarkdownHeadings(article.content);
    const descriptionLength = article.description.trim().length;
    const h1Count = headings.filter((heading) => heading.level === 1).length;
    const hasUntypedCodeBlock = /```(?:\s*\n|$)/.test(article.content);
    const checks: ArticleQualityCheck[] = [
        {
            id: 'title-required',
            label: '标题已填写',
            severity: 'blocking',
            passed: article.title.trim().length > 0,
        },
        {
            id: 'date-valid',
            label: '发布日期有效',
            severity: 'blocking',
            passed: isValidDate(article.date),
        },
        {
            id: 'published-description',
            label: '公开文章有描述',
            severity: 'blocking',
            passed: article.status !== 'published' || article.description.trim().length > 0,
        },
        {
            id: 'description-length',
            label: '描述控制在 30-120 字',
            severity: 'warning',
            passed: descriptionLength >= 30 && descriptionLength <= 120,
        },
        {
            id: 'tags-present',
            label: '至少有 1 个标签',
            severity: 'warning',
            passed: article.tags.length > 0,
        },
        {
            id: 'category-present',
            label: '已设置主分类',
            severity: 'warning',
            passed: Boolean(article.category?.trim()),
        },
        {
            id: 'h1-limit',
            label: '正文最多 1 个 H1',
            severity: 'suggestion',
            passed: h1Count <= 1,
        },
        {
            id: 'code-language',
            label: '代码块声明语言',
            severity: 'suggestion',
            passed: !hasUntypedCodeBlock,
        },
    ];

    for (const section of template?.requiredSections || []) {
        checks.push({
            id: `required-section-${normalizeHeadingText(section)}`,
            label: `包含「${section}」章节`,
            severity: 'warning',
            passed: hasRequiredSection(headings, section),
        });
    }

    if (article.kind === 'deep-dive' || article.kind === 'resource' || article.kind === 'review') {
        checks.push({
            id: 'sources-for-research',
            label: '研究/资源类文章有参考资料',
            severity: 'warning',
            passed: hasRequiredSection(headings, '参考资料') || /\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(article.content),
        });
    }

    if (article.featured) {
        checks.push({
            id: 'featured-public',
            label: '精选内容不是草稿',
            severity: 'blocking',
            passed: article.status === 'published' || article.status === 'evergreen',
        });
    }

    if (article.status === 'evergreen') {
        checks.push({
            id: 'evergreen-updated-date',
            label: '常青文章有修订日期',
            severity: 'warning',
            passed: Boolean(article.updatedDate?.trim()),
        });
    }

    return checks;
}

function normalizeHeadingText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '');
}

function isValidDate(value: string): boolean {
    if (!value.trim()) {
        return false;
    }

    return !Number.isNaN(new Date(value).getTime());
}

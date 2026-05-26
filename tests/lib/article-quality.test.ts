import { describe, expect, it } from 'vitest';
import { getArticleQualityChecks, getMarkdownHeadings, hasRequiredSection } from '@/lib/article-quality';
import { getTemplateById } from '@/lib/templates';

describe('article quality checks', () => {
  it('marks missing titles as blocking', () => {
    const checks = getArticleQualityChecks({
      title: '',
      date: '2026-05-25',
      description: '',
      tags: [],
      content: '# Draft',
      status: 'draft',
    });

    expect(checks).toContainEqual(expect.objectContaining({
      id: 'title-required',
      severity: 'blocking',
      passed: false,
    }));
  });

  it('warns when tutorial required sections are missing', () => {
    const checks = getArticleQualityChecks({
      title: 'Guide',
      date: '2026-05-25',
      description: '这是一段足够长的描述，用来说明读者为什么要阅读这篇教程。',
      tags: ['guide'],
      content: '## 背景\n\nOnly background.',
      kind: 'guide',
      status: 'published',
      category: '工程实践',
    }, getTemplateById('tutorial'));

    expect(checks).toContainEqual(expect.objectContaining({
      id: 'required-section-验证',
      severity: 'warning',
      passed: false,
    }));
  });

  it('detects section aliases and untyped code blocks', () => {
    const headings = getMarkdownHeadings('## References\n\n```\\ncode\\n```');
    const checks = getArticleQualityChecks({
      title: 'Research',
      date: '2026-05-25',
      description: '这是一段足够长的研究说明，用来解释结论来源和适用边界。',
      tags: ['research'],
      content: '## References\n\n```\\ncode\\n```',
      kind: 'deep-dive',
      status: 'published',
      category: '架构设计',
    });

    expect(hasRequiredSection(headings, '参考资料')).toBe(true);
    expect(checks).toContainEqual(expect.objectContaining({
      id: 'code-language',
      severity: 'suggestion',
      passed: false,
    }));
  });
});

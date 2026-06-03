import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import BlogPage from '@/app/blog/page';

vi.mock('@/lib/markdown', () => ({
  getPostsAsync: async () => [
    {
      title: 'First Article',
      description: 'First description',
      date: '2026-05-25',
      slug: 'first-article',
      slugArray: ['first-article'],
      kind: 'essay',
      category: 'Engineering',
      tags: ['nextjs'],
      readingMinutes: 3,
      featured: false,
    },
  ],
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('BlogPage', () => {
  it('renders archive filters with mobile touch and keyboard focus affordances', async () => {
    const html = renderToStaticMarkup(await BlogPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('文章归档');
    expect(html).toContain('全部类型');
    expect(html).toContain('全部分类');
    expect(html).toContain('共 1 篇');
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('focus-visible:outline-2');
    expect(html).toContain('focus-visible:outline-focus');
  });
});

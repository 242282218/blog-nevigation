import { describe, expect, it } from 'vitest';
import {
  createArticleSlug,
  filterArticlesData,
  isArticle,
  parseArticlesData,
} from '@/lib/article-data';

const article = {
  id: 'article-1',
  title: 'Runtime Article',
  date: '2026-05-23',
  description: 'Shared article contract',
  tags: ['architecture'],
  content: '# Runtime Article',
  createdAt: 1,
  updatedAt: 2,
};

describe('article data contract', () => {
  it('accepts valid article records', () => {
    expect(isArticle(article)).toBe(true);
    expect(parseArticlesData([article])).toEqual([
      {
        ...article,
        slug: createArticleSlug(article),
      },
    ]);
  });

  it('rejects malformed records in strict parsing', () => {
    expect(isArticle({ ...article, tags: 'architecture' })).toBe(false);
    expect(parseArticlesData([article, { ...article, id: 1 }])).toBeNull();
    expect(parseArticlesData({ articles: [article] })).toBeNull();
  });

  it('filters invalid records for local recovery paths', () => {
    expect(filterArticlesData([article, { ...article, updatedAt: '2' }, null])).toEqual([
      {
        ...article,
        slug: createArticleSlug(article),
      },
    ]);
    expect(filterArticlesData(null)).toEqual([]);
  });

  it('normalizes stored slugs and rejects duplicates in strict parsing', () => {
    expect(parseArticlesData([{ ...article, slug: ' My Post! ' }])).toEqual([
      {
        ...article,
        slug: 'my-post',
      },
    ]);
    expect(parseArticlesData([{ ...article, slug: '   ' }])).toEqual([
      {
        ...article,
        slug: createArticleSlug(article),
      },
    ]);
    expect(parseArticlesData([
      { ...article, id: 'article-1', slug: 'same' },
      { ...article, id: 'article-2', slug: 'same' },
    ])).toBeNull();
  });
});

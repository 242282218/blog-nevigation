import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/search/route';
import { readNavigationFromDiskAsync } from '@/lib/editor-data-storage';
import { getPostsAsync } from '@/lib/markdown';
import { resetSearchRateLimitForTests } from '@/lib/search-rate-limit';
import type { PostMeta } from '@/lib/markdown';

vi.mock('@/lib/markdown', () => ({
  getPostsAsync: vi.fn(),
}));

vi.mock('@/lib/editor-data-storage', () => ({
  readNavigationFromDiskAsync: vi.fn(),
}));

const mockedGetPostsAsync = vi.mocked(getPostsAsync);
const mockedReadNavigationFromDiskAsync = vi.mocked(readNavigationFromDiskAsync);
const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  TRUSTED_PROXY_IPS: process.env.TRUSTED_PROXY_IPS,
  SKIP_IP_VALIDATION: process.env.SKIP_IP_VALIDATION,
};

function createRequest(query: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(query)}`, {
    headers,
  });
}

function createPost(partial: Partial<PostMeta> & Pick<PostMeta, 'slug' | 'slugArray' | 'title'>): PostMeta {
  return {
    date: '2026-05-24',
    description: '',
    tags: [],
    kind: 'essay',
    status: 'published',
    featured: false,
    readingMinutes: 1,
    sourceLinks: [],
    revisionNotes: [],
    ...partial,
  };
}

beforeEach(() => {
  for (const name of Object.keys(ORIGINAL_ENV) as Array<Exclude<keyof typeof ORIGINAL_ENV, 'NODE_ENV'>>) {
    const value = ORIGINAL_ENV[name];

    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  resetSearchRateLimitForTests();
  mockedGetPostsAsync.mockReset();
  mockedReadNavigationFromDiskAsync.mockReset();
});

describe('search API', () => {
  it('returns an empty result without scanning data for empty or short queries', async () => {
    const emptyResponse = await GET(createRequest('   '));
    const shortResponse = await GET(createRequest('n'));

    expect(await emptyResponse.json()).toEqual([]);
    expect(await shortResponse.json()).toEqual([]);
    expect(mockedGetPostsAsync).not.toHaveBeenCalled();
    expect(mockedReadNavigationFromDiskAsync).not.toHaveBeenCalled();
  });

  it('normalizes case and whitespace when matching post results', async () => {
    mockedGetPostsAsync.mockResolvedValue([
      createPost({
        slug: 'next-runtime-data',
        slugArray: ['next-runtime-data'],
        title: 'Next Runtime Data',
        date: '2026-05-24',
        description: 'Runtime data guide',
      }),
      createPost({
        slug: 'navigation',
        slugArray: ['navigation'],
        title: 'Navigation Index',
        date: '2026-05-23',
        description: 'Filtered system page',
      }),
    ]);
    mockedReadNavigationFromDiskAsync.mockResolvedValue([]);

    const response = await GET(createRequest('  NEXT   runtime  '));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual([
      expect.objectContaining({
        type: 'post',
        title: 'Next Runtime Data',
        href: '/posts/next-runtime-data',
        external: false,
      }),
    ]);
  });

  it('returns tool matches and caps the combined result count', async () => {
    mockedGetPostsAsync.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => createPost({
        slug: `search-post-${index}`,
        slugArray: [`search-post-${index}`],
        title: `Search Post ${index}`,
        date: '2026-05-24',
        description: 'Search result',
      }))
    );
    mockedReadNavigationFromDiskAsync.mockResolvedValue([
      {
        name: 'Search Tools',
        icon: 'search',
        slug: 'search-tools',
        tools: Array.from({ length: 6 }, (_, index) => ({
          icon: 'link',
          title: `Search Tool ${index}`,
          description: 'Search result tool',
          url: `https://example.com/tool-${index}`,
          tags: ['search'],
        })),
      },
    ]);

    const response = await GET(createRequest('search'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveLength(8);
    expect(payload.filter((result: { type: string }) => result.type === 'post')).toHaveLength(5);
    expect(payload.filter((result: { type: string }) => result.type === 'tool')).toHaveLength(3);
    expect(payload.at(-1)).toEqual(
      expect.objectContaining({
        type: 'tool',
        external: true,
        meta: 'Search Tools',
      })
    );
  });

  it('rate limits search scans per client IP', async () => {
    process.env.TRUSTED_PROXY_IPS = '203.0.113.1';
    mockedGetPostsAsync.mockResolvedValue([
      createPost({
        slug: 'search-post',
        slugArray: ['search-post'],
        title: 'Search Post',
      }),
    ]);
    mockedReadNavigationFromDiskAsync.mockResolvedValue([]);

    for (let index = 0; index < 30; index += 1) {
      const response = await GET(createRequest('search', {
        'X-Forwarded-For': '198.51.100.10, 203.0.113.1',
      }));
      expect(response.status).toBe(200);
    }

    const blockedResponse = await GET(createRequest('search', {
      'X-Forwarded-For': '198.51.100.10, 203.0.113.1',
    }));
    const otherClientResponse = await GET(createRequest('search', {
      'X-Forwarded-For': '198.51.100.200, 203.0.113.1',
    }));

    expect(blockedResponse.status).toBe(429);
    expect(await blockedResponse.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('搜索请求过于频繁'),
      })
    );
    expect(otherClientResponse.status).toBe(200);
  });

  it('requires trusted proxy configuration for search rate limiting in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.TRUSTED_PROXY_IPS;
    delete process.env.SKIP_IP_VALIDATION;
    mockedGetPostsAsync.mockResolvedValue([
      createPost({
        slug: 'search-post',
        slugArray: ['search-post'],
        title: 'Search Post',
      }),
    ]);
    mockedReadNavigationFromDiskAsync.mockResolvedValue([]);

    const response = await GET(createRequest('search'));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('TRUSTED_PROXY_IPS'),
      })
    );
    expect(mockedGetPostsAsync).not.toHaveBeenCalled();
    expect(mockedReadNavigationFromDiskAsync).not.toHaveBeenCalled();
  });
});

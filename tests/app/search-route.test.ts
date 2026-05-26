import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/search/route';
import { readNavigationFromDisk } from '@/lib/editor-data-storage';
import { getPosts } from '@/lib/markdown';
import type { PostMeta } from '@/lib/markdown';

vi.mock('@/lib/markdown', () => ({
  getPosts: vi.fn(),
}));

vi.mock('@/lib/editor-data-storage', () => ({
  readNavigationFromDisk: vi.fn(),
}));

const mockedGetPosts = vi.mocked(getPosts);
const mockedReadNavigationFromDisk = vi.mocked(readNavigationFromDisk);

function createRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(query)}`);
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
  mockedGetPosts.mockReset();
  mockedReadNavigationFromDisk.mockReset();
});

describe('search API', () => {
  it('returns an empty result without scanning data for empty or short queries', async () => {
    const emptyResponse = await GET(createRequest('   '));
    const shortResponse = await GET(createRequest('n'));

    expect(await emptyResponse.json()).toEqual([]);
    expect(await shortResponse.json()).toEqual([]);
    expect(mockedGetPosts).not.toHaveBeenCalled();
    expect(mockedReadNavigationFromDisk).not.toHaveBeenCalled();
  });

  it('normalizes case and whitespace when matching post results', async () => {
    mockedGetPosts.mockReturnValue([
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
    mockedReadNavigationFromDisk.mockReturnValue([]);

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
    mockedGetPosts.mockReturnValue(
      Array.from({ length: 6 }, (_, index) => createPost({
        slug: `search-post-${index}`,
        slugArray: [`search-post-${index}`],
        title: `Search Post ${index}`,
        date: '2026-05-24',
        description: 'Search result',
      }))
    );
    mockedReadNavigationFromDisk.mockReturnValue([
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
});

import { NextRequest, NextResponse } from 'next/server';
import { readNavigationFromDiskAsync } from '@/lib/editor-data-storage';
import { getPostsAsync } from '@/lib/markdown';
import { getSearchRateLimitResponse } from '@/lib/search-rate-limit';
import {
    isSearchQueryAllowed,
    normalizeSearchQuery,
} from '@/lib/search-query';

export const dynamic = 'force-dynamic';

function includesQuery(parts: string[], query: string): boolean {
    return parts.join('\n').toLowerCase().includes(query);
}

export async function GET(request: NextRequest) {
    const query = normalizeSearchQuery(request.nextUrl.searchParams.get('q'));

    if (!isSearchQueryAllowed(query)) {
        return NextResponse.json([]);
    }

    const rateLimitResponse = getSearchRateLimitResponse(request);

    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    const [posts, navigation] = await Promise.all([
        getPostsAsync(),
        readNavigationFromDiskAsync(),
    ]);

    const postResults = posts
        .filter((post) => !post.slugArray.includes('navigation'))
        .filter((post) => includesQuery([post.title, post.description ?? '', post.slug], query))
        .slice(0, 5)
        .map((post) => ({
            type: 'post' as const,
            title: post.title,
            slug: post.slug,
            href: `/posts/${post.slug}`,
            description: post.description,
            meta: post.date || '文章',
            external: false,
        }));

    const toolResults = navigation
        .flatMap((category) =>
            category.tools.map((tool) => ({
                categoryName: category.name,
                tool,
            }))
        )
        .filter(({ categoryName, tool }) =>
            includesQuery(
                [
                    categoryName,
                    tool.title,
                    tool.description,
                    tool.url,
                    ...tool.tags,
                ],
                query
            )
        )
        .slice(0, 5)
        .map(({ categoryName, tool }) => ({
            type: 'tool' as const,
            title: tool.title,
            slug: tool.url,
            href: tool.url,
            description: tool.description,
            meta: categoryName,
            external: true,
            tags: tool.tags,
        }));

    const results = [...postResults, ...toolResults].slice(0, 8);

    return NextResponse.json(results);
}

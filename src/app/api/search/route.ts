import { NextRequest, NextResponse } from 'next/server';
import { readNavigationFromDisk } from '@/lib/editor-data-storage';
import { getPosts } from '@/lib/markdown';
import {
    isSearchQueryAllowed,
    normalizeSearchQuery,
} from '@/lib/search-query';

function includesQuery(parts: string[], query: string): boolean {
    return parts.join('\n').toLowerCase().includes(query);
}

export async function GET(request: NextRequest) {
    const query = normalizeSearchQuery(request.nextUrl.searchParams.get('q'));

    if (!isSearchQueryAllowed(query)) {
        return NextResponse.json([]);
    }

    const postResults = getPosts()
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

    const toolResults = readNavigationFromDisk()
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

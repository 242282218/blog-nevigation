import { NextRequest, NextResponse } from 'next/server';
import { getPosts } from '@/lib/markdown';

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q')?.trim().toLowerCase();

    if (!query) {
        return NextResponse.json([]);
    }

    const results = getPosts()
        .filter((post) => !post.slugArray.includes('navigation'))
        .filter((post) => {
            const haystack = [post.title, post.description ?? '', post.slug].join('\n').toLowerCase();
            return haystack.includes(query);
        })
        .slice(0, 8)
        .map((post) => ({
            title: post.title,
            slug: post.slug,
            description: post.description,
        }));

    return NextResponse.json(results);
}

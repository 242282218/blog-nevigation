import { NextRequest, NextResponse } from 'next/server';
import { getPosts } from '@/lib/markdown';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
        return NextResponse.json([]);
    }

    const posts = getPosts();
    const filtered = posts.filter(
        (post) =>
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.description?.toLowerCase().includes(query.toLowerCase())
    );

    return NextResponse.json(filtered.slice(0, 5).map(post => ({
        title: post.title,
        slug: post.slug,
        description: post.description,
    })));
}

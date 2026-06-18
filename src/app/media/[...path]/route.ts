import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
    EditorMediaPathInvalidError,
    resolvePublicMediaFilePath,
} from '@/lib/editor-media-storage';

function getContentType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.png') {
        return 'image/png';
    }

    if (extension === '.jpg' || extension === '.jpeg') {
        return 'image/jpeg';
    }

    if (extension === '.webp') {
        return 'image/webp';
    }

    if (extension === '.gif') {
        return 'image/gif';
    }

    return 'application/octet-stream';
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const params = await context.params;
    const mediaPath = params.path.join('/');

    try {
        const filePath = resolvePublicMediaFilePath(mediaPath);
        const file = await fsPromises.readFile(filePath);

        return new Response(file, {
            headers: {
                'Content-Type': getContentType(filePath),
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        if (
            error instanceof EditorMediaPathInvalidError ||
            (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
            return new Response('Not found', { status: 404 });
        }

        throw error;
    }
}

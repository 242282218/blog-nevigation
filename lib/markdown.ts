import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface PostMeta {
    slug: string;
    slugArray: string[];
    title: string;
    date: string;
    description?: string;
}

const contentDir = path.join(process.cwd(), 'content', 'posts');

export function getPosts(): PostMeta[] {
    let files: string[] = [];

    if (!fs.existsSync(contentDir)) {
        return [];
    }

    function findMdFiles(dir: string) {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                findMdFiles(fullPath);
            } else if (item.endsWith('.md')) {
                files.push(fullPath);
            }
        }
    }

    findMdFiles(contentDir);

    const posts = files.map((file) => {
        const fileContent = fs.readFileSync(file, 'utf8');
        const { data } = matter(fileContent);
        const relativePath = path.relative(contentDir, file);
        const sluggablePath = relativePath.replace(/\\/g, '/').replace(/\.md$/, '');

        return {
            slug: sluggablePath,
            slugArray: sluggablePath.split('/'),
            title: data.title || path.basename(file, '.md'),
            date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
            description: data.description || '',
        };
    });

    return posts.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

export function getPostBySlugArray(slugArray: string[]) {
    const relPath = slugArray.join('/');
    const targetPath = path.join(contentDir, relPath + '.md');
    const targetIndexPath = path.join(contentDir, relPath, 'index.md');

    let matchedFile = '';

    if (fs.existsSync(targetPath)) {
        matchedFile = targetPath;
    } else if (fs.existsSync(targetIndexPath)) {
        matchedFile = targetIndexPath;
    }

    if (!matchedFile) {
        return null;
    }

    const fileContent = fs.readFileSync(matchedFile, 'utf8');
    const { data, content } = matter(fileContent);

    return {
        meta: {
            slug: relPath,
            slugArray,
            title: data.title || slugArray[slugArray.length - 1],
            date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
            description: data.description || '',
        },
        content,
    };
}

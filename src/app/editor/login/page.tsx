import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
    EDITOR_SESSION_COOKIE,
    getSafeEditorNextPath,
    isEditorAuthConfigured,
    isValidEditorSession,
} from '@/lib/editor-auth';
import { EditorLoginForm } from './EditorLoginForm';

interface EditorLoginPageProps {
    searchParams?: {
        next?: string;
    };
}

export default async function EditorLoginPage({
    searchParams,
}: EditorLoginPageProps) {
    const nextPath = getSafeEditorNextPath(searchParams?.next);
    const session = cookies().get(EDITOR_SESSION_COOKIE)?.value;

    if (await isValidEditorSession(session)) {
        redirect(nextPath);
    }

    return (
        <EditorLoginForm
            authConfigured={isEditorAuthConfigured()}
            nextPath={nextPath}
        />
    );
}

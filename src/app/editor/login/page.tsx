import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
    EDITOR_SESSION_COOKIE,
    getSafeEditorNextPath,
} from '@/lib/editor-auth';
import {
    isRuntimeEditorAuthConfigured,
    isRuntimeEditorAuthSetupEnabled,
    isRuntimeEditorAuthSetupTokenRequired,
    isValidRuntimeEditorSession,
} from '@/lib/editor-auth-runtime';
import { EditorLoginForm } from './EditorLoginForm';

interface EditorLoginPageProps {
    searchParams?: Promise<{
        next?: string | string[];
    }>;
}

export default async function EditorLoginPage({
    searchParams,
}: EditorLoginPageProps) {
    const resolvedSearchParams = await searchParams;
    const rawNextPath = Array.isArray(resolvedSearchParams?.next)
        ? resolvedSearchParams.next[0]
        : resolvedSearchParams?.next;
    const nextPath = getSafeEditorNextPath(rawNextPath);
    const cookieStore = await cookies();
    const session = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;

    if (await isValidRuntimeEditorSession(session)) {
        redirect(nextPath);
    }

    return (
        <EditorLoginForm
            authConfigured={isRuntimeEditorAuthConfigured()}
            setupEnabled={isRuntimeEditorAuthSetupEnabled()}
            setupTokenRequired={isRuntimeEditorAuthSetupTokenRequired()}
            nextPath={nextPath}
        />
    );
}

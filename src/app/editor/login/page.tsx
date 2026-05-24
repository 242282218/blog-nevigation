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
    searchParams?: {
        next?: string;
    };
}

export default async function EditorLoginPage({
    searchParams,
}: EditorLoginPageProps) {
    const nextPath = getSafeEditorNextPath(searchParams?.next);
    const session = cookies().get(EDITOR_SESSION_COOKIE)?.value;

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

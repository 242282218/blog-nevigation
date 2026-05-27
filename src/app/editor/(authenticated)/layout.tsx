import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
    EDITOR_SESSION_COOKIE,
    getSafeEditorNextPath,
} from '@/lib/editor-auth';
import { isValidRuntimeEditorSession } from '@/lib/editor-auth-runtime';

export default async function AuthenticatedEditorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const session = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;

    if (!(await isValidRuntimeEditorSession(session))) {
        redirect(`/editor/login?next=${encodeURIComponent(getSafeEditorNextPath('/editor'))}`);
    }

    return children;
}

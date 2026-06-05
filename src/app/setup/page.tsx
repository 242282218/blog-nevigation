import { redirect } from 'next/navigation';
import { getSafeEditorNextPath } from '@/lib/editor-auth';
import { isApplicationSetupComplete } from '@/lib/setup-state';
import { SetupWizard } from './SetupWizard';

interface SetupPageProps {
    searchParams?: Promise<{
        next?: string | string[];
    }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
    const resolvedSearchParams = await searchParams;
    const rawNextPath = Array.isArray(resolvedSearchParams?.next)
        ? resolvedSearchParams.next[0]
        : resolvedSearchParams?.next;
    const nextPath = getSafeEditorNextPath(rawNextPath);

    if (isApplicationSetupComplete()) {
        redirect(nextPath);
    }

    return <SetupWizard nextPath={nextPath} />;
}

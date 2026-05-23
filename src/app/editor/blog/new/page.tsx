'use client';

import { Suspense } from 'react';
import { NewArticleContent } from './NewArticleContent';
import { EditorPage } from '../../components/EditorShell';

export default function NewArticlePage() {
  return (
    <Suspense fallback={
      <EditorPage className="flex items-center justify-center">
        <div className="animate-pulse text-subtle">加载中...</div>
      </EditorPage>
    }>
      <NewArticleContent />
    </Suspense>
  );
}

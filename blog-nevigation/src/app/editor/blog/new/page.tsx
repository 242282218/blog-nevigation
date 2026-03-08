'use client';

import { Suspense } from 'react';
import { NewArticleContent } from './NewArticleContent';

export default function NewArticlePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">加载中...</div>
      </div>
    }>
      <NewArticleContent />
    </Suspense>
  );
}

'use client';

import { BookOpen, NotebookPen, FolderGit2, FileText } from 'lucide-react';
import { articleTemplates } from '@/lib/templates';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="w-6 h-6" />,
  NotebookPen: <NotebookPen className="w-6 h-6" />,
  FolderGit2: <FolderGit2 className="w-6 h-6" />,
  FileText: <FileText className="w-6 h-6" />,
};

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {articleTemplates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.id)}
          className="group rounded-lg border border-gray-200 bg-white p-6 text-left transition-all hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-lg group-hover:bg-blue-100 transition-colors">
              {iconMap[template.icon] || <FileText className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {template.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {template.description}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

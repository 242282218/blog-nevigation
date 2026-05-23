'use client';

import { Frontmatter } from '@/app/types/article';
import { editorInputClassName } from '../../components/EditorShell';

interface FrontmatterFormProps {
  value: Frontmatter;
  onChange: (value: Frontmatter) => void;
  className?: string;
}

export function FrontmatterForm({ value, onChange, className }: FrontmatterFormProps) {
  const handleChange = (field: keyof Frontmatter, fieldValue: string | string[]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    handleChange('tags', tags);
  };

  return (
    <div className={`rounded-token-card border border-border bg-surface p-4 shadow-token-card ${className || ''}`}>
      <div className="mb-4">
        <p className="font-mono text-xs text-accent">frontmatter</p>
        <h2 className="mt-1 text-base font-semibold text-fg">文章信息</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="frontmatter-title" className="block text-xs font-mono text-muted mb-1">
            title
          </label>
          <input
            id="frontmatter-title"
            type="text"
            value={value.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="文章标题"
            className={editorInputClassName}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div>
            <label htmlFor="frontmatter-date" className="block text-xs font-mono text-muted mb-1">
              date
            </label>
            <input
              id="frontmatter-date"
              type="date"
              value={value.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className={editorInputClassName}
            />
          </div>

          <div>
            <label htmlFor="frontmatter-tags" className="block text-xs font-mono text-muted mb-1">
              tags
            </label>
            <input
              id="frontmatter-tags"
              type="text"
              value={value.tags.join(', ')}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="标签1, 标签2, 标签3"
              className={editorInputClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor="frontmatter-description" className="block text-xs font-mono text-muted mb-1">
            description
          </label>
          <textarea
            id="frontmatter-description"
            value={value.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="文章描述"
            rows={2}
            className={`${editorInputClassName} resize-none`}
          />
        </div>
      </div>
    </div>
  );
}

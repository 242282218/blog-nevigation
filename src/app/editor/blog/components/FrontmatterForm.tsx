'use client';

import { Frontmatter } from '@/app/types/article';
import { editorInputClassName } from '../../components/EditorShell';
import { ARTICLE_KIND_OPTIONS, ARTICLE_STATUS_OPTIONS } from '@/lib/article-metadata';

interface FrontmatterFormProps {
  value: Frontmatter;
  onChange: (value: Frontmatter) => void;
  className?: string;
}

export function FrontmatterForm({ value, onChange, className }: FrontmatterFormProps) {
  const handleChange = (field: keyof Frontmatter, fieldValue: Frontmatter[keyof Frontmatter]) => {
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

        <div>
          <label htmlFor="frontmatter-slug" className="block text-xs font-mono text-muted mb-1">
            slug
          </label>
          <input
            id="frontmatter-slug"
            type="text"
            value={value.slug || ''}
            onChange={(e) => handleChange('slug', e.target.value)}
            placeholder="stable-article-url"
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
            <label htmlFor="frontmatter-updated-date" className="block text-xs font-mono text-muted mb-1">
              updatedDate
            </label>
            <input
              id="frontmatter-updated-date"
              type="date"
              value={value.updatedDate || ''}
              onChange={(e) => handleChange('updatedDate', e.target.value)}
              className={editorInputClassName}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div>
            <label htmlFor="frontmatter-kind" className="block text-xs font-mono text-muted mb-1">
              kind
            </label>
            <select
              id="frontmatter-kind"
              value={value.kind || 'essay'}
              onChange={(e) => handleChange('kind', e.target.value as Frontmatter['kind'])}
              className={editorInputClassName}
            >
              {ARTICLE_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="frontmatter-status" className="block text-xs font-mono text-muted mb-1">
              status
            </label>
            <select
              id="frontmatter-status"
              value={value.status || 'draft'}
              onChange={(e) => handleChange('status', e.target.value as Frontmatter['status'])}
              className={editorInputClassName}
            >
              {ARTICLE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div>
            <label htmlFor="frontmatter-category" className="block text-xs font-mono text-muted mb-1">
              category
            </label>
            <input
              id="frontmatter-category"
              type="text"
              value={value.category || ''}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="工程实践"
              className={editorInputClassName}
            />
          </div>

          <div>
            <label htmlFor="frontmatter-series" className="block text-xs font-mono text-muted mb-1">
              series
            </label>
            <input
              id="frontmatter-series"
              type="text"
              value={value.series || ''}
              onChange={(e) => handleChange('series', e.target.value)}
              placeholder="可选系列名称"
              className={editorInputClassName}
            />
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-token-card border border-border bg-background p-3 text-sm">
          <span>
            <span className="block font-medium text-fg">精选入口</span>
            <span className="block text-xs text-subtle">适合进入首页或归档精选区</span>
          </span>
          <input
            type="checkbox"
            checked={Boolean(value.featured)}
            onChange={(e) => handleChange('featured', e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent focus:ring-link"
          />
        </label>

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

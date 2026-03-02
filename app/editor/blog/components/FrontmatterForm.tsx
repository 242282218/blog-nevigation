'use client';

import { Frontmatter } from '@/app/types/article';

interface FrontmatterFormProps {
  value: Frontmatter;
  onChange: (value: Frontmatter) => void;
}

export function FrontmatterForm({ value, onChange }: FrontmatterFormProps) {
  const handleChange = (field: keyof Frontmatter, fieldValue: string | string[]) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    handleChange('tags', tags);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 border-b border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 标题 */}
        <div className="md:col-span-2">
          <label className="block text-xs font-mono text-gray-500 mb-1">
            title
          </label>
          <input
            type="text"
            value={value.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="文章标题"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 日期 */}
        <div>
          <label className="block text-xs font-mono text-gray-500 mb-1">
            date
          </label>
          <input
            type="date"
            value={value.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-xs font-mono text-gray-500 mb-1">
            tags
          </label>
          <input
            type="text"
            value={value.tags.join(', ')}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="标签1, 标签2, 标签3"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 描述 */}
        <div className="md:col-span-2">
          <label className="block text-xs font-mono text-gray-500 mb-1">
            description
          </label>
          <textarea
            value={value.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="文章描述"
            rows={2}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

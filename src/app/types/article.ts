export interface Article {
  id: string;
  slug?: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface ArticleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
  estimatedMinutes?: number;
  highlights?: string[];
  frontmatter: {
    title: string;
    description: string;
    tags: string[];
  };
  content: string;
}

export interface Frontmatter {
  title: string;
  date: string;
  description: string;
  tags: string[];
}

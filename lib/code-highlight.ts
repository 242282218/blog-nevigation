// 浅色主题代码高亮配置
// 使用 GitHub 风格的浅色主题

export const lightThemeColors = {
  // 背景色 - 浅色
  background: '#f8f9fa',
  backgroundDark: '#f1f3f5',
  
  // 文字颜色
  text: '#24292e',
  textLight: '#6a737d',
  
  // 语法高亮颜色 - GitHub 风格
  keyword: '#d73a49',      // 关键字 - 柔和红
  string: '#032f62',       // 字符串 - 深蓝
  number: '#005cc5',       // 数字 - 蓝色
  function: '#6f42c1',     // 函数 - 紫色
  comment: '#6a737d',      // 注释 - 灰色
  operator: '#d73a49',     // 运算符 - 红
  punctuation: '#24292e',  // 标点 - 黑
  property: '#005cc5',     // 属性 - 蓝
  tag: '#22863a',          // 标签 - 绿
  attribute: '#6f42c1',    // 属性名 - 紫
  builtin: '#005cc5',      // 内置函数 - 蓝
  variable: '#e36209',     // 变量 - 橙
};

// 代码高亮 CSS 类名映射
export const highlightClasses = `
  /* 基础样式 */
  .hljs {
    display: block;
    overflow-x: auto;
    padding: 1rem;
    background: #f8f9fa;
    color: #24292e;
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    border-radius: 0.5rem;
  }

  /* 注释 */
  .hljs-comment,
  .hljs-quote {
    color: #6a737d;
    font-style: italic;
  }

  /* 关键字 */
  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-subst {
    color: #d73a49;
    font-weight: 500;
  }

  /* 数字、布尔值 */
  .hljs-number,
  .hljs-literal,
  .hljs-variable,
  .hljs-template-variable,
  .hljs-tag .hljs-attr {
    color: #005cc5;
  }

  /* 字符串 */
  .hljs-string,
  .hljs-doctag {
    color: #032f62;
  }

  /* 标题 */
  .hljs-title,
  .hljs-section,
  .hljs-selector-id {
    color: #6f42c1;
    font-weight: 500;
  }

  /* 类型、类名 */
  .hljs-type,
  .hljs-class .hljs-title {
    color: #22863a;
    font-weight: 500;
  }

  /* 函数名 */
  .hljs-function,
  .hljs-name {
    color: #6f42c1;
  }

  /* 属性 */
  .hljs-property {
    color: #005cc5;
  }

  /* 内置函数 */
  .hljs-built_in,
  .hljs-builtin-name {
    color: #005cc5;
  }

  /* 标签 */
  .hljs-tag {
    color: #22863a;
  }

  /* 属性名 */
  .hljs-attr {
    color: #6f42c1;
  }

  /* 正则表达式 */
  .hljs-regexp,
  .hljs-link {
    color: #032f62;
  }

  /* 符号 */
  .hljs-symbol,
  .hljs-bullet {
    color: #e36209;
  }

  /* 强调 */
  .hljs-emphasis {
    font-style: italic;
  }

  /* 加粗 */
  .hljs-strong {
    font-weight: 700;
  }

  /* 添加行号支持 */
  .hljs-line-numbers {
    color: #6a737d;
    border-right: 1px solid #e1e4e8;
    padding-right: 1rem;
    margin-right: 1rem;
    text-align: right;
    user-select: none;
  }
`;

// 获取代码高亮样式字符串
export function getHighlightStyles(): string {
  return highlightClasses;
}

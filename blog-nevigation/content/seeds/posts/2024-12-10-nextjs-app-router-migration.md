---
title: Next.js App Router 迁移实战
date: 2024-12-10
description: 从 Pages Router 迁移到 App Router 的经验总结与踩坑记录
---

# Next.js App Router 迁移实战

## 迁移背景

Next.js 13+ 引入的 App Router 带来了全新的开发范式，本文记录迁移过程中的关键决策。

## 主要变化

### 路由结构

```
app/
├── page.tsx        # /
├── layout.tsx      # 根布局
├── blog/
│   ├── page.tsx    # /blog
│   └── [slug]/
│       └── page.tsx # /blog/:slug
```

### 数据获取

```typescript
// 服务端组件直接获取数据
async function BlogPage() {
  const posts = await getPosts()
  return <PostList posts={posts} />
}
```

## 遇到的挑战

1. **服务端/客户端组件边界**
2. **缓存策略调整**
3. **第三方库兼容性**

## 性能提升

- 首屏加载时间减少 40%
- JavaScript 包体积减少 25%

## 总结

迁移需要谨慎规划，但收益显著。

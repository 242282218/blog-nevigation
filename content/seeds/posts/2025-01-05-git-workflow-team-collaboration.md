---
title: Git 团队协作工作流指南
date: 2025-01-05
description: 从分支策略到代码审查，建立高效的 Git 协作规范
---

# Git 团队协作工作流指南

## 分支策略

### Git Flow 简化版

- `main` - 生产分支
- `develop` - 开发分支
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复

## 提交规范

```
feat: 添加用户登录功能
fix: 修复导航栏样式问题
docs: 更新 API 文档
refactor: 重构数据获取逻辑
test: 添加单元测试
```

## 代码审查清单

- [ ] 代码逻辑清晰
- [ ] 命名规范合理
- [ ] 测试覆盖充分
- [ ] 无 console.log 残留
- [ ] 性能影响评估

## 冲突解决

```bash
git fetch origin
git rebase origin/main
# 解决冲突
git rebase --continue
```

## 总结

规范的工作流能显著提升团队协作效率。

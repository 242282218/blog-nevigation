# Tasks

## Phase 1: 基础样式系统搭建

- [x] Task 1: 创建现代风格 CSS 文件
  - [x] SubTask 1.1: 创建 `modern.css` 替换 `terminal.css`
  - [x] SubTask 1.2: 定义紫罗兰渐变 CSS 变量
  - [x] SubTask 1.3: 定义玻璃拟态基础类
  - [x] SubTask 1.4: 添加噪点纹理背景样式
  - [x] SubTask 1.5: 添加光晕效果样式

- [x] Task 2: 创建动画工具函数
  - [x] SubTask 2.1: 创建 `useScrollAnimation` composable
  - [x] SubTask 2.2: 创建 `useMousePosition` composable
  - [x] SubTask 2.3: 创建 CSS 动画关键帧

## Phase 2: 核心组件重设计

- [x] Task 3: 重设计导航栏
  - [x] SubTask 3.1: 覆盖 VitePress 默认导航样式
  - [x] SubTask 3.2: 实现玻璃拟态胶囊导航
  - [x] SubTask 3.3: 添加悬停过渡效果

- [x] Task 4: 重设计 Hero 区域
  - [x] SubTask 4.1: 创建 3D 透视网格背景组件
  - [x] SubTask 4.2: 实现渐变文字效果
  - [x] SubTask 4.3: 实现主 CTA 按钮旋转边框动画
  - [x] SubTask 4.4: 更新 `index.md` Hero 配置

- [x] Task 5: 重设计特性卡片
  - [x] SubTask 5.1: 覆盖 VitePress 默认 Feature 样式
  - [x] SubTask 5.2: 实现玻璃拟态卡片背景
  - [x] SubTask 5.3: 实现悬停光晕跟随效果
  - [x] SubTask 5.4: 实现左侧竖条指示器动画
  - [x] SubTask 5.5: 添加滚动触发进入动画

- [x] Task 6: 重设计工具卡片
  - [x] SubTask 6.1: 更新 `ToolCard.vue` 样式
  - [x] SubTask 6.2: 实现玻璃拟态效果
  - [x] SubTask 6.3: 优化悬停上浮动画
  - [x] SubTask 6.4: 添加发光阴影效果

## Phase 3: 交互与动画完善

- [x] Task 7: 实现滚动触发动画系统
  - [x] SubTask 7.1: 集成 Intersection Observer
  - [x] SubTask 7.2: 实现元素进入动画
  - [x] SubTask 7.3: 添加 stagger 延迟效果

- [x] Task 8: 实现高级悬停交互
  - [x] SubTask 8.1: 实现鼠标跟随光晕效果
  - [x] SubTask 8.2: 优化移动端触摸交互
  - [x] SubTask 8.3: 添加减少动画偏好支持

## Phase 4: 响应式与优化

- [x] Task 9: 响应式布局优化
  - [x] SubTask 9.1: 移动端网格布局调整
  - [x] SubTask 9.2: 平板端布局优化
  - [x] SubTask 9.3: 动画性能优化

- [x] Task 10: 主题集成与测试
  - [x] SubTask 10.1: 更新 `index.ts` 引入新样式
  - [x] SubTask 10.2: 构建测试
  - [x] SubTask 10.3: 视觉回归检查

# Task Dependencies

- Task 2 依赖 Task 1 (基础变量定义)
- Task 3 依赖 Task 1
- Task 4 依赖 Task 1, Task 2
- Task 5 依赖 Task 1, Task 2
- Task 6 依赖 Task 1
- Task 7 依赖 Task 2
- Task 8 依赖 Task 2
- Task 9 依赖 Task 3, 4, 5, 6
- Task 10 依赖所有前置任务

# Parallelizable Work

- Task 1 和 Task 2 可以并行
- Task 3, 4, 5, 6 可以并行（在基础样式完成后）
- Task 7 和 Task 8 可以并行

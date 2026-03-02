# 隐藏编辑入口功能计划

## 需求概述
将"写文章"和"编辑导航"按钮从导航页面隐藏，改为通过搜索框输入密码 `20030610@ghl` 后跳转到编辑页面的隐藏入口方式。

## 当前状态
- 文件 `app/navigation/page.tsx` 第54-69行显示两个编辑入口按钮
- 搜索框组件 `app/components/header/CommandInput.tsx` 用于文章搜索

---

## UI 设计规范 (基于 ui-ux-pro-max 技能约束)

### 设计风格
- **风格**: Data-Dense Dashboard (数据密集型仪表盘)
- **配色**:
  - Primary: `#1E293B` (深蓝灰)
  - Secondary: `#334155` 
  - CTA: `#22C55E` (绿色)
  - Background: `#0F172A` (深色背景)
  - Text: `#F8FAFC` (浅色文字)
- **字体**: Fira Code (等宽字体，适合终端风格)
- **效果**: Hover tooltips, smooth filter animations, row highlighting

### 关键 UX 约束
| 规则 | 要求 |
|------|------|
| **Touch Target Size** | 最小 44x44px 点击区域 |
| **Hover States** | 使用颜色/透明度过渡，不使用 scale 变换 |
| **Cursor Pointer** | 所有可点击元素必须添加 cursor-pointer |
| **Transitions** | 微交互使用 150-300ms 过渡时间 |
| **Focus States** | 键盘导航时焦点状态必须可见 |
| **No Emoji Icons** | 使用 SVG 图标 (Lucide) |

---

## 实现方案

### 方案：搜索框密码触发跳转菜单
在 `CommandInput.tsx` 中监听输入，当输入匹配密码 `20030610@ghl` 时，显示编辑选项下拉菜单供用户选择。

---

## UI 示意图

### 1. 密码输入前 (正常搜索状态)
```
┌─────────────────────────────────────────┐
│  $ grep "React优化"...            ⌘K    │  ← 搜索按钮，显示动态 placeholder
└─────────────────────────────────────────┘
```

### 2. 密码匹配后 (显示编辑菜单)
```
┌─────────────────────────────────────────┐
│  $ 20030610@ghl                   ESC   │  ← 输入密码
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │ 🔐 管理员入口                    │    │  ← 菜单标题 (使用 Lock 图标)
│  ├─────────────────────────────────┤    │
│  │ ✏️  写文章                      │    │  ← 选项1: 跳转到 /editor/blog
│  │    创建新的博客文章              │    │
│  ├─────────────────────────────────┤    │
│  │ 🧭  编辑导航                     │    │  ← 选项2: 跳转到 /editor/navigation
│  │    管理导航链接和分类            │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 3. 导航页面变化 (移除可见按钮)

**修改前:**
```
┌──────────────────────────────────────────────────────────────┐
│  ## 工具分类 (Categories)          [写文章] [编辑导航] [db]  │
└──────────────────────────────────────────────────────────────┘
```

**修改后:**
```
┌──────────────────────────────────────────────────────────────┐
│  ## 工具分类 (Categories)                        [bookmarks.db]│  ← 移除两个按钮
└──────────────────────────────────────────────────────────────┘
```

---

## 具体实施步骤

### 步骤1: 隐藏导航页面的编辑按钮
**文件:** `app/navigation/page.tsx`
**操作:** 删除第54-69行的"写文章"和"编辑导航"按钮代码
**约束检查:**
- [ ] 确保剩余元素保持原有间距
- [ ] 保留 `bookmarks.db` 标签

### 步骤2: 在搜索框中添加密码检测逻辑
**文件:** `app/components/header/CommandInput.tsx`
**修改内容:**
1. **导入依赖**
   - 添加 `useRouter` from 'next/navigation'
   - 添加 `Lock, FileText, Compass` from 'lucide-react'

2. **添加常量**
   ```ts
   const SECRET_CODE = '20030610@ghl';
   ```

3. **添加状态**
   ```ts
   const [showSecretMenu, setShowSecretMenu] = useState(false);
   ```

4. **密码检测逻辑**
   - 在 `onChange` 处理中检测 `query === SECRET_CODE`
   - 匹配时设置 `showSecretMenu = true`
   - 清空搜索结果，显示编辑菜单

5. **编辑菜单 UI** (遵循 UX 约束)
   ```tsx
   // 菜单容器
   - 背景: bg-white
   - 边框: border border-gray-200
   - 圆角: rounded-xl
   - 阴影: shadow-lg
   - 内边距: 适当间距
   
   // 菜单项
   - 最小高度: min-h-[44px] (touch target)
   - 悬停效果: hover:bg-gray-50
   - 过渡: transition-colors duration-200
   - 光标: cursor-pointer
   - 图标: 使用 Lucide SVG 图标
   ```

6. **跳转处理**
   - 点击"写文章": `router.push('/editor/blog')`
   - 点击"编辑导航": `router.push('/editor/navigation')`
   - 跳转后关闭菜单: `setIsOpen(false)`

### 步骤3: 验证功能
- [ ] 导航页面不再显示"写文章"和"编辑导航"按钮
- [ ] 搜索框输入 `20030610@ghl` 后显示编辑选项菜单
- [ ] 菜单项有正确的悬停效果 (颜色过渡，无 scale)
- [ ] 点击"写文章"跳转到 `/editor/blog`
- [ ] 点击"编辑导航"跳转到 `/editor/navigation`
- [ ] 原有搜索功能不受影响
- [ ] 菜单项点击区域 >= 44px

---

## 代码变更详情

### 1. app/navigation/page.tsx
删除以下代码块（第54-69行）：
```tsx
{/* 写文章按钮 */}
<Link
    href="/editor/blog"
    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
>
    <FileText className="w-4 h-4" />
    <span className="hidden sm:inline">写文章</span>
</Link>
{/* 编辑导航按钮 */}
<Link
    href="/editor/navigation"
    className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 hover:border-blue-200 transition-all"
>
    <Edit3 className="w-4 h-4" />
    <span className="hidden sm:inline">编辑导航</span>
</Link>
```

### 2. app/components/header/CommandInput.tsx
添加密码检测和编辑菜单功能：
- 导入 `useRouter` from 'next/navigation'
- 导入 `Lock, FileText, Compass` from 'lucide-react'
- 添加 `SECRET_CODE` 常量
- 添加 `showSecretMenu` 状态
- 在输入处理中检测密码匹配
- 添加编辑选项菜单渲染 (遵循上述 UI 规范)

---

## 验收标准
- [ ] 导航页面不再显示"写文章"和"编辑导航"按钮
- [ ] 搜索框输入 `20030610@ghl` 后显示编辑选项菜单
- [ ] 菜单标题显示 "🔐 管理员入口" (使用 Lock 图标)
- [ ] 菜单项有悬停效果 (hover:bg-gray-50, transition-colors duration-200)
- [ ] 所有可点击元素有 cursor-pointer
- [ ] 点击"写文章"选项跳转到 `/editor/blog`
- [ ] 点击"编辑导航"选项跳转到 `/editor/navigation`
- [ ] 原有搜索功能不受影响
- [ ] 使用 Lucide SVG 图标，不使用 emoji

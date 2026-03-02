import { C as resolveComponent, o as openBlock, c as createElementBlock, j as createBaseVNode, a as createTextVNode, F as Fragment, B as renderList, b as createBlock, k as unref } from "./chunks/framework.BiMWp1ZL.js";
const tools = [
  {
    name: "技术博客",
    icon: "blog",
    slug: "blog",
    tools: [
      {
        icon: "blog",
        title: "语雀",
        description: "专业的云端知识库，支持文档协作和知识管理",
        url: "https://www.yuque.com",
        tags: [
          "文档",
          "协作"
        ]
      },
      {
        icon: "blog",
        title: "Notion",
        description: "一体化工作空间，笔记、文档、项目管理",
        url: "https://www.notion.so",
        tags: [
          "笔记",
          "协作"
        ]
      }
    ]
  },
  {
    name: "网址导航",
    icon: "link",
    slug: "navigation",
    tools: [
      {
        icon: "link",
        title: "GitHub",
        description: "全球最大的开源社区和代码托管平台",
        url: "https://github.com",
        tags: [
          "代码",
          "开源"
        ]
      },
      {
        icon: "link",
        title: "QQ 邮箱",
        description: "腾讯 QQ 邮箱服务",
        url: "https://mail.qq.com",
        tags: [
          "邮箱"
        ]
      }
    ]
  },
  {
    name: "观点分享",
    icon: "idea",
    slug: "ideas",
    tools: [
      {
        icon: "idea",
        title: "MDN Web Docs",
        description: "Mozilla 开发者网络文档",
        url: "https://developer.mozilla.org",
        tags: [
          "文档",
          "Web"
        ]
      },
      {
        icon: "idea",
        title: "freeCodeCamp",
        description: "免费学习编程的平台",
        url: "https://www.freecodecamp.org",
        tags: [
          "学习",
          "编程"
        ]
      }
    ]
  },
  {
    name: "玻璃拟态",
    icon: "glass",
    slug: "glass",
    tools: [
      {
        icon: "glass",
        title: "Vue.js",
        description: "渐进式 JavaScript 框架",
        url: "https://vuejs.org",
        tags: [
          "框架",
          "前端"
        ]
      },
      {
        icon: "glass",
        title: "Tailwind CSS",
        description: "实用优先的 CSS 框架",
        url: "https://tailwindcss.com",
        tags: [
          "样式",
          "前端"
        ]
      }
    ]
  },
  {
    name: "本地搜索",
    icon: "search",
    slug: "search",
    tools: [
      {
        icon: "search",
        title: "NCBI",
        description: "National Center for Biotechnology Information",
        url: "https://www.ncbi.nlm.nih.gov",
        tags: [
          "数据库",
          "研究"
        ]
      },
      {
        icon: "search",
        title: "GEO",
        description: "Gene Expression Omnibus 基因表达数据库",
        url: "https://www.ncbi.nlm.nih.gov/geo/",
        tags: [
          "数据库",
          "基因"
        ]
      }
    ]
  },
  {
    name: "响应式设计",
    icon: "responsive",
    slug: "responsive",
    tools: [
      {
        icon: "responsive",
        title: "Vite",
        description: "下一代前端构建工具",
        url: "https://vitejs.dev",
        tags: [
          "构建",
          "前端"
        ]
      },
      {
        icon: "responsive",
        title: "TypeScript",
        description: "JavaScript 的超集，添加类型支持",
        url: "https://www.typescriptlang.org",
        tags: [
          "语言",
          "前端"
        ]
      }
    ]
  }
];
const __pageData = JSON.parse('{"title":"网址导航","description":"","frontmatter":{"layout":"doc","title":"网址导航"},"headers":[],"relativePath":"navigation/index.md","filePath":"navigation/index.md","lastUpdated":null}');
const __default__ = { name: "navigation/index.md" };
const _sfc_main = /* @__PURE__ */ Object.assign(__default__, {
  setup(__props) {
    return (_ctx, _cache) => {
      const _component_ToolGrid = resolveComponent("ToolGrid");
      return openBlock(), createElementBlock("div", null, [
        _cache[0] || (_cache[0] = createBaseVNode("h1", {
          id: "网址导航",
          tabindex: "-1"
        }, [
          createTextVNode("网址导航 "),
          createBaseVNode("a", {
            class: "header-anchor",
            href: "#网址导航",
            "aria-label": 'Permalink to "网址导航"'
          }, "​")
        ], -1)),
        _cache[1] || (_cache[1] = createBaseVNode("div", { class: "page-intro" }, [
          createBaseVNode("p", null, "收藏优质网站与工具，按分类组织，便于快速查找与访问。")
        ], -1)),
        _cache[2] || (_cache[2] = createBaseVNode("div", { class: "gradient-divider" }, null, -1)),
        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(tools), (category) => {
          return openBlock(), createBlock(_component_ToolGrid, {
            key: category.slug,
            title: category.name,
            icon: category.icon,
            tools: category.tools
          }, null, 8, ["title", "icon", "tools"]);
        }), 128))
      ]);
    };
  }
});
export {
  __pageData,
  _sfc_main as default
};

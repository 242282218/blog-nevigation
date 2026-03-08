import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MyBlog',
  description: '个人博客与网址导航',
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ['link', { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#1d4ed8' }]
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'MyBlog',

    nav: [
      { text: '首页', link: '/', activeMatch: '^/$' },
      { text: '博客', link: '/blog/', activeMatch: '^/blog/' },
      { text: '导航', link: '/navigation/', activeMatch: '^/navigation/' },
      { text: '关于', link: '/about/', activeMatch: '^/about/' }
    ],

    sidebar: {
      '/blog/': [
        {
          text: '博客文章',
          items: [{ text: '所有文章', link: '/blog/' }]
        }
      ],
      '/navigation/': [
        {
          text: '网址导航',
          items: [{ text: '全部导航', link: '/navigation/' }]
        }
      ]
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com' }],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024-present'
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3]
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  }
})

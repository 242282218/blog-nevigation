import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"MyBlog","text":"记录技术思考，分享解决方案","tagline":"基于 VitePress 构建的个人博客与网址导航，采用蓝青渐变玻璃拟态设计","image":{"src":"/logo.svg","alt":"MyBlog"},"actions":[{"theme":"brand","text":"开始阅读","link":"/blog/"},{"theme":"alt","text":"浏览导航","link":"/navigation/"}]},"features":[{"icon":"📝","title":"技术博客","details":"记录技术思考、问题拆解与落地经验，持续沉淀可复用的方法论。"},{"icon":"🔗","title":"网址导航","details":"收藏高质量网站和工具，按主题分类，快速检索与访问。"},{"icon":"💡","title":"观点分享","details":"分享个人见解与实践复盘，关注长期可维护的工程方案。"},{"icon":"🎨","title":"统一设计","details":"采用统一的蓝青玻璃拟态视觉语言，保证页面与组件风格一致。"},{"icon":"🔍","title":"本地搜索","details":"内置本地搜索能力，快速定位文章与导航内容。"},{"icon":"📱","title":"响应式体验","details":"同时覆盖桌面端与移动端，保证一致的阅读与浏览体验。"}]},"headers":[],"relativePath":"index.md","filePath":"index.md","lastUpdated":null}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};

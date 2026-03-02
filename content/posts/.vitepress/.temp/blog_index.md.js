import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"博客","description":"","frontmatter":{"layout":"doc","title":"博客"},"headers":[],"relativePath":"blog/index.md","filePath":"blog/index.md","lastUpdated":null}');
const _sfc_main = { name: "blog/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="博客文章" tabindex="-1">博客文章 <a class="header-anchor" href="#博客文章" aria-label="Permalink to &quot;博客文章&quot;">​</a></h1><div class="page-intro"><p>记录技术思考、解决方案与学习复盘。</p></div><div class="gradient-divider"></div><h2 id="最新文章" tabindex="-1">最新文章 <a class="header-anchor" href="#最新文章" aria-label="Permalink to &quot;最新文章&quot;">​</a></h2><h3 id="_2024-年" tabindex="-1">2024 年 <a class="header-anchor" href="#_2024-年" aria-label="Permalink to &quot;2024 年&quot;">​</a></h3><ul><li><a href="./2024/welcome.html">欢迎来到我的博客</a> - 博客上线，记录新的开始</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("blog/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};

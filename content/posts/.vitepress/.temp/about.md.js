import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"关于","description":"","frontmatter":{"layout":"doc","title":"关于"},"headers":[],"relativePath":"about.md","filePath":"about.md","lastUpdated":null}');
const _sfc_main = { name: "about.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="关于我" tabindex="-1">关于我 <a class="header-anchor" href="#关于我" aria-label="Permalink to &quot;关于我&quot;">​</a></h1><div class="page-intro"><p>你好，欢迎来到我的博客。</p></div><div class="gradient-divider"></div><h2 id="关于这个站点" tabindex="-1">关于这个站点 <a class="header-anchor" href="#关于这个站点" aria-label="Permalink to &quot;关于这个站点&quot;">​</a></h2><p>这是一个结合「个人博客 + 网址导航」的内容站，核心目标是：</p><ul><li>📝 记录技术学习与实践过程</li><li>🔗 汇总高质量工具与资源</li><li>💡 输出可复用的问题解决思路</li></ul><h2 id="技术栈" tabindex="-1">技术栈 <a class="header-anchor" href="#技术栈" aria-label="Permalink to &quot;技术栈&quot;">​</a></h2><ul><li><strong>VitePress</strong>：静态站点生成</li><li><strong>Vue.js</strong>：主题与组件扩展</li><li><strong>GitHub Pages</strong>：站点托管</li><li><strong>GitHub Actions</strong>：自动化部署</li></ul><h2 id="联系方式" tabindex="-1">联系方式 <a class="header-anchor" href="#联系方式" aria-label="Permalink to &quot;联系方式&quot;">​</a></h2><ul><li><strong>GitHub</strong>：<a href="https://github.com" target="_blank" rel="noreferrer">github.com</a></li><li><strong>Email</strong>：暂未公开</li></ul><hr><p>感谢你的访问。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("about.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const about = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  about as default
};

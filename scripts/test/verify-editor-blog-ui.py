import os
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import expect, sync_playwright

from editor_auth import create_authenticated_context

BASE_URL = os.environ.get("BASE_URL") or os.environ.get("TEST_BASE_URL", "http://127.0.0.1:3210")
SCREENSHOT_PATH = Path("output/editor-blog-ui.png")
MOBILE_SCREENSHOT_PATH = Path("output/editor-blog-new-mobile-ui.png")
DEBUG_HTML_PATH = Path("output/editor-blog-ui-debug.html")


def assert_no_horizontal_overflow(page) -> None:
    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth - window.innerWidth"
    )
    assert overflow <= 1, f"Page has horizontal overflow: {overflow}px"


def assert_min_touch_target(locator, label: str) -> None:
    box = locator.bounding_box()
    assert box is not None, f"{label} is not visible"
    assert box["width"] >= 44 and box["height"] >= 44, (
        f"{label} touch target is too small: {box['width']}x{box['height']}"
    )


def goto_editor_page(page, path: str) -> None:
    target_url = f"{BASE_URL}{path}"

    for attempt in range(2):
        try:
            page.goto(target_url, wait_until="domcontentloaded", timeout=90000)
            return
        except PlaywrightTimeoutError:
            if attempt == 1:
                raise
            page.goto("about:blank", timeout=10000)


def create_article_list_context(browser, article: dict):
    context = create_authenticated_context(browser, BASE_URL, {"width": 1440, "height": 960}, "local-dev-only-secret")
    context.add_init_script(
        f"""
          window.localStorage.setItem('blog-local-articles', JSON.stringify([{json.dumps(article)}]));
        """
    )
    context.route(
        "**/api/data/articles",
        lambda route: route.fulfill(
            status=503,
            content_type="application/json",
            body='{"message":"smoke list workflow uses local articles"}',
        ),
    )
    page = context.new_page()
    page.set_default_timeout(90000)
    page.set_default_navigation_timeout(90000)
    return context, page


def main() -> None:
    SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = create_authenticated_context(browser, BASE_URL, {"width": 1440, "height": 960}, "local-dev-only-secret")
        page = context.new_page()
        page.set_default_timeout(90000)
        page.set_default_navigation_timeout(90000)

        goto_editor_page(page, "/editor/blog")

        blog_heading = page.get_by_role("heading", name="博客管理")

        try:
            expect(blog_heading).to_be_visible()
        except AssertionError:
            DEBUG_HTML_PATH.write_text(page.content(), encoding="utf-8")
            page.screenshot(path=str(SCREENSHOT_PATH), full_page=True)
            raise AssertionError(f"Blog editor page did not render. Current URL: {page.url}")

        expect(page.get_by_role("heading", name="开始一篇新文章")).to_be_visible()
        page.get_by_role("button", name="模板库", exact=True).click()
        expect(page.get_by_text("排障复盘")).to_be_visible()
        expect(page.get_by_text("适合：线上问题 / 构建失败 / 性能异常")).to_be_visible()

        goto_editor_page(page, "/editor/blog/new?template=blank")
        expect(page.get_by_role("heading", name="新建文章")).to_be_visible()
        page.get_by_role("button", name="保存").click()
        expect(page.get_by_text("文章已保存。")).to_be_visible()
        page.wait_for_url("**/editor/blog/new?edit=*")
        edit_url = page.url
        saved_article_id = parse_qs(urlparse(edit_url).query)["edit"][0]

        editor = page.locator("#article-markdown-editor")
        expect(editor).to_be_visible()
        editor.fill("# Demo\n\n```typescript\nconst ok = true;\n```")
        page.get_by_role("button", name="预览").click()
        expect(page.get_by_role("button", name="复制代码")).to_be_visible()
        expect(page.get_by_text("typescript")).to_be_visible()
        assert_no_horizontal_overflow(page)

        list_workflow_article = {
            "id": saved_article_id,
            "slug": "smoke-publish-draft",
            "title": "Smoke Publish Draft",
            "date": "2026-05-27",
            "description": "",
            "tags": ["smoke"],
            "content": "# Smoke Publish Draft",
            "status": "draft",
            "kind": "essay",
            "featured": False,
            "createdAt": 1779820000000,
            "updatedAt": 1779820000000,
        }

        context.close()

        list_context, page = create_article_list_context(browser, list_workflow_article)
        goto_editor_page(page, "/editor/blog")
        expect(page.get_by_role("heading", name="博客管理")).to_be_visible()
        publish_draft_button = page.locator('button[aria-label="发布文章：Smoke Publish Draft"]').first
        expect(publish_draft_button).to_be_visible()
        publish_draft_button.click()
        expect(page.get_by_text("发布前需要处理：公开文章有描述。")).to_be_visible()
        page.get_by_role("button", name="去编辑").click()
        page.wait_for_url("**/editor/blog/new?edit=*")
        expect(page.get_by_role("heading", name="编辑文章")).to_be_visible()
        list_context.close()

        list_workflow_article["description"] = "A smoke test draft that can be published from the article list."

        publish_context, page = create_article_list_context(browser, list_workflow_article)
        goto_editor_page(page, "/editor/blog")
        expect(page.get_by_text("Smoke Publish Draft").first).to_be_visible()
        publish_button = page.locator('button[aria-label="发布文章：Smoke Publish Draft"]').first
        expect(publish_button).to_be_visible()
        publish_button.click()
        expect(page.get_by_text("文章已标记为已发布。")).to_be_visible()
        draft_button = page.locator('button[aria-label="改为草稿文章：Smoke Publish Draft"]').first
        expect(draft_button).to_be_visible()
        draft_button.click()
        expect(page.get_by_text("文章已改为草稿。")).to_be_visible()

        page.screenshot(path=str(SCREENSHOT_PATH), full_page=True)
        publish_context.close()

        mobile_context = create_authenticated_context(browser, BASE_URL, {"width": 390, "height": 844}, "local-dev-only-secret")
        mobile_page = mobile_context.new_page()
        mobile_page.set_default_timeout(90000)
        mobile_page.set_default_navigation_timeout(90000)
        mobile_page.goto(f"{BASE_URL}/editor/blog/new?template=blank", wait_until="domcontentloaded", timeout=90000)
        expect(mobile_page.get_by_role("heading", name="新建文章")).to_be_visible()
        assert_min_touch_target(
            mobile_page.get_by_role("link", name="返回").first,
            "mobile article editor back action",
        )
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="导出 Markdown").first,
            "mobile article editor export action",
        )
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="保存").first,
            "mobile article editor save action",
        )

        mobile_editor = mobile_page.locator("#article-markdown-editor")
        expect(mobile_editor).to_be_visible()
        expect(mobile_page.get_by_text("发布阻塞：请填写标题")).to_be_visible()
        expect(mobile_page.get_by_text("发布建议：描述建议控制在 30-120 字")).to_be_visible()
        expect(mobile_page.get_by_text("发布建议：至少添加 1 个标签")).to_be_visible()
        mobile_page.get_by_role("button", name="标题已填写").click()
        expect(mobile_page.locator("#frontmatter-title")).to_be_focused()
        mobile_page.locator("#frontmatter-title").fill("Mobile Runtime URL")
        mobile_page.get_by_role("button", name="从标题生成").click()
        publishing_summary = mobile_page.get_by_label("发布准备")
        expect(publishing_summary).to_be_visible()
        expect(publishing_summary.get_by_text("/posts/mobile-runtime-url")).to_be_visible()
        expect(mobile_page.locator("#frontmatter-slug")).to_have_value("mobile-runtime-url")
        expect(mobile_page.locator("#frontmatter-slug-help").get_by_text("/posts/mobile-runtime-url")).to_be_visible()
        mobile_page.locator("#frontmatter-category").fill("Smoke Category")
        mobile_page.locator("#frontmatter-series").fill("Smoke Series")
        mobile_page.get_by_role("button", name="添加资料").click()
        mobile_page.locator("#frontmatter-source-title-0").fill("Smoke Docs")
        mobile_page.locator("#frontmatter-source-url-0").fill("javascript:alert(1)")
        expect(mobile_page.get_by_text("请输入有效的 HTTPS 链接。")).to_be_visible()
        mobile_page.get_by_role("button", name="保存").first.click()
        expect(mobile_page.get_by_text("保存前需要处理：参考资料链接安全有效。")).to_be_visible()
        mobile_page.get_by_role("button", name="定位问题").click()
        expect(mobile_page.locator("#frontmatter-source-url-0")).to_be_focused()
        mobile_page.locator("#frontmatter-source-url-0").fill("https://example.com/docs")
        expect(mobile_page.locator("#frontmatter-source-title-0")).to_have_value("Smoke Docs")
        mobile_page.get_by_role("button", name="添加修订").click()
        mobile_page.locator("#frontmatter-revision-note-0").fill("Smoke revision")
        expect(mobile_page.locator("#frontmatter-revision-note-0")).to_have_value("Smoke revision")
        expect(mobile_page.get_by_role("button", name="写作")).to_have_attribute("aria-pressed", "true")
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="写作").first,
            "mobile write mode action",
        )
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="分栏").first,
            "mobile split mode action",
        )
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="预览").first,
            "mobile preview mode action",
        )
        assert_no_horizontal_overflow(mobile_page)

        mobile_content = "# Mobile\n\n## Jump Target\n\nContent\n\n## Install\n\nNotes\n\n## Verify\n\nNotes\n\n## Ship\n\nNotes"
        mobile_editor.fill(mobile_content)
        expect(mobile_editor).to_have_value(mobile_content)
        toolbar = mobile_page.locator("[data-editor-toolbar]")
        expect(toolbar).to_be_visible()
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="标题").first,
            "mobile markdown heading action",
        )
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="加粗").first,
            "mobile markdown bold action",
        )
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="链接").first,
            "mobile markdown link action",
        )
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="Jump Target").first,
            "mobile outline jump action",
        )
        heading_button = mobile_page.get_by_role("button", name="标题").first
        mobile_editor.evaluate(
            """(element) => {
              element.focus();
              element.setSelectionRange(10, 24);
            }"""
        )
        heading_button.click()
        expect(mobile_editor).to_have_value(mobile_content)
        mobile_editor.evaluate(
            """(element) => {
              element.focus();
              element.setSelectionRange(2, 8);
            }"""
        )
        mobile_page.keyboard.press("Control+B")
        mobile_content = "# **Mobile**\n\n## Jump Target\n\nContent\n\n## Install\n\nNotes\n\n## Verify\n\nNotes\n\n## Ship\n\nNotes"
        expect(mobile_editor).to_have_value(mobile_content)
        mobile_editor.evaluate(
            """(element) => {
              const start = element.value.indexOf('Install');
              element.focus();
              element.setSelectionRange(start, start + 'Install'.length);
            }"""
        )
        mobile_page.keyboard.press("Control+Shift+X")
        mobile_content = "# **Mobile**\n\n## Jump Target\n\nContent\n\n## ~~Install~~\n\nNotes\n\n## Verify\n\nNotes\n\n## Ship\n\nNotes"
        expect(mobile_editor).to_have_value(mobile_content)

        mobile_page.get_by_role("button", name="预览").click()
        preview_pane = mobile_page.locator("[data-preview-pane]")
        expect(preview_pane).to_be_visible()
        expect(mobile_page.get_by_role("heading", name="Mobile", exact=True)).to_be_visible()
        expect(preview_pane.get_by_role("heading", name="目录")).to_be_visible()
        expect(preview_pane.get_by_text("Jump Target").first).to_be_visible()
        expect(preview_pane.get_by_text("Smoke Category")).to_be_visible()
        expect(preview_pane.get_by_text("Smoke Series")).to_be_visible()
        expect(preview_pane.get_by_role("heading", name="参考资料")).to_be_visible()
        expect(preview_pane.get_by_text("Smoke Docs")).to_be_visible()
        expect(preview_pane.get_by_role("heading", name="修订记录")).to_be_visible()
        expect(preview_pane.get_by_text("Smoke revision")).to_be_visible()
        assert_no_horizontal_overflow(mobile_page)

        mobile_page.get_by_role("button", name="分栏").click()
        expect(mobile_page.get_by_role("button", name="分栏")).to_have_attribute("aria-pressed", "true")
        expect(mobile_page.locator("[data-editor-workspace]")).to_be_visible()
        assert_no_horizontal_overflow(mobile_page)

        mobile_page.route(
            "**/api/data/articles",
            lambda route: route.fulfill(
                status=503,
                content_type="application/json",
                body='{"message":"smoke list touch target uses local articles"}',
            ),
        )
        mobile_page.evaluate(
            """() => {
              window.localStorage.setItem('blog-local-articles', JSON.stringify([{
                id: 'mobile-touch-target',
                slug: 'mobile-touch-target',
                title: 'Mobile Touch Target',
                date: '2026-05-27',
                description: 'Mobile list action sizing check.',
                tags: ['smoke'],
                content: '# Mobile Touch Target',
                status: 'published',
                kind: 'essay',
                featured: false,
                createdAt: 1779820000000,
                updatedAt: 1779820000000
              }]));
            }"""
        )
        mobile_page.goto(f"{BASE_URL}/editor/blog", wait_until="domcontentloaded", timeout=90000)
        expect(mobile_page.get_by_role("heading", name="博客管理")).to_be_visible()
        assert_min_touch_target(
            mobile_page.get_by_role("link", name="返回").first,
            "mobile blog list back action",
        )
        assert_min_touch_target(
            mobile_page.locator('label[aria-label="导入文章 Markdown"]').first,
            "mobile blog import action",
        )
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="新建文章").first,
            "mobile new article action",
        )
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="继续编辑").first,
            "mobile recent article edit action",
        )
        mobile_page.get_by_role("button", name="草稿 0").click()
        expect(mobile_page.get_by_text("状态：草稿")).to_be_visible()
        expect(mobile_page.get_by_text("当前显示 0 / 1 篇")).to_be_visible()
        assert_min_touch_target(
            mobile_page.get_by_role("button", name="移除筛选：状态：草稿").first,
            "mobile active filter chip remove action",
        )
        mobile_page.get_by_role("button", name="移除筛选：状态：草稿").click()
        expect(mobile_page.get_by_text("未应用筛选")).to_be_visible()
        expect(mobile_page.get_by_text("Mobile Touch Target").first).to_be_visible()
        mobile_page.get_by_role("button", name="草稿 0").click()
        expect(mobile_page.get_by_text("状态：草稿")).to_be_visible()
        expect(mobile_page.get_by_text("当前筛选没有结果，清除筛选后可以回到完整文章列表。")).to_be_visible()
        mobile_page.get_by_role("button", name="清除筛选").last.click()
        expect(mobile_page.get_by_text("未应用筛选")).to_be_visible()
        expect(mobile_page.get_by_text("Mobile Touch Target").first).to_be_visible()
        assert_min_touch_target(
            mobile_page.get_by_placeholder("搜索标题、描述或标签").first,
            "mobile article search input",
        )
        assert_min_touch_target(
            mobile_page.get_by_label("按文章类型筛选").first,
            "mobile article kind filter",
        )
        assert_min_touch_target(
            mobile_page.locator('button[aria-label="改为草稿文章：Mobile Touch Target"]').first,
            "mobile article status action",
        )
        assert_min_touch_target(
            mobile_page.locator('button[aria-label="编辑文章：Mobile Touch Target"]').last,
            "mobile article edit action",
        )
        assert_min_touch_target(
            mobile_page.locator('button[aria-label="导出文章：Mobile Touch Target"]').first,
            "mobile article export action",
        )

        mobile_page.screenshot(path=str(MOBILE_SCREENSHOT_PATH), full_page=True)
        browser.close()


if __name__ == "__main__":
    main()

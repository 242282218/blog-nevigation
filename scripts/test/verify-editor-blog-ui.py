import os
from pathlib import Path

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


def main() -> None:
    SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = create_authenticated_context(browser, BASE_URL, {"width": 1440, "height": 960}, "playwright-token")
        page = context.new_page()
        page.set_default_timeout(90000)
        page.set_default_navigation_timeout(90000)

        page.goto(f"{BASE_URL}/editor/blog", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")

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

        page.get_by_role("button", name="空白文章", exact=True).click()
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("heading", name="新建文章")).to_be_visible()

        editor = page.locator("#article-markdown-editor")
        expect(editor).to_be_visible()
        editor.fill("# Demo\n\n```typescript\nconst ok = true;\n```")
        page.get_by_role("button", name="预览").click()
        expect(page.get_by_role("button", name="复制代码")).to_be_visible()
        expect(page.get_by_text("typescript")).to_be_visible()
        assert_no_horizontal_overflow(page)

        page.screenshot(path=str(SCREENSHOT_PATH), full_page=True)

        mobile_context = create_authenticated_context(browser, BASE_URL, {"width": 390, "height": 844}, "playwright-token")
        mobile_page = mobile_context.new_page()
        mobile_page.set_default_timeout(90000)
        mobile_page.set_default_navigation_timeout(90000)
        mobile_page.goto(f"{BASE_URL}/editor/blog/new?template=blank", wait_until="domcontentloaded")
        mobile_page.wait_for_load_state("networkidle")
        expect(mobile_page.get_by_role("heading", name="新建文章")).to_be_visible()

        mobile_editor = mobile_page.locator("#article-markdown-editor")
        expect(mobile_editor).to_be_visible()
        expect(mobile_page.get_by_role("button", name="写作")).to_have_attribute("aria-pressed", "true")
        assert_no_horizontal_overflow(mobile_page)

        mobile_editor.fill("# Mobile\n\nContent")
        expect(mobile_editor).to_have_value("# Mobile\n\nContent")
        toolbar = mobile_page.locator("[data-editor-toolbar]")
        expect(toolbar).to_be_visible()

        mobile_page.get_by_role("button", name="预览").click()
        expect(mobile_page.locator("[data-preview-pane]")).to_be_visible()
        expect(mobile_page.get_by_role("heading", name="Mobile")).to_be_visible()
        assert_no_horizontal_overflow(mobile_page)

        mobile_page.get_by_role("button", name="分栏").click()
        expect(mobile_page.get_by_role("button", name="分栏")).to_have_attribute("aria-pressed", "true")
        expect(mobile_page.locator("[data-editor-workspace]")).to_be_visible()
        assert_no_horizontal_overflow(mobile_page)

        mobile_page.screenshot(path=str(MOBILE_SCREENSHOT_PATH), full_page=True)
        browser.close()


if __name__ == "__main__":
    main()

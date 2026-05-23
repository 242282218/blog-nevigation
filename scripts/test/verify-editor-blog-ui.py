import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:3210")
EDITOR_TOKEN = os.environ.get("EDITOR_ACCESS_TOKEN", "playwright-token")
SCREENSHOT_PATH = Path("output/editor-blog-ui.png")
DEBUG_HTML_PATH = Path("output/editor-blog-ui-debug.html")


def login_if_needed(page) -> None:
    if "/editor/login" not in page.url:
        return

    page.locator("input[type='password']").fill(EDITOR_TOKEN)
    page.get_by_role("button", name="进入编辑区").click()
    page.wait_for_load_state("networkidle")
    page.goto(f"{BASE_URL}/editor/blog", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")


def main() -> None:
    SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 960})
        page.set_default_navigation_timeout(90000)

        page.goto(f"{BASE_URL}/editor/blog", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        login_if_needed(page)

        if page.get_by_role("heading", name="博客管理").count() == 0:
            DEBUG_HTML_PATH.write_text(page.content(), encoding="utf-8")
            page.screenshot(path=str(SCREENSHOT_PATH), full_page=True)
            raise AssertionError(f"Blog editor page did not render. Current URL: {page.url}")

        expect(page.get_by_role("heading", name="博客管理")).to_be_visible()
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

        page.screenshot(path=str(SCREENSHOT_PATH), full_page=True)
        browser.close()


if __name__ == "__main__":
    main()

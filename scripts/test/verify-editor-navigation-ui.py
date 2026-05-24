import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

from editor_auth import create_authenticated_context

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3001")
OUTPUT_DIR = Path("output/playwright")


def assert_no_horizontal_overflow(page) -> None:
    has_overflow = page.evaluate(
        "() => document.documentElement.scrollWidth > window.innerWidth + 1"
    )
    assert not has_overflow, f"horizontal overflow on {page.url}"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        for name, viewport in {
            "desktop": {"width": 1440, "height": 960},
            "mobile": {"width": 390, "height": 844},
        }.items():
            context = create_authenticated_context(browser, BASE_URL, viewport, "change-me")
            page = context.new_page()
            page.set_default_timeout(90000)
            page.goto(f"{BASE_URL}/editor/navigation", wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle")

            expect(page.get_by_role("heading", name="导航编辑器")).to_be_visible()
            expect(page.get_by_role("button", name="添加分类")).to_be_visible()
            page.get_by_role("button", name="添加工具").first.click()
            expect(page.get_by_text("工具名称").first).to_be_visible()
            expect(page.get_by_text("URL").first).to_be_visible()
            expect(page.get_by_text("描述").first).to_be_visible()
            expect(page.get_by_text("标签").first).to_be_visible()
            assert_no_horizontal_overflow(page)
            page.screenshot(path=OUTPUT_DIR / f"editor-navigation-{name}.png", full_page=True)
            context.close()

        browser.close()


if __name__ == "__main__":
    main()

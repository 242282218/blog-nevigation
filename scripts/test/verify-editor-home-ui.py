import hashlib
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3000")
EDITOR_ACCESS_TOKEN = os.environ.get("EDITOR_ACCESS_TOKEN", "change-me")
SESSION_NAMESPACE = "blog-navigation-editor-session:v1"
SCREENSHOT_DIR = Path("output/playwright")


def create_session_value(secret: str) -> str:
    return hashlib.sha256(f"{SESSION_NAMESPACE}:{secret.strip()}".encode()).hexdigest()


def assert_no_horizontal_overflow(page) -> None:
    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth - window.innerWidth"
    )
    assert overflow <= 1, f"Page has horizontal overflow: {overflow}px"


def create_authenticated_context(browser, viewport):
    context = browser.new_context(viewport=viewport)
    context.add_cookies(
        [
            {
                "name": "editor_session",
                "value": create_session_value(EDITOR_ACCESS_TOKEN),
                "url": BASE_URL,
                "httpOnly": True,
                "sameSite": "Lax",
            }
        ]
    )

    return context


def verify_page(browser, viewport, screenshot_name: str) -> None:
    context = create_authenticated_context(browser, viewport)
    page = context.new_page()
    page.set_default_timeout(60000)
    page.goto(f"{BASE_URL}/editor", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")

    expect(page.get_by_role("heading", name="编辑中心")).to_be_visible()
    expect(page.get_by_role("link", name="博客编辑器 使用 Markdown 编写文章，保留实时预览、模板和本地优先保存。 开始写作")).to_be_visible()
    expect(page.get_by_role("button", name="退出")).to_be_visible()
    expect(page.get_by_role("button", name="备份数据")).to_be_visible()
    expect(page.get_by_role("button", name="恢复数据")).to_be_visible()
    expect(page.get_by_text("R2 未配置完整，云端同步和云端恢复暂不可用。")).to_be_visible()
    assert_no_horizontal_overflow(page)

    if viewport["width"] < 640:
        first_card_top = page.get_by_role("link", name="博客编辑器 使用 Markdown 编写文章，保留实时预览、模板和本地优先保存。 开始写作").bounding_box()["y"]
        assert first_card_top < 220, f"Editor action cards start too low on mobile: {first_card_top}px"

    page.screenshot(path=str(SCREENSHOT_DIR / screenshot_name), full_page=True)
    context.close()


def main() -> None:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        verify_page(browser, {"width": 1280, "height": 900}, "editor-home-desktop.png")
        verify_page(browser, {"width": 390, "height": 844}, "editor-home-mobile.png")
        browser.close()


if __name__ == "__main__":
    main()

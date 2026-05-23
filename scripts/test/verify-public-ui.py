from pathlib import Path
import os

from playwright.sync_api import expect, sync_playwright


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3001")
OUTPUT_DIR = Path("output/playwright")


def assert_no_horizontal_overflow(page):
    has_overflow = page.evaluate(
        "() => document.documentElement.scrollWidth > window.innerWidth + 1"
    )
    assert not has_overflow, f"horizontal overflow on {page.url}"


def verify_page(page, path, heading, console_errors, page_errors):
    page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
    try:
        expect(page.locator("h1").filter(has_text=heading).first).to_be_visible()
    except AssertionError:
        print(f"Failed route: {path}")
        print(f"Current URL: {page.url}")
        print("Console errors:")
        print("\n".join(console_errors[-5:]))
        print("Page errors:")
        print("\n".join(page_errors[-5:]))
        print(page.locator("body").inner_text()[:1000])
        page.screenshot(path=OUTPUT_DIR / f"failure-{path.strip('/') or 'home'}.png", full_page=True)
        raise
    assert_no_horizontal_overflow(page)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    console_errors = []
    page_errors = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        for name, viewport in {
            "desktop": {"width": 1440, "height": 1000},
            "mobile": {"width": 390, "height": 844},
        }.items():
            page = browser.new_page(viewport=viewport)
            page.on(
                "console",
                lambda message: console_errors.append(message.text)
                if message.type == "error"
                else None,
            )
            page.on("pageerror", lambda error: page_errors.append(str(error)))

            verify_page(page, "/", "技术博客与常用链接的个人工作台", console_errors, page_errors)
            page.screenshot(path=OUTPUT_DIR / f"home-{name}.png", full_page=True)

            verify_page(page, "/blog", "技术文章归档", console_errors, page_errors)
            page.screenshot(path=OUTPUT_DIR / f"blog-{name}.png", full_page=True)

            verify_page(
                page,
                "/posts/2025-02-28-react-performance-optimization",
                "React 性能优化实践指南",
                console_errors,
                page_errors,
            )
            page.screenshot(path=OUTPUT_DIR / f"post-{name}.png", full_page=True)

            verify_page(page, "/navigation", "常用链接导航", console_errors, page_errors)
            page.get_by_placeholder("搜索工具、标签或域名").fill("MDN")
            expect(page.get_by_text("MDN Web Docs").first).to_be_visible()
            assert_no_horizontal_overflow(page)
            page.screenshot(path=OUTPUT_DIR / f"navigation-search-{name}.png", full_page=True)
            page.close()

        browser.close()

    assert not console_errors, "\n".join(console_errors)
    assert not page_errors, "\n".join(page_errors)


if __name__ == "__main__":
    main()

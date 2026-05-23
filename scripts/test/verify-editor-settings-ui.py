import os
import hashlib

from playwright.sync_api import expect, sync_playwright


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3000")
EDITOR_ACCESS_TOKEN = os.environ.get("EDITOR_ACCESS_TOKEN", "change-me")
SESSION_NAMESPACE = "blog-navigation-editor-session:v1"


def create_session_value(secret: str) -> str:
    return hashlib.sha256(f"{SESSION_NAMESPACE}:{secret.strip()}".encode()).hexdigest()


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
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
        page = context.new_page()
        page.set_default_timeout(60000)
        console_errors: list[str] = []
        page_errors: list[str] = []

        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        page.goto(f"{BASE_URL}/editor/settings", wait_until="commit", timeout=60000)

        if page.get_by_role("heading", name="站点设置").count() == 0:
            raise AssertionError(
                f"Settings page did not render. url={page.url} body={page.locator('body').inner_text(timeout=1000)[:500]}"
            )
        expect(page.get_by_role("heading", name="站点设置")).to_be_visible()
        expect(page.get_by_label("站点名称")).to_be_visible()
        expect(page.get_by_label("首页描述")).to_be_visible()
        expect(page.get_by_role("button", name="保存设置")).to_be_visible()

        page.goto(f"{BASE_URL}/", wait_until="commit", timeout=60000)
        page.locator('button:visible:has-text("Ctrl+K")').click()
        expect(page.locator('input[aria-label="搜索文章或链接"]')).to_be_visible()
        page.keyboard.type(":admin")
        expect(page.get_by_text("站点设置")).to_be_visible()

        browser.close()

        relevant_console_errors = [
            error
            for error in console_errors
            if "Failed to fetch RSC payload" not in error
        ]

        if relevant_console_errors or page_errors:
            raise AssertionError(
                f"Browser errors found: console={relevant_console_errors}, page={page_errors}"
            )


if __name__ == "__main__":
    main()

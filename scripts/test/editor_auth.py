import os


def get_editor_login_secret(default_secret: str) -> str:
    return (
        os.environ.get("EDITOR_LOGIN_SECRET")
        or os.environ.get("EDITOR_ACCESS_TOKEN")
        or default_secret
    )


def create_authenticated_context(browser, base_url: str, viewport, default_secret: str):
    context = browser.new_context(viewport=viewport)
    response = context.request.post(
        f"{base_url.rstrip('/')}/api/editor-auth",
        data={"secret": get_editor_login_secret(default_secret)},
    )

    if response.status != 200:
        body = response.text()
        context.close()
        raise AssertionError(
            f"Editor login failed: status={response.status} body={body[:500]}"
        )

    return context

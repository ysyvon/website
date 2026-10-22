"""Restore CSP meta tags removed by the journal HTML exporter."""

from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
MARKER = '<meta name="viewport" content="width=device-width, initial-scale=1">'
BASE_POLICY = (
    "default-src 'none'; base-uri 'none'; object-src 'none'; "
    "script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; "
    "connect-src 'none'; frame-src 'none'; form-action 'none'"
)
POST_POLICY = (
    "default-src 'none'; base-uri 'none'; object-src 'none'; "
    "script-src 'self' https://challenges.cloudflare.com; "
    "style-src 'self'; img-src 'self'; font-src 'self'; "
    "connect-src https://ys-journal-comments.ysgoldt.workers.dev "
    "https://challenges.cloudflare.com; "
    "frame-src https://challenges.cloudflare.com; form-action 'none'"
)


def ensure_csp(page: Path, policy: str) -> bool:
    html = page.read_text()
    if 'http-equiv="Content-Security-Policy"' in html:
        return False
    if html.count(MARKER) != 1:
        raise ValueError(f"{page.relative_to(ROOT)}: expected one viewport meta tag")
    tag = f'<meta http-equiv="Content-Security-Policy" content="{policy}">'
    page.write_text(html.replace(MARKER, MARKER + tag, 1))
    return True


def main() -> None:
    pages = [(ROOT / "journal.html", BASE_POLICY)]
    pages += [(page, BASE_POLICY) for page in sorted((ROOT / "journal-tags").glob("*.html"))]
    pages += [(page, POST_POLICY) for page in sorted((ROOT / "journal-posts").glob("*.html"))]
    changed = sum(ensure_csp(page, policy) for page, policy in pages)
    print(f"Ensured CSP on {len(pages)} journal pages; updated {changed}.")


if __name__ == "__main__":
    main()

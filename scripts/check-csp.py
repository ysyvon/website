"""Reject pages without a CSP or with stale inline-script hashes."""

import base64
import hashlib
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SCRIPT = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.IGNORECASE | re.DOTALL)
POLICY = re.compile(r'<meta http-equiv="Content-Security-Policy" content="([^"]+)">')


def main():
    errors = []
    pages = sorted(ROOT.rglob("*.html"))
    for page in pages:
        if any(part in page.parts for part in (".git", "_site", "node_modules")):
            continue
        html = page.read_text()
        policies = POLICY.findall(html)
        if len(policies) != 1:
            errors.append(f"{page.relative_to(ROOT)}: expected one CSP meta tag, found {len(policies)}")
            continue
        policy = policies[0]
        for script in SCRIPT.finditer(html):
            attributes, body = script.groups()
            if re.search(r"\bsrc\s*=", attributes, re.IGNORECASE):
                continue
            if re.search(r"\btype\s*=\s*['\"]application/ld\+json", attributes, re.IGNORECASE):
                continue
            if not body.strip():
                continue
            digest = base64.b64encode(hashlib.sha256(body.encode()).digest()).decode()
            source = f"'sha256-{digest}'"
            if source not in policy:
                errors.append(f"{page.relative_to(ROOT)}: missing inline script hash {source}")

    if errors:
        raise SystemExit("\n".join(errors))
    print("Every HTML page has one CSP and current inline-script hashes.")


if __name__ == "__main__":
    main()

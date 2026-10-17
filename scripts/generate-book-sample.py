"""Build the Even if the Light Forgets Chapter One page from locked source text."""

from hashlib import sha256
from html import escape
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "books/content/even-if-the-light-forgets-chapter-one.md"
OUTPUT = ROOT / "sample-even-if-the-light-forgets.html"
SOURCE_SHA256 = "86baa93bfe2d7b6ba8c137774559be4d7bab37f5435ad7b98e3a57fe92020a25"
BOOK_URL = "https://ysgoldt.com/shop/even-if-the-light-forgets-volume-i/"
SAMPLE_URL = "https://ysgoldt.com/sample-even-if-the-light-forgets.html"
COVER_URL = "https://ysgoldt.com/shop-assets/even-if-the-light-forgets-generic.jpg"


def render_prose(source):
    lines = source.split("\n")
    if lines[-1] == "":
        lines.pop()
    return "\n".join(
        '          <div class="serial-scene-break" role="separator" aria-label="Scene break">⁂</div>'
        if line == "⁂"
        else f"          <p>{escape(line, quote=False)}</p>"
        for line in lines
    )


def render_page(source):
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Chapter",
                "@id": SAMPLE_URL + "#chapter",
                "name": "Chapter One",
                "url": SAMPLE_URL,
                "author": {"@id": "https://ysgoldt.com/about.html#ys-goldt"},
                "isPartOf": {"@id": BOOK_URL + "#work"},
                "inLanguage": "en",
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Books", "item": "https://ysgoldt.com/"},
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Even if the Light Forgets — Volume I",
                        "item": BOOK_URL,
                    },
                    {"@type": "ListItem", "position": 3, "name": "Chapter One", "item": SAMPLE_URL},
                ],
            },
        ],
    }
    structured_data = json.dumps(graph, ensure_ascii=False, indent=2).replace("<", "\\u003c")
    prose = render_prose(source)
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; frame-src 'none'; form-action 'none'">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chapter One | Even if the Light Forgets — Volume I by Ys Goldt</title>
    <meta name="description" content="Read Chapter One of Even if the Light Forgets — Volume I, an adult fantasy romance by Ys Goldt.">
    <link rel="canonical" href="{SAMPLE_URL}">
    <meta property="og:site_name" content="Ys Goldt">
    <meta property="og:title" content="Chapter One | Even if the Light Forgets — Volume I">
    <meta property="og:description" content="Read Chapter One of Ys Goldt's adult fantasy romance Even if the Light Forgets — Volume I.">
    <meta property="og:type" content="article">
    <meta property="og:url" content="{SAMPLE_URL}">
    <meta property="og:image" content="{COVER_URL}">
    <meta property="og:image:alt" content="Cover of Even if the Light Forgets — Volume I by Ys Goldt">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1604">
    <meta property="og:image:height" content="2560">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Chapter One | Even if the Light Forgets — Volume I">
    <meta name="twitter:description" content="Read Chapter One of Ys Goldt's adult fantasy romance Even if the Light Forgets — Volume I.">
    <meta name="twitter:image" content="{COVER_URL}">
    <meta name="twitter:image:alt" content="Cover of Even if the Light Forgets — Volume I by Ys Goldt">
    <script type="application/ld+json">
{structured_data}
    </script>
    <link rel="icon" type="image/png" href="./favicon.png?v=20260818">
    <link rel="stylesheet" href="./styles.css">
    <script src="./disable-context-menu.js" defer></script>
  </head>
  <body class="detail-page book-sample-page" data-disable-context-menu>
    <main class="site site-detail serial-sample-site">
      <section class="hero" aria-label="Ys Goldt">
        <p class="page-title">Ys Goldt</p>
        <p class="page-subtitle">creator of strange and tender things</p>
      </section>
      <nav class="tabs" aria-label="Sections">
        <a class="tab active" href="./index.html" aria-current="page">Books</a>
        <a class="tab" href="./coming-soon.html">Coming Soon</a>
        <a class="tab" href="./serial/how-long-things-hold/index.html">Serial</a>
        <a class="tab" href="./works.html">Works</a>
        <a class="tab" href="./journal.html">Journal</a>
        <a class="tab" href="./about.html">About</a>
        <a class="tab" href="./contact.html">Contact</a>
        <a class="tab" href="./press.html">Press</a>
      </nav>
      <article class="serial-sample" aria-labelledby="chapter-title">
        <header class="serial-sample-header">
          <a href="./shop/even-if-the-light-forgets-volume-i/">Even if the Light Forgets — Volume I</a>
          <h1 id="chapter-title">Chapter One</h1>
        </header>
        <div class="serial-sample-prose">
{prose}
        </div>
        <div class="serial-sample-end">
          <p>Continue with <cite>Even if the Light Forgets — Volume I</cite></p>
          <a class="cta-button" href="./shop/even-if-the-light-forgets-volume-i/">View the book</a>
        </div>
      </article>
      <footer class="site-footer">
        <p><a href="./press.html">Press</a> · <a href="./privacy-policy.html">Privacy Policy</a></p>
        <p>©2026 Ys Goldt</p>
      </footer>
    </main>
  </body>
</html>
"""


def main():
    source_bytes = SOURCE.read_bytes()
    actual_hash = sha256(source_bytes).hexdigest()
    if actual_hash != SOURCE_SHA256:
        raise SystemExit("Chapter source differs from the supplied text; do not regenerate without editorial approval.")
    html = render_page(source_bytes.decode("utf-8"))
    if "--check" in sys.argv:
        if OUTPUT.read_text(encoding="utf-8") != html:
            raise SystemExit("Published sample differs from its locked chapter source.")
        print("Book sample matches the supplied text.")
    else:
        OUTPUT.write_text(html, encoding="utf-8")
        print("Generated the Chapter One text sample.")


if __name__ == "__main__":
    main()

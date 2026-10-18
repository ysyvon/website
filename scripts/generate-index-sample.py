"""Build the An Index of Vanishing sample from the locked user-supplied text."""

from hashlib import sha256
from html import escape, unescape
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "books/content/an-index-of-vanishing-sample.md"
OUTPUT = ROOT / "sample-an-index-of-vanishing.html"
SOURCE_SHA256 = "dd4af8883a3d4d90dc2a529fa60205756451ad27c2f46b9b7ff8f6bbe4146626"
BOOK_URL = "https://ysgoldt.com/shop/an-index-of-vanishing-part-i/"
SAMPLE_URL = "https://ysgoldt.com/sample-an-index-of-vanishing.html"
COVER_URL = "https://ysgoldt.com/shop-assets/an-index-digital.jpg"


def clean_paste_artifacts(line):
    """Decode the paste's entities and discard only its empty emphasis markers."""
    return unescape(line).replace("*\u00a0*", "").replace("* *", " ")


def render_prose(source):
    lines = source.splitlines()
    assert len(lines) == 41
    assert lines[2] == lines[17] == lines[19] == lines[27] == ""
    assert clean_paste_artifacts(lines[5]) == "codename: leise"
    assert clean_paste_artifacts(lines[28]) == "defiance"
    assert clean_paste_artifacts(lines[8]).startswith("wunderkinder programme, ")
    assert "the program in 1933." in clean_paste_artifacts(lines[9])

    markup = []
    for index, raw in enumerate(lines):
        line = clean_paste_artifacts(raw)
        if not line or index == 8:
            continue
        if index in (0, 1):
            markup.append(f'          <p class="index-sample-document-label">{escape(line)}</p>')
        elif index in (5, 6):
            markup.append(f'          <p class="index-sample-identity">{escape(line)}</p>')
        elif index == 7:
            following = clean_paste_artifacts(lines[8])
            word = "wunderkinder"
            assert following.startswith(word)
            markup.append(
                f'          <p>{escape(line)}<span class="index-sample-smallcaps">{word}</span>'
                f'{escape(following[len(word):])}</p>'
            )
        elif index == 18:
            markup.append(f'          <h2 class="index-sample-date">{escape(line)}</h2>')
        elif index == 28:
            markup.append(f'          <h3 class="index-sample-heading">{escape(line)}</h3>')
        else:
            markup.append(f'          <p>{escape(line)}</p>')
    return "\n".join(markup)


def render_page(source):
    graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CreativeWork",
                "@id": SAMPLE_URL + "#sample",
                "name": "An Index of Vanishing — Part I: Sample",
                "url": SAMPLE_URL,
                "author": {"@id": "https://ysgoldt.com/about.html#ys-goldt"},
                "isPartOf": {"@id": BOOK_URL + "#work"},
                "inLanguage": "en",
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Books", "item": "https://ysgoldt.com/"},
                    {"@type": "ListItem", "position": 2, "name": "An Index of Vanishing — Part I", "item": BOOK_URL},
                    {"@type": "ListItem", "position": 3, "name": "Sample", "item": SAMPLE_URL},
                ],
            },
        ],
    }
    structured_data = json.dumps(graph, ensure_ascii=False, indent=2).replace("<", "\\u003c")
    prose = render_prose(source)
    return f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; frame-src 'none'; form-action 'none'">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Read a Sample | An Index of Vanishing — Part I by Ys Goldt</title>
    <meta name="description" content="Read a text sample from An Index of Vanishing — Part I, the historical romance novella by Ys Goldt.">
    <link rel="canonical" href="{SAMPLE_URL}">
    <meta property="og:site_name" content="Ys Goldt">
    <meta property="og:title" content="Read a Sample | An Index of Vanishing — Part I">
    <meta property="og:description" content="Read a text sample from Ys Goldt's historical romance novella An Index of Vanishing — Part I.">
    <meta property="og:type" content="article">
    <meta property="og:url" content="{SAMPLE_URL}">
    <meta property="og:image" content="{COVER_URL}">
    <meta property="og:image:alt" content="Cover of An Index of Vanishing — Part I by Ys Goldt">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="486">
    <meta property="og:image:height" content="800">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Read a Sample | An Index of Vanishing — Part I">
    <meta name="twitter:description" content="Read a text sample from Ys Goldt's historical romance novella An Index of Vanishing — Part I.">
    <meta name="twitter:image" content="{COVER_URL}">
    <meta name="twitter:image:alt" content="Cover of An Index of Vanishing — Part I by Ys Goldt">
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
      <article class="serial-sample" aria-labelledby="sample-title">
        <header class="serial-sample-header">
          <a href="./shop/an-index-of-vanishing-part-i/">An Index of Vanishing — Part I</a>
          <h1 id="sample-title">Read a Sample</h1>
        </header>
        <div class="serial-sample-prose index-sample-prose">
{prose}
        </div>
        <div class="serial-sample-end">
          <p>Continue with <cite>An Index of Vanishing — Part I</cite></p>
          <a class="cta-button" href="./shop/an-index-of-vanishing-part-i/">View the book</a>
        </div>
      </article>
      <footer class="site-footer">
        <p><a href="./privacy-policy.html">Privacy Policy</a></p>
        <p>©2026 Ys Goldt</p>
      </footer>
    </main>
  </body>
</html>
'''


def main():
    source_bytes = SOURCE.read_bytes()
    if sha256(source_bytes).hexdigest() != SOURCE_SHA256:
        raise SystemExit("Sample source differs from the supplied text; do not regenerate without editorial approval.")
    html = render_page(source_bytes.decode("utf-8"))
    if "--check" in sys.argv:
        if OUTPUT.read_text(encoding="utf-8") != html:
            raise SystemExit("Published sample differs from its locked source.")
        print("Index sample matches the supplied text.")
    else:
        OUTPUT.write_text(html, encoding="utf-8")
        print("Generated the Index text sample.")


if __name__ == "__main__":
    main()

# Maintaining the book catalogue

`books.json` is the public source of truth for Ys Goldt’s book and serial bibliography. Each item in `works` describes a literary work; its `editions` array describes formats. Put an ISBN only on the edition to which it belongs. An ISBN-less edition still has a stable `id` and `canonicalUrl`. Leave unknown facts out rather than guessing.

The site is static. The scripts copy catalogue facts into checked-in HTML so readers and search crawlers see them immediately, without waiting for JavaScript. The homepage’s visible layout is unchanged; its existing JSON-LD list is generated from the catalogue. The Press page provides a readable directory of all seven works.

The `publisher` record identifies Nachtljocht Press and links to its official site, `https://nachtljocht.com/`. Nachtljocht is also a quarterly literary journal there. Keep the publisher identity and the journal’s name distinct when updating book metadata.

## Ordinary updates

1. Edit `books.json` with the new or corrected facts. Keep `id` values stable. Use full `https://ysgoldt.com/...` URLs for official destinations. `status` is `published`, `forthcoming`, or `ongoing`.
2. For a new publication, add a work with a unique `id`, title, type, description, status, canonical URL, and `editions` array. Add only verified dates, genres, images, series details, and publisher information. If the work is free to read, use `readUrl`; do not invent a purchase URL.
3. Add each edition separately. A paperback can have `format: "Paperback"`, `isbn13`, page count, publication date, and its existing `purchaseUrl`. Add EPUB, ebook, or PDF editions as separate records only when those formats are confirmed; omit `isbn13` unless that exact edition has one. For an ISBN-less work, leave `isbn13` out entirely.
4. To change a price or availability, update the relevant edition’s `price`, `currency`, and `availability` together with its verified `purchaseUrl`. The generator emits Product and Offer markup only when all four facts are present. If the site does not visibly show the price and availability, do not add these fields yet. To change a purchase link, edit that edition’s `purchaseUrl`. To change an ISBN destination, edit its `canonicalUrl` or eligible on-site `purchaseUrl`.
5. Run `node scripts/sync-books.mjs` and `node scripts/generate-product-pages.mjs`. For serial metadata, also run `node scripts/generate-serial.mjs`. Review the resulting HTML and `sitemap.xml`, then run the checks below. The GitHub Pages workflow checks generated files before deployment; it does not regenerate them.

The existing product-page templates under `scripts/product-pages/` hold presentation and prose. Their Book JSON-LD, edition facts, and purchase actions are generated from `books.json`. For a new product landing page, add a template and its slug to `scripts/generate-product-pages.mjs`, then add the canonical page to `sitemap.xml`. Keep the old announcement link or anchor pointing readers to the new page.

### One Small Proof on release

Its current official destination is `https://ysgoldt.com/coming-soon.html#one-small-proof-title`. The verified ISBN `9798996205240` belongs to the paperback; the ebook and PDF have no verified ISBN. When the book is released, first create or identify its real official landing and purchase URLs. In `books.json`, change the work `status` to `published`, change the work and paperback `canonicalUrl` to the new official landing page, and add a verified `purchaseUrl` to the appropriate edition. Generate and check the site. The existing Coming Soon anchor will gain a link to the new official page, and the sitemap will list that new canonical URL. Do not point the paperback ISBN at a digital-only purchase page. The confirmed paperback length is 32 pages.

## ISBN lookup and LibraryThing

The public template is `https://ysgoldt.com/book-lookup.html?isbn=MAGICTHING`. The page removes spaces and hyphens, checks ISBN-10 or ISBN-13 digits, converts valid ISBN-10 values to their 978-prefix ISBN-13 form, and finds the matching edition in `books.json`. It redirects with `window.location.replace()` to a safe official-site destination. Invalid, unknown, missing, or duplicate ISBN parameters show a readable fallback. The current four ISBNs begin with 979, so none has an ISBN-10 equivalent. A localhost preview maps recognized official destinations to the matching local pages for testing.

For LibraryThing Quick Links, configure:

| Setting | Value |
| --- | --- |
| Name | Ys Goldt — Official Bookshop |
| Website | https://ysgoldt.com |
| Type | Online bookseller |
| Country | United States of America |
| URL Type | ISBN |
| URL | https://ysgoldt.com/book-lookup.html?isbn=MAGICTHING |
| ISBN Handling | 13-digit |
| Dashes | No |

Test the template with `9798996205240` and the other ISBNs after updating the catalogue. LibraryThing Quick Links do not necessarily create a prominent purchase button for every visitor, nor do they make this site a globally featured retailer.

## Checks and indexing

Run these from the repository root:

```sh
node scripts/sync-books.mjs --check
node scripts/generate-product-pages.mjs --check
node scripts/generate-serial.mjs --check
node --test tests/*.test.mjs
python3 scripts/check-csp.py
```

Inspect a publication page’s HTML source to confirm its visible edition details and Book JSON-LD. After publication, paste its live URL into [Google’s Rich Results Test](https://search.google.com/test/rich-results) and [Schema Markup Validator](https://validator.schema.org/). Book markup may be valid without qualifying for a Google rich result. These checks do not submit a book to a bibliographic service.

Keep only canonical public pages in `sitemap.xml`; it already includes the Press page. Do not add the ISBN lookup, digital redirects, or duplicate `books.html` URL. `robots.txt` already references the sitemap. Once changes are published, submit or recheck the sitemap and inspect individual book URLs in [Google Search Console](https://search.google.com/search-console) and [Bing Webmaster Tools](https://www.bing.com/webmasters). Request indexing where the tools offer it; indexing is not guaranteed.

External discovery needs manual follow-up. Goodreads and LibraryThing author/book records may allow profile or book-site link edits, subject to their permissions. WorldCat and library catalogue purchase links generally depend on library or publisher/distributor record updates; this repository does not submit them. Search engines discover pages through links and sitemaps, but `books.json` is an optional public data source, not an automatic feed to Google, Bing, Goodreads, WorldCat, or LibraryThing. Keep verified external profile links in the catalogue’s author `sameAs` array; do not add guessed URLs.

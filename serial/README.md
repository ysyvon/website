# Publishing serial fiction

Serial metadata lives in `serial/serials.mjs`. Manuscript sources live under
`serial/content/`, separate from public titles, dates, descriptions, and image
details.

To publish another instalment:

1. Add its manuscript file beneath the relevant `serial/content/` directory.
   Use `sourceFormat: "html-fragment"` for a complete trusted
   `<div class="serial-prose">…</div>` fragment, or `"markdown-lines"` for
   plain paragraph-per-line source.
2. Add one instalment record to the work in `serial/serials.mjs`, including the
   source file's SHA-256 checksum.
3. Run `node scripts/generate-serial.mjs` from the website root.
4. Run `node --test tests/serial-generator.test.mjs`.

The generator rebuilds the shelf, story contents, metadata, sitemap entries,
and Previous/Next links. Do not edit generated serial HTML directly.

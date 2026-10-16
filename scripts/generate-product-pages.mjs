import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The checked-in templates are the source of truth for each product page.
// Edit a template, then run this script to rebuild its published copy.
// --check verifies that every published copy matches without writing files.
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const slugs = [
  "an-index-of-vanishing-part-i",
  "even-if-the-light-forgets-volume-i",
  "the-strange-mercy-of-listening",
  "shelves-of-memory-digital",
];
const check = process.argv.includes("--check");

for (const slug of slugs) {
  const templatePath = resolve(root, "scripts", "product-pages", `${slug}.mjs`);
  const outputPath = resolve(root, "shop", slug, "index.html");
  const { default: html } = await import(new URL(`./product-pages/${slug}.mjs`, import.meta.url));
  const canonical = `https://ysgoldt.com/shop/${slug}/`;
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) {
    throw new Error(`Template has the wrong canonical URL: ${templatePath}`);
  }
  if (!html.includes('"@type": "Book"')) {
    throw new Error(`Template is missing Book structured data: ${templatePath}`);
  }
  if (check) {
    const published = await readFile(outputPath, "utf8");
    if (published !== html) throw new Error(`Product page differs from its template: ${outputPath}`);
  } else {
    await mkdir(resolve(root, "shop", slug), { recursive: true });
    await writeFile(outputPath, html);
  }
}

console.log(check ? "Product pages match their templates." : `Generated ${slugs.length} product landing pages.`);

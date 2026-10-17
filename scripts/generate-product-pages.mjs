import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bookGraph, catalogue, editionFacts, escapeHtml, jsonLd, localHref, purchaseActions, replaceGeneratedBlock, validateCatalogue } from "./book-catalogue.mjs";

// Templates own presentation and prose; books.json owns bibliographic facts.
// Edit a template or the catalogue, then rebuild the published page.
// --check verifies that every published copy matches without writing files.
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pages = [
  ["an-index-of-vanishing-part-i", "an-index-of-vanishing-part-i"],
  ["even-if-the-light-forgets-volume-i", "even-if-the-light-forgets-volume-i"],
  ["the-strange-mercy-of-listening", "the-strange-mercy-of-listening"],
  ["shelves-of-memory-digital", "shelves-of-memory"],
];
const check = process.argv.includes("--check");
validateCatalogue();

for (const [slug, workId] of pages) {
  const templatePath = resolve(root, "scripts", "product-pages", `${slug}.mjs`);
  const outputPath = resolve(root, "shop", slug, "index.html");
  const { default: template } = await import(new URL(`./product-pages/${slug}.mjs`, import.meta.url));
  const work = catalogue.works.find((entry) => entry.id === workId);
  if (!work) throw new Error(`Missing catalogue work for ${slug}`);
  const canonical = `https://ysgoldt.com/shop/${slug}/`;
  if (work.canonicalUrl !== canonical) throw new Error(`${work.id}: canonical URL does not match the existing product page`);
  let html = replaceGeneratedBlock(template, "book-jsonld", jsonLd(bookGraph(work)));
  html = replaceGeneratedBlock(html, "breadcrumbs-jsonld", jsonLd([{
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://ysgoldt.com/" },
      { "@type": "ListItem", position: 2, name: work.title, item: work.canonicalUrl },
    ],
  }]));
  html = replaceGeneratedBlock(html, "purchase-actions", purchaseActions(work));
  html = replaceGeneratedBlock(html, "edition-facts", editionFacts(work));
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(work.title)} | ${escapeHtml(work.type)} by Ys Goldt</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(work.description)}">`);
  for (const kind of ["og", "twitter"]) {
    const property = kind === "og" ? "property" : "name";
    for (const [field, value] of [["title", work.title], ["description", work.description], ["image", work.image], ["image:alt", `Cover of ${work.title} by Ys Goldt`]]) {
      html = html.replace(new RegExp(`<meta ${property}="${kind}:${field}" content="[^"]*">`), `<meta ${property}="${kind}:${field}" content="${escapeHtml(value)}">`);
    }
  }
  for (const [field, value] of [["type", work.imageType], ["width", work.imageWidth], ["height", work.imageHeight]]) {
    html = html.replace(new RegExp(`<meta property="og:image:${field}" content="[^"]*">`), `<meta property="og:image:${field}" content="${escapeHtml(value)}">`);
  }
  html = html.replace(/<h1>[^<]*<\/h1>/, `<h1>${escapeHtml(work.title)}</h1>`);
  html = html.replace(/<p class="product-landing-kicker">[^<]*<\/p>/, `<p class="product-landing-kicker">${escapeHtml(work.type)}</p>`);
  html = html.replace(/<div class="product-landing-art"><img[^>]*><\/div>/, `<div class="product-landing-art"><img src="${escapeHtml(localHref(work.image, new URL(work.canonicalUrl).pathname))}" alt="Cover of ${escapeHtml(work.title)} by Ys Goldt" width="${work.imageWidth}" height="${work.imageHeight}"></div>`);
  if (work.sampleUrl) html = html.replace(/(<a class="cta-button product-buy-button" href=")[^"]*("[^>]*>READ A SAMPLE →<\/a>)/, `$1${escapeHtml(localHref(work.sampleUrl, new URL(work.canonicalUrl).pathname))}$2`);
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

console.log(check ? "Product pages match their templates." : `Generated ${pages.length} product landing pages.`);

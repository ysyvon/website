import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";

export const siteOrigin = "https://ysgoldt.com";
export const catalogue = JSON.parse(readFileSync(fileURLToPath(new URL("../books.json", import.meta.url)), "utf8"));

export function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function workById(id) {
  const work = catalogue.works.find((item) => item.id === id);
  if (!work) throw new Error(`Unknown catalogue work: ${id}`);
  return work;
}

export function canonicalPage(url) {
  return url.split("#")[0];
}

export function localHref(url, from = "/") {
  const parsed = new URL(url);
  if (parsed.origin !== siteOrigin) return url;
  const fromDirectory = from.endsWith("/") ? from : posix.dirname(from);
  const target = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  const relative = posix.relative(fromDirectory, target) || "index.html";
  return `${relative}${parsed.pathname !== "/" && parsed.pathname.endsWith("/") && !relative.endsWith("/") ? "/" : ""}${parsed.search}${parsed.hash}`;
}

export function validateCatalogue(data = catalogue) {
  if (data.version !== 1 || !Array.isArray(data.works)) throw new Error("Unsupported book catalogue");
  const ids = new Set();
  const isbns = new Set();
  const entityIds = new Set();
  for (const work of data.works) {
    for (const field of ["id", "title", "type", "status", "canonicalUrl", "description", "language"]) {
      if (!work[field]) throw new Error(`${work.id || "Work"}: missing ${field}`);
    }
    if (ids.has(work.id)) throw new Error(`Duplicate work ID: ${work.id}`);
    ids.add(work.id);
    if (work.entityId) {
      if (entityIds.has(work.entityId)) throw new Error(`Duplicate entity ID: ${work.entityId}`);
      entityIds.add(work.entityId);
    }
    if (!["published", "forthcoming", "ongoing"].includes(work.status)) throw new Error(`${work.id}: bad status`);
    if (!work.canonicalUrl.startsWith(`${siteOrigin}/`)) throw new Error(`${work.id}: destination must be on the official site`);
    if (!Array.isArray(work.editions)) throw new Error(`${work.id}: missing editions`);
    const editionIds = new Set();
    for (const edition of work.editions) {
      if (!edition.id || !edition.format || !edition.canonicalUrl) throw new Error(`${work.id}: incomplete edition`);
      if (editionIds.has(edition.id)) throw new Error(`${work.id}: duplicate edition ${edition.id}`);
      editionIds.add(edition.id);
      if (edition.entityId) {
        if (entityIds.has(edition.entityId)) throw new Error(`Duplicate entity ID: ${edition.entityId}`);
        entityIds.add(edition.entityId);
      }
      if (!edition.canonicalUrl.startsWith(`${siteOrigin}/`)) throw new Error(`${work.id}: bad edition URL`);
      if (edition.isbn13) {
        if (isbns.has(edition.isbn13)) throw new Error(`Duplicate ISBN: ${edition.isbn13}`);
        isbns.add(edition.isbn13);
        if (!/^\d{13}$/.test(edition.isbn13)) throw new Error(`${work.id}: bad ISBN syntax`);
        const sum = [...edition.isbn13.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
        if (Number(edition.isbn13[12]) !== (10 - sum % 10) % 10) throw new Error(`${work.id}: invalid ISBN check digit`);
      }
      if (edition.price !== undefined && !(edition.currency && edition.availability && edition.purchaseUrl)) {
        throw new Error(`${work.id}: price requires currency, availability, and purchase URL`);
      }
      if (edition.purchaseUrl) {
        const purchase = new URL(edition.purchaseUrl);
        if (purchase.protocol !== "https:" || purchase.username || purchase.password) throw new Error(`${work.id}: unsafe purchase URL`);
      }
    }
  }
  return true;
}

export function workId(work) {
  if (work.entityId) return work.entityId;
  if (work.id === "how-long-things-hold" || work.id === "shelves-of-memory") return `${canonicalPage(work.canonicalUrl)}#book`;
  if (work.canonicalUrl.includes("#")) return `${canonicalPage(work.canonicalUrl)}#${work.id}-work`;
  return `${work.canonicalUrl}#work`;
}

export function editionId(work, edition) {
  if (edition.entityId) return edition.entityId;
  return work.canonicalUrl.includes("#")
    ? `${canonicalPage(work.canonicalUrl)}#${work.id}-${edition.id}`
    : `${work.canonicalUrl}#${edition.id}`;
}

const bookFormats = { Paperback: "https://schema.org/Paperback", Hardcover: "https://schema.org/Hardcover", Ebook: "https://schema.org/EBook" };

export function bookGraph(work) {
  const publisher = work.publisherId ? { "@id": work.publisherId, name: catalogue.publisher.name, url: catalogue.publisher.url } : undefined;
  const examples = work.editions.map((edition) => ({
    "@type": "Book",
    "@id": editionId(work, edition),
    name: `${work.title} (${edition.format})`,
    url: edition.canonicalUrl,
    exampleOfWork: { "@id": workId(work) },
    ...(edition.isbn13 ? { isbn: edition.isbn13 } : {}),
    ...(edition.isbn10 ? { isbn: edition.isbn10 } : {}),
    ...(edition.pages ? { numberOfPages: edition.pages } : {}),
    ...(edition.publicationDate ? { datePublished: edition.publicationDate } : {}),
    ...(bookFormats[edition.format] ? { bookFormat: bookFormats[edition.format] } : {}),
    ...(publisher ? { publisher } : {}),
    ...(edition.sameAs ? { sameAs: edition.sameAs } : {}),
    inLanguage: work.language,
  }));
  const book = {
    "@type": "Book",
    "@id": workId(work),
    name: work.title,
    url: work.canonicalUrl,
    mainEntityOfPage: canonicalPage(work.canonicalUrl),
    author: { "@id": catalogue.author.id, name: catalogue.author.name, url: catalogue.author.url },
    description: work.description,
    ...(work.image ? { image: work.image } : {}),
    ...(work.genre ? { genre: work.genre } : {}),
    ...(work.keywords ? { keywords: work.keywords } : {}),
    ...(work.publicationDate ? { datePublished: work.publicationDate } : {}),
    ...(work.series ? { isPartOf: { "@type": "BookSeries", name: work.series } } : {}),
    ...(work.volumeNumber ? { position: work.volumeNumber } : {}),
    ...(publisher ? { publisher } : {}),
    ...(work.sameAs ? { sameAs: work.sameAs } : {}),
    ...(examples.length ? { workExample: examples.map((edition) => ({ "@id": edition["@id"] })) } : {}),
    inLanguage: work.language,
  };
  const products = work.editions.filter((edition) => edition.price !== undefined).map((edition) => ({
    "@type": "Product",
    "@id": `${editionId(work, edition)}-product`,
    name: `${work.title} (${edition.format})`,
    url: edition.canonicalUrl,
    isRelatedTo: { "@id": editionId(work, edition) },
    offers: { "@type": "Offer", url: edition.purchaseUrl, price: edition.price, priceCurrency: edition.currency, availability: `https://schema.org/${edition.availability}` },
  }));
  return [book, ...examples, ...products];
}

export function jsonLd(graph) {
  return `<script type="application/ld+json">\n${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replaceAll("<", "\\u003c")}\n</script>`;
}

export function itemList() {
  return {
    "@type": "CollectionPage", "@id": `${siteOrigin}/#books`, url: `${siteOrigin}/`, name: "Books by Ys Goldt",
    mainEntity: { "@type": "ItemList", itemListElement: catalogue.works.map((work, index) => ({
      "@type": "ListItem", position: index + 1, name: work.title, url: work.canonicalUrl,
    })) },
  };
}

export function statusLabel(work) {
  if (work.status === "published") return "Published";
  if (work.status === "ongoing") return "Ongoing free serial";
  if (!work.publicationDate) return "Forthcoming";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(work.publicationDate)
    ? new Date(`${work.publicationDate}T12:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : work.publicationDate;
  return `Forthcoming · ${date}`;
}

export function editionFacts(work) {
  const details = [
    `<div><dt>Author</dt><dd><a href="${localHref(catalogue.author.url, new URL(work.canonicalUrl).pathname)}">${escapeHtml(catalogue.author.name)}</a></dd></div>`,
    `<div><dt>Status</dt><dd>${escapeHtml(statusLabel(work))}</dd></div>`,
  ];
  if (work.publisherId) details.push(`<div><dt>Publisher</dt><dd><a href="${localHref(catalogue.publisher.url, new URL(work.canonicalUrl).pathname)}">${escapeHtml(catalogue.publisher.name)}</a></dd></div>`);
  if (work.publicationDate) details.push(`<div><dt>Publication</dt><dd>${escapeHtml(work.publicationDate)}</dd></div>`);
  for (const edition of work.editions) {
    details.push(`<div><dt>${escapeHtml(edition.format)} edition</dt><dd>${edition.isbn13 ? `ISBN ${edition.isbn13}` : "No ISBN listed"}${edition.pages ? ` · ${edition.pages} pages` : ""}${edition.price !== undefined ? ` · ${escapeHtml(edition.currency)} ${escapeHtml(edition.price)} · ${escapeHtml(edition.availability)}` : ""}</dd></div>`);
  }
  return `<dl class="book-publication-details" aria-label="Publication and edition details">\n${details.map((detail) => `  ${detail}`).join("\n")}\n</dl>`;
}

export function purchaseActions(work) {
  const actions = work.editions.filter((edition) => edition.purchaseUrl).sort((a, b) => Number(new URL(a.purchaseUrl).origin !== siteOrigin) - Number(new URL(b.purchaseUrl).origin !== siteOrigin)).map((edition) => {
    const external = new URL(edition.purchaseUrl).origin !== siteOrigin;
    const label = external ? `${edition.format} edition` : `Buy directly from Ys Goldt — ${edition.format}`;
    return `<a class="cta-button product-buy-button" href="${escapeHtml(edition.purchaseUrl)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(label)} →</a>`;
  });
  for (const format of work.forthcomingFormats || []) actions.push(`<span class="cta-button product-coming-soon" aria-disabled="true">${escapeHtml(format)} edition coming soon</span>`);
  if (!actions.length && work.readUrl) actions.push(`<a class="cta-button product-buy-button" href="${escapeHtml(work.readUrl)}">Read for free →</a>`);
  return `<div class="product-purchase-actions">\n${actions.map((action) => `  ${action}`).join("\n")}\n</div>`;
}

export function pressCard(work) {
  const path = "/press.html";
  const primary = work.editions.find((edition) => edition.isbn13) || work.editions[0];
  const facts = [work.type, primary?.pages ? `${primary.pages} pages` : null, primary?.isbn13 ? `ISBN ${primary.isbn13} (${primary.format})` : primary?.format].filter(Boolean).join(" · ");
  const assets = [
    work.sampleUrl ? `<a href="${escapeHtml(localHref(work.sampleUrl, path))}">Sample</a>` : "",
    work.readUrl ? `<a href="${escapeHtml(work.readUrl)}">Read for free</a>` : "",
    work.image ? `<a href="${escapeHtml(localHref(work.image, path))}" download>Cover</a>` : "",
    work.pressSheetUrl ? `<a href="${escapeHtml(localHref(work.pressSheetUrl, path))}" target="_blank" rel="noopener noreferrer">Press sheet</a>` : "",
  ].filter(Boolean).join("\n");
  return `<article class="press-book-card">
  <div class="press-book-cover"><a href="${escapeHtml(localHref(work.canonicalUrl, path))}"><img src="${escapeHtml(localHref(work.image, path))}" alt="Cover of ${escapeHtml(work.title)} by Ys Goldt" loading="lazy"></a></div>
  <div class="press-book-copy">
    <p class="press-book-status">${escapeHtml(statusLabel(work))}</p>
    <h3><a href="${escapeHtml(localHref(work.canonicalUrl, path))}"><em>${escapeHtml(work.title)}</em></a></h3>
    <p class="press-book-meta">${escapeHtml(facts)}</p>
    <p class="press-book-description">${escapeHtml(work.description)}</p>
    <div class="press-book-assets">${assets}</div>
  </div>
</article>`;
}

export function generatedBlock(name, value) {
  return `<!-- BOOKS-GENERATED:${name}:START -->\n${value}\n<!-- BOOKS-GENERATED:${name}:END -->`;
}

export function replaceGeneratedBlock(html, name, value) {
  const start = `<!-- BOOKS-GENERATED:${name}:START -->`;
  const end = `<!-- BOOKS-GENERATED:${name}:END -->`;
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from < 0 || to < from) throw new Error(`Missing generated block ${name}`);
  return html.slice(0, from) + generatedBlock(name, value) + html.slice(to + end.length);
}

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bookGraph, catalogue, escapeHtml, itemList, jsonLd, localHref, pressCard, replaceGeneratedBlock, statusLabel, validateCatalogue } from "./book-catalogue.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const check = process.argv.includes("--check");
validateCatalogue();

async function update(file, transform) {
  const path = resolve(root, file);
  const current = await readFile(path, "utf8");
  const next = transform(current);
  if (check) {
    if (current !== next) throw new Error(`${file} is out of sync with books.json`);
  } else if (current !== next) {
    await writeFile(path, next);
  }
}

const homeGraph = jsonLd([
  { "@type": "WebSite", "@id": "https://ysgoldt.com/#website", url: "https://ysgoldt.com/", name: "Ys Goldt", inLanguage: "en", author: { "@id": catalogue.author.id } },
  { "@type": "Person", "@id": catalogue.author.id, name: catalogue.author.name, url: catalogue.author.url },
  itemList(),
]);

const catalogGrid = `<div class="books-grid">\n${catalogue.works.filter((work) => work.status === "published" && work.image).map((work) => {
  const href = escapeHtml(localHref(work.canonicalUrl, "/index.html").replace(/\/$/, "/index.html"));
  const cover = escapeHtml(localHref(work.image, "/index.html"));
  return `  <article class="books-grid-card">
    <a class="books-grid-card-link" href="${href}">
      <img src="${cover}" alt="Cover of ${escapeHtml(work.title)} by Ys Goldt" width="${work.imageWidth}" height="${work.imageHeight}" loading="lazy">
      <h2>${escapeHtml(work.title)}</h2>
    </a>
  </article>`;
}).join("\n")}\n</div>`;

for (const file of ["index.html", "books.html"]) {
  await update(file, (html) => replaceGeneratedBlock(replaceGeneratedBlock(html, "page-jsonld", homeGraph), "catalog-grid", catalogGrid));
}

const authorGraph = jsonLd([{
  "@type": "Person", "@id": catalogue.author.id, name: catalogue.author.name, url: catalogue.author.url,
  mainEntityOfPage: catalogue.author.url, image: "https://ysgoldt.com/ysprofile.png",
  jobTitle: ["Writer", "Artist", "Editor"],
  description: "Ys Goldt is a multidisciplinary writer and artist working across fiction, interactive media, design, and performance.",
  sameAs: catalogue.author.sameAs,
  knowsAbout: ["Literary fiction", "Historical fiction", "Speculative fiction", "Interactive storytelling"],
  affiliation: { "@type": "Organization", name: "Nachtljocht", url: "https://www.nachtljocht.com/" },
}]);
await update("about.html", (html) => replaceGeneratedBlock(html, "page-jsonld", authorGraph));

function upcomingFacts(work) {
  const editions = work.editions.length
    ? work.editions.map((edition) => `${edition.format}${edition.isbn13 ? ` · ISBN ${edition.isbn13}` : ""}${edition.pages ? ` · ${edition.pages} pages` : ""}`).join("; ")
    : "Edition details to be announced";
  const date = work.publicationDate ? `<time datetime="${work.publicationDate}">${escapeHtml(statusLabel(work).split(" · ")[1])}</time>` : "";
  const publisher = work.publisherId ? ` · <a href="${escapeHtml(localHref(catalogue.publisher.url, "/coming-soon.html"))}">${escapeHtml(catalogue.publisher.name)}</a>` : "";
  const destination = work.editions.find((edition) => edition.purchaseUrl && new URL(edition.purchaseUrl).origin === "https://ysgoldt.com")?.purchaseUrl;
  const action = destination && work.status === "published" ? `<p><a href="${escapeHtml(destination)}">Purchase from Ys Goldt →</a></p>` : "";
  const announcementUrl = `https://ysgoldt.com/coming-soon.html#${work.id}-title`;
  const newPage = work.canonicalUrl !== announcementUrl ? `<p><a href="${escapeHtml(localHref(work.canonicalUrl, "/coming-soon.html"))}">View official book page →</a></p>` : "";
  return `<p class="forthcoming-status">${work.status === "forthcoming" ? "Forthcoming" : escapeHtml(statusLabel(work))}${date ? ` · ${date}` : ""}</p>\n<p class="book-inline-facts">By <a href="${escapeHtml(localHref(catalogue.author.url, "/coming-soon.html"))}">${escapeHtml(catalogue.author.name)}</a>${publisher}<br>${escapeHtml(editions)}</p>${newPage}${action}`;
}

const announced = ["if-not-heaven", "one-small-proof"].map((id) => catalogue.works.find((work) => work.id === id));
await update("coming-soon.html", (html) => {
  let next = replaceGeneratedBlock(html, "page-jsonld", jsonLd(announced.flatMap(bookGraph)));
  for (const work of announced) {
    next = replaceGeneratedBlock(next, `${work.id}-title-facts`, upcomingFacts(work));
    const heading = new RegExp(`<h2 class="forthcoming-title" id="${work.id}-title"><em>[^<]*<\\/em><\\/h2>`);
    next = next.replace(heading, `<h2 class="forthcoming-title" id="${work.id}-title"><em>${escapeHtml(work.title)}</em></h2>`);
    const cardStart = next.lastIndexOf('<article class="forthcoming-book">', next.indexOf(`id="${work.id}-title"`));
    const cardEnd = next.indexOf('</article>', cardStart) + '</article>'.length;
    const card = next.slice(cardStart, cardEnd).replace(/<img class="forthcoming-cover"[^>]*>/, `<img class="forthcoming-cover" src="${escapeHtml(localHref(work.image, "/coming-soon.html"))}" alt="Cover of ${escapeHtml(work.title)} by Ys Goldt" width="${work.imageWidth}" height="${work.imageHeight}">`);
    next = next.slice(0, cardStart) + card + next.slice(cardEnd);
  }
  const featured = announced[0];
  for (const kind of ["og", "twitter"]) {
    const property = kind === "og" ? "property" : "name";
    next = next.replace(new RegExp(`<meta ${property}="${kind}:image" content="[^"]*">`), `<meta ${property}="${kind}:image" content="${escapeHtml(featured.image)}">`);
    next = next.replace(new RegExp(`<meta ${property}="${kind}:image:alt" content="[^"]*">`), `<meta ${property}="${kind}:image:alt" content="Cover of ${escapeHtml(featured.title)} by Ys Goldt">`);
  }
  for (const [field, value] of [["type", featured.imageType], ["width", featured.imageWidth], ["height", featured.imageHeight]]) {
    next = next.replace(new RegExp(`<meta property="og:image:${field}" content="[^"]*">`), `<meta property="og:image:${field}" content="${escapeHtml(value)}">`);
  }
  return next;
});

await update("sitemap.xml", (xml) => {
  const urls = [...new Set(catalogue.works.filter((work) => !work.canonicalUrl.includes("/serial/")).map((work) => work.canonicalUrl.split("#")[0]))];
  return replaceGeneratedBlock(xml, "sitemap", urls.map((url) => `  <url>\n    <loc>${escapeHtml(url)}</loc>\n  </url>`).join("\n"));
});

await update("press.html", (html) => {
  return replaceGeneratedBlock(html, "press-cards", catalogue.works.map(pressCard).join("\n"));
});

console.log(check ? "Book metadata matches books.json." : "Synced book metadata from books.json.");

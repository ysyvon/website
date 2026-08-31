import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { serials } from "../serial/serials.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");
const siteUrl = "https://ysgoldt.com";

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function serialPath(serial) {
  return `/serial/${serial.slug}/`;
}

function installmentPath(serial, installment) {
  return `${serialPath(serial)}${installment.slug}/`;
}

function orderedInstallments(serial) {
  return [...serial.installments].sort((a, b) => a.number - b.number);
}

export function validateSerials(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("At least one serial is required.");
  }

  const serialSlugs = new Set();
  for (const serial of entries) {
    for (const key of ["slug", "title", "status", "subtitle", "shelfDescription", "publicationSchedule", "metadataDescription"]) {
      if (!serial[key]) throw new Error(`Serial is missing ${key}.`);
    }
    if (serialSlugs.has(serial.slug)) throw new Error(`Duplicate serial slug: ${serial.slug}`);
    serialSlugs.add(serial.slug);

    if (!Array.isArray(serial.blurb) || serial.blurb.length === 0) {
      throw new Error(`${serial.title} requires a story-home blurb.`);
    }
    if (!Array.isArray(serial.installments)) {
      throw new Error(`${serial.title} requires an instalments list.`);
    }
    if (serial.installments.length === 0 && !/^\d{4}-\d{2}-\d{2}$/.test(serial.updated || "")) {
      throw new Error(`${serial.title} requires an updated date when no instalments are published.`);
    }

    const numbers = new Set();
    const slugs = new Set();
    for (const installment of serial.installments) {
      for (const key of ["number", "roman", "title", "slug", "published", "displayDate", "source", "sourceFormat", "sourceSha256"]) {
        if (!installment[key]) throw new Error(`${serial.title} instalment is missing ${key}.`);
      }
      if (!['markdown-lines', 'html-fragment'].includes(installment.sourceFormat)) {
        throw new Error(`${serial.title} has an unsupported source format: ${installment.sourceFormat}`);
      }
      if (numbers.has(installment.number)) {
        throw new Error(`${serial.title} has duplicate instalment number ${installment.number}.`);
      }
      if (slugs.has(installment.slug)) {
        throw new Error(`${serial.title} has duplicate instalment slug ${installment.slug}.`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(installment.published)) {
        throw new Error(`${serial.title} has an invalid publication date: ${installment.published}`);
      }
      numbers.add(installment.number);
      slugs.add(installment.slug);
    }
  }
}

export function renderManuscript(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line === "***") {
        return '          <div class="serial-scene-break" role="separator" aria-label="Scene break">***</div>';
      }
      return `          <p>${escapeHtml(line)}</p>`;
    })
    .join("\n");
}

export function renderInstallmentContent(installment, source) {
  if (installment.sourceFormat === "html-fragment") return source;
  if (installment.sourceFormat === "markdown-lines") {
    return `        <div class="serial-prose">\n${renderManuscript(source)}\n        </div>`;
  }
  throw new Error(`Unsupported source format: ${installment.sourceFormat}`);
}

export function getInstallmentNavigation(serial, installment) {
  const ordered = orderedInstallments(serial);
  const index = ordered.findIndex((entry) => entry.slug === installment.slug);
  if (index === -1) throw new Error(`Unknown instalment: ${installment.slug}`);
  return {
    previous: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

function metadata({ title, description, canonical, image, type = "website", published }) {
  const publishedMeta = published
    ? `\n    <meta property="article:published_time" content="${escapeAttribute(published)}">`
    : "";
  return `    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <link rel="canonical" href="${escapeAttribute(canonical)}">
    <meta property="og:site_name" content="Ys Goldt">
    <meta property="og:title" content="${escapeAttribute(title)}">
    <meta property="og:description" content="${escapeAttribute(description)}">
    <meta property="og:type" content="${escapeAttribute(type)}">
    <meta property="og:url" content="${escapeAttribute(canonical)}">
    <meta property="og:image" content="${escapeAttribute(image.url)}">
    <meta property="og:image:alt" content="${escapeAttribute(image.alt)}">
    <meta property="og:image:type" content="${escapeAttribute(image.type)}">
    <meta property="og:image:width" content="${image.width}">
    <meta property="og:image:height" content="${image.height}">${publishedMeta}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttribute(title)}">
    <meta name="twitter:description" content="${escapeAttribute(description)}">
    <meta name="twitter:image" content="${escapeAttribute(image.url)}">
    <meta name="twitter:image:alt" content="${escapeAttribute(image.alt)}">`;
}

function localSitePath(rootPrefix, absolutePath) {
  return `${rootPrefix}${absolutePath.replace(/^\//, "")}`;
}

function documentShell({ head, bodyClass, content, rootPrefix }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
${head}
    <link rel="icon" type="image/png" href="${rootPrefix}favicon.png?v=20260818">
    <link rel="stylesheet" href="${rootPrefix}styles.css">
    <script src="${rootPrefix}disable-context-menu.js" defer></script>
  </head>
  <body class="${escapeAttribute(bodyClass)}" data-disable-context-menu data-disable-selection>
${content}
  </body>
</html>
`;
}

function mainNavigation(active, rootPrefix) {
  const items = [
    ["Books", `${rootPrefix}index.html`, "books"],
    ["Coming Soon", `${rootPrefix}coming-soon.html`, "coming-soon"],
    ["Serial", `${rootPrefix}serial/how-long-things-hold/index.html`, "serial"],
    ["Works", `${rootPrefix}works.html`, "works"],
    ["About", `${rootPrefix}about.html`, "about"],
    ["Contact", `${rootPrefix}contact.html`, "contact"],
  ];
  const links = items
    .map(([label, href, key]) => {
      const current = key === active;
      return `        <a class="tab${current ? " active" : ""}" href="${href}"${current ? ' aria-current="page"' : ""}>${label}</a>`;
    })
    .join("\n");
  return `      <nav class="tabs" aria-label="Sections">
${links}
        <a class="tab" href="https://nachtljocht.com" target="_blank" rel="noopener noreferrer">Nachtljocht</a>
      </nav>`;
}

function siteHero() {
  return `      <section class="hero" aria-label="Ys Goldt">
        <h1 class="page-title">Ys Goldt</h1>
        <p class="page-subtitle">creator of strange and tender things</p>
      </section>`;
}

function siteFooter(rootPrefix) {
  return `      <footer class="site-footer">
        <p><a href="${rootPrefix}privacy-policy.html">Privacy Policy</a></p>
        <p>©2026 Ys Goldt</p>
      </footer>`;
}

function subscribePanel(
  id,
  compact = false,
  heading = "Receive instalments by email",
  caption = "New instalments delivered through Buttondown.",
) {
  const captionMarkup = caption ? `\n          <p>${escapeHtml(caption)}</p>` : "";
  return `      <section class="serial-subscribe${compact ? " serial-subscribe-compact" : ""}" id="${id}-signup" aria-labelledby="${id}-title">
        <div class="serial-subscribe-copy">
          <h2 id="${id}-title">${escapeHtml(heading)}</h2>${captionMarkup}
        </div>
        <form action="https://buttondown.com/api/emails/embed-subscribe/how-long-things-hold" method="post" class="embeddable-buttondown-form serial-subscribe-form">
          <label for="${id}-email">Email address</label>
          <div class="serial-subscribe-fields">
            <input id="${id}-email" type="email" name="email" autocomplete="email" placeholder="you@example.com" required>
            <button type="submit">Subscribe</button>
          </div>
          <p class="serial-subscribe-powered"><a href="https://buttondown.com/refer/how-long-things-hold" target="_blank" rel="noreferrer">Powered by Buttondown.</a></p>
        </form>
      </section>`;
}

function serialCard(serial, rootPrefix) {
  const storyHref = `./${serial.slug}/index.html`;
  const shelfDescription = serial.shelfDescription
    .map((paragraph) => `              <p>${escapeHtml(paragraph)}</p>`)
    .join("\n");
  return `          <article class="serial-card">
            <a class="serial-card-cover" href="${storyHref}" aria-label="Enter ${escapeAttribute(serial.title)}">
              <img src="${escapeAttribute(localSitePath(rootPrefix, serial.cover.path))}" alt="${escapeAttribute(serial.cover.alt)}" width="${serial.cover.width}" height="${serial.cover.height}">
            </a>
            <div class="serial-card-copy">
              <p class="serial-status">${escapeHtml(serial.status)}</p>
              <h2><a href="${storyHref}">${escapeHtml(serial.title)}</a></h2>
              <div class="serial-card-description">
${shelfDescription}
              </div>
              <p class="serial-publication-schedule">${escapeHtml(serial.publicationSchedule)}</p>
              <a class="cta-button" href="${storyHref}">Enter Story</a>
            </div>
          </article>`;
}

export function renderSerialIndex(entries = serials) {
  const rootPrefix = "../";
  const latestSerial = entries[0];
  const description = "Serialised fiction by Ys Goldt, published in instalments.";
  const head = metadata({
    title: "Serial Fiction by Ys Goldt",
    description,
    canonical: `${siteUrl}/serial/`,
    image: latestSerial.socialImage,
  });
  const content = `    <main class="site">
${siteHero()}
${mainNavigation("serial", rootPrefix)}
      <section class="panel-shell" aria-labelledby="serial-heading">
        <div class="panel active serial-panel">
          <header class="serial-index-header">
            <h2 id="serial-heading">Serial</h2>
            <p>Fiction published in instalments.</p>
          </header>
          <div class="serial-shelf">
${entries.map((serial) => serialCard(serial, rootPrefix)).join("\n")}
          </div>
        </div>
      </section>
${siteFooter(rootPrefix)}
    </main>`;
  return documentShell({ head, bodyClass: "serial-index-page", content, rootPrefix });
}

function contentsList(serial) {
  const ordered = orderedInstallments(serial);
  const latest = ordered.at(-1);
  return `        <ol class="serial-contents-list">
${ordered
  .map(
    (installment) => `          <li>
            <a href="./${installment.slug}/index.html">
              <span class="serial-contents-title">Instalment ${escapeHtml(installment.roman)} — ${escapeHtml(installment.title)}</span>
              <time datetime="${escapeAttribute(installment.published)}">${escapeHtml(installment.displayDate)}</time>
              ${installment.slug === latest.slug ? '<span class="serial-latest">Latest</span>' : ""}
            </a>
          </li>`,
  )
  .join("\n")}
        </ol>`;
}

export function renderStoryHome(serial) {
  const rootPrefix = "../../";
  const head = metadata({
    title: `${serial.title} | A Novel in Instalments by Ys Goldt`,
    description: serial.metadataDescription,
    canonical: `${siteUrl}${serialPath(serial)}`,
    image: serial.socialImage,
    type: "book",
  });
  const blurb = serial.blurb.map((paragraph) => `              <p>${escapeHtml(paragraph)}</p>`).join("\n");
  const sampleAction = serial.samplePath
    ? `              <div class="serial-story-actions">
                <a class="cta-button" href="${escapeAttribute(localSitePath(rootPrefix, serial.samplePath))}" target="_blank" rel="noopener noreferrer">Read a Sample →</a>
              </div>\n`
    : "";
  const content = `    <main class="site site-detail serial-story-site">
      <section class="detail-frame serial-story-frame">
        <a class="back-link" href="../../index.html">← Home</a>
        <article class="serial-story">
          <div class="serial-story-hero">
            <div class="serial-story-cover-column">
              <div class="serial-story-cover">
                <img src="${escapeAttribute(localSitePath(rootPrefix, serial.cover.path))}" alt="${escapeAttribute(serial.cover.alt)}" width="${serial.cover.width}" height="${serial.cover.height}">
              </div>
            </div>
            <div class="serial-story-introduction">
              <p class="serial-status">${escapeHtml(serial.status)}</p>
              <h1>${escapeHtml(serial.title)}</h1>
              <div class="serial-story-blurb">
${blurb}
              </div>
${sampleAction}${subscribePanel(`${serial.slug}-home`, true, "Receive and read past instalments via email", "").replace(/^/gm, "        ")}
            </div>
          </div>
        </article>
      </section>
${siteFooter(rootPrefix)}
    </main>`;
  return documentShell({ head, bodyClass: "detail-page serial-story-page", content, rootPrefix });
}

function readerNavigation(serial, installment) {
  const { previous, next } = getInstallmentNavigation(serial, installment);
  const previousLink = previous
    ? `        <a class="serial-reader-nav-link serial-reader-nav-previous" href="../${previous.slug}/index.html">← Previous</a>`
    : "";
  const nextLink = next
    ? `        <a class="serial-reader-nav-link serial-reader-nav-next" href="../${next.slug}/index.html">Next →</a>`
    : "";
  return `      <nav class="serial-reader-nav" aria-label="Instalment navigation">
${previousLink}
        <a class="serial-reader-nav-link serial-reader-nav-contents" href="../index.html#contents-title">Contents</a>
${nextLink}
      </nav>`;
}

export function renderInstallmentPage(serial, installment, manuscript) {
  const rootPrefix = "../../../";
  const description = `Read ${installment.title} of ${serial.title}, a speculative novel in instalments by Ys Goldt.`;
  const canonical = `${siteUrl}${installmentPath(serial, installment)}`;
  const head = metadata({
    title: `${installment.title} | ${serial.title} by Ys Goldt`,
    description,
    canonical,
    image: serial.socialImage,
    type: "article",
    published: installment.published,
  });
  const content = `    <main class="site site-detail serial-reader-site">
      <article class="serial-reader">
        <header class="serial-reader-header">
          <a class="serial-reader-story" href="../index.html">${escapeHtml(serial.title)}</a>
          <p class="serial-reader-kicker">Instalment ${escapeHtml(installment.roman)}</p>
          <h1>${escapeHtml(installment.title)}</h1>
          <time datetime="${escapeAttribute(installment.published)}">${escapeHtml(installment.displayDate)}</time>
        </header>
${renderInstallmentContent(installment, manuscript)}
${readerNavigation(serial, installment)}
${subscribePanel(`${serial.slug}-${installment.slug}`, true)}
      </article>
${siteFooter(rootPrefix)}
    </main>`;
  return documentShell({ head, bodyClass: "detail-page serial-installment-page", content, rootPrefix });
}

function renderSitemapEntries(entries) {
  const urls = [];
  for (const serial of entries) {
    const ordered = orderedInstallments(serial);
    const lastmod = ordered.at(-1)?.published ?? serial.updated;
    urls.push([`${siteUrl}/serial/`, lastmod]);
    urls.push([`${siteUrl}${serialPath(serial)}`, lastmod]);
    for (const installment of ordered) {
      urls.push([`${siteUrl}${installmentPath(serial, installment)}`, installment.published]);
    }
  }
  const unique = new Map(urls);
  return [...unique]
    .map(
      ([url, lastmod]) => `  <url>
    <loc>${escapeHtml(url)}</loc>
    <lastmod>${escapeHtml(lastmod)}</lastmod>
  </url>`,
    )
    .join("\n");
}

async function updateSitemap(entries) {
  const sitemapPath = resolve(root, "sitemap.xml");
  const sitemap = await readFile(sitemapPath, "utf8");
  const start = "  <!-- SERIAL-GENERATED:START -->";
  const end = "  <!-- SERIAL-GENERATED:END -->";
  const block = `${start}\n${renderSitemapEntries(entries)}\n${end}`;
  const next = sitemap.includes(start)
    ? sitemap.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block)
    : sitemap.replace("</urlset>", `${block}\n</urlset>`);
  await writeFile(sitemapPath, next);
}

async function writePage(relativePath, html) {
  const target = resolve(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
}

export async function generateSerialSite(entries = serials) {
  validateSerials(entries);
  await writePage("serial/index.html", renderSerialIndex(entries));

  for (const serial of entries) {
    await writePage(`serial/${serial.slug}/index.html`, renderStoryHome(serial));
    for (const installment of orderedInstallments(serial)) {
      const sourcePath = resolve(root, installment.source);
      const manuscript = await readFile(sourcePath, "utf8");
      const hash = createHash("sha256").update(manuscript).digest("hex");
      if (hash !== installment.sourceSha256) {
        throw new Error(
          `${installment.source} does not match its locked source checksum. Update the checksum only after editorial approval.`,
        );
      }
      await writePage(
        `serial/${serial.slug}/${installment.slug}/index.html`,
        renderInstallmentPage(serial, installment, manuscript),
      );
    }
  }

  await updateSitemap(entries);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  await generateSerialSite();
  const installmentCount = serials.reduce((sum, serial) => sum + serial.installments.length, 0);
  console.log(`Generated ${serials.length} serial and ${installmentCount} instalment page.`);
}

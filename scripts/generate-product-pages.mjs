import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const products = [
  {
    slug: "an-index-of-vanishing-part-i",
    title: "An Index of Vanishing — Part I",
    type: "Novella",
    image: "an-index-digital.jpg",
    card: "shop-an-index-digital.jpg",
    description: "Tibet, 1938. Matthias Krüger was sent to watch the Reich’s most classified asset. He never expected her to see him.",
    detail: "A slow-burn historical romance about obsession, longing, and the cost of being seen.",
    ecwid: "https://ysgoldt.com/#!/An-Index-of-Vanishing-Part-I-Digital-Edition/p/848367974",
  },
  {
    slug: "even-if-the-light-forgets-volume-i",
    title: "Even if the Light Forgets — Volume I",
    type: "Novel",
    image: "even-if-digital.jpg",
    card: "shop-even-if-digital.jpg",
    description: "She’s spent her whole life learning not to need anyone. He’s spent his learning he doesn’t deserve to be needed.",
    detail: "An adult fantasy of alchemy, ruin, slow-burn romance, found family, and fragile hope.",
    ecwid: "https://ysgoldt.com/#!/Even-If-the-Light-Forgets-Volume-I-Digital-Edition/p/848382763",
  },
  {
    slug: "the-strange-mercy-of-listening",
    title: "The Strange Mercy of Listening",
    type: "Novel",
    image: "strange-mercy-digital.jpg",
    card: "shop-strange-mercy-digital.jpg",
    description: "A quiet devotion becomes something far more dangerous when silence learns to speak back.",
    detail: "An atmospheric historical novel with a dark romantic core.",
    ecwid: "https://ysgoldt.com/#!/The-Strange-Mercy-of-Listening-Digital-Edition/p/848382842",
  },
  {
    slug: "shelves-of-memory-digital",
    title: "Shelves of Memory",
    type: "Poetry",
    image: "shelves-of-memory-digital.jpg",
    card: "shop-shelves-memory-digital.jpg",
    description: "Poems for the moments you cannot name aloud, the faces you still search for, and the letters you are still waiting to receive.",
    detail: "A 32-page collection living in the quiet spaces between grief, longing, and love.",
    ecwid: "https://ysgoldt.com/#!/Shelves-of-Memory-Digital-Edition/p/848382898",
  },
];

for (const product of products) {
  const dir = resolve(root, "shop", product.slug);
  await mkdir(dir, { recursive: true });
  const url = `https://ysgoldt.com/shop/${product.slug}/`;
  const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${product.title} | A Book by Ys Goldt</title>
    <meta name="description" content="${product.description}">
    <link rel="canonical" href="${url}">
    <meta property="og:site_name" content="Ys Goldt">
    <meta property="og:title" content="${product.title}">
    <meta property="og:description" content="${product.description}">
    <meta property="og:type" content="product">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="https://ysgoldt.com/social-cards/${product.card}">
    <meta property="og:image:alt" content="${product.title} by Ys Goldt">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${product.title}">
    <meta name="twitter:description" content="${product.description}">
    <meta name="twitter:image" content="https://ysgoldt.com/social-cards/${product.card}">
    <meta name="twitter:image:alt" content="${product.title} by Ys Goldt">
    <link rel="icon" type="image/png" href="../../favicon.png">
    <link rel="stylesheet" href="../../styles.css">
    <script src="../../disable-context-menu.js" defer></script>
  </head>
  <body class="product-landing-page" data-disable-context-menu>
    <main class="site product-landing-site">
      <nav class="product-landing-nav" aria-label="Product navigation"><a href="../../index.html">← Books</a></nav>
      <article class="product-landing-card">
        <div class="product-landing-art"><img src="../../shop-assets/${product.image}" alt="${product.title} cover"></div>
        <div class="product-landing-copy">
          <p class="product-landing-kicker">${product.type}</p>
          <h1>${product.title}</h1>
          <p class="product-landing-description">${product.description}</p>
          <p>${product.detail}</p>
          <div class="product-purchase-actions">
            <a class="cta-button product-buy-button" href="${product.ecwid}">Buy Digital Edition →</a>
            <span class="cta-button product-coming-soon" aria-disabled="true">Print Edition Coming Soon</span>
          </div>
        </div>
      </article>
      <footer class="site-footer"><p><a href="https://ysgoldt.com/privacy-policy.html">Privacy Policy</a></p><p>©2026 Ys Goldt</p></footer>
    </main>
  </body>
</html>
`;
  await writeFile(resolve(dir, "index.html"), page);
}

console.log(`Generated ${products.length} product landing pages.`);

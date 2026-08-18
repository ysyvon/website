import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pages = {
  "index.html": "Ys Goldt | Writer, Artist & Interactive Storyteller",
  "about.html": "About Ys Goldt | Writer, Artist & Multidisciplinary Creator",
  "books.html": "Books by Ys Goldt | Literary Fiction & Novellas",
  "ordinary-scores.html": "Ordinary Scores | Participatory Performance by Ys Goldt",
  "visual-work.html": "Visual Work by Ys Goldt | Editorial Art & Design",
  "boundary-research-institute-terminal.html": "Boundary Research Institute Terminal | Interactive Archive",
  "stilling-duty.html": "Stilling Duty | A Visual Novel by Ys Goldt",
  "mid-band-contact.html": "Mid-Band Contact | A Visual Novel by Ys Goldt",
  "journal.html": "Journal by Ys Goldt | Visual Notes & Creative Process",
  "an-index-of-vanishing.html": "An Index of Vanishing | A Novella by Ys Goldt",
  "even-if-the-light-forgets-volume-1.html": "Even if the Light Forgets: Volume I | Ys Goldt",
  "the-strange-mercy-of-listening.html": "The Strange Mercy of Listening | A Novella by Ys Goldt",
  "sample-an-index-of-vanishing.html": "Read An Index of Vanishing | Free Sample by Ys Goldt",
  "sample-even-if-the-light-forgets.html": "Read Even if the Light Forgets | Free Sample by Ys Goldt",
  "sample-the-strange-mercy-of-listening.html": "Read The Strange Mercy of Listening | Sample by Ys Goldt",
  "privacy-policy.html": "Privacy Policy | Official Website of Ys Goldt",
};

const socialImage = "https://ysgoldt.com/social-cards/ysgoldtsocial-v2.png";
const socialImageAlt = "Illustration of a dark-haired woman reclining on a couch and holding an open book";

for (const [file, title] of Object.entries(pages)) {
  const path = resolve(root, file);
  let html = await readFile(path, "utf8");
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${socialImage}">`);
  html = html.replace(/\n\s*<meta property="og:image:(?:type|width|height)"[^>]*>/g, "");
  html = html.replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${socialImageAlt}">\n    <meta property="og:image:type" content="image/png">\n    <meta property="og:image:width" content="1305">\n    <meta property="og:image:height" content="1155">`);
  html = html.replace(/\n\s*<meta name="twitter:image:alt"[^>]*>/g, "");
  html = html.replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${socialImage}">\n    <meta name="twitter:image:alt" content="${socialImageAlt}">`);
  await writeFile(path, html);
}

const linkFiles = ["books.html", "about.html", "ordinary-scores.html", "boundary-research-institute-terminal.html", "stilling-duty.html", "mid-band-contact.html", "visual-work.html"];
for (const file of linkFiles) {
  const path = resolve(root, file);
  let html = await readFile(path, "utf8");
  html = html
    .replaceAll("./index.html#work", "./works.html")
    .replaceAll("./index.html#about", "./about.html")
    .replaceAll("./index.html#contact", "./contact.html");
  await writeFile(path, html);
}

console.log(`Updated social metadata in ${Object.keys(pages).length} pages.`);

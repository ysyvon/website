import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pages = {
  "index.html": ["Ys Goldt | Writer, Artist & Interactive Storyteller", "home.jpg", "Ys Goldt — writer, artist, and interactive storyteller"],
  "about.html": ["About Ys Goldt | Writer, Artist & Multidisciplinary Creator", "about.jpg", "About Ys Goldt, writer, artist, and multidisciplinary creator"],
  "books.html": ["Books by Ys Goldt | Literary Fiction & Novellas", "books.jpg", "Books by Ys Goldt — literary fiction and novellas"],
  "ordinary-scores.html": ["Ordinary Scores | Participatory Performance by Ys Goldt", "ordinary-scores.jpg", "Ordinary Scores — participatory performance by Ys Goldt"],
  "visual-work.html": ["Visual Work by Ys Goldt | Editorial Art & Design", "visual-work.jpg", "Visual work by Ys Goldt — editorial art and design"],
  "boundary-research-institute-terminal.html": ["Boundary Research Institute Terminal | Interactive Archive", "boundary-terminal.jpg", "The Boundary Research Institute Terminal interactive archive"],
  "stilling-duty.html": ["Stilling Duty | A Visual Novel by Ys Goldt", "stilling-duty.jpg", "Stilling Duty — a mini visual novel by Ys Goldt"],
  "mid-band-contact.html": ["Mid-Band Contact | A Visual Novel by Ys Goldt", "mid-band-contact.jpg", "Mid-Band Contact — a mini visual novel by Ys Goldt"],
  "journal.html": ["Journal by Ys Goldt | Visual Notes & Creative Process", "journal.jpg", "Journal by Ys Goldt — visual notes and creative process"],
  "an-index-of-vanishing.html": ["An Index of Vanishing | A Novella by Ys Goldt", "an-index-of-vanishing.jpg", "An Index of Vanishing — a novella by Ys Goldt"],
  "even-if-the-light-forgets-volume-1.html": ["Even if the Light Forgets: Volume I | Ys Goldt", "even-if-the-light-forgets.jpg", "Even if the Light Forgets: Volume I by Ys Goldt"],
  "the-strange-mercy-of-listening.html": ["The Strange Mercy of Listening | A Novella by Ys Goldt", "strange-mercy.jpg", "The Strange Mercy of Listening — a novella by Ys Goldt"],
  "sample-an-index-of-vanishing.html": ["Read An Index of Vanishing | Free Sample by Ys Goldt", "sample-an-index.jpg", "Read a sample of An Index of Vanishing by Ys Goldt"],
  "sample-even-if-the-light-forgets.html": ["Read Even if the Light Forgets | Free Sample by Ys Goldt", "sample-even-if.jpg", "Read a sample of Even if the Light Forgets by Ys Goldt"],
  "sample-the-strange-mercy-of-listening.html": ["Read The Strange Mercy of Listening | Sample by Ys Goldt", "sample-strange-mercy.jpg", "Read a sample of The Strange Mercy of Listening by Ys Goldt"],
  "privacy-policy.html": ["Privacy Policy | Official Website of Ys Goldt", "privacy.jpg", "Privacy policy for the official website of Ys Goldt"],
};

for (const [file, [title, image, alt]] of Object.entries(pages)) {
  const path = resolve(root, file);
  let html = await readFile(path, "utf8");
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="https://ysgoldt.com/social-cards/${image}">`);
  html = html.replace(/\n\s*<meta property="og:image:(?:type|width|height)"[^>]*>/g, "");
  html = html.replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${alt}">\n    <meta property="og:image:type" content="image/jpeg">\n    <meta property="og:image:width" content="1200">\n    <meta property="og:image:height" content="630">`);
  html = html.replace(/\n\s*<meta name="twitter:image:alt"[^>]*>/g, "");
  html = html.replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="https://ysgoldt.com/social-cards/${image}">\n    <meta name="twitter:image:alt" content="${alt}">`);
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

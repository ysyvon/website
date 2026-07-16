import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("/Users/yiskahanderson/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

const root = resolve(import.meta.dirname, "..");
const outputDir = resolve(root, "social-cards");
await mkdir(outputDir, { recursive: true });

const [lightFont, semiboldFont] = await Promise.all([
  readFile(resolve(root, "fonts/IBMPlexMono-Light.ttf")),
  readFile(resolve(root, "fonts/IBMPlexMono-SemiBold.ttf")),
]);

const fontCss = `
  @font-face { font-family: Plex; src: url(data:font/ttf;base64,${lightFont.toString("base64")}); font-weight: 300; }
  @font-face { font-family: Plex; src: url(data:font/ttf;base64,${semiboldFont.toString("base64")}); font-weight: 600; }
`;

const cards = [
  { file: "home.jpg", kicker: "YS GOLDT", title: "Strange and tender things", detail: "Fiction · Interactive Media · Visual Work", cta: "EXPLORE THE WORK →", image: "ysprofile.jpg" },
  { file: "about.jpg", kicker: "ABOUT", title: "Ys Goldt", detail: "Writer · Artist · Multidisciplinary Creator", cta: "READ THE BIOGRAPHY →", image: "ysprofile.jpg" },
  { file: "contact.jpg", kicker: "CONTACT", title: "Get in touch", detail: "Press and general inquiries", cta: "EMAIL YS GOLDT →", image: "ysprofile.jpg" },
  { file: "books.jpg", kicker: "BOOKS", title: "Fiction by Ys Goldt", detail: "Novels and novellas in print and digital editions", cta: "VIEW THE BOOKS →", image: "anindexcover.png", fit: "contain" },
  { file: "works.jpg", kicker: "SELECTED WORK", title: "Works by Ys Goldt", detail: "Visual · Interactive · Performance · Sound", cta: "EXPLORE THE WORK →", image: "gallery-assets/quiet-work.gif" },
  { file: "visual-work.jpg", kicker: "VISUAL WORK", title: "Editorial art and design", detail: "Selected visual work by Ys Goldt", cta: "VIEW THE COLLECTION →", image: "gallery-assets/nachtljocht-manifesto-screenshot.png" },
  { file: "ordinary-scores.jpg", kicker: "PERFORMANCE", title: "Ordinary Scores", detail: "Small invitations to attention, chance, and action", cta: "PERFORM A SCORE →", image: "ysprofile.jpg" },
  { file: "boundary-terminal.jpg", kicker: "INTERACTIVE ARCHIVE", title: "The Boundary Research Institute Terminal", detail: "Personnel files · Containment records · Anomalous research", cta: "ENTER THE TERMINAL →", image: "BRI_Terminal/assets/share-card.png" },
  { file: "stilling-duty.jpg", kicker: "MINI VISUAL NOVEL", title: "Stilling Duty", detail: "A story from The Space Between Names", cta: "PLAY NOW →", image: "VisualNovel/Scene1/social-preview.png" },
  { file: "mid-band-contact.jpg", kicker: "MINI VISUAL NOVEL", title: "Mid-Band Contact", detail: "A story from The Space Between Names", cta: "PLAY NOW →", image: "VisualNovel/Reijnders_Reisz/Mid-BandImage.png" },
  { file: "journal.jpg", kicker: "JOURNAL", title: "Images, atmosphere, and process", detail: "Fragments from ongoing creative work", cta: "OPEN THE JOURNAL →", image: "journal-assets/moodboard_8_jul_2026_ys.png" },
  { file: "an-index-of-vanishing.jpg", kicker: "A NOVELLA", title: "An Index of Vanishing", detail: "Tibet, 1938. He was sent to watch her.", cta: "READ MORE →", image: "anindexcover.png", fit: "contain" },
  { file: "even-if-the-light-forgets.jpg", kicker: "A NOVEL", title: "Even if the Light Forgets", detail: "Volume I · Ys Goldt", cta: "READ MORE →", image: "assets/eitlf-sample/pages/page-01.jpg", fit: "contain" },
  { file: "strange-mercy.jpg", kicker: "A NOVELLA", title: "The Strange Mercy of Listening", detail: "A quiet devotion becomes something more dangerous", cta: "READ MORE →", image: "assets/strange-mercy-sample/pages/page-01.jpg", fit: "contain" },
  { file: "sample-an-index.jpg", kicker: "READ A SAMPLE", title: "An Index of Vanishing", detail: "Opening pages · Ys Goldt", cta: "START READING →", image: "assets/an-index-of-vanishing-sample/pages/page-01.jpg", fit: "contain" },
  { file: "sample-even-if.jpg", kicker: "READ A SAMPLE", title: "Even if the Light Forgets", detail: "Volume I · Ys Goldt", cta: "START READING →", image: "assets/eitlf-sample/pages/page-01.jpg", fit: "contain" },
  { file: "sample-strange-mercy.jpg", kicker: "READ A SAMPLE", title: "The Strange Mercy of Listening", detail: "Opening pages · Ys Goldt", cta: "START READING →", image: "assets/strange-mercy-sample/pages/page-01.jpg", fit: "contain" },
  { file: "privacy.jpg", kicker: "YS GOLDT", title: "Privacy Policy", detail: "How this website handles information", cta: "READ THE POLICY →", image: "ysprofile.jpg" },
];

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function wrap(value, max = 22) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

for (const card of cards) {
  const source = resolve(root, card.image);
  const image = await sharp(source, { animated: false })
    .resize(410, 630, { fit: card.fit ?? "cover", position: "centre", background: "#ddd8ce" })
    .grayscale()
    .modulate({ brightness: 0.92 })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  const titleLines = wrap(card.title);
  const titleStart = titleLines.length === 1 ? 246 : titleLines.length === 2 ? 214 : 184;
  const title = titleLines.map((line, index) =>
    `<text x="70" y="${titleStart + index * 62}" class="title">${escapeXml(line)}</text>`
  ).join("");

  const overlay = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <style>${fontCss}
        .kicker { font: 600 17px Plex, monospace; letter-spacing: 5px; }
        .title { font: 300 50px Plex, monospace; letter-spacing: 1px; }
        .detail { font: 300 20px Plex, monospace; }
        .cta { font: 600 17px Plex, monospace; letter-spacing: 2px; }
        .brand { font: 300 15px Plex, monospace; letter-spacing: 3px; }
      </style>
      <rect width="1200" height="630" fill="#f3efe7"/>
      <image href="data:image/jpeg;base64,${image.toString("base64")}" x="790" y="0" width="410" height="630"/>
      <rect x="760" y="0" width="100" height="630" fill="url(#fade)"/>
      <defs><linearGradient id="fade"><stop stop-color="#f3efe7"/><stop offset="1" stop-color="#f3efe7" stop-opacity="0"/></linearGradient></defs>
      <line x1="70" y1="102" x2="720" y2="102" stroke="#191919" stroke-width="2"/>
      <text x="70" y="78" class="kicker" fill="#191919">${escapeXml(card.kicker)}</text>
      ${title}
      <text x="70" y="430" class="detail" fill="#55524d">${escapeXml(card.detail)}</text>
      <text x="70" y="526" class="cta" fill="#191919">${escapeXml(card.cta)}</text>
      <line x1="70" y1="540" x2="310" y2="540" stroke="#191919" stroke-width="1"/>
      <text x="70" y="588" class="brand" fill="#77736c">YSGOLDT.COM</text>
    </svg>
  `);

  await sharp(overlay)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(resolve(outputDir, card.file));
}

console.log(`Generated ${cards.length} social cards in ${outputDir}`);

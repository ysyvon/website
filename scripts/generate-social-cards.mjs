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
  { file: "visual-work.jpg", kicker: "VISUAL WORK", title: "Editorial art and design", detail: "Selected visual work by Ys Goldt", cta: "VIEW THE COLLECTION →", image: "gallery-assets/nachtljocht-work-margin-paper-transparent.png", fit: "contain", grayscale: false },
  { file: "ordinary-scores.jpg", kicker: "PERFORMANCE", title: "Ordinary Scores", detail: "Small invitations to attention, chance, and action", cta: "PERFORM A SCORE →", artwork: "scores", grayscale: false },
  { file: "boundary-terminal.jpg", kicker: "INTERACTIVE ARCHIVE", title: "The Boundary Research Institute Terminal", detail: "Personnel files · Containment records · Anomalous research", cta: "ENTER THE TERMINAL →", image: "BRI_Terminal/assets/share-card.png", position: "left top", grayscale: false },
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
  { file: "shop-an-index-digital.jpg", kicker: "NOVELLA", title: "An Index of Vanishing", detail: "He was sent to watch her. He never expected her to see him.", image: "shop-assets/an-index-digital.jpg", fit: "contain", grayscale: false, minimal: true },
  { file: "shop-even-if-digital.jpg", kicker: "NOVEL", title: "Even if the Light Forgets", detail: "A world of alchemy, ruin, slow-burn love, and fragile hope", image: "shop-assets/even-if-digital.jpg", fit: "contain", grayscale: false, minimal: true },
  { file: "shop-strange-mercy-digital.jpg", kicker: "NOVEL", title: "The Strange Mercy of Listening", detail: "A quiet devotion becomes something far more dangerous", image: "shop-assets/strange-mercy-digital.jpg", fit: "contain", grayscale: false, minimal: true },
  { file: "shop-shelves-memory-digital.jpg", kicker: "POETRY", title: "Shelves of Memory", detail: "Poems for grief, longing, love, and what cannot return", image: "shop-assets/shelves-of-memory-digital.jpg", fit: "contain", grayscale: false, minimal: true },
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
  const scoreArtwork = Buffer.from(`
    <svg width="720" height="900" xmlns="http://www.w3.org/2000/svg">
      <style>${fontCss}
        .score-title { font: 600 25px Plex, monospace; letter-spacing: 2px; }
        .score-line { font: 300 17px Plex, monospace; }
      </style>
      <rect width="720" height="900" fill="#d9d2c6"/>
      <g transform="translate(70 56) rotate(-3 270 190)">
        <rect width="540" height="350" rx="4" fill="#f6f2e9" stroke="#272522" stroke-width="2"/>
        <text x="38" y="62" class="score-title">SAME SKY</text>
        <line x1="38" y1="80" x2="502" y2="80" stroke="#272522"/>
        <text x="38" y="125" class="score-line">At a time of your choosing step outside.</text>
        <text x="38" y="161" class="score-line">Picture someone you love beneath the same sky.</text>
        <text x="38" y="197" class="score-line">Choose one point above you.</text>
        <text x="38" y="233" class="score-line">Remain with it for one minute.</text>
        <text x="38" y="269" class="score-line">Go back inside.</text>
        <text x="38" y="320" class="score-line" fill="#77736c">ORDINARY SCORES · 01</text>
      </g>
      <g transform="translate(118 482) rotate(3 270 170)">
        <rect width="540" height="330" rx="4" fill="#eee8dc" stroke="#272522" stroke-width="2"/>
        <text x="38" y="62" class="score-title">WINDOW</text>
        <line x1="38" y1="80" x2="502" y2="80" stroke="#272522"/>
        <text x="38" y="132" class="score-line">Open a window.</text>
        <text x="38" y="174" class="score-line">Listen until you notice a sound</text>
        <text x="38" y="208" class="score-line">you had not heard before.</text>
        <text x="38" y="250" class="score-line">Close the window.</text>
        <text x="38" y="298" class="score-line" fill="#77736c">ORDINARY SCORES · 14</text>
      </g>
    </svg>
  `);
  const source = card.artwork === "scores" ? scoreArtwork : resolve(root, card.image);
  let imagePipeline = sharp(source, { animated: false })
    .resize(410, 630, { fit: card.fit ?? "cover", position: card.position ?? "centre", background: "#ddd8ce" });
  if (card.grayscale !== false) imagePipeline = imagePipeline.grayscale().modulate({ brightness: 0.92 });
  const image = await imagePipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();

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
      ${card.minimal ? "" : `<text x="70" y="526" class="cta" fill="#191919">${escapeXml(card.cta)}</text>
      <line x1="70" y1="540" x2="310" y2="540" stroke="#191919" stroke-width="1"/>
      <text x="70" y="588" class="brand" fill="#77736c">YSGOLDT.COM</text>`}
    </svg>
  `);

  await sharp(overlay)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(resolve(outputDir, card.file));
}

console.log(`Generated ${cards.length} social cards in ${outputDir}`);

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const booksPath = resolve(root, "books.html");
const indexPath = resolve(root, "index.html");

let books = await readFile(booksPath, "utf8");
books = books
  .replace('<link rel="canonical" href="https://ysgoldt.com/books.html">', '<link rel="canonical" href="https://ysgoldt.com/">')
  .replace('<meta property="og:url" content="https://ysgoldt.com/books.html">', '<meta property="og:url" content="https://ysgoldt.com/">')
  .replaceAll('href="./books.html"', 'href="./"');

await writeFile(booksPath, books);
const home = books
  .replace("Books by Ys Goldt | Literary Fiction & Novellas", "Ys Goldt | Writer, Artist & Interactive Storyteller")
  .replace('content="Books by Ys Goldt, available in digital and print editions."', 'content="Ys Goldt is a multidisciplinary writer and artist creating strange and tender things across fiction, interactive media, visual work, and performance."')
  .replace('<meta property="og:title" content="Books by Ys Goldt">', '<meta property="og:title" content="Ys Goldt — Writer, Artist & Interactive Storyteller">')
  .replace('content="Strange, intimate fiction by Ys Goldt, available in digital and print editions."', 'content="Writer and artist creating strange and tender things across fiction, interactive media, visual work, and performance."')
  .replace('<meta name="twitter:title" content="Books by Ys Goldt">', '<meta name="twitter:title" content="Ys Goldt — Writer, Artist & Interactive Storyteller">')
  .replace('content="Strange, intimate fiction available in digital and print editions."', 'content="Writer and artist creating strange and tender things across fiction, interactive media, visual work, and performance."');
await writeFile(indexPath, home);

for (const file of ["works.html", "contact.html"]) {
  const path = resolve(root, file);
  const html = (await readFile(path, "utf8")).replaceAll('href="./books.html"', 'href="./"');
  await writeFile(path, html);
}

console.log("Made the Books storefront the canonical root page.");

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const unpublished = [
  "serial/index.html",
  "serial/how-long-things-hold/index.html",
  "sample-how-long-things-hold.html",
];

test("How Long Things Hold appears as forthcoming without a public serial or sample", async () => {
  for (const page of unpublished) {
    await assert.rejects(access(resolve(root, page)), { code: "ENOENT" });
  }
  const catalogue = JSON.parse(await readFile(resolve(root, "books.json"), "utf8"));
  const book = catalogue.works.find((work) => work.id === "how-long-things-hold");
  assert.equal(book.status, "forthcoming");
  assert.equal(book.canonicalUrl, "https://ysgoldt.com/coming-soon.html#how-long-things-hold-title");
  assert.equal(book.sampleUrl, undefined);
  assert.equal(book.readUrl, undefined);
  const comingSoon = await readFile(resolve(root, "coming-soon.html"), "utf8");
  assert.match(comingSoon, /id="how-long-things-hold-title"/);
  const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
  assert.doesNotMatch(sitemap, /sample-how-long-things-hold|https:\/\/ysgoldt\.com\/serial\//);
  for (const file of ["index.html", "books.html", "works.html", "about.html", "contact.html", "journal.html", "press.html", "coming-soon.html"]) {
    const html = await readFile(resolve(root, file), "utf8");
    assert.doesNotMatch(html, /(?:href="[^"]*serial\/how-long-things-hold|>Serial<\/a>|sample-how-long-things-hold)/, file);
  }
});

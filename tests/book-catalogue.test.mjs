import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { bookGraph, catalogue, itemList, localHref, validateCatalogue } from "../scripts/book-catalogue.mjs";

const require = createRequire(import.meta.url);
const lookup = require("../book-lookup.js");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://ysgoldt.com";
const expected = new Map([
  ["9798996205202", "/shop/even-if-the-light-forgets-volume-i/"],
  ["9798996205219", "/shop/an-index-of-vanishing-part-i/"],
  ["9798996205226", "/shop/the-strange-mercy-of-listening/"],
  ["9798996205240", "/coming-soon.html#one-small-proof-title"],
]);

test("catalogue has all seven works and valid unique edition ISBNs", () => {
  assert.equal(validateCatalogue(), true);
  assert.equal(catalogue.works.length, 7);
  const actual = new Set(catalogue.works.flatMap((work) => work.editions.map((edition) => edition.isbn13).filter(Boolean)));
  assert.deepEqual(actual, new Set(expected.keys()));
  for (const isbn of actual) assert.equal(lookup.isValidIsbn13(isbn), true);
  assert.equal(itemList().mainEntity.itemListElement.length, 7);
});

test("every production ISBN resolves to its own official destination", () => {
  for (const [isbn, path] of expected) {
    const match = lookup.resolveIsbn(catalogue, isbn, origin);
    assert.ok(match, isbn);
    assert.equal(new URL(match.destination).pathname + new URL(match.destination).hash, path);
    assert.equal(match.edition.format, "Paperback");
  }
  assert.equal(lookup.resolveIsbn(catalogue, "9780306406157", origin), null);
});

test("ISBN syntax, separators, check digits, and 978 conversion", () => {
  assert.equal(lookup.classifyIsbn("979-8-996205-24-0").isbn13, "9798996205240");
  assert.equal(lookup.classifyIsbn(" 979 8996205240 ").isbn13, "9798996205240");
  assert.equal(lookup.classifyIsbn("0306406152").isbn13, "9780306406157");
  assert.equal(lookup.classifyIsbn("0-306-40615-2").isbn13, "9780306406157");
  assert.equal(lookup.classifyIsbn("0-8044-2957-X").isbn13, "9780804429573");
  for (const bad of ["", "123", "9798996205241", "0306406153", "9798<script>", "978030640615X"]) {
    assert.equal(lookup.classifyIsbn(bad).valid, false, bad);
  }
  const fixture = { works: [{ title: "ISBN-10 fixture", editions: [{ format: "Paperback", isbn13: "9780306406157", canonicalUrl: "https://ysgoldt.com/fixture/" }] }] };
  const converted = lookup.classifyIsbn("0-306-40615-2");
  assert.equal(lookup.resolveIsbn(fixture, converted.isbn13, origin).destination, "https://ysgoldt.com/fixture/");
});

test("lookup rejects external and recursive destinations", () => {
  assert.equal(lookup.sameSiteDestination("https://example.com/", origin), false);
  assert.equal(lookup.sameSiteDestination("javascript:alert(1)", origin), false);
  assert.equal(lookup.sameSiteDestination("https://ysgoldt.com/book-lookup.html?isbn=9798996205240", origin), false);
  const poisoned = structuredClone(catalogue);
  poisoned.works[0].editions[0].canonicalUrl = "https://example.com/";
  assert.equal(lookup.resolveIsbn(poisoned, "9798996205202", origin), null);
});

test("ISBN-less works and unavailable purchases remain distinct", () => {
  const shelves = catalogue.works.find((work) => work.id === "shelves-of-memory");
  const serial = catalogue.works.find((work) => work.id === "how-long-things-hold");
  const heaven = catalogue.works.find((work) => work.id === "if-not-heaven");
  assert.equal(shelves.editions[0].isbn13, undefined);
  assert.equal(serial.editions[0].isbn13, undefined);
  assert.deepEqual(heaven.editions, []);
  const proof = catalogue.works.find((work) => work.id === "one-small-proof");
  assert.equal(proof.editions[0].purchaseUrl, undefined);
  assert.equal(lookup.resolveIsbn(catalogue, proof.editions[0].isbn13, origin).destination, proof.canonicalUrl);
  assert.equal(bookGraph(serial).some((node) => node["@type"] === "Product"), false);
});

test("verified prices can produce edition-specific Product and Offer markup", () => {
  const work = structuredClone(catalogue.works[0]);
  work.editions[0].price = 18;
  work.editions[0].currency = "USD";
  work.editions[0].availability = "InStock";
  const product = bookGraph(work).find((node) => node["@type"] === "Product");
  assert.equal(product.offers.price, 18);
  assert.equal(product.offers.priceCurrency, "USD");
  assert.equal(product.offers.availability, "https://schema.org/InStock");
});

test("public HTML contains matching structured data and crawlable edition facts", async () => {
  const pages = ["index.html", "books.html", "about.html", "coming-soon.html", "press.html", "serial/how-long-things-hold/index.html", ...catalogue.works.filter((work) => work.canonicalUrl.includes("/shop/")).map((work) => new URL(work.canonicalUrl).pathname.slice(1) + "index.html")];
  for (const page of pages) {
    const html = await readFile(resolve(root, page), "utf8");
    for (const [, source] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => JSON.parse(source), page);
    assert.match(html, /rel="canonical"/);
  }
  const press = await readFile(resolve(root, "press.html"), "utf8");
  for (const work of catalogue.works) assert.ok(press.includes(work.title), work.title);
  assert.doesNotMatch(press, /id="nachtljocht-press"|publisher-jsonld/);
  assert.equal(catalogue.publisher.url, "https://nachtljocht.com/");
  for (const work of catalogue.works.filter((item) => item.publisherId)) {
    assert.equal(work.publisherId, catalogue.publisher.id);
    const page = work.id === "one-small-proof" ? "coming-soon.html" : new URL(work.canonicalUrl).pathname.slice(1) + "index.html";
    const html = await readFile(resolve(root, page), "utf8");
    assert.match(html, /href="https:\/\/nachtljocht\.com\/"[^>]*>Nachtljocht Press<\/a>/, page);
  }
  for (const isbn of expected.keys()) {
    const work = catalogue.works.find((item) => item.editions.some((edition) => edition.isbn13 === isbn));
    const page = work.id === "one-small-proof" ? "coming-soon.html" : new URL(work.canonicalUrl).pathname.slice(1) + "index.html";
    const html = await readFile(resolve(root, page), "utf8");
    assert.match(html.slice(html.indexOf("<body")), new RegExp(isbn), page);
  }
  const home = await readFile(resolve(root, "index.html"), "utf8");
  assert.equal(home.match(/class="books-store"/g)?.length, 1);
  const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
  assert.match(sitemap, /https:\/\/ysgoldt\.com\/press\.html/);
  assert.doesNotMatch(sitemap, /book-lookup\.html|shop\/(?:an-index-of-vanishing-part-i|even-if-the-light-forgets-volume-i|the-strange-mercy-of-listening)-digital\//);
});

test("generated internal links and catalogue destinations resolve locally", async () => {
  for (const work of catalogue.works) {
    const url = new URL(work.canonicalUrl);
    const file = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
    await access(resolve(root, file.slice(1)));
  }
  for (const page of ["press.html", "coming-soon.html", "book-lookup.html", "shop/an-index-of-vanishing-part-i/index.html"]) {
    const html = await readFile(resolve(root, page), "utf8");
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|#)/.test(href)) continue;
      const target = new URL(href, `https://ysgoldt.com/${page}`);
      const local = target.pathname.endsWith("/") ? `${target.pathname}index.html` : target.pathname;
      await access(resolve(root, local.slice(1)));
    }
  }
  assert.equal(localHref("https://ysgoldt.com/shop/shelves-of-memory-digital/", "/press.html"), "shop/shelves-of-memory-digital/");
});

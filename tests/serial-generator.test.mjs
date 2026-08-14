import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  escapeHtml,
  getInstallmentNavigation,
  renderInstallmentContent,
  renderInstallmentPage,
  renderManuscript,
  renderSerialIndex,
  renderStoryHome,
  validateSerials,
} from "../scripts/generate-serial.mjs";
import { serials } from "../serial/serials.mjs";

const testPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(testPath), "..");
const sourceInsideRepo = resolve(root, serials[0].installments[0].source);

test("the supplied Chapter One HTML matches its locked checksum", async () => {
  const imported = await readFile(sourceInsideRepo);
  assert.equal(
    createHash("sha256").update(imported).digest("hex"),
    serials[0].installments[0].sourceSha256,
  );
});

test("the supplied HTML fragment and all emphasis tags are inserted unchanged", async () => {
  const manuscript = await readFile(sourceInsideRepo, "utf8");
  const rendered = renderInstallmentContent(serials[0].installments[0], manuscript);
  assert.equal(rendered, manuscript);
  assert.equal((rendered.match(/<em>/g) || []).length, 28);
  assert.equal((rendered.match(/<\/em>/g) || []).length, 28);
  assert.equal((rendered.match(/<p>/g) || []).length, 178);
  assert.equal((rendered.match(/aria-label="Scene break">\*\*\*/g) || []).length, 1);
});

test("plain line sources remain escaped and preserve their scene break", () => {
  const rendered = renderManuscript("One < two\n\n***\nThree & four");
  assert.match(rendered, /<p>One &lt; two<\/p>/);
  assert.match(rendered, /aria-label="Scene break">\*\*\*/);
  assert.match(rendered, /<p>Three &amp; four<\/p>/);
});

test("serial metadata rejects duplicate slugs and instalment numbers", () => {
  validateSerials(serials);
  const duplicateSerial = structuredClone(serials[0]);
  assert.throws(() => validateSerials([serials[0], duplicateSerial]), /Duplicate serial slug/);

  const duplicateNumber = structuredClone(serials[0]);
  duplicateNumber.installments.push({
    ...duplicateNumber.installments[0],
    slug: "02-another-chapter",
  });
  assert.throws(() => validateSerials([duplicateNumber]), /duplicate instalment number/);
});

test("navigation and latest links are calculated from ordered instalments", () => {
  const oneInstallment = serials[0];
  assert.deepEqual(getInstallmentNavigation(oneInstallment, oneInstallment.installments[0]), {
    previous: null,
    next: null,
  });

  const twoInstallments = structuredClone(serials[0]);
  const second = {
    ...twoInstallments.installments[0],
    number: 2,
    roman: "II",
    title: "Chapter Two",
    slug: "02-chapter-two",
    published: "2026-08-20",
    displayDate: "20 August 2026",
  };
  twoInstallments.installments.push(second);

  const firstNavigation = getInstallmentNavigation(twoInstallments, twoInstallments.installments[0]);
  const secondNavigation = getInstallmentNavigation(twoInstallments, second);
  assert.equal(firstNavigation.previous, null);
  assert.equal(firstNavigation.next.slug, second.slug);
  assert.equal(secondNavigation.previous.slug, twoInstallments.installments[0].slug);
  assert.equal(secondNavigation.next, null);

  const storyHome = renderStoryHome(twoInstallments);
  assert.match(storyHome, /Latest Instalment/);
  assert.match(storyHome, /02-chapter-two/);
});

test("launch pages contain the approved hierarchy without chapter blurbs", async () => {
  const serial = serials[0];
  const installment = serial.installments[0];
  const manuscript = await readFile(sourceInsideRepo, "utf8");
  const shelf = renderSerialIndex(serials);
  const story = renderStoryHome(serial);
  const chapter = renderInstallmentPage(serial, installment, manuscript);

  assert.match(shelf, /The Vasentia were built to endure, to preserve, to remember/);
  assert.match(shelf, /They back up their memories and restore themselves from death/);
  assert.match(shelf, /New chapter every Friday/);
  assert.doesNotMatch(shelf, /A speculative novel in instalments about memory/);
  assert.match(shelf, /href="\.\/how-long-things-hold\/index\.html"/);
  assert.match(story, /The Vasentia were built to endure/);
  assert.match(story, /Instalment I — Chapter One/);
  assert.match(story, /14 August 2026/);
  assert.match(
    story,
    /class="serial-cover-subscribe-link" href="#how-long-things-hold-home-signup">Receive instalments by email<\/a>/,
  );
  assert.match(story, /id="how-long-things-hold-home-signup"/);
  assert.doesNotMatch(story, />A novel in instalments</);
  assert.doesNotMatch(story, />1 published instalment</);
  assert.doesNotMatch(story, /Latest Instalment/);
  assert.match(chapter, /<p class="serial-reader-kicker">Instalment I<\/p>/);
  assert.match(chapter, /<h1>Chapter One<\/h1>/);
  assert.ok(chapter.includes(manuscript), "Chapter HTML must contain the exact supplied fragment");
  assert.equal((chapter.match(/<em>/g) || []).length, 28);
  assert.equal((chapter.match(/<\/em>/g) || []).length, 28);
  assert.match(chapter, />Contents<\/a>/);
  for (const page of [shelf, story, chapter]) {
    assert.match(page, /<body[^>]+data-disable-context-menu[^>]+data-disable-selection>/);
    assert.doesNotMatch(page, />[^<]*\binstallments?\b[^<]*</i);
    assert.doesNotMatch(page, /(?:content|aria-label)="[^"]*\binstallments?\b[^"]*"/i);
  }
  for (const page of [story, chapter]) {
    assert.match(
      page,
      /action="https:\/\/buttondown\.com\/api\/emails\/embed-subscribe\/how-long-things-hold"/,
    );
    assert.match(
      page,
      /href="https:\/\/buttondown\.com\/refer\/how-long-things-hold"/,
    );
    assert.doesNotMatch(page, /buttondown\.com\/(?:api\/emails\/embed-subscribe|refer)\/ysgoldt/);
  }
  assert.doesNotMatch(chapter, />← Previous<\/a>/);
  assert.doesNotMatch(chapter, />Next →<\/a>/);
  assert.doesNotMatch(chapter, /The Vasentia were built to endure/);
});

test("generated local links and assets resolve", async () => {
  const pages = [
    "serial/index.html",
    "serial/how-long-things-hold/index.html",
    "serial/how-long-things-hold/01-chapter-one/index.html",
  ];

  for (const page of pages) {
    const html = await readFile(resolve(root, page), "utf8");
    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(
      references.filter((reference) => reference.startsWith("/")).length,
      0,
      `${page} contains a site-root reference that will fail when opened directly`,
    );
    for (const reference of references) {
      if (/^(?:https?:|mailto:|#)/.test(reference)) continue;
      const clean = reference.split(/[?#]/)[0];
      let target = clean.startsWith("/")
        ? resolve(root, `.${clean}`)
        : resolve(dirname(resolve(root, page)), clean);
      if (clean.endsWith("/")) target = resolve(target, "index.html");
      await access(target);
    }
  }
});

test("SERIAL follows Books in every main navigation copy", async () => {
  for (const file of ["index.html", "books.html", "works.html", "about.html", "contact.html"]) {
    const html = await readFile(resolve(root, file), "utf8");
    const booksPosition = html.indexOf(">Books</a>");
    const serialPosition = html.indexOf(">Serial</a>", booksPosition);
    assert.ok(booksPosition !== -1, `${file} is missing Books`);
    assert.ok(serialPosition > booksPosition, `${file} does not place Serial after Books`);
    assert.match(
      html,
      /href="\.\/serial\/index\.html">Serial<\/a>/,
      `${file} must link to the explicit index file for file:// previews`,
    );
  }
});

test("the sitemap includes all serial levels", async () => {
  const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
  assert.match(sitemap, /https:\/\/ysgoldt\.com\/serial\//);
  assert.match(sitemap, /https:\/\/ysgoldt\.com\/serial\/how-long-things-hold\//);
  assert.match(
    sitemap,
    /https:\/\/ysgoldt\.com\/serial\/how-long-things-hold\/01-chapter-one\//,
  );
});

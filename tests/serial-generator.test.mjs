import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getInstallmentNavigation,
  renderInstallmentContent,
  renderManuscript,
  renderSampleMarkdown,
  renderSamplePage,
  renderSerialIndex,
  renderStoryHome,
  validateSerials,
} from "../scripts/generate-serial.mjs";
import { serials } from "../serial/serials.mjs";

const testPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(testPath), "..");
const sampleInstallment = {
  number: 1,
  roman: "I",
  title: "Chapter One",
  slug: "01-chapter-one",
  published: "2026-08-14",
  displayDate: "14 August 2026",
  source: "serial/content/example.html",
  sourceFormat: "html-fragment",
  sourceSha256: "example-checksum",
};

test("the serial can remain published without public instalments", () => {
  assert.deepEqual(serials[0].installments, []);
  validateSerials(serials);
});

test("trusted HTML fragments are inserted unchanged", () => {
  const manuscript = '<div class="serial-prose"><p>Example <em>text</em>.</p></div>';
  assert.equal(renderInstallmentContent(sampleInstallment, manuscript), manuscript);
});

test("plain line sources remain escaped and preserve their scene break", () => {
  const rendered = renderManuscript("One < two\n\n***\nThree & four");
  assert.match(rendered, /<p>One &lt; two<\/p>/);
  assert.match(rendered, /aria-label="Scene break">\*\*\*/);
  assert.match(rendered, /<p>Three &amp; four<\/p>/);
});

test("the text sample preserves emphasis, quoted small caps markup, and its scene break", () => {
  const markdown = "# Chapter One\n\nText with *thoughts* and an escaped exclamation\\!\n\n> a remembered voice\\!\n\n\\*\\*\\*\n\nAfter.";
  const rendered = renderSampleMarkdown(markdown);
  assert.match(rendered, /<em>thoughts<\/em>/);
  assert.match(rendered, /escaped exclamation!/);
  assert.match(rendered, /<blockquote><p>a remembered voice!<\/p><\/blockquote>/);
  assert.match(rendered, /aria-label="Scene break"/);
  assert.match(rendered, /<p>After\.<\/p>/);
  const page = renderSamplePage(serials[0], markdown);
  assert.match(page, /<h1 id="chapter-title">Chapter One<\/h1>/);
  assert.match(page, /<p class="page-title">Ys Goldt<\/p>/);
  assert.match(page, /<link rel="canonical" href="https:\/\/ysgoldt\.com\/sample-how-long-things-hold\.html">/);
  assert.doesNotMatch(page, /noindex|sample-reader\.js|sample-reader\.css/);
});

test("serial metadata rejects duplicate slugs and instalment numbers", () => {
  const duplicateSerial = structuredClone(serials[0]);
  assert.throws(() => validateSerials([serials[0], duplicateSerial]), /Duplicate serial slug/);

  const duplicateNumber = structuredClone(serials[0]);
  duplicateNumber.installments.push(sampleInstallment, {
    ...sampleInstallment,
    slug: "02-another-chapter",
  });
  assert.throws(() => validateSerials([duplicateNumber]), /duplicate instalment number/);
});

test("instalment navigation is calculated from ordered instalments", () => {
  const oneInstallment = structuredClone(serials[0]);
  oneInstallment.installments.push(sampleInstallment);
  assert.deepEqual(getInstallmentNavigation(oneInstallment, sampleInstallment), {
    previous: null,
    next: null,
  });

  const twoInstallments = structuredClone(oneInstallment);
  const second = {
    ...sampleInstallment,
    number: 2,
    roman: "II",
    title: "Chapter Two",
    slug: "02-chapter-two",
    published: "2026-08-20",
    displayDate: "20 August 2026",
  };
  twoInstallments.installments.push(second);

  const firstNavigation = getInstallmentNavigation(twoInstallments, sampleInstallment);
  const secondNavigation = getInstallmentNavigation(twoInstallments, second);
  assert.equal(firstNavigation.previous, null);
  assert.equal(firstNavigation.next.slug, second.slug);
  assert.equal(secondNavigation.previous.slug, sampleInstallment.slug);
  assert.equal(secondNavigation.next, null);
});

test("launch pages keep the story public without chapter links", () => {
  const shelf = renderSerialIndex(serials);
  const story = renderStoryHome(serials[0]);

  assert.match(shelf, /The Vasentia were built to endure, to preserve, to remember/);
  assert.match(shelf, /They back up their memories and restore themselves from death/);
  assert.match(shelf, /href="\.\/how-long-things-hold\/index\.html"/);
  assert.match(story, /For eleven hundred years, Eîra has lived alone among the ruins of a dead civilisation\./);
  assert.match(
    story,
    /href="\.\.\/\.\.\/sample-how-long-things-hold\.html">Read a Sample →<\/a>/,
  );
  assert.ok(
    story.indexOf('class="serial-story-cover"') < story.indexOf('class="serial-cover-actions"') &&
      story.indexOf("Read for free") < story.indexOf("Read a Sample") &&
      story.indexOf("Read a Sample") < story.indexOf('class="serial-story-introduction"'),
    "the archive and sample buttons should appear in that order below the cover",
  );
  assert.match(story, /href="https:\/\/buttondown\.com\/how-long-things-hold\/archive"[^>]*>Read for free<\/a>/);
  assert.doesNotMatch(story, /Start Reading/);
  assert.doesNotMatch(story, /serial-contents/);
  assert.doesNotMatch(story, /Chapter One|Chapter Two/);
  assert.doesNotMatch(story, /<form|home-signup/);
  assert.match(story, /<p class="page-title">Ys Goldt<\/p>/);
  assert.match(story, /<a class="tab active" href="\.\.\/\.\.\/serial\/how-long-things-hold\/index\.html" aria-current="page">Serial<\/a>/);
  assert.match(story, /<h1>How Long Things Hold<\/h1>/);
  assert.doesNotMatch(story, /class="serial-format"/);
  assert.doesNotMatch(story, /class="back-link"/);
  assert.doesNotMatch(story, /class="serial-related"/);
  const structuredData = JSON.parse(story.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(structuredData["@graph"][0].subjectOf.url, serials[0].relatedArticle.url);
  assert.doesNotMatch(story, /New instalments delivered through Buttondown/);
});

test("generated local links and sample assets resolve", async () => {
  const pages = [
    "serial/index.html",
    "serial/how-long-things-hold/index.html",
    "sample-how-long-things-hold.html",
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
      let target = resolve(dirname(resolve(root, page)), clean);
      if (clean.endsWith("/")) target = resolve(target, "index.html");
      await access(target);
    }
  }

  const sample = await readFile(resolve(root, "sample-how-long-things-hold.html"), "utf8");
  assert.match(sample, /<div class="serial-sample-prose">/);
  assert.match(sample, /Eîra had been climbing the tree every morning/);
  assert.match(sample, /<blockquote><p>balance achieved on first attempt\. well done, my dear!<\/p><\/blockquote>/);
  assert.match(sample, /Read for free<\/a>/);
});

test("SERIAL follows Books in every main navigation copy", async () => {
  for (const file of ["index.html", "books.html", "works.html", "about.html", "contact.html"]) {
    const html = await readFile(resolve(root, file), "utf8");
    const booksPosition = html.indexOf(">Books</a>");
    const serialPosition = html.indexOf(">Serial</a>", booksPosition);
    assert.ok(booksPosition !== -1, `${file} is missing Books`);
    assert.ok(serialPosition > booksPosition, `${file} does not place Serial after Books`);
    assert.match(html, /href="\.\/serial\/how-long-things-hold\/index\.html">Serial<\/a>/);
  }
});

test("the sitemap excludes unpublished chapters", async () => {
  const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
  assert.match(sitemap, /https:\/\/ysgoldt\.com\/serial\//);
  assert.match(sitemap, /https:\/\/ysgoldt\.com\/serial\/how-long-things-hold\//);
  assert.doesNotMatch(sitemap, /how-long-things-hold\/(?:01-chapter-one|02-chapter-two)\//);
});

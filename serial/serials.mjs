import { workById } from "../scripts/book-catalogue.mjs";

const book = workById("how-long-things-hold");

export const serials = [
  {
    slug: "how-long-things-hold",
    title: book.title,
    status: book.status === "ongoing" ? "Ongoing" : book.status,
    subtitle: "A novel in instalments",
    shelfDescription: [
      "The Vasentia were built to endure, to preserve, to remember, and to outlast humanity itself.",
      "They back up their memories and restore themselves from death, unchanged across centuries. But anything lost between preservation and damage is gone forever, and they can never know what is missing.",
    ],
    publicationSchedule: "New chapter every Friday",
    updated: "2026-08-28",
    metadataDescription: book.description,
    archiveUrl: book.readUrl,
    samplePath: new URL(book.sampleUrl).pathname,
    sampleSource: "serial/content/how-long-things-hold-chapter-one.md",
    sampleUpdated: "2026-10-16",
    relatedArticle: {
      url: "https://ysgoldt.com/journal-posts/2026-10-15-untitled-95cbd233.html",
      id: "https://ysgoldt.com/journal-posts/2026-10-15-untitled-95cbd233.html#article",
    },
    blurb: [
      "For eleven hundred years, Eîra has lived alone among the ruins of a dead civilisation.",
      "She was made to remember it.",
      "The Vasentia were built to outlast their creators, preserving themselves across centuries in bodies that can die and be restored. But restoration is imperfect. Anything that happens after the last preservation is simply gone.",
      "Eîra knows this. She also knows her city, its ruins, its silences, and the shape of a world that has not surprised her in a very long time.",
      "Then she hears footsteps.",
      "Sâel is the first of her kind she has seen in five hundred years. He has come to document what remains, and Eîra—curious, lonely, and carrying things even she does not fully understand—decides to follow him.",
      "Their meeting should be impossible to lose.",
      "It won't be.",
      "Something has endured in the ruins with them. Something neither preservation nor memory was meant to hold.",
      "And before long, Eîra and Sâel will have to reckon with a more dangerous question than what deserves to be remembered:",
      "What refuses to be forgotten?",
    ],
    cover: {
      path: new URL(book.image).pathname + new URL(book.image).search,
      alt: "Illustrated cover of How Long Things Hold showing Eîra seated on a tree branch beneath the title.",
      width: book.imageWidth,
      height: book.imageHeight,
    },
    socialImage: {
      url: book.image,
      alt: "Cover of How Long Things Hold by Ys Goldt, featuring white-haired Eîra seated on a tree branch",
      type: book.imageType,
      width: book.imageWidth,
      height: book.imageHeight,
    },
    installments: [],
  },
];

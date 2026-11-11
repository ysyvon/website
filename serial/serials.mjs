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
    samplePath: book.sampleUrl ? new URL(book.sampleUrl).pathname : null,
    sampleSource: "serial/content/how-long-things-hold-chapter-one.md",
    sampleUpdated: "2026-10-16",
    relatedArticle: {
      url: "https://ysgoldt.com/journal-posts/2026-10-15-untitled-95cbd233.html",
      id: "https://ysgoldt.com/journal-posts/2026-10-15-untitled-95cbd233.html#article",
    },
    blurb: [
      "For eleven hundred years, Eîra has lived alone among the ruins of a forgotten civilisation. Like all Vasentia, she was cultivated through alchemy—flesh and blood born of intentional design, made to outlast the humans who created her. Now she spends her days tending a library whose books have long since turned to dust, naming the foxes that wander through the ruins, and remembering a father who she says made her only because he loved her.",
      "Then Sâel arrives.",
      "An aloof Vasentia strangely devoted to documenting the decay of the old world, Sâel has little interest in anything beyond his work. Eîra, who has not spoken to another of her kind in centuries, finds herself drawn to his company. But what begins as an unlikely meeting ends in violence, leaving Sâel with two days missing from his memory and Eîra with a truth she cannot bring herself to tell him.",
      "As the grotesque biomechanical horrors of an ancient war stalk the wilderness, Eîra is forced to leave behind the only home she has ever known. Together, she and Sâel must confront a world neither fully understands, and the questions their creators left unanswered.",
      { text: "How Long Things Hold is a speculative fantasy about memory, grief, and the fragile connections that give meaning to existence long after the world that created them is gone.", title: true },
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

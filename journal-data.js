// Add new image-based journal posts here. Newest posts display first.
// Put images in journal-assets/ and use a date in YYYY-MM-DD format for sorting.
window.JOURNAL_POSTS = [
  {
    date: '2026-07-08',
    dateLabel: '8 july 2026',
    image: './journal-assets/moodboard_8_jul_2026_ys.png',
    alt: 'Moodboard journal page for 8 July 2026',
    caption: ''
  },
  {
    date: '2026-05-07',
    dateLabel: '7 may 2026',
    images: [
      {
        src: './journal-assets/journal_2026-05-07_01.png',
        alt: 'Typewritten journal page for 7 May 2026, page 1'
      },
      {
        src: './journal-assets/journal_2026-05-07_02.png',
        alt: 'Typewritten journal page for 7 May 2026, page 2'
      },
      {
        src: './journal-assets/journal_2026-05-07_03.png',
        alt: 'Typewritten journal page for 7 May 2026, page 3'
      }
    ],
    caption: ''
  }
];

window.JOURNAL_SLIDES = window.JOURNAL_POSTS.flatMap(function (post) {
  const images = post.images || [{ src: post.image, alt: post.alt }];
  return images.map(function (image) {
    return {
      src: image.src,
      alt: image.alt,
      caption: post.dateLabel
    };
  });
});

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
    image: './journal-assets/journal_2026-05-07_01.png',
    alt: 'Typewritten journal page for 7 May 2026',
    caption: ''
  },
  {
    date: '2026-05-07',
    dateLabel: '7 may 2026',
    image: './journal-assets/journal_2026-05-07_02.png',
    alt: 'Typewritten journal page for 7 May 2026',
    caption: ''
  },
  {
    date: '2026-05-07',
    dateLabel: '7 may 2026',
    image: './journal-assets/journal_2026-05-07_03.png',
    alt: 'Typewritten journal page for 7 May 2026',
    caption: ''
  }
];

window.JOURNAL_SLIDES = window.JOURNAL_POSTS.map(function (post) {
  return {
    src: post.image,
    alt: post.alt,
    caption: post.dateLabel
  };
});

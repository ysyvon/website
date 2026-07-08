// Edit these slides to add or change images and captions for the Journal page.
// Each slide should point to an image in your site folder or an external image URL.
window.JOURNAL_SLIDES = [
  {
    src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
        <rect width="800" height="1000" fill="#fafafa"/>
        <rect x="40" y="40" width="720" height="920" fill="#ffffff" stroke="#d9d9d9"/>
        <text x="400" y="470" text-anchor="middle" fill="#7d7d7d" font-family="IBM Plex Mono, monospace" font-size="28" letter-spacing="2">
          Add your first journal image here
        </text>
        <text x="400" y="525" text-anchor="middle" fill="#7d7d7d" font-family="IBM Plex Mono, monospace" font-size="18" letter-spacing="2">
          Edit journal-data.js
        </text>
      </svg>
    `),
    alt: 'Journal placeholder page',
    caption: 'Add your first image and caption in journal-data.js.'
  }
];

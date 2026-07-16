(function () {
  const landingPages = {
    "848367974": "./shop/an-index-of-vanishing-part-i-digital/",
    "848382763": "./shop/even-if-the-light-forgets-volume-i-digital/",
    "848382842": "./shop/the-strange-mercy-of-listening-digital/",
    "848382898": "./shop/shelves-of-memory-digital/",
  };

  function updateProductLinks(root = document) {
    root.querySelectorAll('a[href*="/p/"]').forEach((link) => {
      const match = link.getAttribute("href")?.match(/\/p\/(\d+)/);
      if (match && landingPages[match[1]]) link.href = landingPages[match[1]];
    });
  }

  updateProductLinks();
  new MutationObserver(() => updateProductLinks()).observe(document.documentElement, { childList: true, subtree: true });
})();

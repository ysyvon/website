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
      if (match && landingPages[match[1]]) {
        link.href = landingPages[match[1]];
        link.dataset.productLanding = "true";
      }
    });

    root.querySelectorAll(".grid-product__title").forEach((title) => {
      const original = title.textContent.trim();
      const cleaned = original.replace(/\s*\|\s*Digital Edition\s*$/i, "");
      if (cleaned !== original) title.textContent = cleaned;
    });

    root.querySelectorAll('.grid-product img[alt$="Digital Edition"]').forEach((image) => {
      image.alt = image.alt.replace(/\s*\|\s*Digital Edition\s*$/i, "");
    });
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[data-product-landing="true"]');
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(link.href);
  }, true);

  updateProductLinks();
  new MutationObserver(() => updateProductLinks()).observe(document.documentElement, { childList: true, subtree: true });
})();

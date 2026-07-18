(function () {
  const landingPages = {
    "848367974": "./shop/an-index-of-vanishing-part-i/index.html",
    "848382763": "./shop/even-if-the-light-forgets-volume-i/index.html",
    "848382842": "./shop/the-strange-mercy-of-listening/index.html",
    "848382898": "./shop/shelves-of-memory-digital/index.html",
  };

  function updateProductLinks(root = document) {
    root.querySelectorAll('a[href*="/p/"]').forEach((link) => {
      const match = link.getAttribute("href")?.match(/\/p\/(\d+)/);
      if (match && landingPages[match[1]]) {
        const destination = landingPages[match[1]];
        link.href = destination;
        link.dataset.productLanding = "true";

        const productCard = link.closest(".grid-product");
        if (productCard) productCard.dataset.productLandingHref = destination;
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
    const productCard = event.target.closest('.grid-product[data-product-landing-href]');
    const destination = link?.href || productCard?.dataset.productLandingHref;
    if (!destination) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(destination);
  }, true);

  updateProductLinks();
  new MutationObserver(() => updateProductLinks()).observe(document.documentElement, { childList: true, subtree: true });
})();

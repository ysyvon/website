(function () {
  const reader = document.querySelector('[data-standalone-reader]');
  const image = document.querySelector('[data-sample-page]');
  const currentLabel = document.querySelector('[data-sample-current]');
  const previousButtons = document.querySelectorAll('[data-sample-previous]');
  const nextButtons = document.querySelectorAll('[data-sample-next]');
  const stage = document.querySelector('[data-sample-stage]');

  if (!reader || !image || !currentLabel || !stage) return;

  const pageCount = Number(reader.dataset.pageCount);
  const pagePath = reader.dataset.pagePath;
  let currentPage = 1;
  let touchStartX = 0;

  const pageSource = (page) => pagePath + '/page-' + String(page).padStart(2, '0') + '.jpg';

  const preloadPage = (page) => {
    if (page < 1 || page > pageCount) return;
    const preload = new Image();
    preload.src = pageSource(page);
  };

  const showPage = (page) => {
    currentPage = Math.max(1, Math.min(pageCount, page));
    image.src = pageSource(currentPage);
    image.alt = 'Sample page ' + currentPage + ' of ' + pageCount;
    currentLabel.textContent = currentPage;
    previousButtons.forEach((button) => { button.disabled = currentPage === 1; });
    nextButtons.forEach((button) => { button.disabled = currentPage === pageCount; });
    preloadPage(currentPage - 1);
    preloadPage(currentPage + 1);
  };

  previousButtons.forEach((button) => button.addEventListener('click', () => showPage(currentPage - 1)));
  nextButtons.forEach((button) => button.addEventListener('click', () => showPage(currentPage + 1)));

  stage.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  stage.addEventListener('touchend', (event) => {
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) < 45) return;
    showPage(currentPage + (distance < 0 ? 1 : -1));
  }, { passive: true });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') showPage(currentPage - 1);
    if (event.key === 'ArrowRight') showPage(currentPage + 1);
  });

  showPage(1);
})();

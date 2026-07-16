document.addEventListener("DOMContentLoaded", () => {
  const frame = document.querySelector(".visual-novel-embed iframe");
  if (!frame) return;

  const mobileViewport = window.matchMedia("(max-width: 720px)");

  const loadAppropriateVersion = () => {
    const source = mobileViewport.matches
      ? frame.dataset.mobileSrc
      : frame.dataset.desktopSrc;

    if (source && frame.getAttribute("src") !== source) {
      frame.setAttribute("src", source);
    }
  };

  loadAppropriateVersion();

  if (typeof mobileViewport.addEventListener === "function") {
    mobileViewport.addEventListener("change", loadAppropriateVersion);
  } else {
    mobileViewport.addListener(loadAppropriateVersion);
  }
});

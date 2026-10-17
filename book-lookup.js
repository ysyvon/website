(function (root) {
  "use strict";

  function normalizeIsbn(value) {
    return typeof value === "string" ? value.replace(/[\s-]/g, "").toUpperCase() : "";
  }

  function isValidIsbn10(value) {
    if (!/^\d{9}[\dX]$/.test(value)) return false;
    let sum = 0;
    for (let index = 0; index < 10; index += 1) {
      sum += (10 - index) * (value[index] === "X" ? 10 : Number(value[index]));
    }
    return sum % 11 === 0;
  }

  function isValidIsbn13(value) {
    if (!/^\d{13}$/.test(value)) return false;
    let sum = 0;
    for (let index = 0; index < 12; index += 1) sum += Number(value[index]) * (index % 2 ? 3 : 1);
    return Number(value[12]) === (10 - (sum % 10)) % 10;
  }

  function isbn10To13(value) {
    if (!isValidIsbn10(value)) return null;
    const firstTwelve = `978${value.slice(0, 9)}`;
    let sum = 0;
    for (let index = 0; index < 12; index += 1) sum += Number(firstTwelve[index]) * (index % 2 ? 3 : 1);
    return `${firstTwelve}${(10 - (sum % 10)) % 10}`;
  }

  function classifyIsbn(raw) {
    const normalized = normalizeIsbn(raw);
    if (isValidIsbn13(normalized)) return { valid: true, isbn13: normalized };
    if (isValidIsbn10(normalized)) return { valid: true, isbn13: isbn10To13(normalized) };
    return { valid: false, isbn13: null };
  }

  function sameSiteDestination(url, origin) {
    try {
      const target = new URL(url);
      return target.protocol === "https:" && target.origin === origin && target.pathname !== "/book-lookup.html";
    } catch {
      return false;
    }
  }

  function resolveIsbn(catalogue, isbn13, origin) {
    if (!Array.isArray(catalogue?.works)) return null;
    for (const work of catalogue.works) {
      for (const edition of work.editions || []) {
        if (edition.isbn13 !== isbn13) continue;
        const directPurchase = edition.purchaseUrl && sameSiteDestination(edition.purchaseUrl, origin) && edition.availability !== "OutOfStock"
          ? edition.purchaseUrl : null;
        const destination = directPurchase || edition.canonicalUrl || work.canonicalUrl;
        if (!sameSiteDestination(destination, origin)) return null;
        return { work, edition, destination };
      }
    }
    return null;
  }

  const api = { normalizeIsbn, isValidIsbn10, isValidIsbn13, isbn10To13, classifyIsbn, sameSiteDestination, resolveIsbn };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root?.document) return;

  const status = root.document.getElementById("lookup-status");
  const explanation = root.document.getElementById("lookup-explanation");
  if (!status || !explanation) return;
  const params = new URLSearchParams(root.location.search);
  const values = params.getAll("isbn");
  if (!values.length || !values[0].trim()) {
    status.textContent = "No ISBN was supplied";
    explanation.textContent = "Add an ISBN to the link, or browse the official book information below.";
    return;
  }
  if (values.length !== 1) {
    status.textContent = "Please use one ISBN";
    explanation.textContent = "This link contains more than one ISBN parameter.";
    return;
  }
  const result = classifyIsbn(values[0]);
  if (!result.valid) {
    status.textContent = "This ISBN is not valid";
    explanation.textContent = "Check the digits and try again. Spaces and hyphens are fine.";
    return;
  }
  const localPreview = ["localhost", "127.0.0.1"].includes(root.location.hostname);
  const trustedOrigin = localPreview ? "https://ysgoldt.com" : root.location.origin;
  root.fetch("./books.json").then((response) => {
    if (!response.ok) throw new Error("Catalogue unavailable");
    return response.json();
  }).then((catalogue) => {
    const match = resolveIsbn(catalogue, result.isbn13, trustedOrigin);
    if (!match) {
      status.textContent = "ISBN not found in this catalogue";
      explanation.textContent = "This may be a valid ISBN for another publication. Browse Ys Goldt’s books below.";
      return;
    }
    status.textContent = `Opening ${match.work.title}`;
    explanation.textContent = `Taking you to the official page for the ${match.edition.format} edition.`;
    const destination = localPreview ? `${root.location.origin}${new URL(match.destination).pathname}${new URL(match.destination).search}${new URL(match.destination).hash}` : match.destination;
    root.location.replace(destination);
  }).catch(() => {
    status.textContent = "Book lookup is temporarily unavailable";
    explanation.textContent = "Please use the official book catalogue link below.";
  });
})(typeof window === "undefined" ? null : window);

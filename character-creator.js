(() => {
  'use strict';

  const STORAGE_KEY = 'ysgoldt-character-creator-v1';
  const form = document.getElementById('character-form');
  const status = document.getElementById('form-status');
  const nameInput = document.getElementById('full-name');
  const fields = [...form.querySelectorAll('input, textarea')];

  function announce(message, error = false) {
    status.textContent = message;
    status.dataset.error = String(error);
  }

  function readSavedDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        for (const field of fields) {
          if (typeof saved[field.name] === 'string') field.value = saved[field.name];
        }
        announce('Your saved draft has been restored.');
      }
    } catch {
      announce('Browser storage is unavailable. You can still complete the form and download a PDF.', true);
    }
  }

  function saveDraft() {
    const draft = Object.fromEntries(fields.map(field => [field.name, field.value]));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      if (status.dataset.error === 'true') announce('Your draft is saved in this browser.');
    } catch {
      announce('This browser could not save your draft. Download a PDF before closing this page.', true);
    }
  }

  function clearForm() {
    if (!window.confirm('Clear every field and remove this saved draft?')) return;
    form.reset();
    nameInput.removeAttribute('aria-invalid');
    try {
      localStorage.removeItem(STORAGE_KEY);
      announce('The form and saved draft have been cleared.');
    } catch {
      announce('The form is clear, but browser storage could not be cleared.', true);
    }
    nameInput.focus();
  }

  function filenameFor(name) {
    const safe = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 70);
    return `${safe || 'character'}-profile.pdf`;
  }

  // These are the glyph ranges in the site's bundled IBM Plex Mono font.
  // A browser-font image fallback preserves writing outside that range.
  const glyphRanges = '20-7e a0-17f 18f 192 1a0-1a1 1af-1b0 1cd-1dc 1fa-1ff 218-21b 237 259 2bb-2bc 2c6-2c7 2d8-2dd 300-304 306-30c 312 315 31b 323 326-328 3c0 400-45f 472-473 490-49d 4a0-4a5 4aa-4ab 4ae-4b3 4b6-4bb 4c0-4c2 4cf-4d9 4dc-4df 4e2-4e9 4ee-4f5 4f8-4f9 e3f 1e80-1e85 1e9e 1ea0-1ef9 2013-2014 2018-201a 201c-201e 2020-2022 2026 2030 2032-2033 2039-203a 2044 2070 2074-2079 2080-2089 20a1 20a4 20a6 20a8-20ae 20b1-20b2 20b4-20b5 20b8-20ba 20bd 20bf 2113 2116 2122 2126 212e 2150-2151 2153-215e 2190-2199 21a9-21aa 21b0-21b3 21b6-21b7 21ba-21bb 21c4 21c6 2202 2206 220f 2211-2212 2215 221a 221e 222b 2248 2260 2264-2265 2500-259f 25ca 2713 274c 2b0e-2b11 f6d7-f6d8 fb01-fb02'
    .split(' ').map(range => range.split('-').map(value => parseInt(value, 16)));

  function fontHasText(value) {
    return [...value].every(character => {
      const code = character.codePointAt(0);
      return glyphRanges.some(([first, last]) => code >= first && code <= (last ?? first));
    });
  }

  function drawFallbackLine(pdf, value, x, y, width, fontSize) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const cssSize = fontSize * 96 / 72;
    context.font = `${cssSize}px Georgia, "Times New Roman", serif`;
    const textWidth = Math.max(1, Math.ceil(context.measureText(value).width));
    const scale = 2;
    canvas.width = (textWidth + 4) * scale;
    canvas.height = Math.ceil(cssSize * 1.55) * scale;
    context.scale(scale, scale);
    context.fillStyle = '#111111';
    context.font = `${cssSize}px Georgia, "Times New Roman", serif`;
    context.textBaseline = 'alphabetic';
    context.fillText(value, 2, cssSize * 1.15);
    const actualWidth = Math.min(width, textWidth * 72 / 96);
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y - fontSize * 1.05, actualWidth, fontSize * 1.55);
  }

  function createPDF(name) {
    if (!window.jspdf?.jsPDF || !window.CharacterCreatorFonts) {
      throw new Error('The local PDF files could not be loaded.');
    }
    const pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const fonts = window.CharacterCreatorFonts;
    pdf.addFileToVFS('IBMPlexMono-Light.ttf', fonts.light);
    pdf.addFont('IBMPlexMono-Light.ttf', 'Plex', 'normal');
    pdf.addFileToVFS('IBMPlexMono-SemiBold.ttf', fonts.semibold);
    pdf.addFont('IBMPlexMono-SemiBold.ttf', 'Plex', 'bold');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const left = 54;
    const right = 54;
    const contentWidth = pageWidth - left - right;
    const contentBottom = pageHeight - 68;
    let y = 68;

    function newPageIfNeeded(height) {
      if (y + height <= contentBottom) return;
      pdf.addPage();
      y = 60;
    }

    function setFont(style, size, colour = '#111111') {
      pdf.setFont('Plex', style);
      pdf.setFontSize(size);
      pdf.setTextColor(colour);
    }

    function writeLine(line, size, style, x, width, leading) {
      newPageIfNeeded(leading);
      setFont(style, size);
      if (fontHasText(line)) pdf.text(line || ' ', x, y);
      else drawFallbackLine(pdf, line, x, y, width, size);
      y += leading;
    }

    function writeValue(value, x = left, width = contentWidth, size = 10.5, leading = 16) {
      setFont('normal', size);
      const paragraphs = value.replace(/\r\n?/g, '\n').split('\n');
      for (const paragraph of paragraphs) {
        if (paragraph === '') {
          newPageIfNeeded(leading);
          y += leading;
          continue;
        }
        const lines = pdf.splitTextToSize(paragraph.replace(/\t/g, '    '), width);
        for (const line of lines) writeLine(line, size, 'normal', x, width, leading);
      }
    }

    setFont('bold', 22);
    const titleLines = pdf.splitTextToSize(name, contentWidth);
    for (const line of titleLines) writeLine(line, 22, 'bold', left, contentWidth, 31);
    y += 4;
    pdf.setDrawColor('#b9b9b9');
    pdf.setLineWidth(.6);
    pdf.line(left, y, pageWidth - right, y);
    y += 23;

    const quote = document.getElementById('quote').value;
    if (quote.trim()) {
      newPageIfNeeded(40);
      setFont('normal', 11, '#555555');
      writeValue(quote, left + 13, contentWidth - 26, 11, 17);
      y += 22;
    }

    for (const section of form.querySelectorAll('[data-pdf-section]')) {
      const answered = [...section.querySelectorAll('input, textarea')]
        .filter(field => field.value.trim());
      if (!answered.length) continue;

      newPageIfNeeded(58);
      setFont('bold', 13);
      writeLine(section.dataset.pdfSection, 13, 'bold', left, contentWidth, 22);
      y += 7;
      for (const field of answered) {
        newPageIfNeeded(43);
        const label = section.querySelector(`label[for="${field.id}"]`).textContent;
        writeLine(label, 9, 'bold', left, contentWidth, 15);
        writeValue(field.value);
        y += 15;
      }
      y += 9;
    }

    const footer = 'Character creation template by Ys Goldt © 2026 · ysgoldt.com';
    const totalPages = pdf.internal.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor('#d9d9d9');
      pdf.setLineWidth(.5);
      pdf.line(left, pageHeight - 48, pageWidth - right, pageHeight - 48);
      setFont('normal', 8, '#666666');
      pdf.text(footer, left, pageHeight - 32);
    }
    return pdf;
  }

  function downloadPDF() {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.setAttribute('aria-invalid', 'true');
      announce('Enter your character’s full name before downloading the PDF.', true);
      nameInput.focus();
      return;
    }
    nameInput.removeAttribute('aria-invalid');
    try {
      const pdf = createPDF(name);
      pdf.save(filenameFor(name));
      announce('Your PDF has been downloaded.');
    } catch (error) {
      announce(`The PDF could not be created: ${error.message}`, true);
    }
  }

  form.addEventListener('input', event => {
    if (event.target === nameInput) nameInput.removeAttribute('aria-invalid');
    saveDraft();
  });
  form.addEventListener('submit', event => event.preventDefault());
  document.getElementById('clear-form').addEventListener('click', clearForm);
  document.getElementById('download-pdf').addEventListener('click', downloadPDF);
  readSavedDraft();
})();

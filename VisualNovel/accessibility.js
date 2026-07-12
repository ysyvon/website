(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');
    const dialogueBox = document.querySelector('#dialogue-box, .dialogue-box');
    const speaker = document.querySelector('#dialogue-speaker');
    const line = document.querySelector('#dialogue-line');
    if (!main || !dialogueBox || !speaker || !line) return;

    const title = document.title.replace(/\s+[—|]\s+Mobile$/i, '');
    document.querySelectorAll('.overlay h1').forEach((heading) => heading.setAttribute('aria-hidden', 'true'));

    const heading = document.createElement('h1');
    heading.className = 'vn-sr-only';
    heading.textContent = title;
    main.prepend(heading);

    const instructions = document.createElement('p');
    instructions.id = 'vn-instructions';
    instructions.className = 'vn-sr-only';
    instructions.textContent = 'Press Enter or Space to begin and advance. Press once during the typewriter effect to reveal the complete current line.';
    heading.after(instructions);

    const advanceControl = document.querySelector('#scene') || dialogueBox;
    advanceControl.setAttribute('role', 'button');
    advanceControl.setAttribute('tabindex', '0');
    advanceControl.setAttribute('aria-label', 'Advance dialogue');
    advanceControl.setAttribute('aria-describedby', instructions.id);

    const announcer = document.createElement('div');
    announcer.className = 'vn-sr-only';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    main.append(announcer);

    const transcript = document.createElement('section');
    transcript.className = 'vn-sr-only';
    transcript.setAttribute('aria-label', 'Dialogue transcript');
    const transcriptHeading = document.createElement('h2');
    transcriptHeading.textContent = 'Dialogue transcript';
    const transcriptList = document.createElement('ol');
    transcript.append(transcriptHeading, transcriptList);
    main.append(transcript);

    let lastAnnouncement = '';
    const announceCompleteLine = () => {
      if (line.classList.contains('typing')) return;
      const speakerText = speaker.textContent.trim();
      const lineText = line.textContent.trim();
      if (!lineText) return;
      const complete = speakerText ? `${speakerText}: ${lineText}` : lineText;
      if (complete === lastAnnouncement) return;
      lastAnnouncement = complete;
      announcer.textContent = '';
      requestAnimationFrame(() => { announcer.textContent = complete; });
      const item = document.createElement('li');
      item.textContent = complete;
      transcriptList.append(item);
    };

    new MutationObserver(announceCompleteLine).observe(line, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
      characterData: true
    });

    const beginOverlay = document.querySelector('#begin-overlay, #start-overlay');
    const endOverlay = document.querySelector('#end-overlay');
    const replayButton = document.querySelector('#replay-button');
    let sceneStarted = false;

    const manageFocus = () => {
      const beginHidden = beginOverlay?.classList.contains('hidden');
      if (beginHidden && !sceneStarted) {
        sceneStarted = true;
        advanceControl.focus();
      } else if (!beginHidden && sceneStarted && !endOverlay) {
        sceneStarted = false;
        document.querySelector('#begin-button')?.focus();
      }

      if (endOverlay && !endOverlay.classList.contains('hidden')) {
        sceneStarted = false;
        replayButton?.focus();
      }
    };

    [beginOverlay, endOverlay].filter(Boolean).forEach((overlay) => {
      new MutationObserver(manageFocus).observe(overlay, {
        attributes: true,
        attributeFilter: ['class']
      });
    });

    document.querySelectorAll('.scanlines').forEach((element) => element.setAttribute('aria-hidden', 'true'));
    document.querySelectorAll('.progress-rule').forEach((element) => element.setAttribute('aria-hidden', 'true'));
  });
})();

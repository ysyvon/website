/* Shared accessibility enhancements. Retains the historic filename so every
   existing page receives the improvements without additional markup. */
(() => {
  // Allow selection and browser context tools despite older inline blockers.
  ['selectstart', 'contextmenu'].forEach((type) => {
    document.addEventListener(type, (event) => {
      event.stopPropagation();
      if (type === 'contextmenu' && document.body?.hasAttribute('data-disable-context-menu')) {
        event.preventDefault();
      }
      if (type === 'selectstart' && document.body?.hasAttribute('data-disable-selection')) {
        const target = event.target;
        const editable = target instanceof HTMLElement && (
          target.matches('input, textarea') || target.isContentEditable
        );
        if (!editable) event.preventDefault();
      }
    }, { capture: true });
  });

  document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');
    if (main) {
      if (!main.id) main.id = 'main-content';
      const skipLink = document.createElement('a');
      skipLink.className = 'skip-link';
      skipLink.href = `#${main.id}`;
      skipLink.textContent = 'Skip to main content';
      document.body.prepend(skipLink);
    }

    enhanceTabs();
    enhanceProjectLinks();
    enhanceExternalLinks();
    enhanceScoreGrid();
    enhanceNewsletter(main);
  });

  function enhanceTabs() {
    const tablist = document.querySelector('.tabs');
    if (!tablist) return;

    const tabs = [...tablist.querySelectorAll('.tab[data-panel]')];
    const panels = [...document.querySelectorAll('.panel[data-panel]')];
    tablist.setAttribute('role', 'tablist');
    tablist.removeAttribute('aria-label');
    tablist.setAttribute('aria-label', 'Site sections');

    const selectTab = (selected, moveFocus = false) => {
      tabs.forEach((tab) => {
        const active = tab === selected;
        tab.removeAttribute('aria-pressed');
        tab.setAttribute('aria-selected', String(active));
        tab.setAttribute('tabindex', active ? '0' : '-1');
      });
      if (moveFocus) selected.focus();
    };

    tabs.forEach((tab, index) => {
      const name = tab.dataset.panel;
      const panel = panels.find((item) => item.dataset.panel === name);
      const tabId = `tab-${name}`;
      const panelId = `panel-${name}`;
      tab.id = tabId;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panelId);
      tab.removeAttribute('aria-pressed');

      if (panel) {
        panel.id = panelId;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tabId);
        panel.setAttribute('tabindex', '0');
      }

      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', (event) => {
        let nextIndex;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === undefined) return;
        event.preventDefault();
        tabs[nextIndex].click();
        selectTab(tabs[nextIndex], true);
      });
    });

    const activeTab = tabs.find((tab) => tab.classList.contains('active')) || tabs[0];
    selectTab(activeTab);
    document.querySelector('.panel-shell')?.removeAttribute('aria-live');
  }

  function enhanceProjectLinks() {
    document.querySelectorAll('.work-item').forEach((item) => {
      const title = item.querySelector('.work-title')?.textContent.trim();
      const link = item.querySelector('.work-button');
      if (title && link) link.setAttribute('aria-label', `View ${title}`);
    });
  }

  function enhanceExternalLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      if (link.hasAttribute('aria-label')) return;
      const label = link.textContent.trim() || link.querySelector('img')?.alt;
      if (label) link.setAttribute('aria-label', `${label} (opens in a new tab)`);
    });
  }

  function enhanceScoreGrid() {
    const grid = document.querySelector('.score-grid');
    if (!grid) return;
    grid.setAttribute('role', 'list');
    grid.querySelectorAll('.score-card').forEach((card) => card.setAttribute('role', 'listitem'));
  }

  function enhanceNewsletter(main) {
    const popup = document.querySelector('#newsletter-popup');
    const dialog = popup?.querySelector('[role="dialog"]');
    if (!popup || !dialog) return;

    let priorFocus = null;
    let wasOpen = false;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const updateState = () => {
      const open = popup.classList.contains('is-open') && !popup.hidden;
      if (open === wasOpen) return;
      wasOpen = open;

      if (open) {
        priorFocus = document.activeElement;
        if (main) main.inert = true;
        requestAnimationFrame(() => dialog.querySelector(focusableSelector)?.focus());
      } else {
        if (main) main.inert = false;
        if (priorFocus instanceof HTMLElement && document.contains(priorFocus)) priorFocus.focus();
      }
    };

    new MutationObserver(updateState).observe(popup, {
      attributes: true,
      attributeFilter: ['class', 'hidden', 'aria-hidden']
    });

    popup.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || !wasOpen) return;
      const focusable = [...dialog.querySelectorAll(focusableSelector)].filter((element) => !element.hidden);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }
})();

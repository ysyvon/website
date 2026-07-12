(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const navigation = document.querySelector('.tabs');
    const buttons = [...document.querySelectorAll('.tab[data-panel]')];
    const panels = [...document.querySelectorAll('.panel[data-panel]')];

    navigation?.removeAttribute('role');

    const syncNavigation = () => {
      buttons.forEach((button) => {
        const name = button.dataset.panel;
        const panel = panels.find((item) => item.dataset.panel === name);
        const active = !panel?.hidden;
        const buttonId = `section-button-${name}`;
        const panelId = `section-panel-${name}`;

        button.id = buttonId;
        button.removeAttribute('role');
        button.removeAttribute('aria-selected');
        button.removeAttribute('aria-pressed');
        button.removeAttribute('tabindex');
        button.setAttribute('aria-expanded', String(active));
        button.setAttribute('aria-controls', panelId);

        if (panel) {
          panel.id = panelId;
          panel.setAttribute('role', 'region');
          panel.setAttribute('aria-labelledby', buttonId);
          panel.removeAttribute('tabindex');
        }
      });
    };

    buttons.forEach((button) => button.addEventListener('click', syncNavigation));
    syncNavigation();

    panels.forEach((panel) => {
      if (panel.querySelector(':scope > h2')) return;
      const heading = document.createElement('h2');
      heading.className = 'sr-only';
      const name = panel.dataset.panel.replace(/-/g, ' ');
      heading.textContent = name.replace(/\b\w/g, (letter) => letter.toUpperCase());
      panel.prepend(heading);
    });

    const contributorGrid = document.querySelector('.contributors-grid');
    contributorGrid?.setAttribute('role', 'list');
    contributorGrid?.querySelectorAll('.contributor-card').forEach((card) => {
      card.setAttribute('role', 'listitem');
    });

    document.querySelectorAll('.contributor-link').forEach((link) => {
      const name = link.querySelector('.contributor-name')?.textContent.trim();
      if (name) link.setAttribute('aria-label', `Read ${name}'s contributor profile`);
    });

    document.querySelectorAll('iframe[title]').forEach((frame) => {
      frame.setAttribute('aria-label', frame.title);
    });
  });
})();

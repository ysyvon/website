/* Public journal notes. Text is inserted with textContent; no visitor HTML is rendered. */
(() => {
  const section = document.querySelector('.reader-notes[data-post-id]');
  if (!section) return;

  const status = section.querySelector('.notes-status');
  const list = section.querySelector('.notes-list');
  const form = section.querySelector('.notes-form');
  const formStatus = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');
  const api = 'https://ys-journal-comments.ysgoldt.workers.dev/api/comments';
  const post = section.dataset.postId;

  if (location.protocol !== 'https:' || !['ysgoldt.com', 'www.ysgoldt.com'].includes(location.hostname)) {
    status.textContent = 'Notes can be read and sent on the published website.';
    form.hidden = true;
    return;
  }

  const challenge = document.createElement('script');
  challenge.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  challenge.async = true;
  document.head.append(challenge);

  async function loadNotes() {
    try {
      const response = await fetch(`${api}?post=${encodeURIComponent(post)}`);
      if (!response.ok) throw new Error('Could not load notes.');
      const data = await response.json();
      list.replaceChildren();
      for (const note of data.comments) {
        const article = document.createElement('article');
        article.className = 'reader-note';
        const name = document.createElement('strong');
        name.textContent = note.display_name;
        const date = document.createElement('time');
        date.dateTime = note.created_at;
        date.textContent = new Date(note.created_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        const body = document.createElement('p');
        body.textContent = note.body;
        article.append(name, date, body);
        list.append(article);
      }
      status.textContent = data.comments.length
        ? `${data.comments.length} approved ${data.comments.length === 1 ? 'note' : 'notes'}`
        : 'No notes yet. You can leave the first one.';
    } catch {
      status.textContent = 'Notes could not be loaded right now.';
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = form.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!token) {
      formStatus.textContent = 'Please complete the verification first.';
      return;
    }
    button.disabled = true;
    formStatus.textContent = 'Sending your note…';
    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          post,
          name: form.elements.name.value.trim() || 'A visitor',
          body: form.elements.body.value.trim(),
          token
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send your note.');
      form.reset();
      if (window.turnstile) window.turnstile.reset();
      formStatus.textContent = 'Your note was received and is waiting for approval.';
    } catch (error) {
      formStatus.textContent = error.message || 'Could not send your note. Please try again.';
      if (window.turnstile) window.turnstile.reset();
    } finally {
      button.disabled = false;
    }
  });

  loadNotes();
})();

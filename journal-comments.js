/* Public journal notes. Text is inserted with textContent; no visitor HTML is rendered. */
(() => {
  const section = document.querySelector('.reader-notes[data-post-id]');
  if (!section) return;

  const status = section.querySelector('.notes-status');
  const list = section.querySelector('.notes-list');
  const toggle = section.querySelector('.notes-toggle');
  const form = section.querySelector('.notes-form');
  const formStatus = form.querySelector('.form-status');
  const widget = form.querySelector('.turnstile-widget');
  const button = form.querySelector('button[type="submit"]');
  const notify = form.elements.notify;
  const email = form.elements.email;
  const emailField = form.querySelector('.reply-email');
  const api = 'https://ys-journal-comments.ysgoldt.workers.dev/api/comments';
  const replyApi = 'https://ys-journal-comments.ysgoldt.workers.dev/api/replies';
  const post = section.dataset.postId;
  let widgetId = null;
  let challengeLoad = null;

  notify.addEventListener('change', () => {
    emailField.hidden = !notify.checked;
    email.required = notify.checked;
    if (!notify.checked) email.value = '';
  });

  if (location.protocol !== 'https:' || !['ysgoldt.com', 'www.ysgoldt.com'].includes(location.hostname)) {
    status.textContent = 'Notes can be read and sent on the published website.';
    toggle.hidden = true;
    return;
  }

  async function ensureWidget() {
    if (!challengeLoad) {
      challengeLoad = new Promise((resolve, reject) => {
        const challenge = document.createElement('script');
        challenge.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        challenge.async = true;
        challenge.onload = resolve;
        challenge.onerror = () => reject(new Error('Verification could not load. Please try again.'));
        document.head.append(challenge);
      }).catch((error) => {
        challengeLoad = null;
        throw error;
      });
    }
    await challengeLoad;
    if (!form.hidden && widgetId === null) {
      widgetId = window.turnstile.render(widget, {
        sitekey: widget.dataset.sitekey,
        action: widget.dataset.action
      });
    }
  }

  toggle.addEventListener('click', () => {
    const opening = form.hidden;
    if (!opening && widgetId !== null) {
      window.turnstile.remove(widgetId);
      widgetId = null;
    }
    form.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.querySelector('span').textContent = opening ? '−' : '+';
    if (opening) {
      formStatus.textContent = '';
      form.querySelector('textarea').focus();
      ensureWidget().catch((error) => { formStatus.textContent = error.message; });
    }
  });

  function makeDate(value) {
    const date = document.createElement('time');
    date.dateTime = value;
    date.textContent = new Date(value).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    return date;
  }

  function makeReply(name, body, created, author = false) {
    const reply = document.createElement('div');
    reply.className = author ? 'author-reply' : 'visitor-reply';
    const label = document.createElement('strong');
    label.textContent = name;
    const text = document.createElement('p');
    text.textContent = body;
    reply.append(label, makeDate(created), text);
    return reply;
  }

  function makeReplyForm(note) {
    const replyForm = document.createElement('form');
    replyForm.className = 'notes-form inline-reply-form';
    replyForm.hidden = true;
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Your name (optional)';
    const name = document.createElement('input');
    name.name = 'name';
    name.maxLength = 50;
    name.autocomplete = 'name';
    nameLabel.append(name);
    const bodyLabel = document.createElement('label');
    bodyLabel.textContent = 'Your reply';
    const body = document.createElement('textarea');
    body.name = 'body';
    body.maxLength = 2000;
    body.minLength = 3;
    body.required = true;
    body.rows = 3;
    bodyLabel.append(body);
    const challenge = document.createElement('div');
    challenge.className = 'turnstile-widget';
    const privacy = document.createElement('p');
    privacy.className = 'notes-privacy';
    privacy.textContent = 'Replies appear after approval. Please do not include private information.';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Send reply';
    const feedback = document.createElement('p');
    feedback.className = 'form-status';
    feedback.setAttribute('role', 'status');
    replyForm.append(nameLabel, bodyLabel, challenge, privacy, submit, feedback);
    let replyWidgetId = null;
    async function open() {
      replyForm.hidden = false;
      body.focus();
      try {
        await ensureWidget();
        if (replyForm.hidden) return;
        replyWidgetId = window.turnstile.render(challenge, {
          sitekey: widget.dataset.sitekey,
          action: 'journal_reply'
        });
      } catch { feedback.textContent = 'Verification could not load. Please try again.'; }
    }
    function close() {
      replyForm.hidden = true;
      if (replyWidgetId !== null) window.turnstile.remove(replyWidgetId);
      replyWidgetId = null;
    }
    replyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const token = replyWidgetId !== null ? window.turnstile.getResponse(replyWidgetId) : '';
      if (!token) { feedback.textContent = 'Please complete the verification first.'; return; }
      submit.disabled = true;
      feedback.textContent = 'Sending your reply…';
      try {
        const response = await fetch(replyApi, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ post, commentId: note.id, name: name.value.trim() || 'A visitor', body: body.value.trim(), token })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not send your reply.');
        replyForm.reset();
        feedback.textContent = result.message || 'Your reply is waiting for approval.';
        if (replyWidgetId !== null) window.turnstile.reset(replyWidgetId);
      } catch (error) {
        feedback.textContent = error.message || 'Could not send your reply. Please try again.';
        if (replyWidgetId !== null) window.turnstile.reset(replyWidgetId);
      } finally { submit.disabled = false; }
    });
    return { replyForm, open, close };
  }

  async function loadNotes() {
    try {
      const response = await fetch(`${api}?post=${encodeURIComponent(post)}`);
      if (!response.ok) throw new Error('Could not load notes.');
      const data = await response.json();
      list.replaceChildren();
      const byComment = new Map();
      for (const reply of data.visitor_replies || []) {
        if (!byComment.has(reply.comment_id)) byComment.set(reply.comment_id, []);
        byComment.get(reply.comment_id).push(reply);
      }
      const newestFirst = [...data.comments].sort((a, b) => b.created_at.localeCompare(a.created_at));
      for (const note of newestFirst) {
        const article = document.createElement('article');
        article.className = 'reader-note';
        article.id = `reader-note-${note.id}`;
        const name = document.createElement('strong');
        name.textContent = note.display_name;
        const body = document.createElement('p');
        body.textContent = note.body;
        article.append(name, makeDate(note.created_at), body);
        const thread = document.createElement('div');
        thread.className = 'thread-replies';
        if (note.reply_body) {
          thread.append(makeReply('Ys Goldt', note.reply_body, note.replied_at, true));
        }
        for (const reply of byComment.get(note.id) || []) {
          thread.append(makeReply(reply.display_name, reply.body, reply.created_at));
        }
        const actions = document.createElement('div');
        actions.className = 'note-actions';
        const count = thread.childElementCount;
        if (count) {
          const collapse = document.createElement('button');
          collapse.type = 'button';
          collapse.className = 'thread-toggle';
          collapse.textContent = `− ${count} ${count === 1 ? 'reply' : 'replies'}`;
          collapse.setAttribute('aria-expanded', 'true');
          collapse.addEventListener('click', () => {
            thread.hidden = !thread.hidden;
            collapse.setAttribute('aria-expanded', String(!thread.hidden));
            collapse.textContent = `${thread.hidden ? '+' : '−'} ${count} ${count === 1 ? 'reply' : 'replies'}`;
          });
          actions.append(collapse);
        }
        const replyButton = document.createElement('button');
        replyButton.type = 'button';
        replyButton.className = 'reply-toggle';
        replyButton.textContent = 'Reply to this note';
        const { replyForm, open, close } = makeReplyForm(note);
        replyButton.addEventListener('click', () => {
          if (replyForm.hidden) { open(); replyButton.textContent = 'Cancel reply'; }
          else { close(); replyButton.textContent = 'Reply to this note'; }
        });
        actions.append(replyButton);
        article.append(actions, thread, replyForm);
        list.append(article);
      }
      status.textContent = `${data.comments.length} ${data.comments.length === 1 ? 'note' : 'notes'}`;
      if (location.hash.startsWith('#reader-note-')) {
        document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
      }
    } catch {
      status.textContent = 'Notes could not be loaded right now.';
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = widgetId !== null ? window.turnstile.getResponse(widgetId) : '';
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
          notify: notify.checked,
          email: notify.checked ? email.value.trim() : '',
          token
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send your note.');
      form.reset();
      emailField.hidden = true;
      email.required = false;
      if (widgetId !== null) window.turnstile.reset(widgetId);
      formStatus.textContent = result.message || 'Your note was received and is waiting for approval.';
    } catch (error) {
      formStatus.textContent = error.message || 'Could not send your note. Please try again.';
      if (widgetId !== null) window.turnstile.reset(widgetId);
    } finally {
      button.disabled = false;
    }
  });

  loadNotes();
})();

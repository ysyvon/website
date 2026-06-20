(() => {
  "use strict";

  const config = window.DRAFTROOM_FEEDBACK_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const shareID = params.get("id") || "";
  const state = { share: null, selection: null, pendingSubmit: false };
  const elements = Object.fromEntries([
    "loading", "error", "error-message", "reader", "book-title", "chapter-title", "author-name", "manuscript",
    "comment-count", "comments-empty", "comments-list", "composer", "composer-close", "selected-quote",
    "comment-body", "comment-submit", "comment-error", "nickname-dialog", "nickname", "nickname-error",
    "nickname-cancel", "nickname-save", "website", "comments-toggle"
  ].map(id => [id, document.getElementById(id)]));

  const nicknameKey = `draftroom.feedback.nickname.${shareID}`;
  const sessionKey = "draftroom.feedback.session";

  initialize();

  async function initialize() {
    installPrivacyDeterrents();
    bindEvents();
    if (!/^[A-Za-z0-9_-]{20,30}$/.test(shareID)) return showError("This feedback link is incomplete.");
    if (!/^https:\/\//.test(config.apiBaseURL || "") && !/^http:\/\/localhost/.test(config.apiBaseURL || "")) {
      return showError("The feedback service has not been configured yet.");
    }

    try {
      const response = await fetch(`${config.apiBaseURL}/api/shares/${encodeURIComponent(shareID)}`, {
        headers: { accept: "application/json", "x-reader-session": readerSessionID() },
        referrerPolicy: "no-referrer",
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "This review copy is unavailable.");
      state.share = payload;
      renderShare();
    } catch (error) {
      showError(error.message);
    }
  }

  function bindEvents() {
    elements.manuscript.addEventListener("mouseup", captureSelection);
    elements.manuscript.addEventListener("keyup", captureSelection);
    elements["composer-close"].addEventListener("click", closeComposer);
    elements["comment-submit"].addEventListener("click", beginSubmit);
    elements["nickname-cancel"].addEventListener("click", closeNicknameDialog);
    elements["nickname-save"].addEventListener("click", saveNicknameAndSubmit);
    elements["comments-toggle"].addEventListener("click", toggleComments);
    window.addEventListener("resize", debounce(positionComments, 100));
    elements.nickname.addEventListener("keydown", event => {
      if (event.key === "Enter") saveNicknameAndSubmit();
    });
  }

  function renderShare() {
    document.title = `${state.share.chapterTitle} · Draftroom Feedback`;
    elements["book-title"].textContent = state.share.bookTitle;
    elements["chapter-title"].textContent = state.share.chapterTitle;
    if (state.share.authorName) {
      elements["author-name"].textContent = `by ${state.share.authorName}`;
      elements["author-name"].classList.remove("hidden");
    }
    renderManuscript(state.share.content);
    elements.loading.classList.add("hidden");
    elements.reader.classList.remove("hidden");
    elements["comments-toggle"].classList.remove("hidden");
    renderComments();
  }

  function renderManuscript(content) {
    const fragment = document.createDocumentFragment();
    const pieces = String(content || "").split(/(\r\n|\r|\n)/);
    for (const piece of pieces) {
      if (/^(\r\n|\r|\n)$/.test(piece)) {
        const separator = document.createElement("span");
        separator.className = "manuscript-break";
        separator.setAttribute("aria-hidden", "true");
        separator.textContent = piece;
        fragment.append(separator);
      } else if (piece.length > 0) {
        const paragraph = document.createElement("span");
        paragraph.className = "manuscript-paragraph";
        paragraph.textContent = piece;
        fragment.append(paragraph);
      }
    }
    elements.manuscript.replaceChildren(fragment);
  }

  function captureSelection() {
    if (elements.reader.classList.contains("comments-hidden")) return;
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!elements.manuscript.contains(range.commonAncestorContainer)) return;

      const prefix = range.cloneRange();
      prefix.selectNodeContents(elements.manuscript);
      prefix.setEnd(range.startContainer, range.startOffset);
      const startOffset = prefix.toString().length;
      const quote = range.toString().trim();
      if (!quote || quote.length > 2000) return;
      const rawSelection = range.toString();
      const leadingWhitespace = rawSelection.length - rawSelection.trimStart().length;
      const start = startOffset + leadingWhitespace;
      state.selection = { startOffset: start, endOffset: start + quote.length, quote };
      elements["selected-quote"].textContent = quote;
      elements.composer.classList.remove("hidden");
      elements["comment-body"].focus({ preventScroll: true });
    });
  }

  function closeComposer() {
    elements.composer.classList.add("hidden");
    elements["comment-body"].value = "";
    elements["comment-error"].textContent = "";
    state.selection = null;
    window.getSelection()?.removeAllRanges();
  }

  function beginSubmit() {
    if (!state.selection || !elements["comment-body"].value.trim()) {
      elements["comment-error"].textContent = "Write a comment first.";
      return;
    }
    const nickname = localStorage.getItem(nicknameKey)?.trim();
    if (!nickname) {
      state.pendingSubmit = true;
      elements["nickname-dialog"].classList.remove("hidden");
      elements.nickname.focus();
      return;
    }
    submitComment(nickname);
  }

  function saveNicknameAndSubmit() {
    const nickname = elements.nickname.value.trim().slice(0, 40);
    if (!nickname) {
      elements["nickname-error"].textContent = "Enter a nickname to attach to your comments.";
      return;
    }
    localStorage.setItem(nicknameKey, nickname);
    closeNicknameDialog();
    if (state.pendingSubmit) submitComment(nickname);
  }

  function closeNicknameDialog() {
    state.pendingSubmit = false;
    elements["nickname-dialog"].classList.add("hidden");
    elements["nickname-error"].textContent = "";
  }

  async function submitComment(nickname) {
    const selection = state.selection;
    if (!selection) return;
    state.pendingSubmit = false;
    elements["comment-submit"].disabled = true;
    elements["comment-error"].textContent = "";

    try {
      const response = await fetch(`${config.apiBaseURL}/api/shares/${encodeURIComponent(shareID)}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          nickname,
          body: elements["comment-body"].value.trim(),
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          sessionID: readerSessionID(),
          commentToken: state.share.commentToken,
          website: elements.website.value
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The comment could not be saved.");
      state.share.comments.push(payload.comment);
      closeComposer();
      renderComments();
    } catch (error) {
      elements["comment-error"].textContent = error.message;
    } finally {
      elements["comment-submit"].disabled = false;
    }
  }

  function renderComments() {
    const comments = [...(state.share.comments || [])].sort((a, b) =>
      a.startOffset - b.startOffset || a.endOffset - b.endOffset || a.createdAt.localeCompare(b.createdAt)
    );
    elements["comment-count"].textContent = String(comments.length);
    elements["comments-empty"].classList.toggle("hidden", comments.length > 0);
    elements["comments-list"].replaceChildren(...comments.map(commentCard));
    renderHighlights(comments);
    requestAnimationFrame(positionComments);
  }

  function commentCard(comment) {
    const card = document.createElement("article");
    card.className = "comment-card";
    card.dataset.commentId = comment.id;
    card.dataset.startOffset = String(comment.startOffset);
    const meta = document.createElement("div");
    meta.className = "comment-meta";
    const author = document.createElement("span");
    author.className = "comment-author";
    author.textContent = comment.nickname;
    const time = document.createElement("time");
    time.dateTime = comment.createdAt;
    time.textContent = new Date(comment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const metaActions = document.createElement("div");
    metaActions.className = "comment-meta-actions";
    metaActions.append(time);
    if (comment.canDelete) {
      const remove = document.createElement("button");
      remove.className = "delete-comment";
      remove.type = "button";
      remove.textContent = "Delete";
      remove.setAttribute("aria-label", `Delete comment by ${comment.nickname}`);
      remove.addEventListener("click", event => {
        event.stopPropagation();
        deleteComment(comment);
      });
      metaActions.append(remove);
    }
    meta.append(author, metaActions);
    const quote = document.createElement("blockquote");
    quote.className = "comment-quote";
    quote.textContent = `“${shorten(comment.quote, 180)}”`;
    const body = document.createElement("p");
    body.className = "comment-body";
    body.textContent = comment.body;
    card.append(meta, quote, body);
    card.addEventListener("click", () => focusComment(comment));
    return card;
  }

  async function deleteComment(comment) {
    if (!comment.canDelete || !window.confirm("Delete this comment? This cannot be undone.")) return;
    try {
      const response = await fetch(
        `${config.apiBaseURL}/api/shares/${encodeURIComponent(shareID)}/comments/${encodeURIComponent(comment.id)}`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json", accept: "application/json" },
          referrerPolicy: "no-referrer",
          body: JSON.stringify({
            sessionID: readerSessionID(),
            commentToken: state.share.commentToken
          })
        }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The comment could not be deleted.");
      state.share.comments = state.share.comments.filter(item => item.id !== comment.id);
      renderComments();
    } catch (error) {
      window.alert(error.message);
    }
  }

  function renderHighlights(comments) {
    if (!window.CSS?.highlights || !elements.manuscript.firstChild) return;
    if (elements.reader.classList.contains("comments-hidden")) {
      CSS.highlights.delete("reader-comment");
      return;
    }
    const ranges = comments.flatMap(comment => {
      const range = rangeForOffsets(comment.startOffset, comment.endOffset);
      return range ? [range] : [];
    });
    CSS.highlights.set("reader-comment", new Highlight(...ranges));
  }

  function focusComment(comment) {
    if (elements.reader.classList.contains("comments-hidden")) return;
    const range = rangeForOffsets(comment.startOffset, comment.endOffset);
    if (!range) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const anchor = range.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + anchor.top - (window.innerHeight * 0.4),
      behavior: "smooth"
    });
    document.querySelectorAll(".comment-card.active").forEach(card => card.classList.remove("active"));
    document.querySelector(`[data-comment-id="${CSS.escape(comment.id)}"]`)?.classList.add("active");
  }

  function positionComments() {
    if (!state.share || elements.reader.classList.contains("comments-hidden")) return;
    const cards = [...elements["comments-list"].querySelectorAll(".comment-card")];
    const isNarrow = window.matchMedia("(max-width: 860px)").matches;
    if (isNarrow) {
      cards.forEach(card => { card.style.top = ""; });
      return;
    }

    const readerTop = elements.reader.getBoundingClientRect().top;
    let nextAvailableTop = 82;
    for (const card of cards) {
      const start = Number(card.dataset.startOffset);
      const range = rangeForOffsets(start, Math.min(start + 1, state.share.content.length));
      const anchorTop = range ? range.getBoundingClientRect().top - readerTop : nextAvailableTop;
      const top = Math.max(anchorTop - 12, nextAvailableTop);
      card.style.top = `${Math.round(top)}px`;
      nextAvailableTop = top + card.offsetHeight + 14;
    }
    elements["comments-list"].style.minHeight = `${Math.ceil(nextAvailableTop)}px`;
  }

  function toggleComments() {
    const hidden = elements.reader.classList.toggle("comments-hidden");
    elements["comments-toggle"].textContent = hidden ? "Show comments" : "Hide comments";
    elements["comments-toggle"].setAttribute("aria-pressed", String(hidden));
    if (hidden) {
      closeComposer();
      if (window.CSS?.highlights) CSS.highlights.delete("reader-comment");
    } else {
      renderComments();
    }
  }

  function rangeForOffsets(start, end) {
    if (start < 0 || end > state.share.content.length || end <= start) return null;
    const startPosition = textPositionAt(start);
    const endPosition = textPositionAt(end);
    if (!startPosition || !endPosition) return null;
    const range = document.createRange();
    range.setStart(startPosition.node, startPosition.offset);
    range.setEnd(endPosition.node, endPosition.offset);
    return range;
  }

  function textPositionAt(targetOffset) {
    const walker = document.createTreeWalker(elements.manuscript, NodeFilter.SHOW_TEXT);
    let traversed = 0;
    let node;
    while ((node = walker.nextNode())) {
      const next = traversed + node.length;
      if (targetOffset <= next) return { node, offset: targetOffset - traversed };
      traversed = next;
    }
    return null;
  }

  function readerSessionID() {
    let value = localStorage.getItem(sessionKey);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(sessionKey, value);
    }
    return value;
  }

  function installPrivacyDeterrents() {
    document.addEventListener("contextmenu", event => event.preventDefault());
    document.addEventListener("copy", event => {
      if (elements.manuscript.contains(event.target)) event.preventDefault();
    });
    document.addEventListener("cut", event => event.preventDefault());
    document.addEventListener("dragstart", event => event.preventDefault());
    document.addEventListener("keydown", event => {
      if ((event.metaKey || event.ctrlKey) && ["c", "p", "s", "u"].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    });
  }

  function showError(message) {
    elements.loading.classList.add("hidden");
    elements.error.classList.remove("hidden");
    elements["error-message"].textContent = message;
  }

  function shorten(value, maximum) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
  }

  function debounce(callback, delay) {
    let timeout;
    return (...arguments_) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => callback(...arguments_), delay);
    };
  }
})();

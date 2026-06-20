import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

test("publishes encrypted chapter and accepts anonymous-reader comment", async () => {
  const env = testEnvironment();
  const publish = await call(env, "/api/admin/shares", {
    method: "POST",
    admin: true,
    body: { bookTitle: "Test Book", authorName: "Test Author", chapterTitle: "Prologue", content: "The first line.\n\nThe second line." }
  });
  assert.equal(publish.response.status, 201);
  assert.match(publish.value.id, /^[A-Za-z0-9_-]{20,30}$/);
  assert.equal(env.DB.shares.get(publish.value.id).content_ciphertext.includes("The first line"), false);

  const reader = await call(env, `/api/shares/${publish.value.id}`);
  assert.equal(reader.response.status, 200);
  assert.equal(reader.value.content, "The first line.\n\nThe second line.");
  assert.equal(reader.value.authorName, "Test Author");
  assert.equal(reader.value.comments.length, 0);

  const comment = await call(env, `/api/shares/${publish.value.id}/comments`, {
    method: "POST",
    body: {
      nickname: "Night Reader",
      body: "This opening lands well.",
      startOffset: 0,
      endOffset: 14,
      sessionID: "anonymous-browser-session",
      commentToken: reader.value.commentToken,
      website: ""
    }
  });
  assert.equal(comment.response.status, 201);
  assert.equal(comment.value.comment.quote, "The first line");
  assert.equal(comment.value.comment.canDelete, true);

  const ownedReader = await call(env, `/api/shares/${publish.value.id}`, {
    readerSession: "anonymous-browser-session"
  });
  assert.equal(ownedReader.value.comments[0].canDelete, true);

  const otherReader = await call(env, `/api/shares/${publish.value.id}`, {
    readerSession: "different-browser-session"
  });
  assert.equal(otherReader.value.comments[0].canDelete, false);

  const status = await call(env, `/api/admin/shares/${publish.value.id}/comments`, { admin: true });
  assert.equal(status.value.comments.length, 1);
  assert.equal(status.value.comments[0].nickname, "Night Reader");
  assert.equal("ip" in status.value.comments[0], false);

  const deniedDelete = await call(env, `/api/shares/${publish.value.id}/comments/${comment.value.comment.id}`, {
    method: "DELETE",
    body: {
      sessionID: "different-browser-session",
      commentToken: reader.value.commentToken
    }
  });
  assert.equal(deniedDelete.response.status, 403);

  const deleted = await call(env, `/api/shares/${publish.value.id}/comments/${comment.value.comment.id}`, {
    method: "DELETE",
    body: {
      sessionID: "anonymous-browser-session",
      commentToken: reader.value.commentToken
    }
  });
  assert.equal(deleted.response.status, 200);

  await call(env, `/api/admin/shares/${publish.value.id}`, {
    method: "PATCH", admin: true, body: { isOpen: false }
  });
  const closed = await call(env, `/api/shares/${publish.value.id}`);
  assert.equal(closed.response.status, 404);
});

async function call(env, path, options = {}) {
  const headers = new Headers({ origin: "https://ysyvon.github.io" });
  if (options.admin) headers.set("authorization", `Bearer ${env.DRAFTROOM_API_TOKEN}`);
  if (options.readerSession) headers.set("x-reader-session", options.readerSession);
  if (options.body) headers.set("content-type", "application/json");
  const request = new Request(`https://feedback.test${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const response = await worker.fetch(request, env);
  return { response, value: await response.json() };
}

function testEnvironment() {
  return {
    DB: new MemoryD1(),
    DRAFTROOM_API_TOKEN: "owner-token-kept-out-of-github",
    CONTENT_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    COMMENT_SIGNING_KEY: "different-comment-signing-secret",
    READER_BASE_URL: "https://ysyvon.github.io/website/feedback/",
    ALLOWED_ORIGINS: "https://ysyvon.github.io"
  };
}

class MemoryD1 {
  shares = new Map();
  comments = new Map();

  prepare(sql) {
    const database = this;
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      async run() {
        const values = this.values;
        if (sql.includes("INSERT INTO shares")) {
          const [id, book_title, author_name, chapter_title, content_ciphertext, content_iv, created_at, expires_at] = values;
          database.shares.set(id, { id, book_title, author_name, chapter_title, content_ciphertext, content_iv, created_at, expires_at, is_open: 1 });
        } else if (sql.includes("INSERT INTO comments")) {
          const [id, share_id, nickname, body, start_offset, end_offset, quote, session_hash, created_at] = values;
          database.comments.set(id, { id, share_id, nickname, body, start_offset, end_offset, quote, session_hash, created_at, resolved: 0 });
        } else if (sql.startsWith("UPDATE shares")) {
          const [is_open, id] = values;
          database.shares.get(id).is_open = is_open;
        } else if (sql.startsWith("UPDATE comments")) {
          const [resolved, id] = values;
          database.comments.get(id).resolved = resolved;
        } else if (sql.startsWith("DELETE FROM comments WHERE id")) {
          database.comments.delete(values[0]);
        } else if (sql.startsWith("DELETE FROM comments")) {
          for (const [id, item] of database.comments) if (item.share_id === values[0]) database.comments.delete(id);
        } else if (sql.startsWith("DELETE FROM shares")) {
          database.shares.delete(values[0]);
        }
        return { success: true };
      },
      async first() {
        const values = this.values;
        if (sql.includes("FROM shares")) return database.shares.get(values[0]) || null;
        if (sql.includes("SELECT id FROM comments")) {
          const [id, shareID, sessionHash] = values;
          const item = database.comments.get(id);
          return item && item.share_id === shareID && item.session_hash === sessionHash ? { id } : null;
        }
        if (sql.includes("COUNT(*)")) {
          const count = [...database.comments.values()].filter(item => item.session_hash === values[0] && item.created_at > values[1]).length;
          return { count };
        }
        return null;
      },
      async all() {
        const shareID = this.values[0];
        const includeResolved = !sql.includes("resolved = 0");
        const results = [...database.comments.values()]
          .filter(item => item.share_id === shareID && (includeResolved || !item.resolved))
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        return { results };
      }
    };
  }
}

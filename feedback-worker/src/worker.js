const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default {
  async fetch(request, env) {
    try {
      if (request.method === "OPTIONS") return corsPreflight(request, env);

      const url = new URL(request.url);
      const parts = url.pathname.split("/").filter(Boolean);
      let response;

      if (parts[0] !== "api") return json({ error: "Not found" }, 404);

      if (parts[1] === "admin") {
        if (!(await isAuthorized(request, env.DRAFTROOM_API_TOKEN))) {
          return withSecurity(json({ error: "Unauthorized" }, 401), request, env);
        }
        response = await handleAdmin(request, env, parts.slice(2));
      } else if (parts[1] === "shares") {
        response = await handleReader(request, env, parts.slice(2));
      } else {
        response = json({ error: "Not found" }, 404);
      }

      return withSecurity(response, request, env);
    } catch (error) {
      // Intentionally do not log request details, chapter content, nicknames, or IPs.
      return withSecurity(json({ error: "The feedback service could not complete that request." }, 500), request, env);
    }
  }
};

async function handleAdmin(request, env, parts) {
  if (request.method === "POST" && parts[0] === "shares" && parts.length === 1) {
    const body = await readJSON(request);
    const bookTitle = cleanText(body.bookTitle, 200);
    const authorName = cleanText(body.authorName, 200) || null;
    const chapterTitle = cleanText(body.chapterTitle, 200);
    const content = typeof body.content === "string" ? body.content : "";
    const formatting = cleanFormatting(body.formatting, content.length);
    if (!bookTitle || !chapterTitle || !content.trim() || content.length > 500_000) {
      return json({ error: "A book title, chapter title, and chapter text are required." }, 400);
    }

    const id = randomID(18);
    const encrypted = await encryptText(JSON.stringify({ version: 2, content, formatting }), env.CONTENT_ENCRYPTION_KEY);
    const now = new Date().toISOString();
    const expiresAt = validFutureDate(body.expiresAt);
    await env.DB.prepare(
      `INSERT INTO shares
       (id, book_title, author_name, chapter_title, content_ciphertext, content_iv, created_at, expires_at, is_open)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(id, bookTitle, authorName, chapterTitle, encrypted.ciphertext, encrypted.iv, now, expiresAt).run();

    return json({
      id,
      url: `${env.READER_BASE_URL}?id=${encodeURIComponent(id)}`,
      createdAt: now,
      expiresAt
    }, 201);
  }

  if (parts[0] === "shares" && parts[1]) {
    const shareID = parts[1];
    if (request.method === "GET" && parts[2] === "comments") {
      const share = await getShare(env.DB, shareID);
      if (!share) return json({ error: "Share not found" }, 404);
      const comments = await getComments(env.DB, shareID, true);
      return json({ share: adminShare(share), comments });
    }

    if (request.method === "PATCH" && parts.length === 2) {
      const body = await readJSON(request);
      if (typeof body.isOpen !== "boolean") return json({ error: "isOpen is required" }, 400);
      await env.DB.prepare("UPDATE shares SET is_open = ? WHERE id = ?")
        .bind(body.isOpen ? 1 : 0, shareID).run();
      return json({ ok: true, isOpen: body.isOpen });
    }

    if (request.method === "DELETE" && parts.length === 2) {
      await env.DB.prepare("DELETE FROM comments WHERE share_id = ?").bind(shareID).run();
      await env.DB.prepare("DELETE FROM shares WHERE id = ?").bind(shareID).run();
      return json({ ok: true });
    }
  }

  if (request.method === "PATCH" && parts[0] === "comments" && parts[1]) {
    const body = await readJSON(request);
    if (typeof body.resolved !== "boolean") return json({ error: "resolved is required" }, 400);
    await env.DB.prepare("UPDATE comments SET resolved = ? WHERE id = ?")
      .bind(body.resolved ? 1 : 0, parts[1]).run();
    return json({ ok: true, resolved: body.resolved });
  }

  return json({ error: "Not found" }, 404);
}

async function handleReader(request, env, parts) {
  const shareID = parts[0];
  if (!shareID || !/^[A-Za-z0-9_-]{20,30}$/.test(shareID)) return json({ error: "Not found" }, 404);

  const share = await getShare(env.DB, shareID);
  if (!share || !shareAvailable(share)) return json({ error: "This feedback link is unavailable." }, 404);

  if (request.method === "GET" && parts.length === 1) {
    const stored = storedContent(await decryptText(share.content_ciphertext, share.content_iv, env.CONTENT_ENCRYPTION_KEY));
    const content = stored.content;
    const readerSessionID = cleanText(request.headers.get("x-reader-session"), 100);
    const readerSessionHash = readerSessionID ? await sha256Base64URL(readerSessionID) : null;
    const comments = await getComments(env.DB, shareID, false, readerSessionHash);
    return json({
      id: share.id,
      bookTitle: share.book_title,
      authorName: share.author_name,
      chapterTitle: share.chapter_title,
      content,
      formatting: stored.formatting,
      createdAt: share.created_at,
      expiresAt: share.expires_at,
      commentToken: await createCommentToken(shareID, env.COMMENT_SIGNING_KEY),
      comments
    });
  }

  if (request.method === "DELETE" && parts[1] === "comments" && parts[2]) {
    const body = await readJSON(request);
    if (!(await verifyCommentToken(body.commentToken, shareID, env.COMMENT_SIGNING_KEY))) {
      return json({ error: "The comment session expired. Refresh and try again." }, 403);
    }
    const sessionID = cleanText(body.sessionID, 100);
    if (!sessionID) return json({ error: "This browser cannot verify ownership of that comment." }, 403);
    const sessionHash = await sha256Base64URL(sessionID);
    const comment = await env.DB.prepare(
      "SELECT id FROM comments WHERE id = ? AND share_id = ? AND session_hash = ?"
    ).bind(parts[2], shareID, sessionHash).first();
    if (!comment) return json({ error: "Only the person who posted this comment can delete it." }, 403);
    await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(parts[2]).run();
    return json({ ok: true });
  }

  if (request.method === "POST" && parts[1] === "comments") {
    const body = await readJSON(request);
    if (body.website) return json({ ok: true }, 201); // Honeypot.
    if (!(await verifyCommentToken(body.commentToken, shareID, env.COMMENT_SIGNING_KEY))) {
      return json({ error: "The comment session expired. Refresh and try again." }, 403);
    }

    const nickname = cleanText(body.nickname, 40);
    const commentBody = cleanText(body.body, 2_000);
    const sessionID = cleanText(body.sessionID, 100);
    const start = Number(body.startOffset);
    const end = Number(body.endOffset);
    if (!nickname || !commentBody || !sessionID || !Number.isInteger(start) || !Number.isInteger(end)) {
      return json({ error: "Nickname, comment, and selected text are required." }, 400);
    }

    const { content } = storedContent(await decryptText(share.content_ciphertext, share.content_iv, env.CONTENT_ENCRYPTION_KEY));
    if (start < 0 || end <= start || end > content.length || end - start > 2_000) {
      return json({ error: "Select a shorter passage and try again." }, 400);
    }
    const quote = content.slice(start, end);
    const sessionHash = await sha256Base64URL(sessionID);
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM comments WHERE session_hash = ? AND created_at > ?"
    ).bind(sessionHash, new Date(Date.now() - 60_000).toISOString()).first();
    if (Number(recent?.count || 0) >= 5) {
      return json({ error: "Please wait a minute before adding more comments." }, 429);
    }

    const id = randomID(12);
    const createdAt = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO comments
       (id, share_id, nickname, body, start_offset, end_offset, quote, session_hash, created_at, resolved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(id, shareID, nickname, commentBody, start, end, quote, sessionHash, createdAt).run();

    return json({
      comment: { id, nickname, body: commentBody, startOffset: start, endOffset: end, quote, createdAt, canDelete: true }
    }, 201);
  }

  return json({ error: "Not found" }, 404);
}

async function getShare(db, id) {
  return db.prepare("SELECT * FROM shares WHERE id = ?").bind(id).first();
}

async function getComments(db, shareID, includeResolved, readerSessionHash = null) {
  const query = includeResolved
    ? "SELECT * FROM comments WHERE share_id = ? ORDER BY created_at ASC"
    : "SELECT * FROM comments WHERE share_id = ? AND resolved = 0 ORDER BY created_at ASC";
  const result = await db.prepare(query).bind(shareID).all();
  return (result.results || []).map(row => ({
    id: row.id,
    nickname: row.nickname,
    body: row.body,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    quote: row.quote,
    createdAt: row.created_at,
    resolved: Boolean(row.resolved),
    canDelete: Boolean(readerSessionHash && row.session_hash === readerSessionHash)
  }));
}

function adminShare(share) {
  return {
    id: share.id,
    bookTitle: share.book_title,
    authorName: share.author_name,
    chapterTitle: share.chapter_title,
    createdAt: share.created_at,
    expiresAt: share.expires_at,
    isOpen: Boolean(share.is_open)
  };
}

function shareAvailable(share) {
  return Boolean(share.is_open) && (!share.expires_at || new Date(share.expires_at) > new Date());
}

function validFutureDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date > new Date() ? date.toISOString() : null;
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanFormatting(value, contentLength) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10_000).flatMap(run => {
    const startOffset = Number(run?.startOffset);
    const endOffset = Number(run?.endOffset);
    const bold = run?.bold === true;
    const italic = run?.italic === true;
    if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset)
      || startOffset < 0 || endOffset <= startOffset || endOffset > contentLength
      || (!bold && !italic)) return [];
    return [{ startOffset, endOffset, bold, italic }];
  });
}

function storedContent(value) {
  try {
    const envelope = JSON.parse(value);
    if (envelope?.version === 2 && typeof envelope.content === "string") {
      return {
        content: envelope.content,
        formatting: cleanFormatting(envelope.formatting, envelope.content.length)
      };
    }
  } catch {
    // Shares created before formatted text support contain plain text directly.
  }
  return { content: value, formatting: [] };
}

async function readJSON(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("JSON required");
  return request.json();
}

async function isAuthorized(request, expected) {
  if (!expected) return false;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const [a, b] = await Promise.all([sha256(supplied), sha256(expected)]);
  return constantTimeEqual(a, b);
}

async function encryptText(text, encodedKey) {
  const key = await importEncryptionKey(encodedKey, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) };
}

async function decryptText(ciphertext, iv, encodedKey) {
  const key = await importEncryptionKey(encodedKey, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext)
  );
  return new TextDecoder().decode(plaintext);
}

async function importEncryptionKey(encodedKey, usages) {
  const bytes = base64ToBytes(encodedKey || "");
  if (bytes.length !== 32) throw new Error("CONTENT_ENCRYPTION_KEY must contain 32 bytes");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, usages);
}

async function createCommentToken(shareID, secret) {
  const expires = Math.floor(Date.now() / 1000) + 86_400;
  const payload = `${shareID}.${expires}`;
  return `${expires}.${await hmac(payload, secret)}`;
}

async function verifyCommentToken(token, shareID, secret) {
  const [expiresText, signature] = String(token || "").split(".");
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || expires < Date.now() / 1000 || !signature) return false;
  const expected = await hmac(`${shareID}.${expires}`, secret);
  return constantTimeEqual(new TextEncoder().encode(signature), new TextEncoder().encode(expected));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return bytesToBase64URL(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function sha256Base64URL(value) {
  return bytesToBase64URL(await sha256(value));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function randomID(byteCount) {
  return bytesToBase64URL(crypto.getRandomValues(new Uint8Array(byteCount)));
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function bytesToBase64URL(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin");
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(item => item.trim());
  return origin && allowed.includes(origin) ? origin : null;
}

function corsPreflight(request, env) {
  const origin = allowedOrigin(request, env);
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type, authorization, x-reader-session",
      "access-control-max-age": "86400",
      "vary": "Origin"
    }
  });
}

function withSecurity(response, request, env) {
  const headers = new Headers(response.headers);
  const origin = allowedOrigin(request, env);
  if (origin) headers.set("access-control-allow-origin", origin);
  headers.set("vary", "Origin");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), browsing-topics=()");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

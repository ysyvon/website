import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const root = new URL("./", import.meta.url).pathname;
const shareID = "local-review-copy-123456";
const comments = [];
const manuscript = `This is generic sample text for testing inline feedback.

Select any sentence in this paragraph to open the comment composer. The preview contains no writing from a Draftroom project.

Comments should appear beside the passage they reference.`;

createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:8788");
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders());
    return response.end();
  }
  if (url.pathname === `/api/shares/${shareID}`) {
    return sendJSON(response, {
      id: shareID,
      bookTitle: "Sample Novel",
      authorName: "Sample Author",
      chapterTitle: "Sample Chapter",
      content: manuscript,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      commentToken: "local-token",
      comments
    });
  }
  if (request.method === "POST" && url.pathname === `/api/shares/${shareID}/comments`) {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    const comment = {
      id: crypto.randomUUID(),
      nickname: body.nickname,
      body: body.body,
      startOffset: body.startOffset,
      endOffset: body.endOffset,
      quote: manuscript.slice(body.startOffset, body.endOffset),
      createdAt: new Date().toISOString()
    };
    comments.push(comment);
    return sendJSON(response, { comment }, 201);
  }

  const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  if (requested.includes("..")) return sendJSON(response, { error: "Not found" }, 404);
  try {
    let body = await readFile(join(root, requested));
    if (requested === "config.js") {
      body = Buffer.from('window.DRAFTROOM_FEEDBACK_CONFIG = Object.freeze({ apiBaseURL: "http://127.0.0.1:8788" });');
    }
    response.writeHead(200, { "content-type": contentType(requested), "cache-control": "no-store" });
    response.end(body);
  } catch {
    sendJSON(response, { error: "Not found" }, 404);
  }
}).listen(8788, "127.0.0.1", () => {
  console.log(`Feedback reader: http://127.0.0.1:8788/?id=${shareID}`);
});

function sendJSON(response, value, status = 200) {
  response.writeHead(status, { "content-type": "application/json", ...corsHeaders() });
  response.end(JSON.stringify(value));
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "http://127.0.0.1:8788",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

function contentType(path) {
  return ({ ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" })[extname(path)] || "application/octet-stream";
}

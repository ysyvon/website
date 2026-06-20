CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  book_title TEXT NOT NULL,
  chapter_title TEXT NOT NULL,
  content_ciphertext TEXT NOT NULL,
  content_iv TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  is_open INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  quote TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS comments_share_created
ON comments(share_id, created_at);

CREATE INDEX IF NOT EXISTS comments_session_created
ON comments(session_hash, created_at);

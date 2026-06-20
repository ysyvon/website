# Draftroom Feedback Worker

This Cloudflare Worker is the private API for Draftroom's unlisted feedback links.
The public GitHub repository contains code and database structure only. Manuscript
snapshots, comments, nicknames, and secret values are never committed.

## Privacy properties

- Chapter snapshots are encrypted with AES-256-GCM before being written to D1.
- The application does not read or store visitor IP addresses.
- Worker observability and invocation logs are disabled.
- No analytics, advertising, remote fonts, tracking pixels, or third-party scripts.
- Comment rate limits use a one-way hash of a random browser session ID, not an IP.
- Reader links contain a random 144-bit identifier and are marked `noindex`.
- Owner credentials belong in Cloudflare encrypted secrets and the macOS Keychain.

Cloudflare still processes network addresses at the infrastructure layer to deliver
requests. This application does not expose that information to the site owner or readers.

## First deployment

These actions require the site owner's Cloudflare login and intentionally are not
automated from GitHub.

1. Install and authenticate:

   ```sh
   npm install
   npx wrangler login
   ```

2. Create the database:

   ```sh
   npx wrangler d1 create draftroom-feedback
   ```

   Put the returned database ID in `wrangler.jsonc`.

3. Generate three different secrets locally:

   ```sh
   openssl rand -hex 32
   openssl rand -base64 32
   openssl rand -hex 32
   ```

   Use the first value as `DRAFTROOM_API_TOKEN`, the base64 value as
   `CONTENT_ENCRYPTION_KEY`, and the last value as `COMMENT_SIGNING_KEY`.

4. Store them directly in Cloudflare:

   ```sh
   npx wrangler secret put DRAFTROOM_API_TOKEN
   npx wrangler secret put CONTENT_ENCRYPTION_KEY
   npx wrangler secret put COMMENT_SIGNING_KEY
   ```

5. Apply the schema and deploy:

   ```sh
   npm run db:remote
   npm run deploy
   ```

6. Put the resulting `workers.dev` address in `feedback/config.js` and in
   Draftroom Settings → Reader Feedback. Put only the owner API token in Draftroom;
   it is stored in the Mac Keychain.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, replace every placeholder, then run:

```sh
npm run db:local
npm run dev
```

Never commit `.dev.vars` or paste its values into source files.

# Draftroom Feedback Reader

This directory is the static, public reader interface. It contains no manuscripts,
comments, passwords, API credentials, or private configuration. Chapter snapshots
are fetched at runtime from the separate Cloudflare Worker API using an unguessable
share ID.

Before deployment, set `apiBaseURL` in `config.js` to the deployed Worker URL.

For a local interaction preview, run `node dev-server.mjs` and open the URL it prints.

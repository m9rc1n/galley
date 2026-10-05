# Security policy

mreadie renders documents from pull and merge requests, which can come from anyone, and can hold a GitHub access token. Security reports are welcome.

## Reporting a vulnerability

Please use GitHub's private reporting: **Security → Report a vulnerability** on the [repository](https://github.com/m9rc1n/mreadie/security/advisories/new). Don't open a public issue for security problems.

Useful details: the browser and version, the page type, and a minimal document or request that triggers it.

## What matters most

- Script execution from document content (a bypass of the sanitising in `src/ui/render.ts`).
- Anything that sends the GitHub token, page content or browsing information to a site other than the GitHub or GitLab instance in use.
- Permissions broader than the README and store listing describe.

## Supported versions

Only the latest release receives fixes.

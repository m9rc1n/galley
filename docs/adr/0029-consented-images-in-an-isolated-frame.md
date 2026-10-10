---
status: Proposed
date: 2026-10-10
deciders: [m9sh]
rfcs: []
tags: [privacy, rendering]
---

# ADR 0029: Recover consented images in an isolated image-only frame

## Context

GitHub's page image policy can block document badges after the reviewer chooses Load. A shadow root does not isolate image requests from that policy. The existing consent rule remains [ADR 0010](0010-external-images-behind-consent.md).

## Decision

- `src/ui/image.ts` attaches a one-time error fallback to rendered document and comment images. Direct loading remains the first path. In the extension, a blocked HTTP(S) image is replaced by `image-frame.html`, after its source has been released by the existing consent flow. Held images create no frame or request.
- The image frame has an opaque origin, no extension APIs or storage, and a policy that permits only packaged script, inline layout styles and HTTP(S) images. It displays one validated address as an `<img>`, never embeds fetched content as HTML or navigates to it. Credential-bearing URLs and addresses longer than 8,192 characters are refused.
- A transferred message port carries the address and intrinsic dimensions. The reader validates finite positive dimensions up to 10,000 pixels, preserves alt text and links, scales the image to the reading column and restores the original alt text on failure or a 15-second timeout. At most 32 fallback frames are allowed per reader root. The frame closes with its document.
- Both paths suppress referrers. No host permission, API proxy, dependency or stored data is added. The demo keeps ordinary image loading.
- Chrome's shared sandbox policy permits HTTP(S) images for this frame. Every engine frame retains its stricter `default-src 'none'` meta policy, so Mermaid, highlighting, source parsing and configuration parsing still have no network access.

## Consequences

- **Good:** reviewers can see consented coverage and status badges under the platform's image policy without granting third-party API access.
- **Costs:** a blocked image creates a frame, and a genuinely missing image can make one additional image request before showing its original alternative text.
- **Follow-up:** release the rebuilt extension; a Pages preview alone cannot update an installed extension.

## Alternatives considered

- **Fetch arbitrary images in the token worker:** would expand an intentionally narrow API boundary and require additional host permissions.
- **Remove image consent or change the host page's policy:** would weaken an existing privacy or platform boundary.
- **Use a hosted image proxy:** would add a server and disclose image addresses to it.

## Enforcement

- `src/ui/image.test.ts` validates fallback sizing, timeouts, URL caps and the ordinary demo path.
- `src/ui/image-frame.test.ts` rejects active schemes, credentials, oversized addresses and multiple image requests; tests success and error replies.
- `e2e/opening.mjs` runs the shipped extension with a restrictive host image policy, asserts no request before consent, then checks the badge dimensions, link and absent referrer.
- `scripts/build.mjs` assembles the frame for Chrome, Firefox and the demo, and checks that token code cannot reach its bundle.

## References

- [MR #61](https://github.com/m9sh/galley/pull/61).
- [Chrome sandbox pages](https://developer.chrome.com/docs/extensions/reference/manifest/sandbox), [separate sandbox CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy).

# Firefox Add-ons listing

What to enter at [addons.mozilla.org](https://addons.mozilla.org/developers/) for Galley. The Chrome listing in [`LISTING.md`](LISTING.md) is the source for the long description; the name and summary differ, as explained below. The steps that need your account are marked **You**.

## What to upload

Every release attaches three files, built by [`release.yml`](../.github/workflows/release.yml) from the tag:

| File | Where it goes |
| --- | --- |
| `galley-firefox-<version>.zip` | The add-on package |
| `galley-source-<version>.zip` | "Source code" (Mozilla asks for it because the add-on is bundled, and its third-party engines are minified) |
| `SHA256SUMS.txt` | Not uploaded; it lets anyone check both zips |

The package carries the add-on id `galley@m9rc1n.github.io` (`browser_specific_settings.gecko.id`). It identifies the add-on to Mozilla for good, so never change it, even if the repository moves.

It declares `data_collection_permissions: none`, which Firefox reads from version 140 on desktop and 142 on Android, so those are the minimum versions. Android has not been tried.

The validator turns two things into errors, and the Firefox build now fails if either is broken, so they cannot reach an upload again:

- **Name:** at most 45 characters. The Firefox package is named `Galley: Understand pull request changes` (39); Chrome uses `Galley: Clearer reviews for GitHub & GitLab`.
- **File size:** a file over 5 MB is not scanned. Mermaid is minified, and its layout engine ships as a second script, `elk.js`, so the largest file is about 3.6 MB.

## First submission

1. **You:** create a free developer account at addons.mozilla.org and turn on two-factor authentication.
2. **Submit a New Add-on** → **On this site** (listed). Upload `galley-firefox-<version>.zip`; the validator runs on upload. It should report no errors. If it warns about `innerHTML`, that is expected and is explained in the reviewer notes below.
3. Leave **Firefox for Android** unticked in the compatibility choice until it has been tried there.
4. Answer **Do you need to submit source code?** with **Yes** and upload `galley-source-<version>.zip`.
5. Fill in the listing:

| Field | Value |
| --- | --- |
| Name | `Galley: Understand pull request changes` |
| Add-on URL | `galley` |
| Summary (250 characters) | `Galley helps teams understand GitHub pull requests and GitLab merge requests with readable documents and code, edits shown in context, and comments beside the text. Free and open source.` |
| Description | The **Description** block in [`LISTING.md`](LISTING.md), pasted as is |
| Categories | Web Development (check the names offered in the form) |
| License | GNU General Public License v3.0 |
| Homepage | `https://m9rc1n.github.io/galley/` |
| Support site | `https://github.com/m9rc1n/galley/issues` |
| Support email | **You** (shown publicly) |
| Privacy policy | `https://github.com/m9rc1n/galley/blob/main/PRIVACY.md` |
| Screenshots | `assets/screenshot-1-read.jpg` to `assets/screenshot-5-comfort.jpg` |

The summary follows the product positioning in the website and `package.json`. The manifest `description` (132 characters at most, shown in Firefox's add-on manager) is shorter: `Understand GitHub and GitLab changes: readable docs and code, edits in context, and comments beside the text.`

6. Paste the reviewer notes below into **Notes to Reviewer**, then **Submit Version**.
7. Review is by a person for a listed add-on, so it can take days. Mozilla emails the result.

## Notes to reviewer

```
Galley is a reader for GitHub pull requests and GitLab merge requests: changed documents render as articles, source files with syntax colours, and review comments sit beside the text. It is open source (GPL-3.0-or-later): https://github.com/m9rc1n/galley

BUILD. The package is bundled with esbuild from TypeScript. Galley's own code is not minified, so content.js, highlight-frame.js, popup.js and background.js can be read as written. Only the bundled third-party diagram engine is minified: Mermaid (diagram-frame.js, about 3.6 MB) and its layout engine elkjs (elk.js, about 1.4 MB), which is a separate file because addons.mozilla.org does not scan a file over 5 MB. elk.js is loaded by a script element, from the same sandboxed frame, the first time a diagram is laid out (src/ui/elk-shim.ts).
The source package contains everything needed:
  Node.js 22.12 or newer (tested on 22 and 24) and npm; the `zip` command for the package step.
  npm ci --ignore-scripts
  npm run build -- --zip
The unpacked add-on is in dist/firefox and the package is dist/galley-firefox-<version>.zip. The build is reproducible: building the source package in a clean directory gives byte-identical files to the submitted package.

THIRD-PARTY CODE. Runtime dependencies (dompurify, markdown-it, markdown-it-footnote, diff, mermaid and highlight.js, plus mermaid's own dependencies such as elkjs) are bundled from npm, unmodified. Their licences are listed in THIRD_PARTY_NOTICES.txt inside the package.

PERMISSIONS.
  host_permissions github.com, gitlab.com: read the pull or merge request being viewed.
  optional_host_permissions (all sites): requested one domain at a time, only when the user enables a self-managed GitLab or GitHub Enterprise server from the toolbar popup.
  storage: settings, viewed progress and the optional GitHub token.
  scripting, activeTab: register the content script on a domain the user enabled.
No code is loaded from the network. No data is sent to any Galley server: there is none.

SANDBOXED FRAMES. Mermaid and highlight.js run inside diagram-frame.html and highlight-frame.html, shown in an iframe with sandbox="allow-scripts" (an opaque origin with no extension APIs) and a meta Content-Security-Policy that blocks all network access. The reader exchanges messages with them and treats every reply as untrusted.

INNERHTML WARNINGS. The validator lists six assignments to innerHTML. None of them takes document content:
  content.js, src/ui/launcher.ts and src/ui/reader.ts: static templates, CSS text and icon constants bundled with the extension. A lint rule in the repository (lint/no-unsanitized-html.grit) fails the build on any other innerHTML assignment, and pull request content goes through DOMPurify (src/ui/render.ts).
  content.js, DOMPurify: the sanitizer's own parser, writing into an inert document.
  highlight-frame.js, highlight.js: highlightElement, library code Galley never calls. Galley calls hljs.highlight(), which returns a string, and rebuilds every line from the text and hljs-* classes.

TO TRY IT. Open any GitHub pull request or GitLab merge request that changes a .md file and press Read. A public example: https://github.com/mermaid-js/mermaid/pull/8144
```

## Each new version

1. Release as usual; the Firefox and source zips are attached to the GitHub release.
2. **You:** on the add-on's page choose **Upload New Version**, upload both zips, and paste the same reviewer notes. A changelog for users goes in **Release notes**.
3. Every version is reviewed. Updates are usually faster than the first one.
4. To automate this later, Mozilla's [`web-ext sign`](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign) uses an API key and secret from the developer hub. Those would be repository secrets, so it is left as a manual step for now.

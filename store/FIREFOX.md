# Firefox Add-ons listing

What to enter at [addons.mozilla.org](https://addons.mozilla.org/developers/) for Galley. The Chrome listing in [`LISTING.md`](LISTING.md) is the source for the copy; this page covers what is different. The steps that need your account are marked **You**.

## What to upload

Every release attaches three files, built by [`release.yml`](../.github/workflows/release.yml) from the tag:

| File | Where it goes |
| --- | --- |
| `galley-firefox-<version>.zip` | The add-on package |
| `galley-source-<version>.zip` | "Source code" (Mozilla asks for it because the add-on is bundled and minified) |
| `SHA256SUMS.txt` | Not uploaded; it lets anyone check both zips |

The package carries the add-on id `galley@m9rc1n.github.io` (`browser_specific_settings.gecko.id`). It identifies the add-on to Mozilla for good, so never change it, even if the repository moves. It also declares `data_collection_permissions: none`, and needs Firefox 128 or newer.

## First submission

1. **You:** create a free developer account at addons.mozilla.org and turn on two-factor authentication.
2. **Submit a New Add-on** → **On this site** (listed). Upload `galley-firefox-<version>.zip`; the validator runs on upload.
3. Answer **Do you need to submit source code?** with **Yes** and upload `galley-source-<version>.zip`.
4. Fill in the listing:

| Field | Value |
| --- | --- |
| Name | `Galley: Markdown reader for pull & merge requests` |
| Add-on URL | `galley` |
| Summary (250 characters) | `Read markdown changes in GitHub pull requests and GitLab merge requests as typeset articles, with every edit marked in the text.` |
| Description | The **Description** block in [`LISTING.md`](LISTING.md), pasted as is |
| Categories | Web Development (check the names offered in the form) |
| License | MIT License |
| Homepage | `https://m9rc1n.github.io/galley/` |
| Support site | `https://github.com/m9rc1n/galley/issues` |
| Support email | **You** (shown publicly) |
| Privacy policy | `https://github.com/m9rc1n/galley/blob/main/PRIVACY.md` |
| Screenshots | `assets/screenshot-1-changes.jpg` to `assets/screenshot-5-sepia-settings.jpg` |

5. Paste the reviewer notes below into **Notes to Reviewer**, then **Submit Version**.
6. Review is by a person for a listed add-on, so it can take days. Mozilla emails the result.

## Notes to reviewer

```
Galley is a reader for markdown changes in GitHub pull requests and GitLab merge requests. It is open source (MIT): https://github.com/m9rc1n/galley

BUILD. The package is bundled and minified with esbuild from TypeScript. The source package contains everything needed:
  Node.js 22.12 or newer (tested on 22 and 24) and npm; the `zip` command for the package step.
  npm ci --ignore-scripts
  npm run build -- --zip
The unpacked add-on is in dist/firefox and the package is dist/galley-firefox-<version>.zip. The build is reproducible: building the source package in a clean directory gives byte-identical files to the submitted package.

THIRD-PARTY CODE. Runtime dependencies (dompurify, markdown-it, markdown-it-footnote, diff, mermaid and highlight.js) are bundled from npm, unmodified. Their licences are listed in THIRD_PARTY_NOTICES.txt inside the package. Mermaid (diagram-frame.js, about 10 MB) and highlight.js (highlight-frame.js) are the large files.

PERMISSIONS.
  host_permissions github.com, gitlab.com: read the pull or merge request being viewed.
  optional_host_permissions (all sites): requested one domain at a time, only when the user enables a self-managed GitLab or GitHub Enterprise server from the toolbar popup.
  storage: settings, viewed progress and the optional GitHub token.
  scripting, activeTab: register the content script on a domain the user enabled.
No code is loaded from the network. No data is sent to any Galley server: there is none.

SANDBOXED FRAMES. Mermaid and highlight.js run inside diagram-frame.html and highlight-frame.html, shown in an iframe with sandbox="allow-scripts" (an opaque origin with no extension APIs) and a meta Content-Security-Policy that blocks all network access. The reader exchanges messages with them and treats every reply as untrusted.

TO TRY IT. Open any GitHub pull request or GitLab merge request that changes a .md file and press Read. A public example: https://github.com/mermaid-js/mermaid/pull/8144
```

## Each new version

1. Release as usual; the Firefox and source zips are attached to the GitHub release.
2. **You:** on the add-on's page choose **Upload New Version**, upload both zips, and paste the same reviewer notes. A changelog for users goes in **Release notes**.
3. Every version is reviewed. Updates are usually faster than the first one.
4. To automate this later, Mozilla's [`web-ext sign`](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign) uses an API key and secret from the developer hub. Those would be repository secrets, so it is left as a manual step for now.

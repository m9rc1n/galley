# Changelog

## [0.4.1](https://github.com/m9rc1n/galley/compare/v0.4.0...v0.4.1) (2026-10-07)


### Bug Fixes

* pass the addons.mozilla.org validator ([6006569](https://github.com/m9rc1n/galley/commit/6006569f32874385ae817d33e320697a6bbc284f))
* pass the addons.mozilla.org validator ([cbcf9dc](https://github.com/m9rc1n/galley/commit/cbcf9dccf230c0788609ad877e2533f35f827904))

## [0.4.0](https://github.com/m9rc1n/galley/compare/v0.3.1...v0.4.0) (2026-10-07)


### Features

* **reader:** typography matches the website: Newsreader for prose and DM Sans for controls, bundled in the extension, with no font requests and no extra permissions
* **reader:** four reading palettes, Paper, Sage, Sepia and Slate, each with a light and a dark version; the palette and System, Light or Dark are chosen separately, and earlier saved choices are kept
* **reader:** insertions are sage and deletions rose, with a small gap between adjacent old and new wording in Changes mode


### Bug Fixes

* **security:** Mermaid and highlight.js run in sandboxed frames with no access to the page, your session, extension APIs, storage or the network; a frame that stops answering is discarded
* **security:** the file path and quote Galley adds to a comment are posted as code, so a document can no longer add @mentions, issue references, links or images to your comment; quotes are capped at 1,000 characters
* **security:** encoded `..` segments can no longer climb out of the repository, document ids and names get the `user-content-` prefix, thread and "View on" links stay on the review site's own origin, and thread comments render at most 65,536 characters
* a token saved in the popup now reaches reviews that are already open, without a reload

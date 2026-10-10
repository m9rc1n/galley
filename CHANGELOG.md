# Changelog

## [0.9.0](https://github.com/m9rc1n/galley/compare/v0.8.0...v0.9.0) (2026-10-10)


### Features

* **reader:** add optional calming glow and refine file controls ([a3ea965](https://github.com/m9rc1n/galley/commit/a3ea965414d4d0bc18fac759b79857e0d7502650))
* **reader:** read large reviews in a calmer order, fold any file, and pick up where you left off ([088fc79](https://github.com/m9rc1n/galley/commit/088fc793afebd75482c36f3af8d061b28380fd8e))
* **reader:** read large reviews in a calmer order, fold any file, and pick up where you left off ([3b3f9d7](https://github.com/m9rc1n/galley/commit/3b3f9d7024319c51aa89226968f40f056b54585d))


### Bug Fixes

* **reader:** keep code clear of file navigation ([4fcc0fe](https://github.com/m9rc1n/galley/commit/4fcc0fe8e26b870a036f2e2bb6b5c1b0171f94de))
* **reader:** stabilize resume coverage and spread the top glow ([36b20b3](https://github.com/m9rc1n/galley/commit/36b20b3dc4120bcd6bf2047ec71b75393427ce5c))

## [0.8.0](https://github.com/m9rc1n/galley/compare/v0.7.0...v0.8.0) (2026-10-10)


### Features

* **reader:** comment from the comments column, and make +/− signs optional ([cd03347](https://github.com/m9rc1n/galley/commit/cd03347d8b1f6eea241cf760353aabe31ea9fa18))
* **reader:** make large reviews comfortable to read ([7f6338c](https://github.com/m9rc1n/galley/commit/7f6338cab7b895f0c0ba25c83fe9720e42f4e8b7))
* **reader:** make large reviews comfortable to read ([c33a240](https://github.com/m9rc1n/galley/commit/c33a240e69f958190f40a95f2e0443471d6e9c42))


### Bug Fixes

* **reader:** offer a comment anywhere in the comments column ([3318d3d](https://github.com/m9rc1n/galley/commit/3318d3dbde2b9cdb9546344be1b3b95d7c9d2568))

## [0.7.0](https://github.com/m9rc1n/galley/compare/v0.6.1...v0.7.0) (2026-10-09)


### Features

* **reader:** centre the text on wide screens ([45cb7d9](https://github.com/m9rc1n/galley/commit/45cb7d987661a46c9b47874b4d3885e941d7db69))
* **reader:** centre the text on wide screens ([7896a54](https://github.com/m9rc1n/galley/commit/7896a54c186a948a96439536eca6b99d79ef8650))


### Bug Fixes

* **github:** retry file loads that fail for a moment ([985f4ea](https://github.com/m9rc1n/galley/commit/985f4ea8ea381b2c2efb2918028cf6c19e2d8752))

## [0.6.1](https://github.com/m9rc1n/galley/compare/v0.6.0...v0.6.1) (2026-10-09)


### Bug Fixes

* **reader:** preserve touch targets and enforce 95% coverage ([833bad3](https://github.com/m9rc1n/galley/commit/833bad34c2b55999c7eedbddc67bb329647a34fa))
* **reader:** preserve touch targets and enforce 95% coverage ([4f6c319](https://github.com/m9rc1n/galley/commit/4f6c3193b0e0d383a40c36a44a4c58ca80ae0097))
* **reader:** retain touch comment targets through layout updates ([7049c32](https://github.com/m9rc1n/galley/commit/7049c3205ad705c8722dcb288581962546fb696b))

## [0.6.0](https://github.com/m9rc1n/galley/compare/v0.5.1...v0.6.0) (2026-10-09)


### Features

* **reader:** layouts, reading palettes, 120-character code and review shortcuts ([b3a0262](https://github.com/m9rc1n/galley/commit/b3a02623480789f8291e474b07380cbfc5ebfaa8))
* **reader:** layouts, reading palettes, 120-character code and review shortcuts ([0d0d334](https://github.com/m9rc1n/galley/commit/0d0d3346520e3cd175aa1af13c6182c96eca83ab))

## [0.5.1](https://github.com/m9rc1n/galley/compare/v0.5.0...v0.5.1) (2026-10-08)


### Bug Fixes

* **reader:** re-tint change colors per light theme and drop the code-file border ([60f2890](https://github.com/m9rc1n/galley/commit/60f2890f581111b71d7a4f5b36f72d94628464ef))
* relicense under GPL-3.0-or-later and refresh the reader's change colors ([42ef3f2](https://github.com/m9rc1n/galley/commit/42ef3f254eac9fe94f6a20d5a13d0be99136a563))

## [0.5.0](https://github.com/m9rc1n/galley/compare/v0.4.1...v0.5.0) (2026-10-08)


### Features

* comment beside the text, reply to any comment, and read in roomier columns ([87ae28b](https://github.com/m9rc1n/galley/commit/87ae28b445eccafc2e1ad730288b7343878efdc2))
* comment beside the text, reply to any comment, and read in roomier columns ([3251a8a](https://github.com/m9rc1n/galley/commit/3251a8a1e7afe7cb678ab7038d9d56e58feffdcc))

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

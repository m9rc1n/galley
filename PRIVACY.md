# Galley privacy policy

_Last updated: 4 October 2026_

Galley is a browser extension that shows the markdown documents changed in GitHub pull requests and GitLab merge requests as readable, typeset articles. It is open-source software published by Marcin Urbanski and contributors ("we"); the source code is at <https://github.com/m9rc1n/galley>.

## In short

- Galley has no server. We do not receive, collect, sell or share your data.
- Everything Galley displays is processed inside your browser.
- Galley itself only contacts the GitHub or GitLab site you are using. Images embedded in documents load from where they are hosted (see [Content from other websites](#content-from-other-websites)).

## What Galley handles, and why

**Pull and merge request content.** On GitHub and GitLab pages, Galley reads the page address to recognise pull and merge requests. When you open the reader, it requests the list of changed files and the contents of the changed markdown files from that same GitHub or GitLab site (on GitHub.com, through GitHub's API at api.github.com), using your existing session there or your GitHub token (see below). The content is rendered on your device, kept in memory only while the page is open, and not sent anywhere else.

**GitHub access token (optional).** If you add a GitHub token so Galley can read private repositories, the token is stored in your browser's extension storage on your device. It is sent only to the GitHub API of the site you saved it for, to authorise Galley's requests. You can remove it in the Galley popup at any time, and it is deleted when you uninstall Galley.

**Preferences.** Your theme, typeface, text size and display mode are stored in your browser's extension storage.

**Sites you enable.** If you enable Galley on a self-hosted GitLab or GitHub Enterprise site, your browser records that permission for that one domain. You can disable it in the Galley popup or in your browser's extension settings.

## What Galley does not do

- No analytics, tracking, advertising or telemetry.
- No selling or transferring of data to third parties, no use of data for advertising, and no use of data to determine creditworthiness.
- No remote code: everything Galley runs is included in the extension package.

## Content from other websites

Documents can embed images hosted on other websites. When Galley displays such a document, your browser loads those images from where they are hosted, and those hosts can see your IP address, as with any web page.

## Your choices

- Remove your GitHub token in the Galley popup.
- Disable Galley on a self-hosted site in the popup.
- Uninstall Galley to delete everything it stored.

## Changes to this policy

If Galley's handling of data changes, we will update this page and the date at the top.

## Contact

Questions about this policy: open an issue at <https://github.com/m9rc1n/galley/issues>.

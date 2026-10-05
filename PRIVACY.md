# mreadie privacy policy

_Last updated: 4 October 2026_

mreadie is a browser extension that shows the markdown documents changed in GitHub pull requests and GitLab merge requests as readable, typeset articles. It is open-source software published by Marcin Urbanski and contributors ("we"); the source code is at <https://github.com/m9rc1n/mreadie>.

## In short

- mreadie has no server. We do not receive, collect, sell or share your data.
- Everything mreadie displays is processed inside your browser.
- mreadie communicates only with the GitHub or GitLab site you are using.

## What mreadie handles, and why

**Pull and merge request content.** On GitHub and GitLab pages, mreadie reads the page address to recognise pull and merge requests. When you open the reader, it requests the list of changed files and the contents of the changed markdown files from that same GitHub or GitLab site, using your existing session there or your GitHub token (see below). The content is rendered on your device, kept in memory only while the page is open, and not sent anywhere else.

**GitHub access token (optional).** If you add a GitHub token so mreadie can read private repositories, the token is stored in your browser's extension storage on your device. It is sent only to the GitHub API of the site you saved it for, to authorise mreadie's requests. You can remove it in the mreadie popup at any time, and it is deleted when you uninstall mreadie.

**Preferences.** Your theme, typeface, text size and display mode are stored in your browser's extension storage.

**Sites you enable.** If you enable mreadie on a self-hosted GitLab or GitHub Enterprise site, your browser records that permission for that one domain. You can disable it in the mreadie popup or in your browser's extension settings.

## What mreadie does not do

- No analytics, tracking, advertising or telemetry.
- No selling or transferring of data to third parties, no use of data for advertising, and no use of data to determine creditworthiness.
- No remote code: everything mreadie runs is included in the extension package.

## Content from other websites

Documents can embed images hosted on other websites. When mreadie displays such a document, your browser loads those images from where they are hosted, and those hosts can see your IP address, as with any web page.

## Your choices

- Remove your GitHub token in the mreadie popup.
- Disable mreadie on a self-hosted site in the popup.
- Uninstall mreadie to delete everything it stored.

## Changes to this policy

If mreadie's handling of data changes, we will update this page and the date at the top.

## Contact

Questions about this policy: open an issue at <https://github.com/m9rc1n/mreadie/issues>.

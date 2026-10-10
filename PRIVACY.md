# Galley privacy policy

_Last updated: 10 October 2026_

Galley is a browser extension that shows the markdown documents changed in GitHub pull requests and GitLab merge requests as readable, typeset articles, and lets you read a repository's own Markdown documentation the same way. It is open-source software published by Marcin Urbanski and contributors ("we"); the source code is at <https://github.com/m9rc1n/galley>.

## In short

- Galley has no server. We do not receive, collect, sell or share your data.
- Everything Galley displays is processed inside your browser.
- Notes you write about a repository are kept on your device, only when you save them, and leave it only through an export you check first.
- Galley itself only contacts the GitHub or GitLab site you are using. Images that documents embed from other websites load only when you choose to load them (see [Content from other websites](#content-from-other-websites)).

## What Galley handles, and why

**Pull and merge request content.** On GitHub and GitLab pages, Galley reads the page address to recognise pull and merge requests. When you open the reader, it requests the list of changed files and the contents of the changed markdown files from that same GitHub or GitLab site (on GitHub.com, through GitHub's API at api.github.com), using your existing session there or your GitHub token (see below). If you enable code files, it also requests supported source and configuration files from the same review. It also reads the review's existing comment threads, to show them beside the paragraphs they discuss. The content is rendered on your device, kept in memory only while the page is open, and not sent anywhere else.

**Repository documents.** On GitHub and GitLab repository pages (a repository, one of its folders or one of its Markdown files), Galley reads the page address to offer **Read docs**, and requests nothing more until you press it. When you do, it asks the same GitHub or GitLab site which commit the branch or tag on the page points to, lists the files of that repository at that commit (on GitHub.com, through GitHub's API at api.github.com, using your token if you saved one), and reads the Markdown documents you open, and those the project map reads, from that same site with your existing session. When you choose **Read configuration** in the architecture views, it reads the repository's configuration files (such as Compose files, CI workflows, Kubernetes manifests and Terraform) from that same site in the same way, and reads them inside a sandbox in your browser; nothing in them is run, and no cluster, cloud account or CI service is contacted. In a pull or merge request, **Project docs** reads the same repository's documents at the review's base or head commit, in the same way. The documents, configuration, the map built from them and your reading history are kept in memory only while the reader is open, and are not stored or sent anywhere else.

**Your notes on a repository.** Notes you write in the repository reader (ideas, questions, assumptions, next experiments, alternatives), components and connections you propose on the map, and the document types you set are stored on your device in Galley's extension storage, **only when you press Save**. Until then, unsaved changes are kept there as a draft so you can recover them after closing the tab. The storage key is a fingerprint of the repository's address; the stored notes contain what you wrote and, for a note about a document, that document's path, title, heading, the commit and a fingerprint of the section, so Galley can tell you when it changes. They are never sent anywhere by Galley. **Export…** shows the exact text before you copy or download it, and **Open a new issue…** only opens the platform's new-issue form with that text for you to submit or not. **Delete all notes…** removes them for that repository; uninstalling Galley removes all of them. Like any extension storage, they can be read by someone with access to your browser profile.

**GitHub access token (optional).** If you add a GitHub token so Galley can read private repositories or post review comments, the token is stored on your device in Galley's own extension storage, which websites (including GitHub's pages) cannot read. Only Galley's background worker uses it, and only to send the reader's own requests to the GitHub API of the site you saved it for, over https. On a repository page, those requests are limited to finding the commit and listing the files of that repository; on a pull request page, Project docs may also list the files of that pull request's repository. You can remove it in the Galley popup at any time, and it is deleted when you uninstall Galley.

**Review comments.** When you press Comment in the reader, Galley sends your comment, the quoted selection or paragraph, and its file/source-line context to the GitHub or GitLab review you are reading. The platform stores it as a normal review comment or discussion, visible according to that repository's access rules. Drafts stay in memory while the reader is open and are not sent until you post. The demo stores its simulated comments in that tab's session storage only.

**Viewed progress.** With a GitHub token, Galley reads your native file Viewed status and updates it only when you mark or unmark a file. Without a token, and on GitLab, Galley stores local Viewed flags using a fingerprint of the review URL, file path and contents. File content is not stored with these flags. This progress is saved in extension storage (local storage in the demo), stays on your device, and resets when that file changes.

**Diagrams and code colours.** Mermaid diagrams and syntax colours are produced locally using code included in the extension, loaded from the extension package only when needed. Both run in sandboxed frames that have no network access and cannot read the page, your session or Galley's storage. Diagram source, code and images are not sent to any service, and external image/icon assets in Mermaid are disabled.

**Reading position.** So you can pick up where you left off, Galley remembers which file you were reading in a review and how far into it, for your 50 most recent reviews. It keeps only a fingerprint of the review's address, a fingerprint of the file's path and a scroll offset, never the address or path themselves, in extension storage (local storage in the demo), on your device.

**Preferences.** Your theme, typeface, text size, display mode, paragraph filter, code-files option, file order, folding and external-images choice are stored in your browser's extension storage.

**Sites you enable.** If you enable Galley on a self-hosted GitLab or GitHub Enterprise site, your browser records that permission for that one domain. You can disable it in the Galley popup or in your browser's extension settings.

## What Galley does not do

- No analytics, tracking, advertising or telemetry.
- No selling or transferring of data to third parties, no use of data for advertising, and no use of data to determine creditworthiness.
- No remote code: everything Galley runs is included in the extension package.

## Content from other websites

Documents and comments can embed images hosted on other websites. Galley does not load those images by default: each shows the website it comes from and a Load button. Images hosted on the GitHub or GitLab site you are reviewing load normally. If you press Load, or choose to always load external images in reading settings, your browser fetches them from where they are hosted, and those hosts can see your IP address, as with any web page. Galley never sends the address of the page you are reading with these requests.

## Your choices

- Remove your GitHub token in the Galley popup.
- Disable Galley on a self-hosted site in the popup.
- Uninstall Galley to delete everything it stored.

## Changes to this policy

If Galley's handling of data changes, we will update this page and the date at the top.

## Contact

Questions about this policy: open an issue at <https://github.com/m9rc1n/galley/issues>.

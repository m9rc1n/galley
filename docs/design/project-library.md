# Project library: reading layouts and chapter context

Implementation plan for [task #60](https://github.com/m9sh/galley/issues/60). This is a phased task, not an RFC. Its first delivery is the independently reviewable reading-layout foundation; direct chapter context is a follow-up.

## Current journey

| Surface | Responsibility | Existing owner |
| --- | --- | --- |
| Chapters | Explainable groups and a reading order through changed files | `core/chapters.ts`, `ui/chapters.ts`, `Reader` |
| Review article | Changed file, its contents, folds, Viewed and discussion | `Reader` |
| Project library opening | Choose the review's head or base and leave the review open behind it | `Reader.openProject()` |
| This review | Changed files by chapter, with linked documents and their evidence | `repo-views.ts`, `RepoReader` |
| Library browser | Find a document at the selected commit | `RepoReader` and its `ProjectIndex` |
| Contents | Headings of the current article; visible beside Balanced / Wide text on desktop | Each reader's `buildToc()` |
| Project map | Connections backed by explicit document links, plus their evidence | `ProjectIndex`, `repo-views.ts` |

The review sends a snapshot of its chapter groups into This review. Direct supporting-document links in Chapters and shared context attachments are not implemented yet. Avoid another chapter-grouping system: the next delivery should extend this existing snapshot and evidence model.

## Foundation components

`ui/layout-controls.ts` owns the fixed layout-picker markup, names and captions. Both readers compose it into the existing `settingsSheet()`. Review choices remain Balanced, Files, Review, Wide text, Focus and Fit to screen; the library offers Focus, Balanced and Wide text, with previews that do not suggest a discussion column.

`LibraryLayout` owns the library session's supported choice and cycling order. It starts in Focus, survives document navigation and refresh, and ends when the overlay closes. It does not write settings. Component tests cover the two picker contexts and the session model; integration tests exercise selection, navigation, late preference loads, keyboard cycling and the return to a review.

The shared `applyReadingControls()` in `settings-sheet.ts` applies selected control states. The library supplies its session layout over the shared preferences when applying those controls. Typography, appearance and density keep their existing shared persistence.

## State contract

| State | Owner and lifetime | Crossing between review and library |
| --- | --- | --- |
| Review file, paragraph, folds and active chapter | Background `Reader`, for the review session | The overlay stays mounted; opening and closing the library does not replace it |
| Comment and reply drafts | Background `Reader` composers | Stay in that reader; context reading never submits or converts them into notes |
| Viewed | Review's existing progress model | Library reads and layout changes never mark files Viewed |
| Review layout | Persisted `Settings.layout` | The library does not update it |
| Library layout | `LibraryLayout`, one open library session | Starts in Focus; saved review preferences and later preference reads cannot overwrite it |
| Library document and back stack | `RepoReader` history: path, first visible block and offset | Link navigation and Back/Forward restore the paragraph; a layout reflow restores the first visible block |
| Revision | Commit-pinned `RepositorySource`; head/base selected before opening | Existing This review identifies the revision; all reads use its commit |
| Focus and Escape | Existing layer ownership and return callback | Settings close first; closing the library returns focus to the review's opening control |
| Future document/heading attachment | Session state attached to a review chapter | Not implemented here; retain source identity, revision and explicit evidence or “Added by you” |

There is no new storage key or saved repository content. The library's layout choice is independent of content visibility: it does not change Marked / Clean, Changed parts / Whole files, indexing completeness or review progress.

## Reading geometry

Focus is a centred article with a 680px maximum measure and navigation available from the document name. Balanced uses the same measure with Contents beside it on wide screens. Wide text has a 920px maximum, constrained by equal space for the contents rail on both sides. No library layout reserves an empty comments column. Below 1,280px, all three keep one reading column.

Existing palettes, typography, optional glow and Comfortable / Compact density continue to apply. Maps and notes retain their separate on-demand views.

## Next deliveries

1. Put existing related-document evidence beside each chapter's Changed files as Project context. Share those connections with This review and Project map.
2. Add explicit session attachments of a document or heading, labelled Added by you. Preserve head/base and the active chapter when opening them.
3. Add Return to review and Continue chapter with complete position, focus, draft, fold and Viewed regression coverage. Reuse the chapter presentation for optional standalone reading sequences.
4. Refine wrapped navigation items, inspect the joined journey at desktop and phone widths, and run 5–8 voluntary reading sessions. Naming and comfort remain hypotheses until readers validate them; no telemetry is introduced.

## Representative captures

The same architecture article at 1,440px: [before](library-before.png), [Focus](library-focus.png), and the extracted [layout picker](library-layouts.png). The [390px capture](library-phone.png) uses dark appearance, Compact density and 22px text. Browser checks exercise all three layouts at 1,440, 1,280, 390 and 320px in light/Comfortable/20px and dark/Compact/22px.

These captures validate the layout foundation, not the entire joined journey. At 320px the existing top-bar actions squeeze out the document name; the chapter/navigation polish should give the current document space while keeping all actions reachable. Direct chapter context and voluntary reader sessions remain outstanding.

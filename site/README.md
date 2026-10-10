# Galley website

A static, responsive product website. Newsreader headlines and DM Sans interface text are self-hosted alongside the site's assets, with no analytics, remote font requests, or client-side framework. Their SIL Open Font Licenses are included in `src/ui/fonts/` (shared with the extension). The real reader demo and a privacy page generated from `PRIVACY.md` ship alongside it.

## Preview locally

```sh
npm ci --ignore-scripts
npm run site
```

Open http://localhost:4185. Edit `site/index.html`, `site/styles.css`, or `site/main.js`, then rebuild with `npm run build:site`. Reload the browser to see the changes.

`npm run test:site` checks the built website in Chrome, including mobile layouts, preview controls, local links, and the real demo served at a `/galley/` project path. Set `CHROME_PATH` if Chrome is installed somewhere unusual. Screenshots go to `reports/site/`.

## Publish on GitHub Pages

1. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source.
2. Merge the website files into `main`, or run the **Website** workflow manually from `main`.
3. After a successful **Website** build, **Publish website and MR demos** runs from `main`, checks the production site and deploys it to **https://m9rc1n.github.io/galley/**.

Same-repository MRs targeting `main` get a temporary demo at **https://m9rc1n.github.io/galley/pr-preview/NUMBER/demo/** after a successful Website build. Further successful builds replace that MR's demo. Closing or merging the MR removes it; reopening and rebuilding recreates it. One bot comment tracks the URL and built revision, then records removal. Forks still receive website checks, but are not published automatically.

The publisher retains open previews in the generated `pages-previews` branch and combines them with the main site for each deployment. Publishing is queued to retain concurrent MR updates and cleanup events. The build has read-only permissions; the publisher always checks out `main`, treats artifacts as static data, rejects links/repository metadata, and checks that an MR is still open at the built revision before installing its demo.

These workflows must first be merged to `main`: GitHub only triggers `workflow_run` publishers from the default branch, and the Pages environment allows `main` deployments. No Pages settings change or new hosting secret is needed. For recovery, run **Publish website and MR demos** from `main`: leave `run_id` blank to rebuild production and remove closed previews, or supply a successful Website MR run ID to republish its current demo.

The artifact can also be hosted by any static web server. All local links and assets are relative. When moving to a different repository URL or a custom domain, update the canonical URL and Open Graph URLs in `site/index.html`.

Product screenshots (`reader-*.jpg`) and the link preview image are copied from `store/assets/`. Run `npm run store-assets` to refresh them when the reader changes. The interactive hero is explicitly an illustrated review with three views (the raw diff, Galley and Clean); the before/after and the six previews are actual reader screenshots.

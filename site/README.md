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
3. The workflow builds and checks the site, then deploys `dist/site` to **https://m9rc1n.github.io/galley/**.

Pull requests build and check the site without deploying. GitHub Pages must be enabled before the deployment steps can succeed. No hosting secrets are needed.

The artifact can also be hosted by any static web server. All local links and assets are relative. When moving to a different repository URL or a custom domain, update the canonical URL and Open Graph URLs in `site/index.html`.

Product screenshots are copied from `store/assets/`. Run `npm run store-assets` to refresh them when the reader changes. The small interactive hero is explicitly an illustrated review; the full-width previews are actual reader screenshots.

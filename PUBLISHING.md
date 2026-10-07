# Publishing Galley to the Chrome Web Store

The package, graphics, listing copy and privacy texts are ready in this repository. The steps that need you (the account, payment, legal identity, hosting) are marked **You**.

## 1. Developer account (You, once)

1. Sign in at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) with the Google account that should own Galley. For a company, use a shared or group account rather than a personal one.
2. Pay the one-time US$5 registration fee.
3. Verify the contact email and fill in the publisher name.
4. Complete the trader / non-trader declaration required by the EU Digital Services Act. If you publish on behalf of a company, you are most likely a trader: the store then shows your legal name, address, email and phone number to users in the EU.

## 2. Privacy policy

`PRIVACY.md` is complete: it names the project and points to the GitHub issues page for questions. Use its public address as the privacy policy URL in the dashboard:

```
https://github.com/m9rc1n/galley/blob/main/PRIVACY.md
```

If you prefer a standalone page, `npm run privacy-page` renders `store/privacy-policy.html`, which you can host anywhere (GitHub Pages works).

## 3. Build and check the package

```bash
npm ci
npm run release
```

This runs the tests and the type check, then writes `dist/galley-chrome-<version>.zip`. Before uploading:

- Load `dist/chrome` in a fresh Chrome profile (`chrome://extensions`, Developer mode, Load unpacked).
- Open a pull request and a merge request that change markdown, including one in a private project you can access, and press **Read**.
- If you use a self-managed GitLab, enable it from the toolbar popup and try a merge request there.

## 4. Create the store item

1. In the dashboard choose **Add new item** and upload the zip.
2. **Store listing:** copy the fields from [`store/LISTING.md`](store/LISTING.md) and upload the images from `store/assets/`.
3. **Privacy practices:** copy the single purpose, permission justifications, data usage answers and certifications from `store/LISTING.md`, and paste your privacy policy URL.
4. **Distribution:** free; choose Public, Unlisted or Private.
5. **Test instructions:** copy them from `store/LISTING.md`. No credentials are needed.

## 5. Submit

Choose **Submit for review**. You can publish automatically when the review passes, or defer publishing for up to 30 days. Review usually takes a few days; you get an email when it finishes. New developer accounts can publish up to two items at first.

If the review asks about permissions, the answers are in `store/LISTING.md`. In short:

- The only broad host access is optional.
- It is requested one domain at a time, when a user enables a self-hosted server.
- No code is loaded remotely.

## Updates

The version is automatic (see "Commits and releases" in [CONTRIBUTING.md](CONTRIBUTING.md#commits-and-releases)); the store needs a higher number than the published one, and every release raises it.

1. Merge the open `chore(main): release X.Y.Z` pull request when you want to ship. This tags the release and builds the packages.
2. When the **Release** run finishes, download `galley-chrome-X.Y.Z.zip` from the GitHub release and upload it in the item's **Package** tab. `SHA256SUMS.txt` and the build provenance (`gh attestation verify <zip> --repo m9rc1n/galley`) show that the zip is the one built from the tag.
3. If the UI changed, run `npm run store-assets` to redraw the screenshots and promo tiles from the real reader, then replace them in the listing.

`npm run release` still builds the zip on your machine, which is useful for trying a package before the first submission.

## Firefox Add-ons

Every release also attaches `galley-firefox-X.Y.Z.zip` and `galley-source-X.Y.Z.zip` (Mozilla asks for the source of a bundled add-on). [`store/FIREFOX.md`](store/FIREFOX.md) has the listing fields, the notes for Mozilla's reviewers and the steps for the first submission and for each update.

## Rolling out inside a company

Google Workspace admins can install the extension for everyone, or allow it, from the Admin console under Chrome browser settings. This works for unlisted and private items as well.

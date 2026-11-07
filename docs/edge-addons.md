# Microsoft Edge Add-ons

Edge Add-ons is a third distribution channel. It is separate from the
[Chrome Web Store](store-listing.md) and [GitHub Releases](github-release.md).
It ships the same ZIP that `pnpm webstore:prepare <version>` creates, so a
version reaches Edge only after it has been prepared from a clean commit.

Submission, status checks, and publication are manual in
[Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview).
There is no API integration.

## First submission

1. Register as an Edge extension developer in Partner Center.
2. Create a new extension and upload `build/releases/markside-<version>.zip`.
3. **Availability:** public, all markets.
4. **Properties:** category Developer tools. Privacy policy URL
   `https://markside.app/privacy`. Website `https://markside.app`. Support
   `hello@zhuge.app`.
5. **Store listings:** reuse the description and screenshots from
   [store-listing.md](store-listing.md). Write "Chrome" only where the text
   refers to Chrome itself.
6. **Notes for certification:** explain that local files need **Allow access to
   file URLs** on the extension's details page, and that website access is
   optional and used only by Web Preview.
7. Submit. After publication, record the Edge item ID below. Edge assigns its
   own extension ID, and Markside uses it to send Edge installs to their own
   rating page (`getStoreReviewUrl` in `lib/review-prompt.ts`).

## Updates

Upload the newly prepared ZIP to the existing Edge item and submit. Tag the
recorded commit `edge-v<version>` after publication.

## Smoke test in Edge

Load `build/chrome-mv3-prod` unpacked in `edge://extensions`, or install
from the Store after publication, then check that:

- Opening a local `.md` file renders it after **Allow access to file URLs** is
  enabled.
- The popup and Options links to the extension details page open Edge's own
  page.
- **Rate** in the popup and Settings opens the Edge Add-ons listing (Store
  install) or the Chrome Web Store listing (Chrome Web Store install).
- Saving, Open Folder, the quick switcher, and PDF Export work.

## Release history

- Item ID: not yet published

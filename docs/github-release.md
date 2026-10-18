# GitHub releases

GitHub Releases distribute an unpacked build independently of the
[Chrome Web Store](store-listing.md). Users can download the ZIP and load it in
Chrome without waiting for Store review.

## Publish through Actions

The workflow in `.github/workflows/github-release.yml` runs manually by default.
Choose **GitHub Release** in the Actions tab and select **Run workflow** on the
intended release commit.

The workflow:

1. Reads `package.json` and skips a version already tagged `github-v<version>`.
2. Installs dependencies using the pinned pnpm version and Node from `.nvmrc`.
3. Runs tests and builds the production extension.
4. Packages `build/chrome-mv3-prod` with `manifest.json` at the ZIP root.
5. Creates a `github-v<version>` release with the ZIP attached, using
   `GITHUB_TOKEN` with `contents: write` permission.

To enable automatic releases, uncomment the workflow's `push` trigger for
`package.json` changes on `main`. Once enabled, a version bump can publish a
release without another approval step. Keep that trigger disabled when releases
should remain manual.

## Publish with the CLI

Start from the intended clean release commit, then run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Package the build with `manifest.json` at the ZIP root and capture its commit:

```bash
release_version=$(node -p "require('./package.json').version")
release_commit=$(git rev-parse HEAD)
(cd build/chrome-mv3-prod && zip -X -q -r "../../markside-${release_version}.zip" . -x "*.DS_Store")
unzip -Z1 "markside-${release_version}.zip" | grep -x manifest.json
```

Then publish with the installed GitHub CLI:

```bash
gh release create "github-v${release_version}" "markside-${release_version}.zip" \
  --target "$release_commit" \
  --title "Markside ${release_version}" \
  --notes "Unpacked Chrome extension built from ${release_commit}. See README for installation."
```

## Install a downloaded release

Extract the ZIP. In `chrome://extensions`, enable **Developer mode**, choose
**Load unpacked**, and select the folder containing `manifest.json`. Enable
**Allow access to file URLs** in Markside's Details.

## Relationship to the Web Store

Both channels use the version in `package.json`, but have separate release tags
and artifacts. GitHub uses `github-v<version>`; future Web Store publications
use `webstore-v<version>` on the prepared commit.

GitHub attaches its ZIP to the release. The local Web Store preparation writes
its ZIP and identity JSON under `build/releases/`. Store submission, status,
and publication are manual Dashboard actions and use no API credentials.

A version can reach one channel before the other, or only one channel. Ask
which build a reporter installed when investigating a release-specific bug.

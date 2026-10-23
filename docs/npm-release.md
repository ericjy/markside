# CLI releases on npm

The `cli/` directory is the standalone `markside` npm package. Its version in
`cli/package.json` is independent of the Chrome extension's root package version.
The first release is `0.1.0`. Publishing it does not release the extension to
the Web Store or GitHub.

## Prepare

Run these commands from the repository root on the intended release commit:

```sh
git status --short
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
npm pack ./cli --dry-run --json
```

Commit the intended changes before packing. The worktree must be clean. For
subsequent releases, update `cli/package.json` to a new semantic version first.
The CLI has no build step or runtime dependencies. The package must contain only
`package.json`, `markside.mjs`, `review-file.mjs`, `review-file.d.mts`, `README.md`,
and `LICENSE`. Check that `markside.mjs` is executable and starts with its Node
shebang. Do not include Review files, credentials, or extension bundles.

Create the artifact under the ignored release directory:

```sh
mkdir -p build/releases
npm pack ./cli --pack-destination build/releases --json
```

Install that tarball in a temporary directory with Node.js 20+ and run the
installed `markside --help`. Verify a Review with `--no-open`: wait for a send,
read comments, address a comment with a reply, and continue until the reviewer
finishes. Use the existing CLI integration tests for the file protocol; Chrome
integration still needs the checks in [manual-test.md](manual-test.md).

## Publish

Check authentication against the public registry. If needed, log in interactively;
never put npm credentials in the repository or release notes.

```sh
npm whoami --registry=https://registry.npmjs.org/
npm login --registry=https://registry.npmjs.org/
```

Check the package's existing versions before publishing. A 404 means no package
is visible under that name; publication is the final check of name availability.
Publish the exact tarball that was verified, substituting the intended version:

```sh
npm view markside versions --json --registry=https://registry.npmjs.org/
npm publish ./build/releases/markside-0.1.0.tgz --access public --tag latest --registry=https://registry.npmjs.org/
```

Complete npm's authentication or two-factor prompt if requested. If publication
fails or its result is uncertain, check the registry before retrying. npm versions
cannot be reused.

## Verify and record

```sh
npm view markside@0.1.0 version dist.integrity dist-tags --json --registry=https://registry.npmjs.org/
npm exec --yes --package=markside@0.1.0 -- markside --help
```

Compare the registry integrity with `npm pack`'s integrity for the verified
artifact. Record the published version, date, exact commit, and integrity below.
Tag that commit `cli-v0.1.0` and push the tag after successful publication.
Use `cli-v<version>` for later CLI releases, separate from `github-v<version>` and
`webstore-v<version>`.

After the first successful publication, update installation instructions in
`cli/README.md`, `README.md`, `docs/user-guide.md`, and `skills/markside/SKILL.md`
to offer `npm install --global markside` and `npx markside`. Follow the recorded
Beta rollout decision in `docs/changes/2026-10-20-pending-decisions/spec.md`
when preparing the extension release.

## Published versions

| Version | Date | Commit | Integrity | Tag |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-10-22 | `69c151dc2fbbe4515cfc32aac97efa73daae37fc` | `sha512-EannaHzx1VrUstIldm70MBrXCyQCdYBpoDwMVEmdF7PcQ6hDG8ERWRbGVRIDIfMlG1gNGXLF81ZoHOkqgw4EAg==` | `cli-v0.1.0` |

# Contributing to Markside

Thanks for helping improve Markside. We welcome bug fixes, documentation
improvements, usability refinements, and focused features that make local
Markdown files easier to read, navigate, and edit.

For project setup, development commands, testing, and technical references,
see the [development guide](docs/dev-guide.md).

## Set up and check a change

Use the Node version in `.nvmrc` and pnpm 10.28.2. Builds require
`rsvg-convert`, available from Homebrew's `librsvg` package on macOS or the
`librsvg2-bin` apt package on Debian/Ubuntu.

```bash
nvm use
npm install --global pnpm@10.28.2
pnpm install --frozen-lockfile
pnpm dev
```

Load `build/chrome-mv3-dev` as an unpacked extension in `chrome://extensions`
and enable **Allow access to file URLs** in Markside's Details.

Before submitting, run:

```bash
pnpm typecheck
pnpm test
```

For UI or browser-integration changes, build with `pnpm build` and complete
[docs/manual-test.md](docs/manual-test.md). Report which checks passed and which
still need verification. Keep private business notes and research outside the
repository.

Contributions are licensed under the project's [MIT license](LICENSE),
copyright 2026 Jing Yang.

## Report a bug

Before opening an issue, search [existing issues](https://github.com/ericjy/markside/issues)
to avoid duplicates. Include:

- a clear description of what happened and what you expected
- steps that reliably reproduce the problem
- the file type and a safe sample file, if relevant
- your Chrome version, operating system, and Markside version
- screenshots, console errors, or logs when they help explain the problem

Do not include private file contents, paths, or credentials in a public issue.

## Suggest an enhancement

Open an [issue](https://github.com/ericjy/markside/issues) before starting a
substantial feature. Explain:

- the problem the change would solve
- who would benefit from it
- the proposed behavior, including any tradeoffs or alternatives

Keep proposals aligned with Markside's focus on local Markdown viewing and
editing. Markside does not watch files or automatically reload external
changes.

## Triage labels

Use these labels when triaging issues:

| Label | Meaning |
| --- | --- |
| `needs-triage` | Maintainer needs to evaluate the issue |
| `needs-info` | Waiting for more information from the reporter |
| `ready-for-agent` | Fully specified and ready for an agent to implement |
| `ready-for-human` | Requires human implementation |
| `wontfix` | Will not be actioned |

## Change records

Keep technical specs in `docs/changes/YYYY-MM-DD-topic/spec.md`, related
interviews in `grill.md`, and archived Reviews in `grill.review.json` in the same
directory. See the [change index](docs/changes/README.md).

These records preserve design intent. Current behavior belongs in
`docs/system-design.md`, and durable architectural decisions belong in `docs/adr/`.

## Submit a pull request

1. Create a focused branch and make the smallest change that solves the issue.
2. Link the related issue, or explain why no issue is needed.
3. Describe the user-visible change and the checks you ran.
4. Include screenshots for visual changes and update documentation when
   behavior or a durable constraint changes.
5. Respond to review feedback and keep the pull request scoped to its purpose.

Pull requests are reviewed for user impact, correctness, tests, and fit with
the existing TypeScript and React patterns.

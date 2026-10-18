#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from "node:fs"
import { basename, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const PROD_DIRECTORY = "build/chrome-mv3-prod"

const HELP = `Markside Chrome Web Store release tool

Commands:
  prepare <version>   Test, build, and package a committed release
  help                Show this help

Submitting, checking status, and publishing are done by hand in the
Chrome Web Store Developer Dashboard. See docs/store-listing.md.
`

function parseChromeVersion(version) {
  if (!/^\d+(?:\.\d+){0,3}$/.test(version)) {
    throw new Error(
      `Chrome version "${version}" must contain one to four numeric components`
    )
  }

  const parts = version.split(".").map(Number)
  if (parts.some((part) => part > 65535)) {
    throw new Error(
      `Chrome version "${version}" components must be between 0 and 65535`
    )
  }

  return [...parts, 0, 0, 0, 0].slice(0, 4)
}

export function validatePrepareState({
  requestedVersion,
  packageVersion,
  gitStatus
}) {
  parseChromeVersion(requestedVersion)
  const errors = []
  if (packageVersion !== requestedVersion) {
    errors.push(
      `package.json version is ${packageVersion}; set it to ${requestedVersion} and commit the change`
    )
  }
  if (gitStatus.trim()) {
    errors.push("the Git worktree is not clean")
  }
  return errors
}

export function validateNodeVersion(version) {
  if (Number(version.split(".")[0]) < 20) {
    return [
      `release preparation requires Node 20 or newer; current runtime is ${version}`
    ]
  }
  return []
}

export function releasePaths(root, version) {
  parseChromeVersion(version)
  const directory = resolve(root, "build/releases")
  return {
    directory,
    zip: resolve(directory, `markside-${version}.zip`),
    metadata: resolve(directory, `markside-${version}.json`)
  }
}

export function validateBuiltManifest(manifest, expectedVersion) {
  const errors = []
  if (manifest.version !== expectedVersion) {
    errors.push(
      `generated manifest version is ${manifest.version}, expected ${expectedVersion}`
    )
  }
  if (manifest.manifest_version !== 3) {
    errors.push("generated manifest is not MV3")
  }
  const hasFileMatch = (manifest.web_accessible_resources ?? []).some((entry) =>
    (entry.matches ?? []).some((match) => match.startsWith("file://"))
  )
  if (hasFileMatch) {
    errors.push(
      "generated web_accessible_resources still contains a file:// match"
    )
  }
  return errors
}

export function createArtifactMetadata({
  version,
  commit,
  sha256,
  zip,
  createdAt = new Date().toISOString()
}) {
  return {
    schemaVersion: 1,
    version,
    commit,
    sha256,
    zip,
    createdAt
  }
}

function run(command, args, { cwd, capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const detail = capture ? result.stderr.trim() : ""
    throw new Error(
      `${command} ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`
    )
  }
  return capture ? result.stdout.trim() : ""
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function assertNoErrors(errors) {
  if (errors.length) {
    throw new Error(errors.map((error) => `- ${error}`).join("\n"))
  }
}

async function prepareRelease(root, version) {
  parseChromeVersion(version)
  assertNoErrors(validateNodeVersion(process.versions.node))
  const packageJson = readJson(resolve(root, "package.json"))
  const gitStatus = run("git", ["status", "--porcelain"], {
    cwd: root,
    capture: true
  })
  assertNoErrors(
    validatePrepareState({
      requestedVersion: version,
      packageVersion: packageJson.version,
      gitStatus
    })
  )

  const commit = run("git", ["rev-parse", "HEAD"], {
    cwd: root,
    capture: true
  })
  process.stdout.write(`Preparing Markside ${version} from ${commit}\n`)

  run("pnpm", ["test"], { cwd: root })
  run("pnpm", ["build"], { cwd: root })

  const productionDirectory = resolve(root, PROD_DIRECTORY)
  const manifestPath = resolve(productionDirectory, "manifest.json")
  if (!existsSync(manifestPath)) {
    throw new Error(`Production manifest not found: ${manifestPath}`)
  }
  assertNoErrors(validateBuiltManifest(readJson(manifestPath), version))

  const paths = releasePaths(root, version)
  mkdirSync(paths.directory, { recursive: true })
  if (existsSync(paths.zip)) unlinkSync(paths.zip)
  run(
    "zip",
    ["-X", "-q", "-r", paths.zip, ".", "-x", "*.DS_Store"],
    { cwd: productionDirectory }
  )
  const archiveEntries = run("unzip", ["-Z1", paths.zip], {
    cwd: root,
    capture: true
  }).split("\n")
  if (!archiveEntries.includes("manifest.json")) {
    throw new Error("Upload ZIP does not contain manifest.json at its root")
  }

  const digest = sha256(paths.zip)
  const metadata = createArtifactMetadata({
    version,
    commit,
    sha256: digest,
    zip: basename(paths.zip)
  })
  writeFileSync(paths.metadata, `${JSON.stringify(metadata, null, 2)}\n`)

  process.stdout.write(
    `Prepared ${paths.zip}\nSHA-256 ${digest}\nMetadata ${paths.metadata}\n` +
      `Upload this ZIP by hand in the Developer Dashboard; see docs/store-listing.md.\n`
  )
}

async function main(argv) {
  const command = argv[0] ?? "help"
  const args = argv.slice(1)
  const root = process.cwd()

  if (command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(HELP)
    return
  }

  if (command === "prepare") {
    if (!args[0]) throw new Error("prepare requires a version")
    await prepareRelease(root, args[0])
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
}

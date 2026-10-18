import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"
import {
  createArtifactMetadata,
  releasePaths,
  validateBuiltManifest,
  validateNodeVersion,
  validatePrepareState
} from "../scripts/webstore-release.mjs"

describe("webstore release CLI", () => {
  it("documents the local prepare phase", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/webstore-release.mjs", "help"],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("prepare")
    expect(result.stdout).toContain("Developer Dashboard")
  })

  it("requires a clean committed tree at the requested version", () => {
    expect(
      validatePrepareState({
        requestedVersion: "1.1.0",
        packageVersion: "1.0.0",
        gitStatus: ""
      })
    ).toEqual([
      "package.json version is 1.0.0; set it to 1.1.0 and commit the change"
    ])

    expect(
      validatePrepareState({
        requestedVersion: "1.1.0",
        packageVersion: "1.1.0",
        gitStatus: " M package.json"
      })
    ).toEqual(["the Git worktree is not clean"])
  })

  it("accepts current Node releases for preparation", () => {
    expect(validateNodeVersion("20.19.4")).toEqual([])
    expect(validateNodeVersion("24.13.1")).toEqual([])
    expect(validateNodeVersion("18.20.8")).toEqual([
      "release preparation requires Node 20 or newer; current runtime is 18.20.8"
    ])
  })

  it("uses predictable artifact paths", () => {
    expect(releasePaths("/repo", "1.1.0")).toEqual({
      directory: "/repo/build/releases",
      zip: "/repo/build/releases/markside-1.1.0.zip",
      metadata: "/repo/build/releases/markside-1.1.0.json"
    })
  })

  it("validates the generated production manifest", () => {
    expect(
      validateBuiltManifest(
        {
          manifest_version: 3,
          version: "1.1.0",
          web_accessible_resources: [{ matches: ["<all_urls>"] }]
        },
        "1.1.0"
      )
    ).toEqual([])

    expect(
      validateBuiltManifest(
        {
          manifest_version: 2,
          version: "1.0.0",
          web_accessible_resources: [{ matches: ["file://**/*"] }]
        },
        "1.1.0"
      )
    ).toEqual([
      "generated manifest version is 1.0.0, expected 1.1.0",
      "generated manifest is not MV3",
      "generated web_accessible_resources still contains a file:// match"
    ])
  })

  it("records the artifact identity", () => {
    const metadata = createArtifactMetadata({
      version: "1.1.0",
      commit: "abc123",
      sha256: "deadbeef",
      zip: "markside-1.1.0.zip",
      createdAt: "2026-07-24T12:00:00.000Z"
    })

    expect(metadata).toEqual({
      schemaVersion: 1,
      version: "1.1.0",
      commit: "abc123",
      sha256: "deadbeef",
      zip: "markside-1.1.0.zip",
      createdAt: "2026-07-24T12:00:00.000Z"
    })
  })
})

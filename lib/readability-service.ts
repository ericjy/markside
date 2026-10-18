import type { ReadabilityDimension, ReadabilityFinding, ReadabilityScores } from "./readability"

// Readability Check is unreleased and off in every build unless this is set to "true".
export const READABILITY_CHECK_ENABLED = process.env.PLASMO_PUBLIC_READABILITY_CHECK === "true"

export async function checkReadability(section: string): Promise<ReadabilityScores> {
  const response = await chrome.runtime.sendMessage({ type: "check-readability", section }) as
    { scores?: ReadabilityScores; error?: string } | undefined
  if (!response?.scores) throw new Error(response?.error ?? "Readability Check is unavailable")
  return response.scores
}

export async function locateReadability(section: string, dimensions: readonly ReadabilityDimension[]): Promise<ReadabilityFinding[]> {
  const response = await chrome.runtime.sendMessage({ type: "locate-readability", section, dimensions }) as
    { findings?: ReadabilityFinding[]; error?: string } | undefined
  if (!response?.findings) throw new Error(response?.error ?? "Locating sentences is unavailable")
  return response.findings
}

// Chrome opens this page after the extension is removed. It carries the version
// only, so an answer cannot be linked to a person or browser.
export function uninstallSurveyUrl(origin: string, version: string): string {
  const url = new URL("/uninstall", origin)
  url.searchParams.set("v", version)
  return url.href
}

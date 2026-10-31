// Copied into the build unprocessed: Parcel would rewrite this import() into its
// own module lookup. Runs in the content script's isolated world, so pages can't call it.
globalThis.marksideImportVegaEngine = () => import(chrome.runtime.getURL("vega-engine.js"))

export const TYPEFACE_STORAGE_KEY = "typeface"

export const TYPEFACES = {
  sans: { label: "Sans", stack: "ui-sans-serif, system-ui, sans-serif" },
  serif: { label: "Serif", stack: "ui-serif, \"New York\", Georgia, serif" },
  charter: { label: "Charter", stack: "Charter, \"Bitstream Charter\", \"Sitka Text\", Cambria, serif" },
  iowan: { label: "Iowan", stack: "\"Iowan Old Style\", \"Palatino Linotype\", Palatino, serif" },
  avenir: { label: "Avenir", stack: "\"Avenir Next\", Avenir, \"Segoe UI\", Montserrat, sans-serif" },
} as const

export type Typeface = keyof typeof TYPEFACES

export function resolveTypeface(value: unknown): Typeface {
  return typeof value === "string" && Object.hasOwn(TYPEFACES, value)
    ? (value as Typeface)
    : "sans"
}

export async function getTypeface(): Promise<Typeface> {
  const stored = await chrome.storage.local.get(TYPEFACE_STORAGE_KEY)
  return resolveTypeface(stored[TYPEFACE_STORAGE_KEY])
}

export async function setTypeface(typeface: Typeface): Promise<void> {
  await chrome.storage.local.set({ [TYPEFACE_STORAGE_KEY]: typeface })
}

export function watchTypeface(
  onChange: (typeface: Typeface) => void
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== "local") return
    const change = changes[TYPEFACE_STORAGE_KEY]
    if (change) onChange(resolveTypeface(change.newValue))
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

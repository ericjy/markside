import { setFileHandle } from "./db"

export async function createMarkdownInFolder(
  root: FileSystemDirectoryHandle,
  rootUrl: string,
  input: string,
): Promise<string> {
  const trimmed = input.trim()
  if (!trimmed || /[\\/<>:"|?*\u0000-\u001f]/.test(trimmed) || trimmed === "." || trimmed === "..") {
    throw new Error("Enter a filename without slashes or special characters.")
  }
  if (!trimmed.endsWith(".md")) throw new Error("The filename must end in .md.")
  const filename = trimmed
  const permission = await (root as FileSystemDirectoryHandle & {
    requestPermission: (options: { mode: "readwrite" }) => Promise<PermissionState>
  }).requestPermission({ mode: "readwrite" })
  if (permission !== "granted") throw new Error("Allow folder access to create a file.")

  try {
    await root.getFileHandle(filename)
    throw new Error("A file with this name already exists. Choose another name.")
  } catch (error) {
    if (error instanceof DOMException && error.name === "TypeMismatchError") {
      throw new Error("A folder with this name already exists. Choose another name.")
    }
    if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error
  }
  // Creating the entry makes an empty file. Never open a writable stream here:
  // an external process could create the same name between the check and create.
  const handle = await root.getFileHandle(filename, { create: true })
  const url = new URL(encodeURIComponent(filename), rootUrl).href
  await setFileHandle(url, handle)
  return url
}

export async function openNewMarkdownTab(url: string): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: "new-markdown-file", url })
  if (response?.error) throw new Error(response.error)
}

export interface ReloadedFile {
  buffer: ArrayBuffer | null
  lastModified: number
  text: string | null
  type: string
}

interface FileFetchResponse {
  base64?: string
  error?: string
  text?: string
  type?: string
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function readFileThroughBackground(
  url: string,
  binary: boolean,
): Promise<ReloadedFile> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: binary ? "fetch-file-data" : "fetch-file",
        url,
      },
      (response: FileFetchResponse | undefined) => {
        const runtimeError = chrome.runtime.lastError
        if (runtimeError) {
          reject(new Error(runtimeError.message))
          return
        }
        if (!response || response.error) {
          reject(new Error(response?.error ?? "Failed to read file from disk"))
          return
        }
        if (binary) {
          if (typeof response.base64 !== "string") {
            reject(new Error("Failed to read binary file from disk"))
            return
          }
          resolve({
            buffer: decodeBase64(response.base64),
            lastModified: 0,
            text: null,
            type: response.type || "application/octet-stream",
          })
          return
        }
        if (typeof response.text !== "string") {
          reject(new Error("Failed to read text file from disk"))
          return
        }
        resolve({
          buffer: null,
          lastModified: 0,
          text: response.text,
          type: response.type || "text/plain",
        })
      },
    )
  })
}

export async function readFileFromDisk(
  handle: FileSystemFileHandle | null,
  url: string,
  binary: boolean,
): Promise<ReloadedFile> {
  if (!handle) return readFileThroughBackground(url, binary)

  let file: File
  try {
    file = await handle.getFile()
  } catch (err) {
    // A handle restored from IndexedDB loses its permission when the browser
    // session ends, so read through the background relay instead.
    if ((err as DOMException).name === "NotAllowedError") return readFileThroughBackground(url, binary)
    throw err
  }
  return {
    buffer: binary ? await file.arrayBuffer() : null,
    lastModified: file.lastModified,
    text: binary ? null : await file.text(),
    type: file.type || "application/octet-stream",
  }
}

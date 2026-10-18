import * as Dialog from "@radix-ui/react-dialog"
import { useRef } from "react"

import { FolderPickerTip } from "~components/folder-picker-tip"
import { Button } from "~components/ui/button"
import type { FolderError } from "~hooks/use-persisted-directory"

interface SaveFolderDialogProps {
  fileName: string
  folderError: FolderError | null
  onCancel: () => void
  onChooseFolder: () => void
}

export function SaveFolderDialog({
  fileName,
  folderError,
  onCancel,
  onChooseFolder,
}: SaveFolderDialogProps) {
  const previousFocus = useRef(document.activeElement)

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/50" />
        <Dialog.Content
          onKeyDown={(event) => event.stopPropagation()}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus()
          }}
          className="fixed left-1/2 top-1/2 z-[120] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 text-foreground shadow-2xl">
          <Dialog.Title className="text-base font-semibold">
            Allow saving in this folder
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Chrome needs you to select this file's folder before Markside can save the file. After you
            select the folder once, Markside can save files in that folder in the future.
          </Dialog.Description>
          <FolderPickerTip className="mt-3 text-sm leading-relaxed text-muted-foreground" />
          {folderError && (
            <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
              You chose <strong>{folderError.picked}</strong>, which doesn't contain {fileName}.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={onChooseFolder}>Choose folder</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

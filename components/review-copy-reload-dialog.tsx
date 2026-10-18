import * as Dialog from "@radix-ui/react-dialog"
import { useRef } from "react"

import { Button } from "~components/ui/button"

interface ReviewCopyReloadDialogProps {
  comment: boolean
  loading: boolean
  error: string | null
  onCancel: () => void
  onReload: () => void
}

export function ReviewCopyReloadDialog({
  comment,
  loading,
  error,
  onCancel,
  onReload,
}: ReviewCopyReloadDialogProps) {
  const previousFocus = useRef(document.activeElement)

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !loading) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/50" />
        <Dialog.Content
          aria-busy={loading}
          onKeyDown={(event) => event.stopPropagation()}
          onEscapeKeyDown={(event) => { if (loading) event.preventDefault() }}
          onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus()
          }}
          className="fixed left-1/2 top-1/2 z-[120] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 text-foreground shadow-2xl">
          <Dialog.Title className="text-base font-semibold">
            {comment ? "Couldn't copy comment" : "Couldn't copy Review"}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This file changed on disk. Reload and check the latest text before copying again.
          </Dialog.Description>
          {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" disabled={loading} onClick={onCancel}>Cancel</Button>
            <Button disabled={loading} onClick={onReload}>
              {loading ? "Reloading…" : "Reload file"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

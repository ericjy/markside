// Chrome's folder picker can't open at a given path, so Choose folder copies
// the path and this tip says how to jump to it.
export function FolderPickerTip({ className }: { className?: string }) {
  return (
    <p className={className}>
      {/Mac/.test(navigator.platform)
        ? <>The folder path is copied automatically when you click “Choose folder”. In the picker, just press <kbd className="rounded border bg-muted px-1 font-mono text-[0.9em]">⌘⇧G</kbd> and paste it to jump straight to the folder.</>
        : <>The folder path is copied automatically when you click “Choose folder”. In the picker, just paste it into the address bar to jump straight to the folder.</>}
    </p>
  )
}

import { Check } from "lucide-react"

// Chrome's folder picker can't open at a given path, so Choose folder copies
// the path and this tip shows the keys that jump to it.
export function FolderPickerTip({ copied, className }: { copied: boolean; className?: string }) {
  const keys = /Mac/.test(navigator.platform) ? ["⌘⇧G", "⌘V", "↩"] : ["Ctrl+L", "Ctrl+V", "Enter"]
  return (
    <p className={className}>
      <span role="status">
        {copied
          ? <><Check className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" /> Path copied.</>
          : "Choose folder copies its path."}
      </span>{" "}
      To jump to it in the picker, press{" "}
      <span className="whitespace-nowrap">
        {keys.map((key) => (
          <kbd key={key} className="mr-1 rounded border bg-muted px-1 font-mono text-[0.9em]">{key}</kbd>
        ))}
      </span>
    </p>
  )
}

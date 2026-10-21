import { Check } from "lucide-react"
import React from "react"

import { cn } from "~lib/utils"

// Chrome's folder picker can't open at a given path, so Choose folder copies
// the path and this tip shows the keys that jump to it.
export function FolderPickerTip({ copied, className }: { copied: boolean; className?: string }) {
  const keys = /Mac/.test(navigator.platform) ? ["⌘⇧G", "⌘V", "↩"] : ["Ctrl+L", "Ctrl+V", "Enter"]
  return (
    <p className={cn(className, copied && "rounded-md border border-emerald-600/25 bg-emerald-500/10 px-3 py-2.5 text-[17px]")}>
      <span className={copied ? "text-emerald-800 dark:text-emerald-300" : undefined}>
        <span role="status" className={copied ? "font-semibold" : undefined}>
          {copied
            ? <><Check className="inline h-4 w-4 align-[-3px]" aria-hidden="true" /> Folder path copied.</>
            : "Choose folder copies its path."}
        </span>{" "}
        {copied ? "To jump right to it" : "To jump to it"} in the picker, press{" "}
        <span className="whitespace-nowrap">
          {keys.map((key, index) => (
            <React.Fragment key={key}>
              {index > 0 && <><span className="mx-1 opacity-60" aria-hidden="true">→</span><span className="sr-only">then</span></>}
              <kbd
                className={cn(
                  "rounded border px-1 font-mono text-[0.9em]",
                  copied ? "border-emerald-600/30 bg-background font-semibold" : "bg-muted",
                )}>
                {key}
              </kbd>
            </React.Fragment>
          ))}
        </span>
      </span>
    </p>
  )
}

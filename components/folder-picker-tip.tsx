import { t, tRich } from "~lib/i18n"
import { Check, Lightbulb } from "lucide-react"
import React from "react"

import { cn } from "~lib/utils"

// Chrome's folder picker can't open at a given path, so Choose folder copies
// the path and this tip shows the key that jumps to it.
export function FolderPickerTip({ copied, className }: { copied: boolean; className?: string }) {
  const goToFolderKey = /Mac/.test(navigator.platform) ? "⌘⇧G" : "Ctrl+L"
  return (
    <p className={cn(className, "rounded-md border px-3 py-2.5", copied ? "border-emerald-600/25 bg-emerald-500/10" : "border-transparent bg-foreground/5")}>
      <span className={copied ? "text-emerald-800 dark:text-emerald-300" : undefined}>
        <span role="status" className={copied ? "font-semibold" : undefined}>
          {copied
            ? <><Check className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" /> {t("Folder path copied.")}</>
            : <><Lightbulb className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" /> {t("Clicking the button also copies the folder path.")}</>}
        </span>{" "}
        {tRich("In the folder picker, press {0} and paste the path to quickly locate the folder.",
          <kbd
            className={cn(
              "whitespace-nowrap rounded border px-1 font-mono text-[0.9em]",
              copied ? "border-emerald-600/30 bg-background font-semibold" : "bg-background",
            )}>
            {goToFolderKey}
          </kbd>)}
      </span>
    </p>
  )
}

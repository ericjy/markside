import React,{ useEffect,useRef,useState } from "react"
import {
  clampSplitPercent,
  getSplitMinWidth,
  MIN_SPLIT_PANE_WIDTH,
  setSplitPercent,
} from "~lib/markdown-mode"

type SidebarState = { leftOpen: boolean; outlineOpen: boolean }

interface UseContentSplitPaneOptions {
  initialSplitPercent: number
  initialSidebarState: { stateBeforeSplit: SidebarState | null; wasSplitView: boolean }
  isSplitView: boolean
  leftOpen: boolean
  setLeftOpen: React.Dispatch<React.SetStateAction<boolean>>
  outlineOpen: boolean
  setOutlineOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export function useContentSplitPane({
  initialSplitPercent,
  initialSidebarState,
  isSplitView,
  leftOpen,
  setLeftOpen,
  outlineOpen,
  setOutlineOpen,
}: UseContentSplitPaneOptions) {
  const [previewPercent, setPreviewPercent] = useState(initialSplitPercent)
  const previewPercentRef = useRef(initialSplitPercent)
  const splitContainerRef = useRef<HTMLDivElement>(null)
  const sidebarStateBeforeSplitRef = useRef(initialSidebarState.stateBeforeSplit)
  const wasSplitViewRef = useRef(initialSidebarState.wasSplitView)

  // Split view needs the width, so both sidebars close on entry and reopen on exit.
  useEffect(() => {
    if (isSplitView === wasSplitViewRef.current) return
    wasSplitViewRef.current = isSplitView

    if (isSplitView) {
      sidebarStateBeforeSplitRef.current = { leftOpen, outlineOpen }
      setLeftOpen(false)
      setOutlineOpen(false)
      return
    }

    const previousState = sidebarStateBeforeSplitRef.current
    sidebarStateBeforeSplitRef.current = null
    if (!previousState) return
    setLeftOpen(previousState.leftOpen)
    setOutlineOpen(previousState.outlineOpen)
  }, [isSplitView])

  const updateSplitFromClientX = (clientX: number) => {
    const container = splitContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const desired = ((clientX - rect.left) / rect.width) * 100
    previewPercentRef.current = clampSplitPercent(desired, rect.width)
    setPreviewPercent(previewPercentRef.current)
  }

  // Dragging updates on every pointer move, so the split is stored once it settles.
  const storeSplitPercent = () => {
    void setSplitPercent(previewPercentRef.current).catch(() => undefined)
  }

  const adjustSplitBy = (delta: number) => {
    const width =
      splitContainerRef.current?.getBoundingClientRect().width ??
      MIN_SPLIT_PANE_WIDTH * 2
    previewPercentRef.current = clampSplitPercent(previewPercentRef.current + delta, width)
    setPreviewPercent(previewPercentRef.current)
    storeSplitPercent()
  }

  return {
    previewPercent,
    splitContainerRef,
    splitMinWidth: getSplitMinWidth(previewPercent),
    updateSplitFromClientX,
    storeSplitPercent,
    adjustSplitBy,
  }
}

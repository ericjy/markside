// components/SidebarRight.tsx
import { ChevronRight, X } from "lucide-react"
import React, { useRef } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "~components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "~components/ui/sidebar"
import { groupHeadings, type Heading, type OutlineGroup } from "~lib/headings"

interface SidebarRightProps {
  headings: Heading[]
  activeHeadingId?: string | null
  onHeadingClick?: (id: string) => void
  open?: boolean
  width?: number
  onResize?: (width: number) => void
  onClose?: () => void
}

export function SidebarRight({
  headings,
  activeHeadingId,
  onHeadingClick,
  open = true,
  width = 300,
  onResize,
  onClose,
}: SidebarRightProps) {
  const groups = groupHeadings(headings)
  const outlineButtonClass = "relative h-auto min-h-8 cursor-pointer rounded-l-none rounded-r-md border-l-2 border-transparent px-3 py-1.5 text-[13px] leading-5 text-sidebar-foreground/60 transition-[background-color,border-color,color] hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-[active=true]:border-sidebar-foreground/70 data-[active=true]:bg-sidebar-accent/80 data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground"
  const widthRef = useRef(width)
  widthRef.current = width

  const onResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = widthRef.current
    const pointerId = e.pointerId
    const handle = e.currentTarget
    handle.setPointerCapture(pointerId)
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      onResize?.(Math.max(180, Math.min(520, startWidth + startX - ev.clientX)))
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointercancel", onUp)
      if (handle.hasPointerCapture(pointerId)) {
        handle.releasePointerCapture(pointerId)
      }
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onUp)
    document.addEventListener("pointercancel", onUp)
  }

  const scrollTo = (id: string) => {
    if (!id) return
    if (onHeadingClick) {
      onHeadingClick(id)
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // All items use SidebarMenuButton (w-full) so ml-auto chevrons align at the same right edge.
  // Indentation is expressed via pl-* overrides instead of nested SidebarMenuSub containers.

  const renderLeaf = (item: { id: string; title: string }, pl: string) => (
    <SidebarMenuItem key={item.id}>
      <SidebarMenuButton
        aria-current={item.id === activeHeadingId ? "location" : undefined}
        isActive={item.id === activeHeadingId}
        onClick={() => scrollTo(item.id)}
        title={item.title}
        className={`${outlineButtonClass} ${pl}`}>
        <span className="truncate">{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )

  // H2 rendered inside H1's CollapsibleContent — indented one level
  const renderH2InH1 = (sub: OutlineGroup, key: number) => {
    if (sub.items.length > 0) {
      return (
        <Collapsible key={key} defaultOpen className="group/h2-collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                aria-current={sub.id === activeHeadingId ? "location" : undefined}
                isActive={sub.id === activeHeadingId}
                onClick={() => scrollTo(sub.id)}
                title={sub.title}
                className={`${outlineButtonClass} pl-5`}>
                <span className="flex-1 truncate font-medium text-sidebar-foreground/80">{sub.title}</span>
                <ChevronRight className="ml-auto h-3 w-3 shrink-0 transition-transform group-data-[state=open]/h2-collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-5 border-l border-sidebar-border">
                <SidebarMenu>
                  {sub.items.map((item) => renderLeaf(item, item.level >= 4 ? "pl-7" : "pl-4"))}
                </SidebarMenu>
              </div>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      )
    }
    return (
      <SidebarMenuItem key={key}>
        <SidebarMenuButton
          aria-current={sub.id === activeHeadingId ? "location" : undefined}
          isActive={sub.id === activeHeadingId}
          onClick={() => scrollTo(sub.id)}
          title={sub.title}
          className={`${outlineButtonClass} pl-5`}>
          <span className="truncate font-medium text-sidebar-foreground/80">{sub.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  const renderGroup = (group: OutlineGroup, gi: number) => {
    // Anonymous orphan group (H3/H4 before any H1/H2) — render flat
    if (group.id === "" && group.title === "") {
      return (
        <React.Fragment key={gi}>
          {group.items.map((item) => renderLeaf(item, ""))}
        </React.Fragment>
      )
    }

    if (group.level === 1) {
      const hasChildren = group.subgroups.length > 0 || group.items.length > 0
      if (hasChildren) {
        return (
          <Collapsible key={gi} defaultOpen className="group/collapsible">
            <SidebarMenuItem className={gi > 0 ? "mt-2" : ""}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  aria-current={group.id === activeHeadingId ? "location" : undefined}
                  isActive={group.id === activeHeadingId}
                  onClick={() => scrollTo(group.id)}
                  title={group.title}
                  className={outlineButtonClass}>
                  <span className="flex-1 truncate text-sm font-semibold text-sidebar-foreground/90">{group.title}</span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu>
                  {group.subgroups.map((sub, si) => renderH2InH1(sub, si))}
                  {group.items.map((item) => renderLeaf(item, "pl-5"))}
                </SidebarMenu>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        )
      }
      // H1 with no children — flat
      return (
        <SidebarMenuItem key={gi} className={gi > 0 ? "mt-2" : ""}>
          <SidebarMenuButton
            aria-current={group.id === activeHeadingId ? "location" : undefined}
            isActive={group.id === activeHeadingId}
            onClick={() => scrollTo(group.id)}
            title={group.title}
            className={outlineButtonClass}>
            <span className="truncate text-sm font-semibold text-sidebar-foreground/90">{group.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    }

    // Standalone H2 at top level (no parent H1)
    if (group.items.length > 0) {
      return (
        <Collapsible key={gi} defaultOpen className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                aria-current={group.id === activeHeadingId ? "location" : undefined}
                isActive={group.id === activeHeadingId}
                onClick={() => scrollTo(group.id)}
                title={group.title}
                className={outlineButtonClass}>
                <span className="flex-1 truncate font-medium text-sidebar-foreground/80">{group.title}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-2 border-l border-sidebar-border">
                <SidebarMenu>
                  {group.items.map((item) => renderLeaf(item, item.level >= 4 ? "pl-7" : "pl-4"))}
                </SidebarMenu>
              </div>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      )
    }

    // Standalone H2 with no items — flat
    return (
      <SidebarMenuItem key={gi}>
        <SidebarMenuButton
          aria-current={group.id === activeHeadingId ? "location" : undefined}
          isActive={group.id === activeHeadingId}
          onClick={() => scrollTo(group.id)}
          title={group.title}
          className={outlineButtonClass}>
          <span className="truncate font-medium text-sidebar-foreground/80">{group.title}</span>
          </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close outline"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-foreground/15 backdrop-blur-[1px] print:hidden xl:hidden"
        />
      )}
      <Sidebar
        data-markside-right-sidebar
        side="right"
        collapsible="none"
        style={{ "--sidebar-width": `${width}px` } as React.CSSProperties}
        className={`fixed inset-y-0 right-0 z-50 h-svh overflow-hidden bg-background/95 text-foreground shadow-2xl backdrop-blur-md transition-[width,opacity] duration-200 ease-out print:hidden xl:sticky xl:inset-auto xl:top-0 xl:z-auto xl:h-[calc(100svh-3rem)] xl:self-start xl:bg-transparent xl:shadow-none xl:backdrop-blur-none ${open ? "w-[--sidebar-width] opacity-100" : "w-0 opacity-0 pointer-events-none"}`}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close outline"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring xl:hidden">
          <X size={15} />
        </button>
        <SidebarContent className="gap-0 px-3 pt-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:pl-4 xl:pr-8">
          {headings.length === 0 ? (
            <div className="px-2 py-8 text-xs text-muted-foreground">
              No headings found
            </div>
          ) : (
            <SidebarGroup className="p-0 pb-10">
              <SidebarGroupLabel className="mb-2 h-7 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45">
                On this page
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {groups.map((group, gi) => renderGroup(group, gi))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <div
          onPointerDown={onResizeStart}
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-20 w-2 cursor-col-resize touch-none transition-colors after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-transparent hover:after:bg-sidebar-border"
        />
      </Sidebar>
    </>
  )
}

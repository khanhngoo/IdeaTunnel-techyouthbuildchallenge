"use client"
import * as React from "react"
import { Search, Plus, BookOpen, Boxes, Bot } from "lucide-react"
import { MoreHorizontal } from "lucide-react"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ChatItem = { id: string; title: string; summary?: string }

function loadChats(): ChatItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('weave:chats')
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function saveChats(chats: ChatItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('weave:chats', JSON.stringify(chats))
}

export function AppSidebar(
  props: React.ComponentProps<typeof Sidebar> & { onOpenCommand?: () => void }
) {
  const router = require('next/navigation').useRouter()
  const pathname = require('next/navigation').usePathname()
  const [chats, setChats] = React.useState<ChatItem[]>([])
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [draftTitle, setDraftTitle] = React.useState<string>("")
  React.useEffect(()=>{ setChats(loadChats()) }, [])

  const createChat = React.useCallback(()=>{
    const id = Math.random().toString(36).slice(2, 9)
    const title = "Untitled"
    const next = [{ id, title }, ...chats]
    setChats(next)
    saveChats(next)
    router.push(`/workflow/${id}`)
  }, [chats, router])

  const openChat = React.useCallback((id: string)=>{
    router.push(`/workflow/${id}`)
  }, [router])

  const deleteChat = React.useCallback((id: string)=>{
    const next = chats.filter(c => c.id !== id)
    setChats(next)
    saveChats(next)
    if (pathname && pathname.startsWith('/workflow/') && pathname.endsWith(id)) {
      const fallback = next[0]?.id
      router.push(fallback ? `/workflow/${fallback}` : `/workflow`)
    }
  }, [chats, pathname, router])

  const renameChat = React.useCallback((id: string)=>{
    const current = chats.find(c => c.id === id)
    setEditingId(id)
    setDraftTitle(current?.title ?? 'Untitled')
  }, [chats])

  const commitRename = React.useCallback(()=>{
    if (!editingId) return
    const trimmed = draftTitle.trim()
    if (trimmed.length === 0) { setEditingId(null); return }
    const next = chats.map(c => c.id === editingId ? { ...c, title: trimmed } : c)
    setChats(next)
    saveChats(next)
    setEditingId(null)
  }, [editingId, draftTitle, chats])

  const cancelRename = React.useCallback(()=>{
    setEditingId(null)
  }, [])

  return (
    <Sidebar collapsible="icon" {...props} variant="floating">
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold group-data-[collapsible=icon]:hidden">IdeaTunnel</div>
          <div className="flex items-center gap-1">
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Primary actions (like ChatGPT) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={createChat}>
                  <Plus className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">New chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => props.onOpenCommand?.()}>
                  <Search className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Search chats</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Saved spaces / projects (examples) */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-xs">Templates (Coming Soon)</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Boxes className="h-4 w-4" />
                  <span>Business Model Canvas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Bot className="h-4 w-4" />
                  <span>Saas Product Roadmap</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chats list */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((c) => {
                const isActive = typeof pathname === 'string' && pathname === `/workflow/${c.id}`
                return (
                  <SidebarMenuItem key={c.id} className={isActive ? "bg-muted/70 rounded-md" : undefined}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      {editingId === c.id ? (
                        <input
                          autoFocus
                          value={draftTitle}
                          onChange={(e)=>setDraftTitle(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e)=>{ if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') cancelRename(); }}
                          className="flex-1 h-7 px-2 rounded border border-input bg-background text-sm"
                        />
                      ) : (
                        <SidebarMenuButton title={c.summary} onClick={()=>openChat(c.id)} className="flex-1 text-left">
                          {c.title}
                        </SidebarMenuButton>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button aria-label="More" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="right" align="start">
                                <DropdownMenuItem onClick={()=>renameChat(c.id)}>Rename chat</DropdownMenuItem>
                                <DropdownMenuItem onClick={()=>deleteChat(c.id)}>Delete chat</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TooltipTrigger>
                          <TooltipContent>More actions</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="text-xs text-muted-foreground px-2">{chats.length} chats</div>
      </SidebarFooter>
    </Sidebar>
  )
}
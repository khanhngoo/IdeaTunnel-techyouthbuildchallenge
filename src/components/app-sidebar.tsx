import * as React from "react"
import { Search, Plus, BookOpen, Boxes, Bot } from "lucide-react"
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

const chats = [
  { id: "c3", title: "New Product Pitch", summary: "Ideation around core value" },
  { id: "c2", title: "Brainstorm A", summary: "Market and problem fit" },
  { id: "c1", title: "Idea B", summary: "User interviews synthesis" },
]

export function AppSidebar(
  props: React.ComponentProps<typeof Sidebar> & { onOpenCommand?: () => void }
) {
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
                <SidebarMenuButton>
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
              {chats.map((c) => (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton title={c.summary}>{c.title}</SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
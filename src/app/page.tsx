"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase, isSupabaseConfigured, ensureUserBootstrap } from "@/lib/supabase.client";

export default function Home() {
  const router = useRouter();
  const onStart = React.useCallback(async () => {
    // If Supabase available and user logged in → create chat in DB and use UUID id
    if (isSupabaseConfigured()) {
      const { data: sess } = await supabase!.auth.getSession();
      if (sess.session) {
        const { workspaceId } = await ensureUserBootstrap();
        const { data, error } = await supabase!.from('chats').insert({ title: 'Untitled', workspace_id: workspaceId }).select('id').single();
        if (!error && data?.id) {
          router.push(`/workflow/${data.id}`);
          return;
        }
      }
    }
    // Fallback (no session / no supabase): use short id and localStorage flow
    const localId = Math.random().toString(36).slice(2, 9);
    router.push(`/workflow/${localId}`);
  }, [router]);
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="workflow" style={{ position: "fixed", inset: 0 }}>
        <div className="absolute left-2 top-2 z-50">
          <SidebarTrigger />
        </div>
        <main className="w-full h-screen grid place-items-center">
          <button onClick={onStart} className="px-4 py-2 border rounded text-sm font-medium">Start Canvas</button>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

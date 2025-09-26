"use client";
import dynamic from "next/dynamic";
import * as React from "react";

const WorkflowCanvas = dynamic(() => import("../Canvas"), { ssr: false });

export default function WorkflowChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = React.use(params);
  const key = `workflow:${chatId}`;
  return (
    <main className="w-full h-screen">
      <WorkflowCanvas persistenceKey={key} />
    </main>
  );
}



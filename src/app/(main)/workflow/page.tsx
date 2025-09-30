"use client";
import dynamic from "next/dynamic";

const WorkflowCanvas = dynamic(() => import("@/features/workflow/components/Canvas"), { ssr: false });

export default function WorkflowPage() {
  return (
    <main className="w-full h-screen">
      <WorkflowCanvas />
    </main>
  );
}

"use client";
import dynamic from "next/dynamic";

const WorkflowCanvas = dynamic(() => import("./Canvas"), { ssr: false });

export default function WorkflowPage() {
  return (
    <main className="w-full h-screen">
      <WorkflowCanvas />
    </main>
  );
}

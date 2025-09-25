"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "tldraw";
import { createShapeId, TLShapeId } from "tldraw";
import { NodeShape } from "../nodes/NodeShapeUtil";
import { getNodePorts } from "../nodes/nodePorts";
import { ConnectionShape } from "../connection/ConnectionShapeUtil";
import { createOrUpdateConnectionBinding } from "../connection/ConnectionBindingUtil";
import { DEFAULT_NODE_SPACING_PX, NODE_WIDTH_PX } from "../constants";

type RootChatOverlayProps = {
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
};

export function RootChatOverlay({ visible, x, y, onClose }: RootChatOverlayProps) {
  const editor = useEditor();
  const [idea, setIdea] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [streamText, setStreamText] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!visible) {
      setIdea("");
      setStreamText("");
      setSubmitting(false);
    }
  }, [visible]);

  const boxStyle = useMemo(() => ({
    // Use fixed overlay centered in viewport to avoid page/viewport coord mismatch
    position: "fixed" as const,
    left: '50%',
    top: '30%',
    transform: "translate(-50%, -30%)",
    zIndex: 1000,
    background: "#fff",
    color: "#000",
    border: "1px solid #000",
    borderRadius: 12,
    width: 640,
    maxWidth: "calc(100vw - 32px)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  }), [x, y]);

  const startFanout = useCallback(async (parentId: TLShapeId, ideaForFanout: string) => {
    try {
      const res = await fetch('/api/llm/fanout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea: ideaForFanout }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // map
      editor.markHistoryStoppingPoint('auto-fanout');
      editor.run(() => {
        const parentBounds = editor.getShapePageBounds(parentId)!;
        const parentPorts = getNodePorts(editor, parentId);
        const parentOut = Object.values(parentPorts).find(p => p.terminal === 'start');
        const center = { x: parentBounds.midX, y: parentBounds.midY };
        const branches = (data?.branches ?? []) as Array<{ title: string; file: string; sections: Array<{ title: string; bullets: string[] }> }>;
        const radius = Math.max(parentBounds.width, parentBounds.height) + 200;
        branches.forEach((branch, i) => {
          const angle = (i / Math.max(1, branches.length)) * Math.PI * 2;
          const bx = center.x + Math.cos(angle) * radius;
          const by = center.y + Math.sin(angle) * radius;
          const branchId = createShapeId();
          editor.createShape<NodeShape>({
            type: 'node', id: branchId, x: bx - NODE_WIDTH_PX / 2, y: by,
            props: { node: { type: 'message', title: branch.title, userMessage: '', assistantMessage: `# ${branch.file}\n`, isExpanded: true, isEditingTitle: false } as any }
          });
          const branchPorts = getNodePorts(editor, branchId);
          const branchIn = Object.values(branchPorts).find(p => p.terminal === 'end');
          if (parentOut && branchIn) {
            const connId = createShapeId();
            editor.createShape<ConnectionShape>({ type: 'connection', id: connId });
            createOrUpdateConnectionBinding(editor, connId, parentId, { portId: parentOut.id, terminal: 'start' });
            createOrUpdateConnectionBinding(editor, connId, branchId, { portId: branchIn.id, terminal: 'end' });
          }
          let yCursor = by + 160;
          for (const section of branch.sections) {
            const content = ['- ' + (section.bullets ?? []).join('\n- ')].join('\n');
            const subId = createShapeId();
            editor.createShape<NodeShape>({
              type: 'node', id: subId, x: bx - NODE_WIDTH_PX / 2, y: yCursor,
              props: { node: { type: 'message', title: section.title, userMessage: '', assistantMessage: content, isExpanded: true, isEditingTitle: false } as any }
            });
            const subPorts = getNodePorts(editor, subId);
            const branchOut = Object.values(branchPorts).find(p => p.terminal === 'start');
            const subIn = Object.values(subPorts).find(p => p.terminal === 'end');
            if (branchOut && subIn) {
              const c2 = createShapeId();
              editor.createShape<ConnectionShape>({ type: 'connection', id: c2 });
              createOrUpdateConnectionBinding(editor, c2, branchId, { portId: branchOut.id, terminal: 'start' });
              createOrUpdateConnectionBinding(editor, c2, subId, { portId: subIn.id, terminal: 'end' });
            }
            yCursor += DEFAULT_NODE_SPACING_PX + 180;
          }
        });
      });
    } catch (e) {
      console.error(e);
    }
  }, [editor]);

  const onSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!idea.trim() || isSubmitting) return;
    setSubmitting(true);
    try {
      // 1) Stream a short description
      const messages = [{ role: 'user', content: `Write a concise 3-6 bullet summary for this idea (no preface). Idea: ${idea}` }];
      const res = await fetch('/api/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messages) });
      let description = '';
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const maybeSse = chunk.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.replace(/^data:\s?/, '')).join('');
          description += maybeSse || chunk;
          setStreamText(description);
        }
      }
      // 2) Title normalization (<=60 chars)
      const titlePrompt = [{ role: 'user', content: `Normalize this idea into a clean product title under 60 chars (no quotes). Idea: ${idea}` }];
      const titleRes = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(titlePrompt) });
      const rawTitle = await titleRes.text();
      const title = rawTitle.trim().slice(0, 60);

      // 3) Create main message node at overlay position
      const nodeId = createShapeId();
      editor.createShape<NodeShape>({
        type: 'node', id: nodeId, x: x - NODE_WIDTH_PX / 2, y: y - 27,
        props: { node: { type: 'message', title, userMessage: idea, assistantMessage: description, isExpanded: true, isEditingTitle: false } as any }
      });

      onClose();
      // 4) Auto fanout
      await startFanout(nodeId, idea);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [idea, isSubmitting, editor, x, y, onClose, startFanout]);

  if (!visible) return null;

  return (
    <div ref={containerRef} style={boxStyle} onPointerDown={(e) => e.stopPropagation()}>
      <form onSubmit={onSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
        <button type="button" aria-label="preset" title="product package" style={{ border: 'none', background: 'transparent', fontWeight: 700 }}>+</button>
        <input
          placeholder="What’s on the agenda today?"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          style={{ flex: 1, border: '1px solid #000', borderRadius: 8, padding: '10px 12px', outline: 'none' }}
        />
      </form>
      {isSubmitting && (
        <div style={{ borderTop: '1px solid #000', padding: 12, maxHeight: 160, overflow: 'auto', fontSize: 14 }}>
          {streamText || 'Generating…'}
        </div>
      )}
    </div>
  );
}



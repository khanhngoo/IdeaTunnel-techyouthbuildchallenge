"use client";

import { Editor, TLShapeId } from "tldraw";
import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";
import { getNodePortConnections } from "../nodes/nodePorts";
import { NODE_WIDTH_PX } from "../constants";

type TreeNode = { id: TLShapeId; children: TreeNode[] };

function buildTree(editor: Editor, rootId: TLShapeId, visited = new Set<TLShapeId>()): TreeNode {
  visited.add(rootId);
  const children: TreeNode[] = [];
  const conns = getNodePortConnections(editor, rootId);
  for (const c of conns) {
    if (c.terminal !== 'start') continue; // only outward edges
    const childId = c.connectedShapeId as TLShapeId;
    if (visited.has(childId)) continue;
    children.push(buildTree(editor, childId, visited));
  }
  return { id: rootId, children };
}

export function layoutTreeFrom(
  editor: Editor,
  rootId: TLShapeId,
  options?: { dx?: number; dy?: number; marginX?: number; marginY?: number }
) {
  const marginX = options?.marginX ?? 40;
  const marginY = options?.marginY ?? 80;
  // 1) Build tree data & collect node ids to compute average size
  const data = buildTree(editor, rootId);
  const root = hierarchy<TreeNode>(data, d => d.children);

  let totalW = 0, totalH = 0, count = 0;
  root.each((n) => {
    const b = editor.getShapePageBounds(n.data.id);
    if (b) { totalW += b.width; totalH += b.height; count++; }
  });
  const avgW = count ? totalW / count : NODE_WIDTH_PX;
  const avgH = count ? totalH / count : 54;

  // space horizontally by avg node width + margin, vertically by desired level gap
  const dx = options?.dx ?? (avgW + marginX);
  const dy = options?.dy ?? (avgH + 220 + marginY);

  // 2) Compute layout using tidy tree
  tree<TreeNode>()
    .nodeSize([dx, dy])
    .separation((a, b) => (a.parent === b.parent ? 1.3 : 2.2))(root);

  // 3) Map coordinates to tldraw positions around current root
  const rootBounds = editor.getShapePageBounds(rootId);
  if (!rootBounds) return;
  const origin = { x: rootBounds.midX, y: rootBounds.midY };

  const updates: any[] = [];
  root.each((node: HierarchyPointNode<TreeNode>) => {
    const shapeId = node.data.id as TLShapeId;
    const x = origin.x + node.x - NODE_WIDTH_PX / 2;
    const y = origin.y + node.y;
    updates.push({ id: shapeId, type: 'node', x, y });
  });

  editor.animateShapes(updates, { animation: { duration: 160 } });
}


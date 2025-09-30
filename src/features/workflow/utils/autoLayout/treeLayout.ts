"use client";

import { Editor, TLShapeId } from "tldraw";
import { hierarchy, tree, type HierarchyNode, type HierarchyPointNode } from "d3-hierarchy";
import { getNodePortConnections } from "../../nodes/nodePorts";
import { NODE_WIDTH_PX } from "../../components/constants";

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
  const marginX = options?.marginX ?? 60;
  const marginY = options?.marginY ?? 140;
  
  // 1) Build tree data & collect actual node dimensions
  const data = buildTree(editor, rootId);
  const root = hierarchy<TreeNode>(data, (d: TreeNode) => d.children);

  // Collect actual bounds for all nodes
  const nodeBounds = new Map<TLShapeId, { width: number; height: number }>();
  let totalH = 0, totalW = 0, count = 0;
  
  root.each((n: HierarchyNode<TreeNode>) => {
    const bounds = editor.getShapePageBounds(n.data.id);
    if (bounds) {
      nodeBounds.set(n.data.id, { 
        width: bounds.width, 
        height: bounds.height 
      });
      totalH += bounds.height;
      totalW += bounds.width;
      count++;
    }
  });
  
  const avgH = count ? totalH / count : 54;
  const avgW = count ? totalW / count : NODE_WIDTH_PX;

  // Dynamic spacing based on actual node widths
  const getHorizontalSpacing = (nodeA: HierarchyPointNode<TreeNode>, nodeB: HierarchyPointNode<TreeNode>) => {
    const widthA = nodeBounds.get(nodeA.data.id)?.width ?? NODE_WIDTH_PX;
    const widthB = nodeBounds.get(nodeB.data.id)?.width ?? NODE_WIDTH_PX;
    return (widthA + widthB) / 2 + marginX;
  };

  // Calculate optimal dx based on maximum width to prevent overlap
  const maxW = Math.max(...Array.from(nodeBounds.values()).map(b => b.width), NODE_WIDTH_PX);
  const dx = options?.dx ?? (maxW + marginX);
  const dy = options?.dy ?? (avgH + 260 + marginY);

  // 2) Compute layout using tidy tree with proper node width calculation
  tree<TreeNode>()
    .nodeSize([dx, 1])
    .separation((a: HierarchyPointNode<TreeNode>, b: HierarchyPointNode<TreeNode>) => {
      // Calculate actual spacing based on node widths to prevent overlap
      const widthA = nodeBounds.get(a.data.id)?.width ?? NODE_WIDTH_PX;
      const widthB = nodeBounds.get(b.data.id)?.width ?? NODE_WIDTH_PX;
      const actualSpacing = (widthA + widthB) / 2 + marginX;
      
      // Normalize to dx units
      return actualSpacing / dx;
    })(root);

  // Tính max height cho mỗi depth (bao gồm content/chatbar hiện tại)
  const maxHByDepth = new Map<number, number>();
  root.each((n: HierarchyNode<TreeNode>) => {
    const h = nodeBounds.get(n.data.id)?.height ?? avgH;
    const cur = maxHByDepth.get(n.depth) ?? 0;
    if (h > cur) maxHByDepth.set(n.depth, h);
  });
  // Khoảng cách theo level = maxHeight(level) + padding dọc
  const levelGapByDepth = new Map<number, number>();
  maxHByDepth.forEach((h, depth) => {
    levelGapByDepth.set(depth, h + 260 + marginY);
  });
  // Prefix sum để scale y theo depth
  const prefixGap: number[] = [];
  let acc = 0;
  for (let d = 0; d <= (root.height ?? 0); d++) {
    prefixGap[d] = acc;
    acc += levelGapByDepth.get(d) ?? (avgH + 260 + marginY);
  }
  root.each((n: HierarchyNode<TreeNode>) => {
    (n as HierarchyPointNode<TreeNode>).y = prefixGap[n.depth];
  });

  // Post-pass: re-center each depth level to fix rightward drift
  const nodesByDepth = new Map<number, HierarchyPointNode<TreeNode>[]>();
  root.each((n: HierarchyNode<TreeNode>) => {
    const arr = nodesByDepth.get(n.depth) ?? [];
    arr.push(n as HierarchyPointNode<TreeNode>);
    nodesByDepth.set(n.depth, arr);
  });
  
  console.log(`\n--- Re-centering each depth level ---`);
  nodesByDepth.forEach((arr, depth) => {
    if (arr.length <= 1) return; // Skip single nodes
    
    // Calculate current center
    const minX = Math.min(...arr.map(n => n.x));
    const maxX = Math.max(...arr.map(n => n.x));
    const currentCenter = (minX + maxX) / 2;
    const offset = -currentCenter; // Move to center at x=0
    
    console.log(`Depth ${depth}: center=${currentCenter.toFixed(1)}, offset=${offset.toFixed(1)}`);
    
    // Apply offset to all nodes at this depth
    arr.forEach(node => {
      const oldX = node.x;
      node.x += offset;
      console.log(`  ${node.data.id}: ${oldX.toFixed(1)} -> ${node.x.toFixed(1)}`);
    });
  });

  // 3) Map coordinates to tldraw positions around current root
  const rootBounds = editor.getShapePageBounds(rootId);
  if (!rootBounds) return;
  const origin = { x: rootBounds.midX, y: rootBounds.midY };

  // Debug logging: Log node information before positioning
  console.log("=== TREE LAYOUT DEBUG ===");
  console.log(`Total nodes: ${count}, avgW: ${avgW.toFixed(1)}px, maxW: ${maxW.toFixed(1)}px, avgH: ${avgH.toFixed(1)}px`);
  console.log(`dx: ${dx.toFixed(1)}px, dy: ${dy.toFixed(1)}px`);
  
  const nodesByDepthDebug = new Map<number, Array<{id: string, x: number, y: number, width: number, height: number}>>();
  root.each((node: HierarchyNode<TreeNode>) => {
    const pointNode = node as HierarchyPointNode<TreeNode>;
    const bounds = nodeBounds.get(node.data.id);
    const width = bounds?.width ?? NODE_WIDTH_PX;
    const height = bounds?.height ?? avgH;
    
    const arr = nodesByDepthDebug.get(node.depth) ?? [];
    arr.push({
      id: node.data.id,
      x: pointNode.x,
      y: pointNode.y,
      width,
      height
    });
    nodesByDepthDebug.set(node.depth, arr);
  });
  
  // Log nodes by depth
  nodesByDepthDebug.forEach((nodes, depth) => {
    console.log(`\n--- Depth ${depth} (${nodes.length} nodes) ---`);
    nodes.forEach(node => {
      console.log(`  ${node.id}: x=${node.x.toFixed(1)}, y=${node.y.toFixed(1)}, w=${node.width.toFixed(1)}, h=${node.height.toFixed(1)}`);
    });
  });

  const updates: any[] = [];
  console.log(`\n--- Final positioning (origin: ${origin.x.toFixed(1)}, ${origin.y.toFixed(1)}) ---`);
  
  root.each((node: HierarchyNode<TreeNode>) => {
    const pointNode = node as HierarchyPointNode<TreeNode>;
    const shapeId = node.data.id as TLShapeId;
    const actualWidth = nodeBounds.get(node.data.id)?.width ?? NODE_WIDTH_PX;
    
    // Position based on actual width
    const x = origin.x + pointNode.x - actualWidth / 2;
    const y = origin.y + pointNode.y;
    
    console.log(`  ${shapeId}: treePos(${pointNode.x.toFixed(1)}, ${pointNode.y.toFixed(1)}) -> finalPos(${x.toFixed(1)}, ${y.toFixed(1)}) w=${actualWidth.toFixed(1)}`);
    
    updates.push({ id: shapeId, type: 'node', x, y });
  });

  editor.animateShapes(updates, { animation: { duration: 160 } });
}


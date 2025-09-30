"use client";

import {
	AssetToolbarItem,
	CheckBoxToolbarItem,
	CloudToolbarItem,
	createShapeId,
	DefaultContextMenu,
	DefaultToolbar,
	DiamondToolbarItem,
	DrawToolbarItem,
	Editor,
	EllipseToolbarItem,
	HandToolbarItem,
	HeartToolbarItem,
	HexagonToolbarItem,
	HighlightToolbarItem,
	LaserToolbarItem,
	NoteToolbarItem,
	onDragFromToolbarToCreateShape,
	OvalToolbarItem,
	RectangleToolbarItem,
	RhombusToolbarItem,
	SelectToolbarItem,
	StarToolbarItem,
	TextToolbarItem,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiMenuGroup,
	TLShapeId,
	TLUiOverrides,
	ToolbarItem,
	TriangleToolbarItem,
	Vec,
	XBoxToolbarItem,
	useActions,
	useEditor,
	useValue,
} from "tldraw";
import { NodeShape } from "../nodes/NodeShapeUtil";
import { getNodeDefinitions, NodeType } from "../nodes/nodeTypes";
import { getNodePorts } from "../nodes/nodePorts";
import { createOrUpdateConnectionBinding } from "../connection/ConnectionBindingUtil";
import { ConnectionShape } from "../connection/ConnectionShapeUtil";
import { DEFAULT_NODE_SPACING_PX, NODE_WIDTH_PX } from "./constants";
import { RootChatOverlay } from "./RootChatOverlay";
import { useState } from "react";
// (no extra imports)

function createNodeShape(editor: Editor, shapeId: TLShapeId, center: Vec, node: NodeType) {
	// Mark a history stopping point for undo/redo
	const markId = editor.markHistoryStoppingPoint('create node')

	editor.run(() => {
		// Create the shape with the node definition
		editor.createShape<NodeShape>({
			id: shapeId,
			type: 'node',
			props: { node },
		})

		// Get the created shape and its bounds
		const shape = editor.getShape<NodeShape>(shapeId)!
		const shapeBounds = editor.getShapePageBounds(shapeId)!

		// Position the shape so its center aligns with the drop point
		const x = center.x - shapeBounds.width / 2
		const y = center.y - shapeBounds.height / 2
		editor.updateShape({ ...shape, x, y })

		// Select the newly created shape
		editor.select(shapeId)
	})

	return markId
}

// Custom context menu for nodes
export function NodeContextMenu() {
	const editor = useEditor();
	const selectedShapes = useValue('selectedShapes', () => editor.getSelectedShapes(), [editor]);
	
	const isNodeSelected = selectedShapes.length === 1 && selectedShapes[0]?.type === 'node';
	
	const handleRename = () => {
		if (!isNodeSelected) return;
		
		const shape = selectedShapes[0] as NodeShape;
		const currentTitle = (shape.props.node as any).title || 'New Message';
		const newTitle = prompt('Enter new name:', currentTitle);
		
		if (newTitle && newTitle !== currentTitle) {
			editor.updateShape({
				id: shape.id,
				type: 'node',
				props: {
					node: {
						...shape.props.node,
						title: newTitle,
					},
				},
			});
		}
	};
	
	// Always return default context menu for now
	return <DefaultContextMenu />;
}

export const overrides: TLUiOverrides = {
	tools: (editor, tools, scope) => {
		void scope;
		for (const nodeDef of Object.values(getNodeDefinitions(editor))) {
			tools[`node-${nodeDef.type}`] = {
				id: `node-${nodeDef.type}`,
				label: nodeDef.title,
				icon: nodeDef.icon,
				onSelect: () => {
					createNodeShape(
						editor,
						createShapeId(),
						editor.getViewportPageBounds().center,
						nodeDef.getDefault()
					)
				},
				onDragStart: (_, info) => {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) => {
							editor.createShape<NodeShape>({
								id,
								type: 'node',
								props: { node: nodeDef.getDefault() },
							})
						},
						onDragEnd: () => {},
					})
				},
			}
		}
		return tools
	},
	actions: (editor, actions) => {
		// Add rename action for nodes
		actions['rename-node'] = {
			id: 'rename-node',
			label: 'Rename Node',
			readonlyOk: true,
			onSelect: () => {
				const selectedShapes = editor.getSelectedShapes();
				const nodeShape = selectedShapes.find(s => s.type === 'node') as NodeShape;
				
				if (nodeShape) {
					// Set isEditingTitle to true to enable inline editing
					editor.updateShape({
						id: nodeShape.id,
						type: 'node',
						props: {
							node: {
								...nodeShape.props.node,
								isEditingTitle: true,
							},
						},
					});
				}
			},
		};
		return actions;
	},
}


// Rename button component
function RenameButton() {
	const editor = useEditor();
	const selectedShapes = useValue('selectedShapes', () => editor.getSelectedShapes(), [editor]);
	const actions = useActions();
	
	const isNodeSelected = selectedShapes.length === 1 && selectedShapes[0]?.type === 'node';
	
	if (!isNodeSelected) return null;
	
	return (
		<TldrawUiButton
			type="icon"
			onClick={() => actions['rename-node'].onSelect('toolbar')}
			title="Rename Node"
		>
			<TldrawUiButtonIcon icon="edit" />
		</TldrawUiButton>
	);
}

export function WorkflowToolbar() {
    const editor = useEditor();
    const [showRootChat, setShowRootChat] = useState(false);
    const center = editor.getViewportPageBounds().center;
    return (
        <>
        <DefaultToolbar orientation="horizontal" maxItems={7}>
			<TldrawUiMenuGroup id="selection">
				<SelectToolbarItem />
				<HandToolbarItem />
				<DrawToolbarItem />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="nodes">
				<ToolbarItem tool="node-message" />
				<ToolbarItem tool="node-rootchat" />
			</TldrawUiMenuGroup>
            
		</DefaultToolbar>
        <RootChatOverlay visible={showRootChat} x={center.x} y={center.y - 120} onClose={() => setShowRootChat(false)} />
        </>
	)
}

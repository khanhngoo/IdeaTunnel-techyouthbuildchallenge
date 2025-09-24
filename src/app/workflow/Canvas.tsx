"use client";

import {
	DefaultActionsMenu,
	DefaultActionsMenuContent,
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultQuickActions,
	DefaultStylePanel,
	TLComponents,
	Tldraw,
	TldrawOptions,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiToolbar,
	TLUiContextMenuProps,
	useActions,
	useEditor,
	useValue,
} from "tldraw";
import { overrides, WorkflowToolbar } from "./components/WorkflowToolbar";
import { ConnectionBindingUtil } from "./connection/ConnectionBindingUtil";
import { ConnectionShapeUtil } from "./connection/ConnectionShapeUtil";
import { keepConnectionsAtBottom } from "./connection/keepConnectionsAtBottom";
import { disableTransparency } from "./disableTransparency";
import { NodeShapeUtil } from "./nodes/NodeShapeUtil";
import { PointingPort } from "./ports/PointingPort";
import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// Custom ActionsMenu with rename functionality
function CustomActionsMenu() {
	const editor = useEditor();
	const actions = useActions();
	const selectedShapes = useValue('selectedShapes', () => editor.getSelectedShapes(), [editor]);
	
	const isNodeSelected = selectedShapes.length === 1 && selectedShapes[0]?.type === 'node';
	
	return (
		<DefaultActionsMenu>
			{isNodeSelected && (
				<TldrawUiMenuGroup id="node-actions">
					<TldrawUiMenuItem
						id="rename-node"
						label="Rename Node"
						icon="edit"
						readonlyOk
						onSelect={() => {
							actions['rename-node'].onSelect('actions-menu');
						}}
					/>
				</TldrawUiMenuGroup>
			)}
			<DefaultActionsMenuContent />
		</DefaultActionsMenu>
	);
}

// Custom ContextMenu with rename functionality
function CustomContextMenu(props: TLUiContextMenuProps) {
	const editor = useEditor();
	const actions = useActions();
	const selectedShapes = useValue('selectedShapes', () => editor.getSelectedShapes(), [editor]);
	
	const isNodeSelected = selectedShapes.length === 1 && selectedShapes[0]?.type === 'node';
	
	return (
		<DefaultContextMenu {...props}>
			{isNodeSelected && (
				<TldrawUiMenuGroup id="node-actions">
					<TldrawUiMenuItem
						id="rename-node"
						label="Rename Node"
						icon="edit"
						readonlyOk
						onSelect={() => {
							actions['rename-node'].onSelect('context-menu');
						}}
					/>
				</TldrawUiMenuGroup>
			)}
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	);
}

// Define custom shape utilities that extend tldraw's shape system
const shapeUtils = [NodeShapeUtil, ConnectionShapeUtil];
// Define binding utilities that handle relationships between shapes
const bindingUtils = [ConnectionBindingUtil];

// Customize tldraw's UI components to add workflow-specific functionality
const components: TLComponents = {
	Toolbar: () => (
		<>
			<WorkflowToolbar />
			<div className="tlui-main-toolbar tlui-main-toolbar--horizontal">
				<TldrawUiToolbar className="tlui-main-toolbar__tools" label="Actions">
					<DefaultQuickActions />
					<CustomActionsMenu />
				</TldrawUiToolbar>
			</div>
		</>
	),

	MenuPanel: () => null,
	ContextMenu: CustomContextMenu,
	StylePanel: () => {
		const editor = useEditor();
		const shouldShowStylePanel = useValue(
			"shouldShowStylePanel",
			() => {
				return (
					!editor.isIn("select") ||
					editor.getSelectedShapes().some((s) => s.type !== "node" && s.type !== "connection")
				);
			},
			[editor]
		);
		if (!shouldShowStylePanel) return null;
		return <DefaultStylePanel />;
	},
};

const options: Partial<TldrawOptions> = {
	actionShortcutsLocation: "menu",
	maxPages: 1,
};

function WorkflowCanvas() {
	return (
		<SidebarProvider defaultOpen>
			<AppSidebar />
			<SidebarInset className="workflow" style={{ position: "fixed", inset: 0 }}>
				<div className="absolute left-2 top-2 z-50">
					<SidebarTrigger />
				</div>
				<Tldraw
				persistenceKey="workflow"
				options={options}
				overrides={overrides}
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				components={components}
				onMount={(editor) => {
					const editorWindow = window as Window & { editor?: typeof editor };
					editorWindow.editor = editor;
					
					// Migrate existing nodes to new format
					const shapes = editor.getCurrentPageShapes();
					const nodeShapes = shapes.filter((s) => s.type === "node");
					
					for (const shape of nodeShapes) {
						if ((shape as any).props.node.type === "message") {
							const node = (shape as any).props.node;
							// Check if migration is needed
							if (node.title === undefined || node.isExpanded === undefined || node.isEditingTitle === undefined) {
								editor.updateShape({
									id: shape.id,
									type: "node",
									props: {
										node: {
											type: "message",
											title: node.title !== undefined ? node.title : "New Message",
											userMessage: node.userMessage || "hello",
											assistantMessage: node.assistantMessage || "",
											isExpanded: node.isExpanded !== undefined ? node.isExpanded : false,
											isEditingTitle: node.isEditingTitle !== undefined ? node.isEditingTitle : false,
										},
									},
								});
							}
						}
					}
					
					if (!editor.getCurrentPageShapes().some((s) => s.type === "node")) {
						editor.createShape({ type: "node", x: 200, y: 200 });
					}

					editor.user.updateUserPreferences({ isSnapMode: true });

					// Add our custom pointing port tool to the select tool's state machine
					// This allows users to create connections by pointing at ports
					const selectState = editor.getStateDescendant("select");
					if (selectState && selectState.children && !selectState.children["pointing_port"]) {
						selectState.addChild(PointingPort);
					}

					// todo: move connections to on the canvas layer

					// Ensure connections always stay at the bottom of the shape stack
					// This prevents them from covering other shapes
					keepConnectionsAtBottom(editor);

					// Disable transparency for workflow shapes
					disableTransparency(editor, ["node", "connection"]);
				}}
			/>
			</SidebarInset>
		</SidebarProvider>
	);
}

export default WorkflowCanvas;

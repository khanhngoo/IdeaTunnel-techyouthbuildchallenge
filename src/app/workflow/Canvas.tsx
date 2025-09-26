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
import { useEffect, useRef, useState } from "react";
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

import { supabase, isSupabaseConfigured } from "@/lib/supabase.client";

function WorkflowCanvas(props: { persistenceKey?: string; chatId?: string } = {}) {
	return (
		<SidebarProvider defaultOpen>
			<AppSidebar />
			<SidebarInset className="workflow" style={{ position: "fixed", inset: 0 }}>
				<div className="absolute left-2 top-2 z-50">
					<SidebarTrigger />
				</div>
				<Tldraw
				persistenceKey={props.persistenceKey ?? "workflow"}
				options={options}
				overrides={overrides}
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				components={components}
				onMount={(editor) => {
					const editorWindow = window as Window & { editor?: typeof editor };
					editorWindow.editor = editor;

					// Load snapshot from Supabase if configured and chatId provided
					(async () => {
						if (!isSupabaseConfigured() || !props.chatId) return;
						try {
							// Only query DB when chatId looks like a UUID (to avoid 22P02)
							const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(props.chatId);
							if (!isUuid) { (editor as any).__skipCanvasDb = true; return; }
							const { data, error } = await supabase!.from('canvases').select('doc').eq('chat_id', props.chatId).maybeSingle();
							if (error) {
								// If canvases table missing, disable DB persistence for this session
								if ((error as any).code === 'PGRST205') {
									(editor as any).__skipCanvasDb = true;
								}
								return;
							}
							if (data?.doc) {
								// Best-effort load, ignore if schema changed
								try { (editor.store as any).loadSnapshot?.(data.doc as any) } catch {}
							}
						} catch {}
					})();
					
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
						editor.createShape({
							type: "node",
							x: 200,
							y: 200,
							props: { node: { type: 'rootchat', title: 'Root Chat', idea: '', isSubmitting: false } as any },
						});
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

					// Auto-save snapshot to Supabase (debounced)
					if (isSupabaseConfigured() && props.chatId) {
						let saveTimer: any = null;
						const unsub = editor.store.listen(() => {
							clearTimeout(saveTimer);
							saveTimer = setTimeout(async () => {
								try {
									if ((editor as any).__skipCanvasDb) return;
									const snapshot = (editor.store as any).getSnapshot?.() ?? (editor.store as any).serialize?.() ?? null;
									if (!snapshot) return;
									const { error } = await supabase!.from('canvases').upsert({ chat_id: props.chatId, doc: snapshot, updated_at: new Date().toISOString() }, { onConflict: 'chat_id' });
									if (error && (error as any).code === 'PGRST205') {
										(editor as any).__skipCanvasDb = true;
									}
								} catch {}
							}, 800);
						});
						// Cleanup listener on unmount
						(editor as any).__unsub_save = unsub;
					}
				}}
			/>
			</SidebarInset>
		</SidebarProvider>
	);
}

export default WorkflowCanvas;

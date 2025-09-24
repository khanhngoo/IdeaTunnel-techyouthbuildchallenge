"use client";

import { ModelMessage } from "ai";
import { useCallback } from "react";
import { T, TldrawUiButton, TldrawUiButtonIcon, useEditor } from "tldraw";
import { Send } from "lucide-react";
import { HandleIcon } from "../../components/icons/HandleIcon";
import { SendIcon } from "../../components/icons/SendIcon";
import { NODE_HEIGHT_PX, NODE_WIDTH_PX } from "../../constants";
import { getAllConnectedNodes } from "../nodePorts";
import { NodeShape } from "../NodeShapeUtil";
import {
	NodeComponentProps,
	NodeDefinition,
	shapeInputPort,
	shapeOutputPort,
	updateNode,
} from "./shared";

/**
 * This node is a message from the user.
 */
export type MessageNode = T.TypeOf<typeof MessageNode>;
export const MessageNode = T.object({
	type: T.literal("message"),
	title: T.string,
	userMessage: T.string,
	assistantMessage: T.string,
	isExpanded: T.boolean,
	isEditingTitle: T.boolean,
});

// Flexible validator for migration
export const MessageNodeFlexible = T.object({
	type: T.literal("message"),
	title: T.optional(T.string),
	userMessage: T.string,
	assistantMessage: T.string,
	isExpanded: T.optional(T.boolean),
	isEditingTitle: T.optional(T.boolean),
});

export class MessageNodeDefinition extends NodeDefinition<MessageNode> {
	static type = "message";
	static validator = MessageNodeFlexible; // Use flexible validator for migration
	title = "Message";
	heading = "Message";
	icon = <SendIcon />;
	getDefault(): MessageNode {
		return {
			type: "message",
			title: "New Message",
			userMessage: "",
			assistantMessage: "",
			isExpanded: false,
			isEditingTitle: false,
		};
	}
	
	// Migration function to handle old nodes without title and isExpanded
	migrateNode(node: any): MessageNode {
		return {
			type: "message",
			title: node.title || "New Message",
			userMessage: node.userMessage || "",
			assistantMessage: node.assistantMessage || "",
			isExpanded: node.isExpanded !== undefined ? node.isExpanded : false,
			isEditingTitle: node.isEditingTitle !== undefined ? node.isEditingTitle : false,
		};
	}
	getBodyWidthPx(shape: NodeShape, node: MessageNode): number {
		void shape;
		void node;
		return NODE_WIDTH_PX;
	}
	getBodyHeightPx(shape: NodeShape, node: MessageNode): number {
		// Collapsed state - only show title
		if (!node.isExpanded) {
			return 60; // Fixed height for collapsed state
		}
		
		// Expanded state - calculate based on content
		const assistantMessage = node.assistantMessage.trim();
		
		// Base height for header + padding
		let baseHeight = 80;
		
		// Add height for assistant message if it exists
		if (assistantMessage) {
			const assistantSize = this.editor.textMeasure.measureText(assistantMessage, {
				fontFamily: "Inter",
				fontSize: 14,
				fontWeight: "400",
				fontStyle: "normal",
				maxWidth: NODE_WIDTH_PX - 40, // Account for padding
				lineHeight: 1.5,
				padding: "0",
			});
			baseHeight += Math.max(60, assistantSize.h + 20); // Minimum 60px for assistant message
		}
		
		// Add height for input bar when selected (fixed height)
		const isSelected = this.editor.getSelectedShapeIds().includes(shape.id);
		if (isSelected) {
			baseHeight += 60; // Fixed height for input bar
		}
		
		// Ensure minimum height for expanded state
		return Math.max(140, baseHeight);
	}
	getPorts(shape: NodeShape, node: MessageNode) {
		return {
			input: shapeInputPort,
			output: {
				...shapeOutputPort,
				y: this.getBodyHeightPx(shape, node),
			},
		};
	}

	Component = MessageNodeComponent;
}

function MessageNodeComponent({ node, shape }: NodeComponentProps<MessageNode>) {
	const editor = useEditor();
	
	// Ensure node has all required properties (migration)
	const migratedNode: MessageNode = {
		type: "message",
		title: node.title !== undefined ? node.title : "New Message",
		userMessage: node.userMessage || "",
		assistantMessage: node.assistantMessage || "",
		isExpanded: node.isExpanded !== undefined ? node.isExpanded : false,
		isEditingTitle: node.isEditingTitle !== undefined ? node.isEditingTitle : false,
	};

	// Check if this node is selected
	const isSelected = editor.getSelectedShapeIds().includes(shape.id);

	const handleSend = useCallback(() => {
		// Check for mock response
		if (migratedNode.userMessage.toLowerCase() === "mock") {
			updateNode<MessageNode>(editor, shape, (node) => ({
				...node,
				assistantMessage: "This is a mock AI response. The system is working correctly!",
			}));
			return;
		}

		// 1. gather up parents and create message history
		// 2. create prompt
		// 3. send prompt to ai
		// 4. update node with assistant message

		const messages: ModelMessage[] = [];

		const connectedNodeShapes = getAllConnectedNodes(editor, shape, "end");
		for (const connectedShape of connectedNodeShapes) {
			const node = editor.getShape(connectedShape);

			if (!node) continue;
			if (!editor.isShapeOfType<NodeShape>(node, "node")) continue;
			if (node.props.node.type !== "message") continue;

			if (node.props.node.assistantMessage && connectedShape !== shape.id) {
				messages.push({
					role: "assistant",
					content: node.props.node.assistantMessage ?? "",
				});
			}

			messages.push({
				role: "user",
				content: node.props.node.userMessage ?? "",
			});
		}

		messages.reverse();

		// clear any previous assistant message before starting
		updateNode<MessageNode>(editor, shape, (node) => ({
			...node,
			assistantMessage: "...",
		}));

		// stream the response and append as chunks arrive
		;(async () => {
			try {
				const response = await fetch("/api/stream", {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(messages),
				})
				if (!response.body) return

				const reader = response.body.getReader()
				const decoder = new TextDecoder()
				let accumulatedText = ''

				while (true) {
					const { value, done } = await reader.read()
					if (done) break
					const chunk = decoder.decode(value, { stream: true })
					// Some environments may send SSE-style lines; extract data if so, else use raw chunk
					const maybeSse = chunk
						.split('\n')
						.filter((line) => line.startsWith('data:'))
						.map((line) => line.replace(/^data:\s?/, ''))
						.join('')
					accumulatedText += maybeSse || chunk
					updateNode<MessageNode>(editor, shape, (node) => ({
						...node,
						assistantMessage: accumulatedText,
					}))
				}
			} catch (e) {
				console.error(e)
			}
		})();
	}, [editor, shape, migratedNode.userMessage]);

	const handleMessageChange = useCallback(
		(value: string) => {
			updateNode<MessageNode>(editor, shape, (node) => ({
				...node,
				userMessage: value,
			}));
		},
		[editor, shape]
	)


	const handleToggleExpand = useCallback(() => {
		updateNode<MessageNode>(editor, shape, (node) => ({
			...node,
			isExpanded: !node.isExpanded,
		}));
	}, [editor, shape]);

	const handleStartEditTitle = useCallback(() => {
		updateNode<MessageNode>(editor, shape, (node) => ({
			...node,
			isEditingTitle: true,
		}));
	}, [editor, shape]);

	const handleTitleChange = useCallback((value: string) => {
		updateNode<MessageNode>(editor, shape, (node) => ({
			...node,
			title: value, // Allow empty string
		}));
	}, [editor, shape]);

	const handleConfirmTitle = useCallback(() => {
		updateNode<MessageNode>(editor, shape, (node) => ({
			...node,
			isEditingTitle: false,
		}));
	}, [editor, shape]);

	const handleCancelEditTitle = useCallback(() => {
		updateNode<MessageNode>(editor, shape, (node) => ({
			...node,
			isEditingTitle: false,
		}));
	}, [editor, shape]);

	return (
		<div
			style={{
				pointerEvents: 'auto',
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				background: 'white',
				borderRadius: '12px',
				boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
				border: '1px solid rgba(0, 0, 0, 0.06)',
				overflow: 'hidden',
				position: 'relative', // For absolute positioning of input bar
			}}
		>
			{/* Header with title and expand button */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					padding: '12px 16px',
					borderBottom: migratedNode.isExpanded ? '1px solid rgba(0, 0, 0, 0.06)' : 'none',
					background: '#f8f9fa',
					cursor: 'pointer',
					flexShrink: 0, // Prevent header from shrinking
				}}
				onClick={(e) => {
					e.stopPropagation();
					editor.select(shape.id);
				}}
				onPointerDown={(e) => {
					e.stopPropagation();
					editor.markEventAsHandled(e);
				}}
			>
				<div style={{ flex: 1, marginRight: '12px' }}>
					{migratedNode.isEditingTitle ? (
						<input
							value={migratedNode.title}
							onChange={(e) => handleTitleChange(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleConfirmTitle();
								} else if (e.key === 'Escape') {
									e.preventDefault();
									handleCancelEditTitle();
								}
							}}
							onBlur={handleConfirmTitle}
							onPointerDown={(e) => e.stopPropagation()}
							style={{
								fontSize: '14px',
								fontWeight: '600',
								color: '#1a1a1a',
								background: 'white',
								border: '1px solid #d1d5db',
								borderRadius: '6px',
								padding: '6px 10px',
								outline: 'none',
								width: '100%',
							}}
							autoFocus
						/>
					) : (
						<div
							style={{
								fontSize: '14px',
								fontWeight: '600',
								color: '#1a1a1a',
								padding: '2px 0',
							}}
						>
							{migratedNode.title || 'Untitled'}
						</div>
					)}
				</div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: '28px',
						height: '28px',
						borderRadius: '6px',
						background: '#e5e7eb',
						transition: 'transform 0.2s ease',
						transform: migratedNode.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
						cursor: 'pointer',
					}}
					onClick={handleToggleExpand}
					onPointerDown={(e) => {
						e.stopPropagation();
						editor.markEventAsHandled(e);
					}}
				>
					<span style={{ fontSize: '12px', color: '#374151' }}>›</span>
				</div>
			</div>

			{/* Expanded content - AI Response fills the node */}
			{migratedNode.isExpanded && (
				<div 
					style={{ 
						flex: 1, 
						display: 'flex', 
						flexDirection: 'column',
						padding: isSelected ? '16px 16px 80px 16px' : '16px', // Add bottom padding when selected for input bar
						minHeight: 0, // Allow flex shrinking
					}}
				>
					{/* AI Response - fills the entire node content area */}
					<div
						style={{
							flex: 1,
							background: 'transparent',
							color: '#1a1a1a',
							fontSize: '14px',
							lineHeight: '1.5',
							whiteSpace: 'pre-wrap',
							overflowWrap: 'break-word',
							wordBreak: 'break-word',
							overflow: 'auto', // Allow scrolling if content is too long
						}}
					>
						{migratedNode.assistantMessage || 'No response yet...'}
					</div>
				</div>
			)}

			{/* Input bar - Fixed at bottom of node when selected */}
			{isSelected && migratedNode.isExpanded && (
				<div 
					style={{ 
						position: 'absolute',
						bottom: '0',
						left: '0',
						right: '0',
						display: 'flex', 
						alignItems: 'center',
						background: '#f8f9fa',
						borderRadius: '0 0 12px 12px',
						border: '1px solid #e5e7eb',
						borderTop: '1px solid rgba(0, 0, 0, 0.06)',
						padding: '8px 12px',
						gap: '8px',
						zIndex: 10, // Ensure it's above content
					}}
				>
					{/* Input field */}
					<input
						value={migratedNode.userMessage}
						onChange={(e) => handleMessageChange(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								handleSend();
							}
						}}
						style={{
							flex: 1,
							fontSize: '14px',
							background: 'white',
							border: '1px solid #d1d5db',
							borderRadius: '6px',
							padding: '8px 12px',
							outline: 'none',
							color: '#1a1a1a',
						}}
						placeholder="Type your message..."
					/>

					{/* Send button with Lucide icon */}
					<button
						onClick={handleSend}
						onPointerDown={editor.markEventAsHandled}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '36px',
							height: '36px',
							borderRadius: '6px',
							background: '#1a1a1a',
							border: 'none',
							cursor: 'pointer',
							boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
						}}
					>
						<Send size={16} color="white" />
					</button>
				</div>
			)}
		</div>
	)
}
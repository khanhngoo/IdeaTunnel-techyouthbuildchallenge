/**
 * This file contains functions for working with ports and connections on nodes.
 */
import { createComputedCache, Editor, TLShapeId } from 'tldraw'
import { ConnectionBinding, getConnectionBindings } from '../connection/ConnectionBindingUtil'
import { PortId } from '../ports/Port'
import { NodeShape } from './NodeShapeUtil'
import { getNodeTypePorts, NodeTypePorts } from './nodeTypes'

/**
 * Get the ports for a node. This is cached, because we only want to re-evaluate it when the
 * underlying records change.
 */
export function getNodePorts(editor: Editor, shape: NodeShape | TLShapeId): NodeTypePorts {
	return nodePortsCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? {}
}
const nodePortsCache = createComputedCache(
	'ports',
	(editor: Editor, node: NodeShape): NodeTypePorts => getNodeTypePorts(editor, node)
)

/**
 * A connection from one node to another.
 */
export interface NodePortConnection {
	connectedShapeId: TLShapeId
	connectionId: TLShapeId
	terminal: 'start' | 'end'
	ownPortId: PortId
	connectedPortId: PortId
}

/**
 * Get the connections for a node. This is cached.
 */
export function getNodePortConnections(
	editor: Editor,
	shape: NodeShape | TLShapeId
): NodePortConnection[] {
	return nodePortConnectionsCache.get(editor, typeof shape === 'string' ? shape : shape.id) ?? []
}
const nodePortConnectionsCache = createComputedCache(
	'port connections',
	(editor: Editor, node: NodeShape) => {
		const bindings = editor.getBindingsToShape<ConnectionBinding>(node.id, 'connection')

		const connections: NodePortConnection[] = []
		for (const binding of bindings) {
			const oppositeTerminal = binding.props.terminal === 'start' ? 'end' : 'start'
			const oppositeBinding = getConnectionBindings(editor, binding.fromId)[oppositeTerminal]
			if (!oppositeBinding) continue

			connections.push({
				connectedShapeId: oppositeBinding.toId,
				connectionId: binding.fromId,
				terminal: binding.props.terminal,
				ownPortId: binding.props.portId,
				connectedPortId: oppositeBinding.props.portId,
			})
		}

		return connections
	},
	{
		areRecordsEqual: (a, b) => a.id === b.id,
	}
)

/**
 * Traverse the graph from a starting node, in a given direction, returning all the nodes that are
 * connected to it (including the starting node).
 */
export function getAllConnectedNodes(
	editor: Editor,
	startingNode: TLShapeId | NodeShape,
	direction?: 'start' | 'end'
) {
	const toVisit = [typeof startingNode === 'string' ? startingNode : startingNode.id]
	const found = new Set<TLShapeId>()

	while (toVisit.length > 0) {
		const nodeId = toVisit.shift()
		if (!nodeId) continue

		const node = editor.getShape(nodeId)
		if (!node || !editor.isShapeOfType<NodeShape>(node, 'node')) continue

		if (found.has(node.id)) continue
		found.add(node.id)

		for (const connection of getNodePortConnections(editor, node)) {
			if (direction && connection.terminal !== direction) continue
			toVisit.push(connection.connectedShapeId)
		}
	}

	return found
}

/**
 * Build context string from parent and sibling nodes for AI prompts.
 * This gathers relevant information from connected nodes to provide context.
 */
export function buildNodeContext(editor: Editor, nodeId: TLShapeId): string {
	const contextParts: string[] = []

	// Get all parent nodes (nodes that flow INTO this node - direction 'end')
	const parentNodes = getAllConnectedNodes(editor, nodeId, 'end')
	parentNodes.delete(nodeId) // Remove self

	if (parentNodes.size > 0) {
		const parentInfo: string[] = []
		parentNodes.forEach((parentId) => {
			const shape = editor.getShape(parentId)
			if (!shape || !editor.isShapeOfType<NodeShape>(shape, 'node')) return

			const node = shape.props.node as any
			const title = node.title || 'Untitled'
			const content = node.assistantMessage || node.idea || node.userMessage || ''

			if (content && content.trim()) {
				// Limit content length to avoid huge prompts
				const trimmedContent = content.length > 500
					? content.substring(0, 500) + '...'
					: content
				parentInfo.push(`### ${title}\n${trimmedContent}`)
			}
		})

		if (parentInfo.length > 0) {
			contextParts.push('## Parent Nodes (Context)\n' + parentInfo.join('\n\n'))
		}
	}

	// Get sibling nodes (nodes that share the same parent)
	const connections = getNodePortConnections(editor, nodeId)
	const parentConnection = connections.find(c => c.terminal === 'end')

	if (parentConnection) {
		const parentId = parentConnection.connectedShapeId
		const parentConnections = getNodePortConnections(editor, parentId)

		const siblingIds: TLShapeId[] = []
		parentConnections.forEach((conn) => {
			if (conn.terminal === 'start' && conn.connectedShapeId !== nodeId) {
				siblingIds.push(conn.connectedShapeId)
			}
		})

		if (siblingIds.length > 0) {
			const siblingInfo: string[] = []
			siblingIds.forEach((siblingId) => {
				const shape = editor.getShape(siblingId)
				if (!shape || !editor.isShapeOfType<NodeShape>(shape, 'node')) return

				const node = shape.props.node as any
				const title = node.title || 'Untitled'
				const content = node.assistantMessage || ''

				if (content && content.trim()) {
					const trimmedContent = content.length > 300
						? content.substring(0, 300) + '...'
						: content
					siblingInfo.push(`- **${title}**: ${trimmedContent}`)
				}
			})

			if (siblingInfo.length > 0) {
				contextParts.push('## Sibling Nodes\n' + siblingInfo.join('\n'))
			}
		}
	}

	return contextParts.length > 0 ? contextParts.join('\n\n') : ''
}

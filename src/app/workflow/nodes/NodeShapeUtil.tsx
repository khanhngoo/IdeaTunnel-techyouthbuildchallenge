"use client";

import classNames from "classnames";
import {
	Circle2d,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	resizeBox,
	ShapeUtil,
	TLBaseShape,
	TLResizeInfo,
	useEditor,
	useUniqueSafeId,
	useValue,
} from "tldraw";
import { NODE_WIDTH_PX, PORT_RADIUS_PX } from "../constants";
import { Port } from "../ports/Port";
import { getNodePorts } from "./nodePorts";
import {
	getNodeDefinition,
	getNodeHeightPx,
	getNodeTypePorts,
	getNodeWidthPx,
	NodeType,
	NodeTypePorts,
} from "./nodeTypes";

// Define our custom node shape type that extends tldraw's base shape system
export type NodeShape = TLBaseShape<'node', { node: NodeType }>

// This class extends tldraw's ShapeUtil to define how our custom node shapes behave
export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = 'node' as const
	static override props: RecordProps<NodeShape> = {
		node: NodeType,
	}

	getDefaultProps(): NodeShape['props'] {
		return {
			node: getNodeDefinition(this.editor, 'message').getDefault(),
		}
	}

	migrateProps(shape: NodeShape): NodeShape['props'] {
		// Handle migration for message nodes
		if (shape.props.node.type === 'message') {
			const node = shape.props.node as any;
			return {
				node: {
					type: "message",
					title: node.title !== undefined ? node.title : "New Message",
					userMessage: node.userMessage || "hello",
					assistantMessage: node.assistantMessage || "",
					isExpanded: node.isExpanded !== undefined ? node.isExpanded : false,
					isEditingTitle: node.isEditingTitle !== undefined ? node.isEditingTitle : false,
				},
			};
		}
		return shape.props;
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return true
	}
	override hideResizeHandles() {
		return false
	}
	override hideRotateHandle() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}
	override isAspectRatioLocked() {
		return false
	}
	override getBoundsSnapGeometry(shape: NodeShape) {
		void shape;
		return {
			points: [{ x: 0, y: 0 }],
		}
	}

	// Define the geometry of our node shape including ports
	getGeometry(shape: NodeShape) {
		const ports = getNodePorts(this.editor, shape)

		const portGeometries = Object.values(ports).map(
			(port) =>
				new Circle2d({
					x: port.x - PORT_RADIUS_PX,
					y: port.y - PORT_RADIUS_PX,
					radius: PORT_RADIUS_PX,
					isFilled: true,
					// not a label, but this hack excludes them from the selection bounds which is useful
					isLabel: true,
				})
		)

		const bodyGeometry = new Rectangle2d({
			width: getNodeWidthPx(this.editor, shape),
			height: getNodeHeightPx(this.editor, shape),
			isFilled: true,
		})

		return new Group2d({
			children: [bodyGeometry, ...portGeometries],
		})
	}


	component(shape: NodeShape) {
		return <NodeShape shape={shape} />
	}

	indicator(shape: NodeShape) {
		const ports = getNodePorts(this.editor, shape)
		return <NodeShapeIndicator shape={shape} ports={ports} />
	}
}

// SVG indicator component that shows selection bounds and ports
function NodeShapeIndicator({ shape, ports }: { shape: NodeShape; ports: NodeTypePorts }) {
	const editor = useEditor()
	const id = useUniqueSafeId()
	const height = useValue('height', () => getNodeHeightPx(editor, shape), [
		shape.props.node,
		editor,
	])

	return (
		<>
			{/* Create a mask to show ports as holes in the selection bounds */}
			<mask id={id}>
				<rect width={NODE_WIDTH_PX + 10} height={height + 10} fill="white" x={-5} y={-5} />
				{Object.values(ports).map((port) => (
					<circle
						key={port.id}
						cx={port.x}
						cy={port.y}
						r={PORT_RADIUS_PX}
						fill="black"
						strokeWidth={0}
					/>
				))}
			</mask>
			<rect rx={9} width={NODE_WIDTH_PX} height={height} mask={`url(#${id})`} />
			{Object.values(ports).map((port) => (
				<circle key={port.id} cx={port.x} cy={port.y} r={PORT_RADIUS_PX} />
			))}
		</>
	)
}

// Main node component that renders the HTML content
function NodeShape({ shape }: { shape: NodeShape }) {
	const editor = useEditor()

	return (
		<HTMLContainer
			className={classNames('NodeShape')}
			style={{
				width: getNodeWidthPx(editor, shape),
				height: getNodeHeightPx(editor, shape),
			}}
		>
			<NodeBody shape={shape} />
			<NodePorts shape={shape} />
		</HTMLContainer>
	)
}

function NodeBody({ shape }: { shape: NodeShape }) {
	const node = shape.props.node
	const editor = useEditor()
	const { Component } = getNodeDefinition(editor, node)
	return <Component shape={shape} node={node} />
}

function NodePorts({ shape }: { shape: NodeShape }) {
	const editor = useEditor()
	const ports = useValue('node ports', () => getNodeTypePorts(editor, shape), [shape, editor])
	return (
		<>
			{Object.values(ports).map((port) => (
				<Port key={port.id} shapeId={shape.id} port={port} />
			))}
		</>
	)
}

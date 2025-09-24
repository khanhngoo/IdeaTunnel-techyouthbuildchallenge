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
		return false
	}
	override hideSelectionBoundsFg() {
		return false
	}
	override isAspectRatioLocked() {
		return false
	}

	// Allow horizontal resize to adjust node.width persisted on the shape
	override onResize(shape: NodeShape, info: TLResizeInfo<any>) {
		const MIN_W = 320
		const MAX_W = 1600
		const currentW = getNodeWidthPx(this.editor, shape)
		const scaleX = Math.abs(((info as any).scale?.x) ?? 1)
		const nextW = Math.max(MIN_W, Math.min(MAX_W, Math.round(currentW * (scaleX || 1))))
		const resized = resizeBox(shape, info)
		const nextX = Number.isFinite((resized as any)?.x) ? (resized as any).x : shape.x
		const nextY = Number.isFinite((resized as any)?.y) ? (resized as any).y : shape.y
		const node = shape.props.node as any
		console.debug('[NodeResize]', {
			shapeId: shape.id,
			currentW,
			scaleX: (info as any).scale?.x,
			nextW,
			resized,
			nextX,
			nextY,
		})
		return {
			...shape,
			x: nextX,
			y: nextY,
			props: { node: { ...node, width: nextW } },
		}
	}

	override onResizeEnd(initial: NodeShape, current: NodeShape) {
		console.debug('[NodeResizeEnd]', {
			shapeId: current.id,
			initialX: initial.x,
			initialY: initial.y,
			currentX: current.x,
			currentY: current.y,
			finalWidth: getNodeWidthPx(this.editor, current),
		})
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
    const EDGE_PAD = 8

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
			x: -EDGE_PAD,
			y: -EDGE_PAD,
			width: getNodeWidthPx(this.editor, shape) + EDGE_PAD * 2,
			height: getNodeHeightPx(this.editor, shape) + EDGE_PAD * 2,
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
		const width = useValue('width', () => getNodeWidthPx(editor, shape), [
			shape.props.node,
			editor,
		])
	const EDGE_PAD = 8

	return (
		<>
			{/* Create a mask to show ports as holes in the selection bounds */}
			<mask id={id}>
			<rect
				width={width + EDGE_PAD * 2 + 10}
				height={height + EDGE_PAD * 2 + 10}
				fill="white"
				x={-EDGE_PAD - 5}
				y={-EDGE_PAD - 5}
			/>
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
			<rect rx={9} width={width + EDGE_PAD * 2} height={height + EDGE_PAD * 2} x={-EDGE_PAD} y={-EDGE_PAD} mask={`url(#${id})`} />
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
		<>
		<HTMLContainer
			className={classNames('NodeShape')}
			style={{
				width: getNodeWidthPx(editor, shape),
				height: getNodeHeightPx(editor, shape),
				overflow: 'visible',
				pointerEvents: 'none',
			}}
		>
			<NodeBody shape={shape} />
		</HTMLContainer>
		<NodePorts shape={shape} />
		</>
	)
}

function NodeBody({ shape }: { shape: NodeShape }) {
	const node = shape.props.node
	const editor = useEditor()
	const { Component } = getNodeDefinition(editor, node)
    return (
        <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
            <Component shape={shape} node={node} />
        </div>
    )
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

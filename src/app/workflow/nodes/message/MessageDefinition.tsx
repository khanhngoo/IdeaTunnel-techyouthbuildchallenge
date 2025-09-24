import { T, Editor } from 'tldraw'
import { NodeDefinition, shapeInputPort, shapeOutputPort } from '../types/shared'
import { NodeShape } from '../NodeShapeUtil'
import { NODE_WIDTH_PX } from '../../constants'
import { MessageNode, MessageNodeFlexible } from './MessageTypes'
import { SendIcon } from '../../components/icons/SendIcon'
import { MessageNodeComponent } from './MessageComponent'

export class MessageNodeDefinition extends NodeDefinition<MessageNode> {
  static type = 'message' as const
  static validator = MessageNodeFlexible
  title = 'Message'
  heading = 'Message'
  icon = <SendIcon />

  constructor(public editor: Editor) { super(editor) }

  getDefault(): MessageNode {
    return {
      type: 'message',
      title: 'New Message',
      userMessage: '',
      assistantMessage: '',
      isExpanded: false,
      isEditingTitle: false,
    }
  }

  migrateNode(node: any): MessageNode {
    return {
      type: 'message',
      title: node.title || 'New Message',
      userMessage: node.userMessage || '',
      assistantMessage: node.assistantMessage || '',
      isExpanded: node.isExpanded !== undefined ? node.isExpanded : false,
      isEditingTitle: node.isEditingTitle !== undefined ? node.isEditingTitle : false,
    }
  }

  getBodyWidthPx(shape: NodeShape, node: MessageNode): number {
    void shape; void node; return (node as any).width ?? NODE_WIDTH_PX
  }

  getBodyHeightPx(shape: NodeShape, node: MessageNode): number {
    const INPUT_BAR_H = 60
    if (!node.isExpanded) return 60
    const assistantMessage = node.assistantMessage.trim()
    let baseHeight = 80
    if (assistantMessage) {
      const assistantSize = this.editor.textMeasure.measureText(assistantMessage, {
        fontFamily: 'Inter', fontSize: 14, fontWeight: '400', fontStyle: 'normal',
        maxWidth: ((node as any).width ?? NODE_WIDTH_PX) - 40, lineHeight: 1.5, padding: '0',
      })
      baseHeight += Math.max(60, assistantSize.h + 20)
    }
    // Cộng phần chat bar khi expanded để bao hết component
    baseHeight += INPUT_BAR_H
    const computed = Math.max(140, baseHeight)
    return (node as any).height ?? computed
  }

	getPorts(shape: NodeShape, node: MessageNode) {
		const w = (node as any).width ?? NODE_WIDTH_PX
		return {
			input: { id: 'input', terminal: 'end' as const, x: w / 2, y: 0 },
			output: { id: 'output', terminal: 'start' as const, x: w / 2, y: this.getBodyHeightPx(shape, node) },
		}
	}

  Component = MessageNodeComponent
}



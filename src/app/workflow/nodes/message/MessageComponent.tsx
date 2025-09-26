import { ModelMessage } from 'ai'
import { useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEditor } from 'tldraw'
import { Send } from 'lucide-react'
import { NodeShape } from '../NodeShapeUtil'
import { updateNode, NodeComponentProps } from '../types/shared'
import { getAllConnectedNodes } from '../nodePorts'
import { MessageNode } from './MessageTypes'

export function MessageNodeComponent({ node, shape }: NodeComponentProps<MessageNode>) {
  const editor = useEditor()

  const migratedNode: MessageNode = {
    type: 'message',
    title: node.title !== undefined ? node.title : 'New Message',
    userMessage: node.userMessage || '',
    assistantMessage: node.assistantMessage || '',
    isExpanded: node.isExpanded !== undefined ? node.isExpanded : false,
    isEditingTitle: node.isEditingTitle !== undefined ? node.isEditingTitle : false,
  }

  const isSelected = editor.getSelectedShapeIds().includes(shape.id)

  const handleSend = useCallback(() => {
    if (migratedNode.userMessage.toLowerCase() === 'mock') {
      updateNode<MessageNode>(editor, shape, (node) => ({
        ...node,
        assistantMessage: 'This is a mock AI response. The system is working correctly!',
        userMessage: '',
      }))
      return
    }

    if (migratedNode.userMessage.toLowerCase() === 'mock2') {
      const longText = `This is a long mock AI response intended to test auto-expansion.\n\n` +
        `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris. ` +
        `Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit. Donec et mollis dolor. ` +
        `Praesent et diam eget libero egestas mattis sit amet vitae augue. Nam tincidunt congue enim, ut porta lorem lacinia consectetur. ` +
        `Donec ut libero sed arcu vehicula ultricies a non tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. ` +
        `Aenean ut gravida lorem. Ut turpis felis, pulvinar a semper sed, adipiscing id dolor. Pellentesque auctor nisi id magna consequat sagittis. ` +
        `Curabitur dapibus enim sit amet elit pharetra tincidunt feugiat nisl imperdiet. ` +
        `Ut convallis libero in urna ultrices accumsan. Donec sed odio eros. ` +
        `\n\nMore paragraphs to ensure several lines of content cause a resize. ` +
        `Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus.`
      updateNode<MessageNode>(editor, shape, (node) => ({
        ...node,
        assistantMessage: longText,
        userMessage: '',
      }))
      return
    }

    // Focused rewrite: only update this node's content according to its title and instruction
    const title = migratedNode.title
    const content_md = migratedNode.assistantMessage
    const instruction = migratedNode.userMessage

    updateNode<MessageNode>(editor, shape, (node) => ({ ...node, assistantMessage: '...', userMessage: '' }))

    ;(async () => {
      try {
        const response = await fetch('/api/llm/rewrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content_md, instruction }),
        })
        if (!response.ok) throw new Error('rewrite failed')
        const data = (await response.json()) as { content_md?: string }
        const nextContent = (data?.content_md ?? '').trim()
        updateNode<MessageNode>(editor, shape, (node) => ({ ...node, assistantMessage: nextContent || content_md }))
      } catch (e) {
        console.error(e)
        // Fallback: keep old content if rewrite failed
        updateNode<MessageNode>(editor, shape, (node) => ({ ...node, assistantMessage: content_md }))
      }
    })()
  }, [editor, shape, migratedNode.userMessage])

  const handleMessageChange = useCallback((value: string) => {
    updateNode<MessageNode>(editor, shape, (node) => ({ ...node, userMessage: value }))
  }, [editor, shape])

  const handleToggleExpand = useCallback(() => {
    updateNode<MessageNode>(editor, shape, (node) => ({ ...node, isExpanded: !node.isExpanded }))
  }, [editor, shape])

  const handleTitleChange = useCallback((value: string) => {
    updateNode<MessageNode>(editor, shape, (node) => ({ ...node, title: value }))
  }, [editor, shape])

  const handleConfirmTitle = useCallback(() => {
    updateNode<MessageNode>(editor, shape, (node) => ({ ...node, isEditingTitle: false }))
  }, [editor, shape])

  return (
    <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', height: '100%', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: migratedNode.isExpanded ? '1px solid rgba(0,0,0,0.06)' : 'none', background: '#f8f9fa', cursor: 'pointer', flexShrink: 0 }}
        onClick={(e) => { e.stopPropagation(); editor.select(shape.id) }}
        onPointerDown={(e) => { e.stopPropagation(); editor.markEventAsHandled(e) }}
      >
        <div style={{ flex: 1, marginRight: 12 }}>
          {migratedNode.isEditingTitle ? (
            <input value={migratedNode.title} onChange={(e) => handleTitleChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmTitle() } }} onBlur={handleConfirmTitle} onPointerDown={(e) => e.stopPropagation()} style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', outline: 'none', width: '100%' }} autoFocus />
          ) : (
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', padding: '2px 0' }}>{migratedNode.title || 'Untitled'}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: '#e5e7eb', transition: 'transform 0.2s ease', transform: migratedNode.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', cursor: 'pointer' }}
          onClick={handleToggleExpand} onPointerDown={(e) => { e.stopPropagation(); editor.markEventAsHandled(e) }}>
          <span style={{ fontSize: 12, color: '#374151' }}>›</span>
        </div>
      </div>

      {migratedNode.isExpanded && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 16px 80px 16px', minHeight: 0 }}>
          <div style={{ flex: 1, background: 'transparent', color: '#1a1a1a', fontSize: 14, lineHeight: 1.5, overflow: 'auto' }}>
            {migratedNode.assistantMessage
              ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{migratedNode.assistantMessage}</ReactMarkdown>
              : 'No response yet...'}
          </div>
        </div>
      )}

      {migratedNode.isExpanded && (
        <div 
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', background: '#f8f9fa', borderRadius: '0 0 12px 12px', border: '1px solid #e5e7eb', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '8px 12px', gap: 8, zIndex: 10 }}
          onPointerDown={(e) => { e.stopPropagation(); editor.markEventAsHandled(e) }}
        >
          <input 
            value={migratedNode.userMessage}
            onChange={(e) => handleMessageChange(e.target.value)} 
            onKeyDown={(e) => { 
              e.stopPropagation();
              if (e.key === 'Enter') { e.preventDefault(); handleSend() } 
            }} 
            onPointerDown={(e) => { e.stopPropagation(); editor.markEventAsHandled(e) }}
            onFocus={() => editor.select(shape.id)}
            style={{ flex: 1, fontSize: 14, background: 'white', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', outline: 'none', color: '#1a1a1a' }} 
            placeholder="Type your message..." 
          />
          <button onClick={handleSend} onPointerDown={editor.markEventAsHandled} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 6, background: '#1a1a1a', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <Send size={16} color="white" />
          </button>
        </div>
      )}
    </div>
  )
}



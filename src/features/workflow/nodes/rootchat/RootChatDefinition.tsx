import { Editor, T } from 'tldraw'
import { NodeDefinition, NodeComponentProps } from '../types/shared'
import { NodeShape } from '../NodeShapeUtil'
import { NODE_WIDTH_PX } from '../../components/constants'
import { RootChatNode, RootChatNodeFlexible } from './RootChatTypes'
import { HandleIcon } from '../../components/icons/HandleIcon'
import { useCallback, useState } from 'react'
import { createShapeId, TLShapeId } from 'tldraw'
import { NodeShape as NodeShapeType } from '../NodeShapeUtil'
import { getNodePorts } from '../nodePorts'
import { ConnectionShape } from '../../connection/ConnectionShapeUtil'
import { createOrUpdateConnectionBinding } from '../../connection/ConnectionBindingUtil'
import { DEFAULT_NODE_SPACING_PX } from '../../components/constants'
import { layoutTreeFrom } from '../../utils/autoLayout/treeLayout'
import { Input } from '@/components/ui/input'
import { useDemoMode } from '@/app/(main)/demo/page'

export class RootChatNodeDefinition extends NodeDefinition<RootChatNode> {
  static type = 'rootchat' as const
  static validator = RootChatNodeFlexible
  title = 'Root Chat'
  heading = 'Root Chat'
  icon = <HandleIcon />
  constructor(public editor: Editor) { super(editor) }

  getDefault(): RootChatNode {
    return { type: 'rootchat', title: 'Root Chat', idea: '', isSubmitting: false }
  }

  migrateNode(node: any): RootChatNode {
    return { type: 'rootchat', title: node.title || 'Root Chat', idea: node.idea || '', isSubmitting: !!node.isSubmitting }
  }

  getBodyWidthPx(shape: NodeShape, node: RootChatNode): number { return (node as any).width ?? NODE_WIDTH_PX }
  getBodyHeightPx(shape: NodeShape, node: RootChatNode): number { return (node as any).height ?? 60 }
  getPorts(shape: NodeShape, node: RootChatNode) { const w = (node as any).width ?? NODE_WIDTH_PX; return { input: { id:'input', terminal:'end' as const, x:w/2, y:0 }, output: { id:'output', terminal:'start' as const, x:w/2, y:this.getBodyHeightPx(shape, node) } } }

  Component = function RootChatComponent({ node, shape }: NodeComponentProps<RootChatNode>) {
    const editor = (window as any).editor as Editor | undefined
    const [text, setText] = useState(node.idea || '')

    // Try to access demo mode context, but don't fail if not in demo mode
    let demoModeContext = null
    try {
      demoModeContext = useDemoMode()
    } catch {
      // Not in demo mode, context not available
    }

    const submit = useCallback(async () => {
      if (!editor) return
      const shapeBounds = editor.getShapePageBounds(shape.id)!

      try {
        let title = ''
        let description = ''
        let data: any = null

        if (demoModeContext?.isDemoMode) {
          // Demo mode: wait 15 seconds then use pre-loaded data
          await new Promise(resolve => setTimeout(resolve, 15000))
          title = 'Mise - Duolingo for Cooking'
          description = '• Mobile app for teaching cooking skills through gamified lessons\n• Applies language-learning principles to culinary arts\n• Bite-sized lessons from basic knife skills to complex sauces\n• Makes cooking fun and accessible for home cooks'
          data = demoModeContext.fanoutData
        } else {
          // Normal mode: call APIs
          // 1) Generate title and summary
          const titlePrompt = [{ role:'user', content: `Normalize this idea into a clean product title under 60 chars (no quotes). Idea: ${text}` }]
          const titleRes = await fetch('/api/generate', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(titlePrompt) })

          if (!titleRes.ok) {
            const errorData = await titleRes.json().catch(() => ({ error: 'Unknown error' }))
            console.error('Title generation failed:', errorData)
            alert(errorData.error || 'Failed to generate title. Please try again.')
            return
          }

          title = (await titleRes.text()).trim().slice(0,60)
          const summaryPrompt = [{ role:'user', content:`Write a concise 3-6 bullet summary for this idea (no preface). Idea: ${text}` }]
          const res = await fetch('/api/stream', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(summaryPrompt) })

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
            console.error('Summary generation failed:', errorData)
            alert(errorData.error || 'Failed to generate summary. Please try again.')
            return
          }

          if (res.body) {
            const reader = res.body.getReader(); const decoder = new TextDecoder();
            while (true) { const { value, done } = await reader.read(); if (done) break; const chunk = decoder.decode(value, { stream: true }); const maybeSse = chunk.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.replace(/^data:\s?/, '')).join(''); description += maybeSse || chunk; }
          }

          // 3) Auto-fanout
          const idea = text
          const fan = await fetch('/api/llm/fanout', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ idea }) });

          if (!fan.ok) {
            const errorData = await fan.json().catch(() => ({ error: 'Unknown error' }))
            console.error('Fanout failed:', errorData)
            alert(errorData.error || 'Failed to generate branches. Please try again.')
            return
          }

          data = await fan.json();
        }

        // 2) Replace this node with message node
        editor.updateShape<NodeShapeType>({ id: shape.id, type: 'node', props: { node: { type:'message', title, userMessage: text, assistantMessage: description, isExpanded: true, isEditingTitle: false } as any } })
      const parentPorts = getNodePorts(editor, shape.id)
      const parentOut = Object.values(parentPorts).find(p => p.terminal === 'start')
      const center = { x: shapeBounds.midX, y: shapeBounds.midY }
      const branches = (data?.branches ?? []) as Array<{ title:string; file:string; sections: Array<{ title:string; content?:string; bullets?:string[] }> }>
      const radius = Math.max(shapeBounds.width, shapeBounds.height) + 200
      editor.run(()=>{
        branches.forEach((branch, i)=>{
          const angle = (i / Math.max(1, branches.length)) * Math.PI * 2
          const bx = center.x + Math.cos(angle) * radius
          const by = center.y + Math.sin(angle) * radius
          const branchId = createShapeId()
          editor.createShape<NodeShapeType>({ type:'node', id: branchId, x: bx - NODE_WIDTH_PX/2, y: by, props:{ node:{ type:'message', title: branch.title, userMessage:'', assistantMessage:`# ${branch.file}\n`, isExpanded:true, isEditingTitle:false } as any } })
          const branchPorts = getNodePorts(editor, branchId)
          const branchIn = Object.values(branchPorts).find(p=>p.terminal==='end')
          if (parentOut && branchIn) {
            const connId = createShapeId(); editor.createShape<ConnectionShape>({ type:'connection', id: connId });
            createOrUpdateConnectionBinding(editor, connId, shape.id as TLShapeId, { portId: parentOut.id, terminal:'start' })
            createOrUpdateConnectionBinding(editor, connId, branchId as TLShapeId, { portId: branchIn.id, terminal:'end' })
          }
          let yCursor = by + 160
          for (const section of branch.sections) {
            const content = (section.content && section.content.trim().length > 0)
              ? section.content
              : ['- '+(section.bullets ?? []).join('\n- ')].join('\n')
            const subId = createShapeId(); editor.createShape<NodeShapeType>({ type:'node', id: subId, x: bx - NODE_WIDTH_PX/2, y: yCursor, props:{ node:{ type:'message', title: section.title, userMessage:'', assistantMessage: content, isExpanded:true, isEditingTitle:false } as any } })
            const subPorts = getNodePorts(editor, subId)
            const branchOut = Object.values(branchPorts).find(p=>p.terminal==='start')
            const subIn = Object.values(subPorts).find(p=>p.terminal==='end')
            if (branchOut && subIn) { const c2 = createShapeId(); editor.createShape<ConnectionShape>({ type:'connection', id: c2 }); createOrUpdateConnectionBinding(editor, c2, branchId as TLShapeId, { portId: branchOut.id, terminal:'start' }); createOrUpdateConnectionBinding(editor, c2, subId as TLShapeId, { portId: subIn.id, terminal:'end' }) }
            yCursor += DEFAULT_NODE_SPACING_PX + 180
          }
        })
        })
        // 4) Auto layout (tree) from this main node
        layoutTreeFrom(editor, shape.id as TLShapeId, { dx: 160, dy: 260 })
      } catch (error: any) {
        console.error('Submit error:', error)
        alert('An error occurred. Please try again.')
      }
    }, [editor, shape.id, text, demoModeContext])

    return (
      <div
        style={{
          display:'flex',
          alignItems:'center',
          gap:8,
          padding:'8px 12px',
          background:'#fff',
          border:'1px solid #000',
          borderRadius:8
        }}
        onPointerDown={(e)=>{ e.stopPropagation(); editor?.select(shape.id) }}
      >
        <Input
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder="What’s on the agenda today?"
          className="h-9"
          onKeyDown={(e)=>{
            if (e.key==='Enter') { e.preventDefault(); submit(); }
          }}
        />
      </div>
    )
  }
}



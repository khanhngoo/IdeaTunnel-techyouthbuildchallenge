import { Editor, TLShapeId } from 'tldraw'
import { getNodePortConnections } from '@/features/workflow/nodes/nodePorts'

type FileMap = Record<string, string>

function collectBranchTree(editor: Editor, branchId: TLShapeId) {
  const branch = editor.getShape(branchId)
  if (!branch || !editor.isShapeOfType(branch, 'node')) return [] as { title: string; bullets: string[] }[]
  const subs = [] as { title: string; bullets: string[] }[]
  const conns = getNodePortConnections(editor, branch.id)
  for (const c of conns) {
    if (c.terminal !== 'start') continue
    const sub = editor.getShape(c.connectedShapeId)
    if (!sub || !editor.isShapeOfType(sub, 'node')) continue
    const n: any = (sub as any).props.node
    const title = n?.title ?? 'Section'
    const content = (n?.assistantMessage ?? '') as string
    const bullets = content
      .split(/\n+/)
      .map(s => s.replace(/^[-*]\s?/, '').trim())
      .filter(Boolean)
    subs.push({ title, bullets })
  }
  return subs
}

export function compileCanvasToPRDFiles(editor: Editor): FileMap {
  const shapes = editor.getCurrentPageShapes()
  const files: FileMap = {}
  // Identify branch roots by assistantMessage header "# file.md" set during fanout mapping
  for (const s of shapes) {
    if (!editor.isShapeOfType(s, 'node')) continue
    const n: any = (s as any).props.node
    if (!n || n.type !== 'message') continue
    const head = (n.assistantMessage ?? '') as string
    const match = head.match(/^#\s*(product_brief\.md|technical_spec\.md|codebase_guide\.md)\s*$/m)
    if (!match) continue
    const file = match[1]
    const sections = collectBranchTree(editor, s.id)
    const md = ['# ' + file.replace(/_/g, ' ').replace(/\.md$/, ''), '']
    for (const sec of sections) {
      md.push('## ' + sec.title)
      for (const b of sec.bullets) md.push('- ' + b)
      md.push('')
    }
    files['docs/' + file] = md.join('\n')
  }
  // tasks.md from three files
  if (files['docs/product_brief.md'] || files['docs/technical_spec.md'] || files['docs/codebase_guide.md']) {
    const t: string[] = ['# Tasks', '', '## Implementation Checklist', '']
    for (const [path, content] of Object.entries(files)) {
      t.push('### ' + path.split('/').pop()?.replace(/_/g, ' ').replace(/\.md$/, ''))
      const bullets = content.split('\n').filter(line => line.startsWith('- '))
      if (bullets.length === 0) {
        t.push('- [ ] Review and add details')
      } else {
        for (const b of bullets) t.push('- [ ] ' + b.replace(/^-\s*/, ''))
      }
      t.push('')
    }
    files['docs/tasks.md'] = t.join('\n')
  }
  return files
}

export function downloadFiles(files: FileMap) {
  for (const [path, content] of Object.entries(files)) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = path
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
}



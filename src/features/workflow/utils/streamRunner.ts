export type NodeCreateEvent = {
  type: 'node-create'
  node: {
    id?: string
    title: string
    kind?: string
    parentId?: string
    file?: string
    section?: string
  }
}

export type NodeTextDeltaEvent = {
  type: 'node-text-delta'
  nodeId: string
  delta: string
}

export type NodeDoneEvent = {
  type: 'node-done'
  nodeId: string
}

export type StreamEvent = NodeCreateEvent | NodeTextDeltaEvent | NodeDoneEvent

export interface WorkflowStreamRunnerCallbacks {
  onNodeCreate: (event: NodeCreateEvent) => void
  onNodeTextDelta: (event: NodeTextDeltaEvent) => void
  onNodeDone: (event: NodeDoneEvent) => void
  onError?: (error: unknown) => void
  onComplete?: () => void
}

/**
 * Connects to the structured streaming endpoint and dispatches events as they arrive.
 */
export async function runWorkflowStream(
  init: {
    seedNode: { title: string; kind?: string; parentId?: string }
    strategy?: 'breadth' | 'depth'
    context?: string
  },
  callbacks: WorkflowStreamRunnerCallbacks
) {
  try {
    const response = await fetch('/api/workflow/stream-nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(init),
    })
    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const payload = line.replace(/^data:\s?/, '').trim()
        if (!payload) continue

        try {
          const parsed = JSON.parse(payload)
          // Expect shapes like { type: 'object', object: { events: [...] } } from toDataStreamResponse
          if (parsed?.type === 'object' && parsed?.object?.events) {
            const events: StreamEvent[] = parsed.object.events
            for (const evt of events) {
              switch (evt.type) {
                case 'node-create':
                  callbacks.onNodeCreate?.(evt)
                  break
                case 'node-text-delta':
                  callbacks.onNodeTextDelta?.(evt)
                  break
                case 'node-done':
                  callbacks.onNodeDone?.(evt)
                  break
                default:
                  break
              }
            }
          }

          if (parsed?.type === 'finish') {
            callbacks.onComplete?.()
          }
        } catch (err) {
          callbacks.onError?.(err)
        }
      }
    }

    callbacks.onComplete?.()
  } catch (error) {
    callbacks.onError?.(error)
  }
}



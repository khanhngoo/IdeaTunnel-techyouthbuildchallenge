import { T } from 'tldraw'

export type MessageNode = T.TypeOf<typeof MessageNode>

export const MessageNode = T.object({
  type: T.literal('message'),
  title: T.string,
  userMessage: T.string,
  assistantMessage: T.string,
  isExpanded: T.boolean,
  isEditingTitle: T.boolean,
  width: T.optional(T.number),
  height: T.optional(T.number),
})

// Flexible validator for migration
export const MessageNodeFlexible = T.object({
  type: T.literal('message'),
  title: T.optional(T.string),
  userMessage: T.string,
  assistantMessage: T.string,
  isExpanded: T.optional(T.boolean),
  isEditingTitle: T.optional(T.boolean),
  width: T.optional(T.number),
  height: T.optional(T.number),
})



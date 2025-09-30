import { T } from 'tldraw'

export type RootChatNode = T.TypeOf<typeof RootChatNode>

export const RootChatNode = T.object({
  type: T.literal('rootchat'),
  title: T.optional(T.string),
  idea: T.string,
  isSubmitting: T.optional(T.boolean),
  width: T.optional(T.number),
  height: T.optional(T.number),
})

export const RootChatNodeFlexible = T.object({
  type: T.literal('rootchat'),
  title: T.optional(T.string),
  idea: T.optional(T.string),
  isSubmitting: T.optional(T.boolean),
  width: T.optional(T.number),
  height: T.optional(T.number),
})



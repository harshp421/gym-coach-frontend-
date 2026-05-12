import { create } from "zustand"
import type { ChatMessage } from "../schemas/chat"

type CoachState = {
    messages: ChatMessage[]
    /** Streaming assistant content, not yet persisted with an id. */
    streaming: string | null
    error: string | null
    /** Sending = user hit send, server hasn't closed the stream yet. */
    sending: boolean

    setMessages: (messages: ChatMessage[]) => void
    appendUserMessage: (content: string, imageUrl?: string | null) => void
    /** Drop any optimistic user message added with appendUserMessage. */
    rollbackOptimistic: () => void
    appendChunk: (text: string) => void
    finishStream: (assistant: ChatMessage | null) => void
    setError: (msg: string | null) => void
    setSending: (sending: boolean) => void
    clear: () => void
}

const optimisticIdMarker = "optimistic:"

export const useCoachStore = create<CoachState>((set, get) => ({
    messages: [],
    streaming: null,
    error: null,
    sending: false,

    setMessages: (messages) => set({ messages, streaming: null, error: null }),

    appendUserMessage: (content, imageUrl) => {
        const optimistic: ChatMessage = {
            id: `${optimisticIdMarker}${Date.now()}`,
            sessionId: "",
            role: "user",
            content,
            imageUrl: imageUrl ?? null,
            createdAt: new Date().toISOString(),
        }
        set({
            messages: [...get().messages, optimistic],
            streaming: "",
            error: null,
        })
    },

    rollbackOptimistic: () => {
        set({
            messages: get().messages.filter((m) => !m.id.startsWith(optimisticIdMarker)),
            streaming: null,
        })
    },

    appendChunk: (text) =>
        set({ streaming: (get().streaming ?? "") + text }),

    finishStream: (assistant) => {
        const next = [...get().messages]
        if (assistant) next.push(assistant)
        else if (get().streaming) {
            // Server didn't return an id (rare). Keep the streamed text as
            // a non-persisted assistant bubble so the user doesn't lose it.
            next.push({
                id: `${optimisticIdMarker}assistant:${Date.now()}`,
                sessionId: "",
                role: "assistant",
                content: get().streaming ?? "",
                imageUrl: null,
                createdAt: new Date().toISOString(),
            })
        }
        set({ messages: next, streaming: null, sending: false })
    },

    setError: (error) => set({ error, streaming: null, sending: false }),
    setSending: (sending) => set({ sending }),
    clear: () => set({ messages: [], streaming: null, error: null, sending: false }),
}))

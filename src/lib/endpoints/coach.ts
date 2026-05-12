import { api } from "../api"
import type { ChatMessage } from "../../schemas/chat"

export type ListMessagesResponse = { items: ChatMessage[] }

export const coachApi = {
    list: (limit = 50) =>
        api.get<ListMessagesResponse>("/coach/messages", {
            query: { limit },
        }),

    clear: () => api.delete<void>("/coach/messages"),

    // POST /coach/messages is SSE; it lives in lib/coach-stream.ts because
    // the api.ts wrapper assumes JSON and doesn't stream.
}

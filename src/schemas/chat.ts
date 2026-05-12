export type ChatRole = "user" | "assistant" | "system"

export type ChatMessage = {
    id: string
    sessionId: string
    role: ChatRole
    content: string
    /** Cloudinary URL when the user attached a photo to this message. */
    imageUrl: string | null
    createdAt: string
}

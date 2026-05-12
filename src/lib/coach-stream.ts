// SSE consumer for POST /api/v1/coach/messages. The shared `api.ts` wrapper
// assumes JSON responses; SSE needs raw streaming, so we go straight to
// `fetch` here.

const BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"

export type CoachStreamHandlers = {
    onChunk: (text: string) => void
    onDone: (messageId: string | null) => void
    onError: (message: string) => void
    /** Hooked into AbortSignal so navigation away can cut the upstream call. */
    signal?: AbortSignal
}

export type SendOptions = {
    /** Cloudinary URL to attach. Routes the turn through the vision model. */
    imageUrl?: string
}

export async function streamCoachMessage(
    content: string,
    handlers: CoachStreamHandlers,
    options: SendOptions = {},
): Promise<void> {
    let response: Response
    try {
        const body: Record<string, unknown> = { content }
        if (options.imageUrl) body.imageUrl = options.imageUrl
        response = await fetch(`${BASE_URL}/coach/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
            signal: handlers.signal,
        })
    } catch (err) {
        if ((err as Error)?.name === "AbortError") return
        handlers.onError(
            err instanceof Error ? err.message : "Network error reaching coach",
        )
        return
    }

    if (!response.ok || !response.body) {
        let detail = ""
        try {
            const text = await response.text()
            // Try to parse as JSON; if backend sent { error: "..." } we
            // surface that, otherwise the raw body.
            try {
                const parsed = JSON.parse(text)
                detail = parsed?.error || text
            } catch {
                detail = text
            }
        } catch {
            detail = `HTTP ${response.status}`
        }
        handlers.onError(
            detail === "coach_not_configured"
                ? "Coach is offline — set GROQ_API_KEY on the server."
                : detail || `HTTP ${response.status}`,
        )
        return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
        for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            // Each SSE event is separated by a blank line ("\n\n").
            let sep = buffer.indexOf("\n\n")
            while (sep !== -1) {
                const frame = buffer.slice(0, sep)
                buffer = buffer.slice(sep + 2)
                handleFrame(frame, handlers)
                sep = buffer.indexOf("\n\n")
            }
        }
        // Flush any trailing frame on close.
        if (buffer.trim()) handleFrame(buffer, handlers)
    } catch (err) {
        if ((err as Error)?.name === "AbortError") return
        handlers.onError(err instanceof Error ? err.message : "Stream broke")
    } finally {
        reader.releaseLock?.()
    }
}

function handleFrame(frame: string, handlers: CoachStreamHandlers): void {
    let event = "message"
    let dataLines: string[] = []
    for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) {
            event = line.slice(7).trim()
        } else if (line.startsWith("data: ")) {
            dataLines.push(line.slice(6))
        }
    }
    if (dataLines.length === 0) return
    const dataStr = dataLines.join("\n")

    let payload: any = null
    try {
        payload = JSON.parse(dataStr)
    } catch {
        // Non-JSON frames are ignored.
        return
    }

    if (event === "chunk" && typeof payload?.text === "string") {
        handlers.onChunk(payload.text)
    } else if (event === "done") {
        handlers.onDone(typeof payload?.messageId === "string" ? payload.messageId : null)
    } else if (event === "error") {
        const msg =
            typeof payload?.message === "string"
                ? payload.message
                : "Coach error"
        handlers.onError(
            msg === "coach_not_configured"
                ? "Coach is offline — set GROQ_API_KEY on the server."
                : msg,
        )
    }
}

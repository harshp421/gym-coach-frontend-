import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { coachApi } from "../../lib/endpoints/coach"
import { streamCoachMessage } from "../../lib/coach-stream"
import { useQuery } from "../../hooks/useQuery"
import { useCoachStore } from "../../stores/coachStore"
import { confirm } from "../../stores/confirmStore"
import { toast } from "../../stores/toastStore"
import { isCloudinaryConfigured, uploadImage } from "../../lib/cloudinary"
import Spinner from "../../components/ui/Spinner"
import MessageBubble from "./components/MessageBubble"

type StagedPhoto = {
    file: File
    /** Local object URL for preview. Revoked when removed/sent. */
    previewUrl: string
}

function CoachView() {
    const messages = useCoachStore((s) => s.messages)
    const streaming = useCoachStore((s) => s.streaming)
    const error = useCoachStore((s) => s.error)
    const sending = useCoachStore((s) => s.sending)
    const setMessages = useCoachStore((s) => s.setMessages)
    const appendUserMessage = useCoachStore((s) => s.appendUserMessage)
    const rollbackOptimistic = useCoachStore((s) => s.rollbackOptimistic)
    const appendChunk = useCoachStore((s) => s.appendChunk)
    const finishStream = useCoachStore((s) => s.finishStream)
    const setError = useCoachStore((s) => s.setError)
    const setSending = useCoachStore((s) => s.setSending)
    const clear = useCoachStore((s) => s.clear)

    const { state: listState, call: list } = useQuery(coachApi.list)
    const { state: clearState, call: clearOnServer } = useQuery(coachApi.clear)

    const [draft, setDraft] = useState("")
    const [photo, setPhoto] = useState<StagedPhoto | null>(null)
    const [uploading, setUploading] = useState(false)
    const abortRef = useRef<AbortController | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Initial load.
    useEffect(() => {
        list(50)
            .then((res) => setMessages(res.items))
            .catch(() => {
                setMessages([])
            })
        return () => {
            abortRef.current?.abort()
        }
    }, [list, setMessages])

    // Auto-scroll to bottom on new content.
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    }, [messages, streaming])

    // Revoke the staged photo's object URL when it changes/unmounts so we
    // don't leak browser memory.
    useEffect(() => {
        return () => {
            if (photo) URL.revokeObjectURL(photo.previewUrl)
        }
    }, [photo])

    const stagePhoto = (file: File) => {
        if (!isCloudinaryConfigured()) {
            toast.error("Photo upload isn't set up — see .env.example")
            return
        }
        if (photo) URL.revokeObjectURL(photo.previewUrl)
        setPhoto({ file, previewUrl: URL.createObjectURL(file) })
    }

    const removePhoto = () => {
        if (photo) URL.revokeObjectURL(photo.previewUrl)
        setPhoto(null)
    }

    const handleSend = async () => {
        const trimmed = draft.trim()
        // With a photo + no text, supply a sensible default question.
        const content =
            trimmed || (photo ? "What machine is this and how do I use it?" : "")
        if (!content || sending || uploading) return

        let imageUrl: string | undefined
        if (photo) {
            setUploading(true)
            try {
                const result = await uploadImage(photo.file)
                imageUrl = result.secureUrl
            } catch (err) {
                setUploading(false)
                toast.error(
                    err instanceof Error ? err.message : "Couldn't upload photo",
                )
                return
            }
            setUploading(false)
        }

        // Reset composer + optimistic bubble.
        setDraft("")
        const optimisticImage = imageUrl ?? null
        if (photo) URL.revokeObjectURL(photo.previewUrl)
        setPhoto(null)

        setError(null)
        setSending(true)
        appendUserMessage(content, optimisticImage)

        const controller = new AbortController()
        abortRef.current = controller

        await streamCoachMessage(
            content,
            {
                signal: controller.signal,
                onChunk: (text) => appendChunk(text),
                onDone: async () => {
                    try {
                        const res = await coachApi.list(50)
                        setMessages(res.items)
                    } catch {
                        finishStream(null)
                    }
                    setSending(false)
                },
                onError: (msg) => {
                    rollbackOptimistic()
                    setError(msg)
                },
            },
            { imageUrl },
        )
    }

    const handleClear = async () => {
        const ok = await confirm({
            title: "Clear the chat?",
            body: "All messages will be removed.",
            confirmLabel: "Clear",
            destructive: true,
        })
        if (!ok) return
        try {
            await clearOnServer()
            clear()
            toast.info("Chat cleared")
        } catch {
            // surfaced via clearState.error below
        }
    }

    const showEmpty =
        !listState.loading &&
        messages.length === 0 &&
        !streaming &&
        !error

    return (
        <main className="h-dvh bg-stone-50 text-neutral-900 flex flex-col overflow-hidden">
            <header className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur border-b border-neutral-200">
                <div className="max-w-3xl mx-auto px-6 sm:px-10 py-4 flex items-center justify-between gap-3">
                    <Link
                        to="/dashboard"
                        className="text-xl font-black tracking-tight"
                    >
                        GC
                    </Link>
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                        Coach
                    </span>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={
                            sending ||
                            clearState.loading ||
                            messages.length === 0
                        }
                        className="text-xs text-neutral-500 hover:text-red-600 transition-colors disabled:opacity-30"
                    >
                        Clear
                    </button>
                </div>
            </header>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto"
            >
                <div className="max-w-3xl mx-auto px-6 sm:px-10 py-8 flex flex-col gap-3">
                    {listState.loading && messages.length === 0 && (
                        <div className="flex items-center justify-center py-16 text-neutral-400">
                            <Spinner size="md" />
                        </div>
                    )}

                    {showEmpty && <EmptyState />}

                    {messages.map((m) => (
                        <MessageBubble
                            key={m.id}
                            role={m.role}
                            content={m.content}
                            imageUrl={m.imageUrl}
                        />
                    ))}

                    {streaming !== null && (
                        <MessageBubble
                            role="assistant"
                            content={streaming || "…"}
                            streaming
                        />
                    )}

                    {error && (
                        <div
                            role="alert"
                            className="self-start max-w-[85%] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}
                </div>
            </div>

            <Composer
                value={draft}
                onChange={setDraft}
                onSend={handleSend}
                sending={sending}
                uploading={uploading}
                photo={photo}
                onAttachPhoto={stagePhoto}
                onRemovePhoto={removePhoto}
            />
        </main>
    )
}

function Composer({
    value,
    onChange,
    onSend,
    sending,
    uploading,
    photo,
    onAttachPhoto,
    onRemovePhoto,
}: {
    value: string
    onChange: (v: string) => void
    onSend: () => void
    sending: boolean
    uploading: boolean
    photo: StagedPhoto | null
    onAttachPhoto: (file: File) => void
    onRemovePhoto: () => void
}) {
    const fileRef = useRef<HTMLInputElement>(null)

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            onSend()
        }
    }

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) onAttachPhoto(file)
        // Reset so picking the same file twice in a row re-fires onChange.
        e.target.value = ""
    }

    const disabled = sending || uploading
    const canSend = !disabled && (value.trim().length > 0 || photo !== null)

    return (
        <div
            className="border-t border-neutral-200 bg-stone-50"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="max-w-3xl mx-auto px-6 sm:px-10 py-3 flex flex-col gap-2">
                {photo && (
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            <img
                                src={photo.previewUrl}
                                alt="Selected"
                                className="size-16 rounded-xl object-cover border border-neutral-200"
                            />
                            <button
                                type="button"
                                onClick={onRemovePhoto}
                                disabled={uploading || sending}
                                aria-label="Remove photo"
                                className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-neutral-900 text-white text-xs leading-none flex items-center justify-center shadow disabled:opacity-50"
                            >
                                ×
                            </button>
                        </div>
                        <div className="text-xs text-neutral-500 flex-1 min-w-0 truncate">
                            {uploading
                                ? "Uploading photo…"
                                : "Photo attached — describe what to do or just send."}
                        </div>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={disabled}
                        aria-label="Attach a photo"
                        className="shrink-0 size-12 inline-flex items-center justify-center rounded-full border border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <CameraIcon />
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={onPick}
                        className="hidden"
                    />

                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={onKey}
                        rows={1}
                        placeholder={
                            photo
                                ? "Add a question (optional)…"
                                : "Ask your coach…"
                        }
                        disabled={disabled}
                        className="flex-1 max-h-32 px-4 py-3 text-base rounded-2xl bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors resize-none disabled:opacity-50"
                    />

                    <button
                        type="button"
                        onClick={onSend}
                        disabled={!canSend}
                        className="shrink-0 inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {sending || uploading ? <Spinner size="sm" /> : "Send →"}
                    </button>
                </div>
            </div>
        </div>
    )
}

function CameraIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path
                d="M4 7h3l1.5-2h5L15 7h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
            />
            <circle
                cx="11"
                cy="12.5"
                r="3.2"
                stroke="currentColor"
                strokeWidth="1.7"
            />
        </svg>
    )
}

function EmptyState() {
    return (
        <div className="text-center py-12">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Coach
            </span>
            <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                Ask anything.
            </h1>
            <p className="mt-3 text-neutral-500 max-w-md mx-auto">
                "Why am I plateauing on bench?" · "Make my plan 4 days instead
                of 5" · or snap a photo of a machine you don't know.
            </p>
        </div>
    )
}

export default CoachView

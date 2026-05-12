import type { ChatRole } from "../../../schemas/chat"

type Props = {
    role: ChatRole
    content: string
    /** When set, renders an image above the text (user-side photo). */
    imageUrl?: string | null
    /** Visual nuance: still streaming. Adds a subtle pulsing caret. */
    streaming?: boolean
}

function MessageBubble({ role, content, imageUrl, streaming }: Props) {
    const isUser = role === "user"
    return (
        <div
            className={`w-full flex ${
                isUser ? "justify-end" : "justify-start"
            }`}
        >
            <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl overflow-hidden text-[15px] ${
                    isUser
                        ? "bg-neutral-900 text-white rounded-br-md"
                        : "bg-white border border-neutral-200 text-neutral-900 rounded-bl-md"
                }`}
            >
                {imageUrl && (
                    <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                    >
                        <img
                            src={imageUrl}
                            alt="Attached"
                            loading="lazy"
                            className="block w-full max-h-80 object-cover bg-neutral-100"
                        />
                    </a>
                )}
                {(content || streaming) && (
                    <div className="px-4 py-3 whitespace-pre-wrap leading-relaxed">
                        {content}
                        {streaming && (
                            <span
                                aria-hidden
                                className="inline-block w-1 h-4 align-middle bg-neutral-400 ml-0.5 animate-pulse"
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MessageBubble

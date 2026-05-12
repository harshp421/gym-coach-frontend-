import { useEffect } from "react"
import { useConfirmStore } from "../../stores/confirmStore"

/**
 * Mounted once at the App root. Renders the active confirm modal, if any.
 * Bottom sheet on mobile, centered card on desktop — matches the rest of
 * the app's modal patterns (ExercisePicker, HistorySheet).
 */
function ConfirmDialog() {
    const pending = useConfirmStore((s) => s.pending)
    const close = useConfirmStore((s) => s.close)

    useEffect(() => {
        if (!pending) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close(false)
            else if (e.key === "Enter") close(true)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [pending, close])

    if (!pending) return null

    const confirmLabel = pending.confirmLabel ?? "Confirm"
    const cancelLabel = pending.cancelLabel ?? "Cancel"

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/40 backdrop-blur-sm animate-in"
            onClick={() => close(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-md bg-stone-50 sm:rounded-3xl rounded-t-3xl border border-neutral-200 shadow-2xl p-6"
            >
                <h3
                    id="confirm-title"
                    className="text-2xl font-black tracking-tight text-neutral-900"
                >
                    {pending.title}
                </h3>
                {pending.body && (
                    <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                        {pending.body}
                    </p>
                )}
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => close(false)}
                        className="min-h-12 px-5 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => close(true)}
                        autoFocus
                        className={`min-h-12 px-5 rounded-full text-sm font-semibold transition-colors ${
                            pending.destructive
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-neutral-900 text-white hover:bg-neutral-800"
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmDialog

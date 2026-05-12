import { useToastStore, type ToastKind } from "../../stores/toastStore"

/**
 * Sticky stack of toasts at the bottom-center on mobile, top-right on
 * desktop. One mount at the App root.
 */
function ToastViewport() {
    const items = useToastStore((s) => s.items)
    const dismiss = useToastStore((s) => s.dismiss)

    if (items.length === 0) return null

    return (
        <div
            aria-live="polite"
            className="fixed z-50 left-1/2 bottom-20 -translate-x-1/2 sm:left-auto sm:right-4 sm:bottom-auto sm:top-4 sm:translate-x-0 flex flex-col gap-2 w-[min(92vw,360px)] pointer-events-none"
        >
            {items.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className={`pointer-events-auto text-left rounded-2xl border shadow-lg px-4 py-3 text-sm flex items-start gap-3 ${kindStyles(t.kind)}`}
                >
                    <span aria-hidden className="text-base leading-none mt-0.5">
                        {kindIcon(t.kind)}
                    </span>
                    <span className="flex-1">{t.message}</span>
                </button>
            ))}
        </div>
    )
}

function kindStyles(kind: ToastKind): string {
    switch (kind) {
        case "success":
            return "bg-emerald-50 border-emerald-200 text-emerald-900"
        case "error":
            return "bg-red-50 border-red-200 text-red-900"
        default:
            return "bg-neutral-900 border-neutral-900 text-white"
    }
}

function kindIcon(kind: ToastKind): string {
    switch (kind) {
        case "success":
            return "✓"
        case "error":
            return "!"
        default:
            return "·"
    }
}

export default ToastViewport

import { useEffect, useState } from "react"

type Props = {
    /** Total rest duration in seconds. */
    seconds: number
    onDismiss: () => void
}

/**
 * Sticky countdown shown after a set is logged. Pure client-side: state
 * lives in the component and disappears on refresh. Survives quick
 * navigations within the session view because SessionView holds it.
 */
function RestTimer({ seconds, onDismiss }: Props) {
    const [remaining, setRemaining] = useState(seconds)
    const [paused, setPaused] = useState(false)

    useEffect(() => {
        setRemaining(seconds)
        setPaused(false)
    }, [seconds])

    useEffect(() => {
        if (paused || remaining <= 0) return
        const id = window.setInterval(() => {
            setRemaining((r) => Math.max(0, r - 1))
        }, 1000)
        return () => window.clearInterval(id)
    }, [paused, remaining])

    useEffect(() => {
        if (remaining === 0) {
            const id = window.setTimeout(() => onDismiss(), 1500)
            return () => window.clearTimeout(id)
        }
    }, [remaining, onDismiss])

    const min = Math.floor(remaining / 60)
    const sec = remaining % 60
    const pct = Math.max(0, (remaining / Math.max(seconds, 1)) * 100)

    const done = remaining === 0

    return (
        <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-80 z-30">
            <div
                className={`rounded-2xl border shadow-lg overflow-hidden ${
                    done
                        ? "bg-emerald-600 text-white border-emerald-700"
                        : "bg-neutral-900 text-white border-neutral-900"
                }`}
            >
                <div className="px-4 pt-3 flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                            {done ? "Go" : "Rest"}
                        </span>
                        <span className="text-2xl font-black tabular-nums">
                            {done
                                ? "ready"
                                : `${min}:${sec.toString().padStart(2, "0")}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {!done && (
                            <button
                                type="button"
                                onClick={() => setPaused((p) => !p)}
                                className="size-9 inline-flex items-center justify-center rounded-full hover:bg-white/10 text-sm"
                            >
                                {paused ? "▶" : "❙❙"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="size-9 inline-flex items-center justify-center rounded-full hover:bg-white/10 text-base"
                        >
                            ×
                        </button>
                    </div>
                </div>
                <div className="h-1 bg-white/10">
                    <div
                        className="h-full bg-white transition-all duration-1000 ease-linear"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        </div>
    )
}

export default RestTimer

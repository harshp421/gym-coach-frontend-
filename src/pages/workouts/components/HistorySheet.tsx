import { useEffect } from "react"
import { sessionsApi } from "../../../lib/endpoints/sessions"
import { useCachedQuery } from "../../../hooks/useCachedQuery"
import Spinner from "../../../components/ui/Spinner"

type Props = {
    planExerciseId: string
    exerciseName: string
    onClose: () => void
}

const fmtDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        })
    } catch {
        return iso.slice(0, 10)
    }
}

function HistorySheet({ planExerciseId, exerciseName, onClose }: Props) {
    const { state } = useCachedQuery(
        `workouts:exercises:${planExerciseId}:history`,
        () => sessionsApi.exerciseHistory(planExerciseId, { limit: 10 }),
        { ttl: 30_000 },
    )

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [onClose])

    const items = state.data?.items ?? []

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-lg max-h-[80vh] flex flex-col bg-stone-50 rounded-t-3xl border border-neutral-200 shadow-2xl"
            >
                <header className="px-6 pt-5 pb-3 border-b border-neutral-200 flex items-start justify-between gap-3">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                            Recent sessions
                        </span>
                        <h3 className="mt-1 text-xl font-black tracking-tight">
                            {exerciseName}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="size-9 inline-flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500"
                    >
                        ×
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {state.loading && (
                        <div className="flex items-center justify-center py-8 text-neutral-400">
                            <Spinner size="md" />
                        </div>
                    )}
                    {state.error && !state.loading && (
                        <p className="px-2 py-4 text-sm text-red-600">
                            {state.error.userMessage || state.error.message}
                        </p>
                    )}
                    {!state.loading && items.length === 0 && !state.error && (
                        <p className="px-2 py-4 text-sm text-neutral-500">
                            No history yet — this'll be your first.
                        </p>
                    )}

                    <ul className="flex flex-col gap-2">
                        {items.map((entry) => (
                            <li
                                key={entry.sessionId}
                                className="rounded-xl bg-white border border-neutral-200 p-3"
                            >
                                <div className="flex items-baseline justify-between">
                                    <span className="text-sm font-semibold tabular-nums">
                                        {fmtDate(entry.startedAt)}
                                    </span>
                                    {!entry.completedAt && (
                                        <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                                            in progress
                                        </span>
                                    )}
                                </div>
                                <ul className="mt-2 flex flex-wrap gap-1.5">
                                    {entry.sets.map((s) => (
                                        <li
                                            key={s.id}
                                            className={`text-xs tabular-nums px-2 py-1 rounded-full border ${
                                                s.isPr
                                                    ? "bg-neutral-900 text-white border-neutral-900"
                                                    : "bg-neutral-100 text-neutral-700 border-neutral-200"
                                            }`}
                                            title={s.isPr ? "Personal record" : undefined}
                                        >
                                            {s.isPr && (
                                                <span className="mr-1 font-bold">
                                                    PR
                                                </span>
                                            )}
                                            {s.weightKg !== null
                                                ? `${s.weightKg}kg`
                                                : "BW"}{" "}
                                            × {s.reps}
                                            {s.rpe !== null && (
                                                <span
                                                    className={
                                                        s.isPr
                                                            ? "text-neutral-300"
                                                            : "text-neutral-400"
                                                    }
                                                >
                                                    {" "}
                                                    @{s.rpe}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default HistorySheet

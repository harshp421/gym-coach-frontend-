import { useEffect, useMemo, useState } from "react"
import { exercisesApi } from "../../../lib/endpoints/exercises"
import type { ExerciseListQuery } from "../../../lib/endpoints/exercises"
import { useQuery } from "../../../hooks/useQuery"
import type {
    Exercise,
    ExerciseLevel,
    PlanExercise,
} from "../../../schemas/workout"
import Spinner from "../../../components/ui/Spinner"

type Props = {
    onClose: () => void
    /**
     * Caller does the mutation (swap or add). The picker just shows the
     * catalog and forwards the chosen exercise; if `onSelect` throws, the
     * picker surfaces the message inline so the user can retry.
     */
    onSelect: (exercise: Exercise) => Promise<void>
    /**
     * Swap mode: prefill filters by the current exercise + show "Swap"
     * header. Add mode: omit, picker shows generic "Add an exercise" header
     * with optional level prefill.
     */
    swappingFrom?: PlanExercise
    /** Optional cap for add-mode list (level <= user's experience). */
    levelCap?: ExerciseLevel
}

function ExercisePicker({ onClose, onSelect, swappingFrom, levelCap }: Props) {
    const isSwap = !!swappingFrom
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const { state: listState, call: list } = useQuery(exercisesApi.list)

    // Filters derived from swap target / level cap. Separated from the search
    // term so the search debounce doesn't get reset whenever the parent
    // re-renders with the same swappingFrom object.
    const baseFilters: ExerciseListQuery = useMemo(() => {
        if (swappingFrom) {
            return {
                muscle: swappingFrom.exercise.primaryMuscles[0],
                equipment: swappingFrom.exercise.equipment ?? undefined,
                level: swappingFrom.exercise.level,
                limit: 30,
            }
        }
        return { level: levelCap, limit: 50 }
    }, [swappingFrom, levelCap])

    // Debounce the search box. 250ms feels live without hammering the
    // network — cache hits return synchronously anyway.
    useEffect(() => {
        const id = setTimeout(() => setDebouncedQuery(query.trim()), 250)
        return () => clearTimeout(id)
    }, [query])

    // Re-fetch whenever filters or debounced search term change. `list`
    // already de-dupes via exercisesApi's in-memory cache.
    useEffect(() => {
        list({ ...baseFilters, q: debouncedQuery || undefined }).catch(() => {})
    }, [list, baseFilters, debouncedQuery])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [onClose])

    // Enter key shouldn't reload the page. Search is live, so nothing to do.
    const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
    }

    const handleSelect = async (exercise: Exercise) => {
        if (swappingFrom && exercise.id === swappingFrom.exercise.id) {
            onClose()
            return
        }
        setSubmitting(true)
        setSubmitError(null)
        try {
            await onSelect(exercise)
            onClose()
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : "Couldn't update the plan"
            setSubmitError(msg)
        } finally {
            setSubmitting(false)
        }
    }

    // Render cached data instantly during a refetch — useQuery clears
    // `data` when a new call starts, but the underlying api layer can
    // satisfy the same key from cache so we peek directly.
    const peeked = exercisesApi.peekList({
        ...baseFilters,
        q: debouncedQuery || undefined,
    })
    const items = listState.data?.items ?? peeked?.items ?? []
    const showSpinner = listState.loading && items.length === 0

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-xl max-h-[90vh] flex flex-col bg-stone-50 sm:rounded-3xl rounded-t-3xl border border-neutral-200 shadow-2xl"
            >
                <header className="px-6 pt-5 pb-4 border-b border-neutral-200">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                                {isSwap ? "Swap exercise" : "Add an exercise"}
                            </span>
                            {isSwap && swappingFrom ? (
                                <>
                                    <h2 className="mt-1 text-2xl font-black tracking-tight">
                                        {swappingFrom.exercise.name}
                                    </h2>
                                    <p className="mt-1 text-xs text-neutral-500">
                                        Same{" "}
                                        <span className="font-medium text-neutral-700">
                                            {swappingFrom.exercise
                                                .primaryMuscles[0] ?? "muscle"}
                                        </span>
                                        , same equipment.
                                    </p>
                                </>
                            ) : (
                                <h2 className="mt-1 text-2xl font-black tracking-tight">
                                    Pick an exercise.
                                </h2>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="size-9 inline-flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500"
                        >
                            ×
                        </button>
                    </div>

                    <form onSubmit={onSearch} className="mt-4">
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={
                                isSwap
                                    ? "Search alternatives…"
                                    : "Search exercises…"
                            }
                            className="w-full min-h-11 px-4 text-base rounded-xl bg-white border border-neutral-300 focus:border-neutral-900 outline-none transition-colors"
                        />
                    </form>
                </header>

                <div className="flex-1 overflow-y-auto px-3 py-3">
                    {showSpinner && (
                        <div className="flex items-center justify-center py-8 text-neutral-400">
                            <Spinner size="md" />
                        </div>
                    )}
                    {listState.error && !listState.loading && (
                        <div className="m-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {listState.error.userMessage ||
                                listState.error.message}
                        </div>
                    )}
                    {!showSpinner && items.length === 0 && (
                        <div className="px-3 py-6 text-sm text-neutral-500">
                            {isSwap
                                ? "No alternatives found."
                                : "No exercises match."}
                        </div>
                    )}
                    <ul className="flex flex-col gap-1">
                        {items.map((ex) => {
                            const isCurrent =
                                isSwap && swappingFrom
                                    ? ex.id === swappingFrom.exercise.id
                                    : false
                            return (
                                <li key={ex.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(ex)}
                                        disabled={submitting}
                                        className={`w-full text-left rounded-xl px-3 py-3 transition-colors disabled:opacity-50 ${
                                            isCurrent
                                                ? "bg-neutral-900 text-white"
                                                : "bg-white border border-neutral-200 hover:border-neutral-900"
                                        }`}
                                    >
                                        <div className="flex items-baseline justify-between gap-3">
                                            <div className="font-semibold flex items-center gap-2 min-w-0">
                                                <span className="truncate">
                                                    {ex.name}
                                                </span>
                                                {ex.origin === "user" && (
                                                    <span
                                                        className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-normal uppercase ${
                                                            isCurrent
                                                                ? "bg-white text-neutral-900"
                                                                : "bg-neutral-900 text-white"
                                                        }`}
                                                    >
                                                        yours
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                className={`text-[11px] uppercase tracking-wider shrink-0 ${
                                                    isCurrent
                                                        ? "text-neutral-300"
                                                        : "text-neutral-400"
                                                }`}
                                            >
                                                {ex.equipment ?? "—"}
                                            </div>
                                        </div>
                                        <div
                                            className={`mt-1 text-xs ${
                                                isCurrent
                                                    ? "text-neutral-300"
                                                    : "text-neutral-500"
                                            }`}
                                        >
                                            {ex.primaryMuscles.join(", ")} ·{" "}
                                            {ex.mechanic ?? "—"} · {ex.level}
                                        </div>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>

                {submitError && (
                    <div
                        role="alert"
                        className="mx-3 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {submitError}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ExercisePicker

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { Exercise, PlanDay, WorkoutPlan } from "../../../schemas/workout"
import { workoutsApi } from "../../../lib/endpoints/workouts"
import { planEditApi } from "../../../lib/endpoints/plan-edit"
import { toast } from "../../../stores/toastStore"
import Spinner from "../../../components/ui/Spinner"

type Props = {
    exercise: Exercise
    onClose: () => void
    onAdded?: () => void
}

/**
 * Bottom sheet that picks which day to drop `exercise` into. Loads the
 * user's active plan, lists its days, then calls plan-edit's
 * createExercise with sensible defaults for the exercise's mechanic.
 */
function AddToPlanSheet({ exercise, onClose, onAdded }: Props) {
    const [plan, setPlan] = useState<WorkoutPlan | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        workoutsApi
            .getPlan()
            .then((res) => {
                if (cancelled) return
                setPlan(res.plan)
            })
            .catch((err) => {
                if (cancelled) return
                setError(err?.userMessage || err?.message || "Couldn't load your plan")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    const handlePick = async (day: PlanDay) => {
        setSubmitting(day.id)
        const isCompound = exercise.mechanic === "compound"
        try {
            await planEditApi.createExercise(day.id, {
                exerciseId: exercise.id,
                targetSets: isCompound ? 4 : 3,
                targetRepsMin: isCompound ? 6 : 10,
                targetRepsMax: isCompound ? 10 : 12,
                targetRpe: 7.5,
                restSeconds: isCompound ? 120 : 75,
            })
            toast.success(`Added to ${day.name}`)
            onAdded?.()
            onClose()
        } catch (err) {
            const msg =
                (err as { userMessage?: string; message?: string })?.userMessage ||
                (err as Error)?.message ||
                "Couldn't add to that day"
            toast.error(msg)
        } finally {
            setSubmitting(null)
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Add to plan"
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
        >
            {/* Backdrop */}
            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Sheet */}
            <div className="relative w-full sm:max-w-md bg-stone-50 rounded-t-3xl sm:rounded-3xl border-t sm:border border-neutral-200 max-h-[80vh] overflow-y-auto">
                <header className="sticky top-0 bg-stone-50 px-6 pt-6 pb-3 border-b border-neutral-200">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                                Add to plan
                            </span>
                            <h2 className="mt-2 text-2xl font-black tracking-tight leading-tight">
                                {exercise.name}
                            </h2>
                            <p className="mt-1 text-xs text-neutral-500">
                                Pick a day below — we'll set defaults you can edit later.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="text-neutral-400 hover:text-neutral-900 text-xl leading-none p-1 -m-1"
                        >
                            ×
                        </button>
                    </div>
                </header>

                <div className="px-6 py-4">
                    {loading && (
                        <div className="flex items-center gap-3 text-sm text-neutral-500 py-6">
                            <Spinner size="sm" />
                            Loading your plan…
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {!loading && !error && !plan && (
                        <div className="text-center py-6">
                            <p className="text-sm text-neutral-600">
                                You don't have a plan yet.
                            </p>
                            <Link
                                to="/workouts/plan"
                                onClick={onClose}
                                className="mt-4 inline-flex items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                            >
                                Build one →
                            </Link>
                        </div>
                    )}

                    {plan && plan.days.length === 0 && (
                        <div className="text-center py-6">
                            <p className="text-sm text-neutral-600">
                                Your plan has no days yet.
                            </p>
                            <Link
                                to="/workouts/plan"
                                onClick={onClose}
                                className="mt-4 inline-flex items-center gap-2 min-h-12 px-5 rounded-full bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                            >
                                Edit plan →
                            </Link>
                        </div>
                    )}

                    {plan && plan.days.length > 0 && (
                        <ul className="flex flex-col gap-2">
                            {plan.days.map((day) => {
                                const isSubmitting = submitting === day.id
                                return (
                                    <li key={day.id}>
                                        <button
                                            type="button"
                                            onClick={() => handlePick(day)}
                                            disabled={submitting !== null}
                                            className="w-full text-left rounded-2xl border border-neutral-200 bg-white p-4 hover:border-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="text-base font-semibold">
                                                    {day.name}
                                                </div>
                                                <div className="mt-0.5 text-xs text-neutral-500">
                                                    {day.exercises.length} exercise
                                                    {day.exercises.length === 1
                                                        ? ""
                                                        : "s"}
                                                </div>
                                            </div>
                                            {isSubmitting && <Spinner size="sm" />}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AddToPlanSheet

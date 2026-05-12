import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { PlanExercise } from "../../../schemas/workout"
import type { SetLog } from "../../../schemas/session"

type Draft = {
    weight: string
    reps: string
    rpe: string
}

type Props = {
    planExercise: PlanExercise
    sets: SetLog[]
    onLog: (input: {
        setNumber: number
        weightKg?: number
        reps: number
        rpe?: number
    }) => Promise<void>
    onDelete: (setLogId: string) => Promise<void>
    onShowHistory: () => void
    disabled?: boolean
}

function SetLogger({
    planExercise,
    sets,
    onLog,
    onDelete,
    onShowHistory,
    disabled,
}: Props) {
    const target = planExercise.targetSets
    const setsByNumber = new Map(sets.map((s) => [s.setNumber, s]))

    return (
        <article className="rounded-2xl bg-white border border-neutral-200 p-5">
            <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <Link
                        to={`/exercises/${planExercise.exercise.slug}`}
                        className="text-base font-bold hover:underline underline-offset-4 decoration-neutral-300"
                    >
                        {planExercise.exercise.name}
                    </Link>
                    <div className="mt-1 text-xs text-neutral-500">
                        {planExercise.exercise.primaryMuscles.join(", ")}
                        {planExercise.exercise.equipment
                            ? ` · ${planExercise.exercise.equipment}`
                            : ""}
                    </div>
                    <div className="mt-2 text-xs text-neutral-500 tabular-nums">
                        Target: {planExercise.targetSets} ×{" "}
                        {planExercise.targetRepsMin}–{planExercise.targetRepsMax}
                        {planExercise.targetRpe !== null
                            ? ` @ RPE ${planExercise.targetRpe}`
                            : ""}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onShowHistory}
                    className="shrink-0 text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-4"
                >
                    History
                </button>
            </header>

            <ul className="mt-4 flex flex-col gap-2">
                {Array.from({ length: target }, (_, i) => {
                    const setNumber = i + 1
                    const existing = setsByNumber.get(setNumber)
                    return (
                        <SetRow
                            key={setNumber}
                            setNumber={setNumber}
                            existing={existing}
                            onLog={(values) => onLog({ setNumber, ...values })}
                            onDelete={
                                existing ? () => onDelete(existing.id) : undefined
                            }
                            disabled={disabled}
                        />
                    )
                })}
            </ul>
        </article>
    )
}

function SetRow({
    setNumber,
    existing,
    onLog,
    onDelete,
    disabled,
}: {
    setNumber: number
    existing: SetLog | undefined
    onLog: (values: {
        weightKg?: number
        reps: number
        rpe?: number
    }) => Promise<void>
    onDelete?: () => Promise<void>
    disabled?: boolean
}) {
    const [draft, setDraft] = useState<Draft>(() => ({
        weight:
            existing?.weightKg !== undefined && existing?.weightKg !== null
                ? String(existing.weightKg)
                : "",
        reps: existing ? String(existing.reps) : "",
        rpe: existing?.rpe ? String(existing.rpe) : "",
    }))
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Re-sync drafts when the server value updates from elsewhere (resume,
    // refresh, another tab, etc).
    useEffect(() => {
        setDraft({
            weight:
                existing?.weightKg !== undefined && existing?.weightKg !== null
                    ? String(existing.weightKg)
                    : "",
            reps: existing ? String(existing.reps) : "",
            rpe: existing?.rpe ? String(existing.rpe) : "",
        })
    }, [existing?.id, existing?.weightKg, existing?.reps, existing?.rpe])

    const dirty =
        !existing ||
        String(existing.weightKg ?? "") !== draft.weight ||
        String(existing.reps) !== draft.reps ||
        String(existing.rpe ?? "") !== draft.rpe

    const isLogged = !!existing && !dirty

    const submit = async () => {
        setError(null)
        const reps = Number.parseInt(draft.reps, 10)
        if (!Number.isFinite(reps) || reps < 1) {
            setError("Reps?")
            return
        }
        const weightKg =
            draft.weight === "" ? undefined : Number.parseFloat(draft.weight)
        if (weightKg !== undefined && (!Number.isFinite(weightKg) || weightKg < 0)) {
            setError("Bad weight")
            return
        }
        const rpe = draft.rpe === "" ? undefined : Number.parseFloat(draft.rpe)
        if (rpe !== undefined && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10)) {
            setError("RPE 1–10")
            return
        }

        setSubmitting(true)
        try {
            await onLog({ weightKg, reps, rpe })
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <li>
            <div
                className={`grid grid-cols-[2.25rem_1fr_auto_1fr_auto] gap-2 items-center rounded-xl px-3 py-2 transition-colors ${
                    isLogged
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-stone-50 border border-neutral-200"
                }`}
            >
                <div className="flex items-center gap-1 text-xs font-bold tabular-nums text-neutral-500">
                    {isLogged && <span className="text-emerald-600">✓</span>}
                    {setNumber}
                </div>

                <input
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    value={draft.weight}
                    onChange={(e) =>
                        setDraft((d) => ({ ...d, weight: e.target.value }))
                    }
                    disabled={disabled || submitting}
                    className="min-w-0 min-h-11 px-3 text-base text-right rounded-lg bg-white border border-neutral-200 focus:border-neutral-900 outline-none tabular-nums"
                />
                <span className="text-neutral-400 px-1">×</span>
                <input
                    type="number"
                    inputMode="numeric"
                    placeholder="reps"
                    value={draft.reps}
                    onChange={(e) =>
                        setDraft((d) => ({ ...d, reps: e.target.value }))
                    }
                    disabled={disabled || submitting}
                    className="min-w-0 min-h-11 px-3 text-base text-right rounded-lg bg-white border border-neutral-200 focus:border-neutral-900 outline-none tabular-nums"
                />

                <button
                    type="button"
                    onClick={submit}
                    disabled={disabled || submitting || !dirty}
                    className={`min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors ${
                        isLogged
                            ? "text-emerald-700"
                            : "bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40"
                    }`}
                >
                    {submitting
                        ? "…"
                        : isLogged
                          ? "Edit"
                          : existing
                            ? "Save"
                            : "Log"}
                </button>
            </div>

            <div className="mt-1 px-3 flex items-center justify-between text-[11px] text-neutral-500">
                <label className="inline-flex items-center gap-1">
                    <span>RPE</span>
                    <input
                        type="number"
                        inputMode="decimal"
                        step={0.5}
                        min={1}
                        max={10}
                        placeholder="—"
                        value={draft.rpe}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, rpe: e.target.value }))
                        }
                        disabled={disabled || submitting}
                        className="w-12 px-1 text-right tabular-nums bg-transparent outline-none focus:text-neutral-900"
                    />
                </label>
                <div className="flex items-center gap-3">
                    {error && <span className="text-red-600">{error}</span>}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={disabled || submitting}
                            className="text-neutral-400 hover:text-red-600"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </li>
    )
}

export default SetLogger

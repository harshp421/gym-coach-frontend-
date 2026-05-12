import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { PlanExercise } from "../../../schemas/workout"
import {
    detectSessionInProgress,
    isExerciseHasLogs,
    planEditApi,
    type PlanResponse,
    type UpdateExerciseInput,
} from "../../../lib/endpoints/plan-edit"
import { confirm } from "../../../stores/confirmStore"
import Spinner from "../../../components/ui/Spinner"
import Reorderable from "./Reorderable"

type Props = {
    pe: PlanExercise
    canMoveUp: boolean
    canMoveDown: boolean
    /** Receives the API response on every successful mutation. */
    onAfterMutation: (response: PlanResponse) => void
    /** Called when the server returns 409 session_in_progress. */
    onConflict: (sessionId: string) => void
    onSwapClick: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    /** Disable all interactive controls (used while a parent action is running). */
    disabled?: boolean
}

type Draft = {
    targetSets: string
    targetRepsMin: string
    targetRepsMax: string
    targetRpe: string
    restSeconds: string
    notes: string
}

const toDraft = (pe: PlanExercise): Draft => ({
    targetSets: String(pe.targetSets),
    targetRepsMin: String(pe.targetRepsMin),
    targetRepsMax: String(pe.targetRepsMax),
    targetRpe: pe.targetRpe == null ? "" : String(pe.targetRpe),
    restSeconds: pe.restSeconds == null ? "" : String(pe.restSeconds),
    notes: pe.notes ?? "",
})

function ExerciseEditor({
    pe,
    canMoveUp,
    canMoveDown,
    onAfterMutation,
    onConflict,
    onSwapClick,
    onMoveUp,
    onMoveDown,
    disabled,
}: Props) {
    const [draft, setDraft] = useState<Draft>(() => toDraft(pe))
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Re-sync drafts when the server value changes upstream (e.g. swap).
    useEffect(() => {
        setDraft(toDraft(pe))
    }, [pe.id, pe.exercise.id, pe.targetSets, pe.targetRepsMin, pe.targetRepsMax, pe.targetRpe, pe.restSeconds, pe.notes])

    const dirty =
        draft.targetSets !== String(pe.targetSets) ||
        draft.targetRepsMin !== String(pe.targetRepsMin) ||
        draft.targetRepsMax !== String(pe.targetRepsMax) ||
        draft.targetRpe !== (pe.targetRpe == null ? "" : String(pe.targetRpe)) ||
        draft.restSeconds !==
            (pe.restSeconds == null ? "" : String(pe.restSeconds)) ||
        draft.notes !== (pe.notes ?? "")

    const buildPatch = (): UpdateExerciseInput | null => {
        const patch: UpdateExerciseInput = {}

        const sets = Number.parseInt(draft.targetSets, 10)
        if (!Number.isFinite(sets) || sets < 1) {
            setError("Sets must be a positive number")
            return null
        }
        if (sets !== pe.targetSets) patch.targetSets = sets

        const repsMin = Number.parseInt(draft.targetRepsMin, 10)
        const repsMax = Number.parseInt(draft.targetRepsMax, 10)
        if (
            !Number.isFinite(repsMin) ||
            !Number.isFinite(repsMax) ||
            repsMin < 1 ||
            repsMax < repsMin
        ) {
            setError("Rep range must be valid (max ≥ min)")
            return null
        }
        if (repsMin !== pe.targetRepsMin) patch.targetRepsMin = repsMin
        if (repsMax !== pe.targetRepsMax) patch.targetRepsMax = repsMax

        if (draft.targetRpe === "") {
            if (pe.targetRpe !== null) patch.targetRpe = null
        } else {
            const rpe = Number.parseFloat(draft.targetRpe)
            if (!Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
                setError("RPE must be between 1 and 10")
                return null
            }
            if (rpe !== pe.targetRpe) patch.targetRpe = rpe
        }

        if (draft.restSeconds === "") {
            if (pe.restSeconds !== null) patch.restSeconds = null
        } else {
            const rest = Number.parseInt(draft.restSeconds, 10)
            if (!Number.isFinite(rest) || rest < 0 || rest > 900) {
                setError("Rest must be 0–900s")
                return null
            }
            if (rest !== pe.restSeconds) patch.restSeconds = rest
        }

        if (draft.notes !== (pe.notes ?? "")) {
            patch.notes = draft.notes.trim() === "" ? null : draft.notes.trim()
        }

        return patch
    }

    const handleSave = async () => {
        setError(null)
        const patch = buildPatch()
        if (!patch) return
        if (Object.keys(patch).length === 0) return // nothing dirty after parse
        setSaving(true)
        try {
            const res = await planEditApi.updateExercise(pe.id, patch)
            onAfterMutation(res)
        } catch (err) {
            const conflict = detectSessionInProgress(err)
            if (conflict) {
                onConflict(conflict.sessionId)
                return
            }
            setError(err instanceof Error ? err.message : "Couldn't save")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        const ok = await confirm({
            title: `Remove ${pe.exercise.name}?`,
            body: "It'll be gone from this day. Logs from past sessions stay.",
            confirmLabel: "Remove",
            destructive: true,
        })
        if (!ok) return
        setError(null)
        setDeleting(true)
        try {
            const res = await planEditApi.deleteExercise(pe.id)
            onAfterMutation(res)
        } catch (err) {
            const conflict = detectSessionInProgress(err)
            if (conflict) {
                onConflict(conflict.sessionId)
                return
            }
            if (isExerciseHasLogs(err)) {
                setError(
                    "This exercise has logged sets — log a fresh one or archive it later.",
                )
                return
            }
            setError(err instanceof Error ? err.message : "Couldn't remove")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <article className="rounded-2xl bg-white border border-neutral-200 p-4">
            <header className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <Link
                        to={`/exercises/${pe.exercise.slug}`}
                        className="text-base font-bold hover:underline underline-offset-4 decoration-neutral-300"
                    >
                        {pe.exercise.name}
                    </Link>
                    <div className="mt-1 text-xs text-neutral-500">
                        {pe.exercise.primaryMuscles.join(", ")}
                        {pe.exercise.equipment
                            ? ` · ${pe.exercise.equipment}`
                            : ""}
                    </div>
                </div>
                <Reorderable
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    disabled={disabled || saving || deleting}
                    label="exercise"
                />
            </header>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <NumField
                    label="Sets"
                    value={draft.targetSets}
                    onChange={(v) =>
                        setDraft((d) => ({ ...d, targetSets: v }))
                    }
                    disabled={disabled || saving || deleting}
                />
                <RangeField
                    label="Reps"
                    min={draft.targetRepsMin}
                    max={draft.targetRepsMax}
                    onMin={(v) =>
                        setDraft((d) => ({ ...d, targetRepsMin: v }))
                    }
                    onMax={(v) =>
                        setDraft((d) => ({ ...d, targetRepsMax: v }))
                    }
                    disabled={disabled || saving || deleting}
                />
                <NumField
                    label="RPE"
                    value={draft.targetRpe}
                    placeholder="—"
                    step="0.5"
                    onChange={(v) => setDraft((d) => ({ ...d, targetRpe: v }))}
                    disabled={disabled || saving || deleting}
                />
                <NumField
                    label="Rest (s)"
                    value={draft.restSeconds}
                    placeholder="—"
                    onChange={(v) =>
                        setDraft((d) => ({ ...d, restSeconds: v }))
                    }
                    disabled={disabled || saving || deleting}
                />
            </div>

            <label className="mt-3 block text-xs font-medium text-neutral-500">
                Notes
                <input
                    type="text"
                    value={draft.notes}
                    onChange={(e) =>
                        setDraft((d) => ({ ...d, notes: e.target.value }))
                    }
                    placeholder="Optional cue"
                    disabled={disabled || saving || deleting}
                    className="mt-1 block w-full min-h-11 px-3 text-sm rounded-lg bg-stone-50 border border-neutral-200 focus:border-neutral-900 outline-none disabled:opacity-50"
                />
            </label>

            {error && (
                <div
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                    {error}
                </div>
            )}

            <footer className="mt-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-xs">
                    <button
                        type="button"
                        onClick={onSwapClick}
                        disabled={disabled || saving || deleting}
                        className="text-neutral-500 hover:text-neutral-900 underline underline-offset-4 disabled:opacity-50"
                    >
                        Swap
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={disabled || saving || deleting}
                        className="text-neutral-400 hover:text-red-600 disabled:opacity-50"
                    >
                        {deleting ? "Removing…" : "Remove"}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled || saving || deleting || !dirty}
                    className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {saving && <Spinner size="sm" />}
                    {saving ? "Saving…" : dirty ? "Save" : "Saved"}
                </button>
            </footer>
        </article>
    )
}

function NumField({
    label,
    value,
    onChange,
    placeholder,
    step,
    disabled,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    step?: string
    disabled?: boolean
}) {
    return (
        <label className="text-xs font-medium text-neutral-500">
            {label}
            <input
                type="number"
                inputMode="decimal"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                step={step}
                min={0}
                disabled={disabled}
                className="mt-1 block w-full min-h-11 px-3 text-base text-right rounded-lg bg-stone-50 border border-neutral-200 focus:border-neutral-900 outline-none tabular-nums disabled:opacity-50"
            />
        </label>
    )
}

function RangeField({
    label,
    min,
    max,
    onMin,
    onMax,
    disabled,
}: {
    label: string
    min: string
    max: string
    onMin: (v: string) => void
    onMax: (v: string) => void
    disabled?: boolean
}) {
    return (
        <div className="text-xs font-medium text-neutral-500">
            {label}
            <div className="mt-1 flex items-center gap-1">
                <input
                    type="number"
                    inputMode="numeric"
                    value={min}
                    onChange={(e) => onMin(e.target.value)}
                    min={1}
                    disabled={disabled}
                    aria-label="Min reps"
                    className="w-full min-h-11 px-2 text-base text-right rounded-lg bg-stone-50 border border-neutral-200 focus:border-neutral-900 outline-none tabular-nums disabled:opacity-50"
                />
                <span className="text-neutral-300">–</span>
                <input
                    type="number"
                    inputMode="numeric"
                    value={max}
                    onChange={(e) => onMax(e.target.value)}
                    min={1}
                    disabled={disabled}
                    aria-label="Max reps"
                    className="w-full min-h-11 px-2 text-base text-right rounded-lg bg-stone-50 border border-neutral-200 focus:border-neutral-900 outline-none tabular-nums disabled:opacity-50"
                />
            </div>
        </div>
    )
}

export default ExerciseEditor
